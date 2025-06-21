import { useEffect, useState, useCallback } from 'react';
import { contract } from '../../types';
import { db, StoredDataBlock } from '../../lib/db'; // Import Dexie db instance
import { CharacterLite } from '@/types/domain'; // Import CharacterLite
import { estimateBlockTimestamp } from '@/utils/blockUtils'; // Import the new utility function
import { ENTRYPOINT_ADDRESS } from '../../config/env'; // Import contract address
import { mapCharacterToCharacterLite } from '@/mappers/contractToDomain'; // Import mapper function

// In-memory character cache to remember names of characters we've seen
// This persists during the session but clears on page reload
const characterNameCache = new Map<number, { id: string; name: string; areaId: bigint }>();

// Export function to clear character cache (useful for debugging or when switching characters)
export const clearCharacterNameCache = () => {
  characterNameCache.clear();
};

// Define SerializedEventLog based on contract.Log, converting BigInts to numbers
// Export needed types
export interface SerializedEventLog {
  logType: number;
  index: number;
  mainPlayerIndex: number; // Converted from BigInt to number
  otherPlayerIndex: number; // Converted from BigInt to number
  attackerName?: string;
  defenderName?: string;
  areaId: string;
  hit: boolean;
  critical: boolean;
  damageDone: number;
  healthHealed: number;
  targetDied: boolean;
  lootedWeaponID: number;
  lootedArmorID: number;
  experience: number;
  value: string; // Store BigInt as string
}

// Create a SerializedChatLog type to match what we store
// Export needed types
export interface SerializedChatLog {
  logIndex: number;
  content: string;
  timestamp: string;
  senderId: string;
  senderName: string;
}

// Return type still aims to match the old CachedDataBlock structure for compatibility
// with useUiSnapshot mapping logic
// Export needed types
export interface CachedDataBlock { 
  blockNumber: bigint; 
  timestamp: number;
  chats: SerializedChatLog[];
  events: SerializedEventLog[];
}

// Constants
const FEED_TTL = 1000 * 60 * 60; // 1 hour in ms 


/**
 * Hook to manage cached data feed blocks using in-memory storage with localStorage persistence.
 * Loads initial cached events on mount and maintains processed block tracking.
 * Uses block-level deduplication to prevent overwriting resolved events.
 */
export const useCachedDataFeed = (owner: string | null, characterId: string | null) => {
  const [inMemoryEvents, setInMemoryEvents] = useState<CachedDataBlock[]>([]);
  const [processedBlocks, setProcessedBlocks] = useState<Set<string>>(new Set());
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    if (!owner || !characterId) {
      if (isMounted) {
        setInMemoryEvents([]); 
        setProcessedBlocks(new Set());
        setIsHistoryLoading(false);
      }
      return;
    }

    const loadInitialCachedEvents = async () => {
      if (!isMounted) return;
      setIsHistoryLoading(true);
      try {
        const contractAddress = ENTRYPOINT_ADDRESS.toLowerCase();
        
        // Load character-specific data from Dexie
        const recentStoredBlocks = await db.dataBlocks
          .where('[owner+contract+characterId]')
          .equals([owner, contractAddress, characterId])
          .toArray();

        recentStoredBlocks.sort((a, b) => parseInt(a.block, 10) - parseInt(b.block, 10));

        const deserializedBlocks = recentStoredBlocks.map(stored => ({
          blockNumber: BigInt(stored.block),
          timestamp: stored.ts,
          // Ensure loaded chats/events conform to interface
          chats: (stored.chats || []) as SerializedChatLog[], 
          events: (stored.events || []) as SerializedEventLog[] 
        }));

        // Build set of processed blocks
        const processedBlocksSet = new Set(recentStoredBlocks.map(stored => stored.block));

        if (isMounted) {
            setInMemoryEvents(deserializedBlocks);
            setProcessedBlocks(processedBlocksSet);
        }

        // Update character metadata with last active timestamp
        await db.characters.put({
          owner,
          characterId,
          lastActive: Date.now()
        });

        // Purge expired blocks (TTL-based cleanup)
        const now = Date.now();
        const expirationTime = now - FEED_TTL;
        
        // Purge expired blocks for this specific character
        const deleteCount = await db.dataBlocks
          .where('[owner+contract+characterId]')
          .equals([owner, contractAddress, characterId])
          .and(item => item.ts < expirationTime)
          .delete();

        if (deleteCount > 0) {
          console.log(`[CachedDataFeed] Purged ${deleteCount} expired blocks for character ${characterId}.`);
        }

      } catch (error) {
        console.error('[CachedDataFeed] Error loading initial blocks from Dexie:', error);
        if (isMounted) {
            setInMemoryEvents([]);
            setProcessedBlocks(new Set());
        }
      } finally {
        if (isMounted) {
            setIsHistoryLoading(false);
        }
      }
    };

    loadInitialCachedEvents();

    return () => {
      isMounted = false;
    };
  }, [owner, characterId]); // Removed refreshTrigger dependency

  // Utility function to get all characters for current owner
  const getAllCharactersForOwner = useCallback(async (ownerAddress: string) => {
    if (!ownerAddress) return [];
    
    try {
      const characters = await db.characters
        .where('owner')
        .equals(ownerAddress)
        .toArray();
      
      // Sort by lastActive in memory (most recent first)
      return characters.sort((a, b) => b.lastActive - a.lastActive);
    } catch (error) {
      console.error('[CachedDataFeed] Error getting characters for owner:', error);
      return [];
    }
  }, []);

  // Utility function to get data summary for all characters of current owner
  const getDataSummaryForOwner = useCallback(async (ownerAddress: string) => {
    if (!ownerAddress) return {};
    
    try {
      const contractAddress = ENTRYPOINT_ADDRESS.toLowerCase();
      const summary: Record<string, { blockCount: number, lastActivity: number }> = {};
      
      // Get all data blocks for this owner across all characters
      const allBlocks = await db.dataBlocks
        .where('[owner+contract]')
        .equals([ownerAddress, contractAddress])
        .toArray();
      
      // Group by characterId
      allBlocks.forEach(block => {
        if (!summary[block.characterId]) {
          summary[block.characterId] = { blockCount: 0, lastActivity: 0 };
        }
        summary[block.characterId].blockCount++;
        summary[block.characterId].lastActivity = Math.max(
          summary[block.characterId].lastActivity, 
          block.ts
        );
      });
      
      return summary;
    } catch (error) {
      console.error('[CachedDataFeed] Error getting data summary:', error);
      return {};
    }
  }, []);

  // Function to add new events to in-memory store (replaces refreshCachedData)
  const addNewEvents = useCallback((newBlocks: CachedDataBlock[]) => {
    if (newBlocks.length === 0) return;
    
    setInMemoryEvents(prev => {
      // Create a map of existing blocks by block number for efficient lookup
      const existingBlocksMap = new Map(prev.map(block => [block.blockNumber.toString(), block]));
      
      // Add new blocks that we haven't seen before
      newBlocks.forEach(newBlock => {
        const blockKey = newBlock.blockNumber.toString();
        if (!existingBlocksMap.has(blockKey)) {
          existingBlocksMap.set(blockKey, newBlock);
        }
      });
      
      // Convert back to array and sort by block number
      return Array.from(existingBlocksMap.values())
        .sort((a, b) => Number(a.blockNumber - b.blockNumber));
    });
    
    // Update processed blocks set
    setProcessedBlocks(prev => {
      const newSet = new Set(prev);
      newBlocks.forEach(block => {
        newSet.add(block.blockNumber.toString());
      });
      return newSet;
    });
  }, []);

  // Return the in-memory events and loading state, plus utility functions
  return {
    historicalBlocks: inMemoryEvents, // Keep same interface for compatibility
    processedBlocks, // Expose processed blocks for storeFeedData
    isHistoryLoading,
    getAllCharactersForOwner, // For character switching UI
    getDataSummaryForOwner,   // For showing data availability per character
    addNewEvents, // For adding new events to in-memory store
  };
};

export const processDataFeedsToCachedBlocks = (
  dataFeeds: contract.DataFeed[],
  combatantsContext: CharacterLite[] | undefined,
  nonCombatantsContext: CharacterLite[] | undefined,
  currentBlockNumber: bigint, // Add currentBlockNumber parameter
  fetchTimestamp: number, // Add fetchTimestamp parameter
  playerAreaId?: bigint, // Add player's current areaId
  mainPlayerCharacter?: contract.Character // Add main player character for name lookup
): CachedDataBlock[] => {
  if (!dataFeeds || dataFeeds.length === 0) {
    return [];
  }

  // Get the current timestamp once for the whole batch processing
  // Use the provided fetchTimestamp as the reference point
  const currentTimestamp = fetchTimestamp;

  // Create lookup maps from context (index -> {id, name, areaId})
  const characterLookup = new Map<number, { id: string; name: string; areaId: bigint }>();
  
  // 1. Start with cached characters (from previous encounters)
  characterNameCache.forEach((char, index) => {
    characterLookup.set(index, char);
  });
  
  // 2. Add/update current combatants (will override cache if different)
  (combatantsContext || []).forEach(c => {
    const charData = { id: c.id, name: c.name, areaId: c.areaId };
    characterLookup.set(c.index, charData);
    // Update cache with current data
    characterNameCache.set(c.index, charData);
  });
  
  // 3. Add/update current noncombatants (will override cache if different)
  (nonCombatantsContext || []).forEach(c => {
    const charData = { id: c.id, name: c.name, areaId: c.areaId };
    characterLookup.set(c.index, charData);
    // Update cache with current data
    characterNameCache.set(c.index, charData);
  });
  
  // 4. Add main player character to lookup (most important for name resolution)
  if (mainPlayerCharacter) {
    const mainPlayerLite = mapCharacterToCharacterLite(mainPlayerCharacter);
    if (mainPlayerLite) {
      const charData = { 
        id: mainPlayerLite.id, 
        name: mainPlayerLite.name, 
        areaId: mainPlayerLite.areaId 
      };
      characterLookup.set(mainPlayerLite.index, charData);
      // Update cache with main player data
      characterNameCache.set(mainPlayerLite.index, charData);
    }
  }
  
  const processedBlocks: CachedDataBlock[] = [];

  for (const feed of dataFeeds) {
    const blockNumberBigInt = feed.blockNumber ? BigInt(feed.blockNumber) : undefined;
    if (blockNumberBigInt === undefined) continue; 

    const estimatedBlockTimestamp = estimateBlockTimestamp(
      currentBlockNumber, // lastBlock (reference block)
      currentTimestamp,   // lastBlockTimestamp (reference time)
      blockNumberBigInt         // lookupBlock (block to estimate for)
    );

    const serializedChatsForBlock: SerializedChatLog[] = [];
    const serializedEventsForBlock: SerializedEventLog[] = []; 

    let chatLogArrayIndex = 0; // Use separate counter for chatLogs array access

    (feed.logs || []).forEach((log: contract.Log) => {
      if (log.index === undefined || log.logType === undefined) return; 
      const logIndexNum = typeof log.index === 'bigint' ? Number(log.index) : log.index;
      const logTypeNum = Number(log.logType);

      // Process Event Log (always)
      const mainPlayerIndexNum = Number(log.mainPlayerIndex);
      const otherPlayerIndexNum = Number(log.otherPlayerIndex);
      const attackerInfo = characterLookup.get(mainPlayerIndexNum);
      const defenderInfo = characterLookup.get(otherPlayerIndexNum);
      // Generate better fallback names when character info is not available
      const getCharacterFallbackName = (playerIndex: number, isAttacker: boolean): string => {
        if (playerIndex <= 0) return 'Unknown';
        
        // Try to determine if it's likely a player or NPC based on index range
        if (playerIndex < 100) {
          return isAttacker ? `Player ${playerIndex}` : `Character ${playerIndex}`;
        } else {
          return isAttacker ? `Creature ${playerIndex}` : `Enemy ${playerIndex}`;
        }
      };

      serializedEventsForBlock.push({
        logType: log.logType,
        index: logIndexNum,
        mainPlayerIndex: mainPlayerIndexNum,
        otherPlayerIndex: otherPlayerIndexNum,
        attackerName: attackerInfo?.name || getCharacterFallbackName(mainPlayerIndexNum, true),
        defenderName: defenderInfo?.name || getCharacterFallbackName(otherPlayerIndexNum, false),
        areaId: String(playerAreaId || 0n), // Use player's current areaId
        hit: log.hit,
        critical: log.critical,
        damageDone: log.damageDone,
        healthHealed: log.healthHealed,
        targetDied: log.targetDied,
        lootedWeaponID: log.lootedWeaponID,
        lootedArmorID: log.lootedArmorID,
        experience: log.experience,
        value: String(log.value || '0')
      });

      // Process Chat Log specifically if type is Chat (4)
      if (logTypeNum === 4) { 
        const senderInfo = attackerInfo; // Assume attacker is sender for chat
        // Access chatLogs array using separate counter, NOT log.index
        const messageContent = feed.chatLogs?.[chatLogArrayIndex]; 
        chatLogArrayIndex++; // Increment after potential access
        
        if (messageContent) { 
          serializedChatsForBlock.push({
            logIndex: logIndexNum,
            content: messageContent,
            timestamp: estimatedBlockTimestamp.toString(),
            senderId: senderInfo?.id || 'unknown-id',
            senderName: senderInfo?.name || 'Unknown'
          });
        }
      }
    });

    // Only add block if it has chats or events worth storing
    if (serializedChatsForBlock.length > 0 || serializedEventsForBlock.length > 0) {
      processedBlocks.push({ 
        blockNumber: blockNumberBigInt, 
        timestamp: estimatedBlockTimestamp,
        chats: serializedChatsForBlock,
        events: serializedEventsForBlock 
      });
      
    }
  }
  return processedBlocks;
};


/**
 * Utility function to store feed data with block deduplication
 * Only processes and stores blocks that haven't been processed before
 * @param owner - owner wallet address
 * @param characterId - character ID to associate data with
 * @param dataFeeds - dataFeeds to store
 * @param combatantsContext - combatantsContext to store
 * @param nonCombatantsContext - nonCombatantsContext to store
 * @param currentBlockNumber - currentBlockNumber to store
 * @param fetchTimestamp - fetchTimestamp to store
 * @param processedBlocks - Set of already processed block numbers
 * @param addNewEvents - Function to add new events to in-memory store
 * @returns newly processed blocks
 */
export const storeFeedData = async (
  owner: string,
  characterId: string,
  dataFeeds: contract.DataFeed[],
  combatantsContext: CharacterLite[] | undefined,
  nonCombatantsContext: CharacterLite[] | undefined,
  currentBlockNumber: bigint,
  fetchTimestamp: number,
  processedBlocks: Set<string>,
  addNewEvents: (blocks: CachedDataBlock[]) => void,
  playerAreaId?: bigint,
  mainPlayerCharacter?: contract.Character
): Promise<CachedDataBlock[]> => {
  if (!owner || !characterId || !dataFeeds || dataFeeds.length === 0) {
    return []; // No owner/character or data to store
  }

  // 1. Filter out dataFeeds for blocks we've already processed
  const newDataFeeds = dataFeeds.filter(feed => {
    const blockNumber = feed.blockNumber?.toString();
    return blockNumber && !processedBlocks.has(blockNumber);
  });

  if (newDataFeeds.length === 0) {
    console.log('[storeFeedData] No new blocks to process');
    return [];
  }

  console.log(`[storeFeedData] Processing ${newDataFeeds.length} new blocks out of ${dataFeeds.length} total`);

  // 2. Process only the new feeds
  const processedNewBlocks = processDataFeedsToCachedBlocks(
    newDataFeeds,
    combatantsContext,
    nonCombatantsContext,
    currentBlockNumber, 
    fetchTimestamp,
    playerAreaId,
    mainPlayerCharacter
  );

  if (processedNewBlocks.length === 0) {
    return [];
  }

  // 3. Add to in-memory store immediately
  addNewEvents(processedNewBlocks);

  // 4. Transform processed blocks into the format needed for Dexie (StoredDataBlock)
  const contractAddress = ENTRYPOINT_ADDRESS.toLowerCase();
  const blocksToStore: StoredDataBlock[] = processedNewBlocks.map(block => ({
    owner: owner,
    contract: contractAddress,
    characterId: characterId,
    block: block.blockNumber.toString(),
    ts: block.timestamp,
    chats: block.chats,
    events: block.events
  }));

  // 5. Store in Dexie (persistence)
  try {
    await db.transaction('rw', db.dataBlocks, async () => {
      await db.dataBlocks.bulkPut(blocksToStore);
    });
    console.log(`[storeFeedData] Successfully stored ${blocksToStore.length} new blocks to Dexie`);
  } catch (txError) {
     console.error("[storeFeedData] Dexie transaction failed:", txError);
  }

  return processedNewBlocks;
};