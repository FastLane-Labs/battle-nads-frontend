import { useEffect, useState, useCallback } from 'react';
import { contract } from '../../types';
import { db, StoredDataBlock } from '../../lib/db'; // Import Dexie db instance
import { LogType } from '@/types/domain/enums'; // Import LogType
import { CharacterLite } from '@/types/domain'; // Import CharacterLite
import { estimateBlockTimestamp } from '@/utils/blockUtils'; // Import the new utility function
import { ENTRYPOINT_ADDRESS } from '../../config/env'; // Import contract address
import { createAreaID } from '@/utils/areaId'; // Import area ID calculation

// Define SerializedEventLog based on contract.Log, converting BigInts
// Export needed types
export interface SerializedEventLog {
  logType: number;
  index: number;
  mainPlayerIndex: number;
  otherPlayerIndex: number;
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
 * Hook to manage cached data feed blocks using Dexie.
 * Loads initial historical blocks from Dexie ON MOUNT and handles purging.
 * Enhanced to support character-specific data storage.
 */
export const useCachedDataFeed = (owner: string | null, characterId: string | null) => {
  const [historicalBlocks, setHistoricalBlocks] = useState<CachedDataBlock[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    if (!owner || !characterId) {
      if (isMounted) {
        setHistoricalBlocks([]); 
        setIsHistoryLoading(false);
      }
      return;
    }

    const loadInitialHistoryAndPurge = async () => {
      if (!isMounted) return;
      setIsHistoryLoading(true);
      try {
        const contractAddress = ENTRYPOINT_ADDRESS.toLowerCase();
        
        // Load character-specific data
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

        if (isMounted) {
            setHistoricalBlocks(deserializedBlocks);
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
          // console.log(`[CachedDataFeed] Purged ${deleteCount} expired blocks for character ${characterId}.`);
        }

      } catch (error) {
        console.error('[CachedDataFeed] Error loading initial blocks from Dexie:', error);
        if (isMounted) {
            setHistoricalBlocks([]);
        }
      } finally {
        if (isMounted) {
            setIsHistoryLoading(false);
        }
      }
    };

    loadInitialHistoryAndPurge();

    return () => {
      isMounted = false;
    };
  }, [owner, characterId]); // Now depends on both owner and characterId

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

  // Return the historical blocks and loading state, plus utility functions
  return {
    historicalBlocks, // Return the state variable
    isHistoryLoading,
    getAllCharactersForOwner, // For character switching UI
    getDataSummaryForOwner,   // For showing data availability per character
  };
};

export const processDataFeedsToCachedBlocks = (
  dataFeeds: contract.DataFeed[],
  combatantsContext: CharacterLite[] | undefined,
  nonCombatantsContext: CharacterLite[] | undefined,
  currentBlockNumber: bigint, // Add currentBlockNumber parameter
  fetchTimestamp: number, // Add fetchTimestamp parameter
  playerCharacter?: contract.Character | null // Add player character for lookup
): CachedDataBlock[] => {
  if (!dataFeeds || dataFeeds.length === 0) {
    return [];
  }

  // Get the current timestamp once for the whole batch processing
  // Use the provided fetchTimestamp as the reference point
  const currentTimestamp = fetchTimestamp;

  // Create lookup maps from context (index -> {id, name, areaId})
  const characterLookup = new Map<number, { id: string; name: string; areaId: bigint }>();
  (combatantsContext || []).forEach(c => characterLookup.set(c.index, { id: c.id, name: c.name, areaId: c.areaId }));
  (nonCombatantsContext || []).forEach(c => characterLookup.set(c.index, { id: c.id, name: c.name, areaId: c.areaId }));
  
  // CRITICAL FIX: Add player character to lookup so it can be resolved when storing events
  if (playerCharacter) {
    const playerIndex = Number(playerCharacter.stats.index);
    // Calculate proper area ID from player position
    const playerAreaId = createAreaID(
      Number(playerCharacter.stats.depth),
      Number(playerCharacter.stats.x),
      Number(playerCharacter.stats.y)
    );
    characterLookup.set(playerIndex, { 
      id: playerCharacter.id, 
      name: playerCharacter.name, 
      areaId: playerAreaId 
    });
  }
  
  // Calculate snapshot area ID once for all events (they all happen in player's current area)
  const snapshotAreaId = playerCharacter ? createAreaID(
    Number(playerCharacter.stats.depth),
    Number(playerCharacter.stats.x),
    Number(playerCharacter.stats.y)
  ) : BigInt(0);

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
      const attackerInfo = characterLookup.get(Number(log.mainPlayerIndex));
      const defenderInfo = characterLookup.get(Number(log.otherPlayerIndex));
      serializedEventsForBlock.push({
        logType: log.logType,
        index: logIndexNum,
        mainPlayerIndex: log.mainPlayerIndex,
        otherPlayerIndex: log.otherPlayerIndex,
        attackerName: attackerInfo?.name,
        defenderName: defenderInfo?.name,
        areaId: String(snapshotAreaId), // Use calculated snapshot area ID for all events
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
 * Utility function to store feed data (can be called from useUiSnapshot)
 * @param owner - owner wallet address
 * @param characterId - character ID to associate data with
 * @param dataFeeds - dataFeeds to store
 * @param combatantsContext - combatantsContext to store
 * @param nonCombatantsContext - nonCombatantsContext to store
 * @param currentBlockNumber - currentBlockNumber to store
 * @param fetchTimestamp - fetchTimestamp to store
 * @returns 
 */
export const storeFeedData = async (
  owner: string,
  characterId: string,
  dataFeeds: contract.DataFeed[],
  combatantsContext: CharacterLite[] | undefined,
  nonCombatantsContext: CharacterLite[] | undefined,
  currentBlockNumber: bigint, // Add currentBlockNumber parameter
  fetchTimestamp: number, // Add fetchTimestamp parameter
  playerCharacter?: contract.Character | null // Add player character for lookup
) => {
  if (!owner || !characterId || !dataFeeds || dataFeeds.length === 0) {
    return; // No owner/character or data to store
  }

  // 1. Process the feeds using the new utility function
  const processedBlocks = processDataFeedsToCachedBlocks(
    dataFeeds,
    combatantsContext,
    nonCombatantsContext,
    currentBlockNumber, 
    fetchTimestamp,
    playerCharacter
  );

  // 2. Transform processed blocks into the format needed for Dexie (StoredDataBlock)
  const contractAddress = ENTRYPOINT_ADDRESS.toLowerCase();
  const blocksToStore: StoredDataBlock[] = processedBlocks.map(block => ({
    owner: owner,
    contract: contractAddress,
    characterId: characterId, // Include characterId in stored data
    block: block.blockNumber.toString(),
    ts: block.timestamp,
    chats: block.chats,
    events: block.events
  }));


  // 3. Store in Dexie
  if (blocksToStore.length > 0) {
    try {
      await db.transaction('rw', db.dataBlocks, async () => {
        await db.dataBlocks.bulkPut(blocksToStore);
      });
    } catch (txError) {
       console.error("[storeFeedData] Dexie transaction failed:", txError);
    }
  }
};