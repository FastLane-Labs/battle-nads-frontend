import { useEffect, useState, useCallback } from 'react';
import { contract } from '../../types';
import { db, StoredDataBlock, StoredEvent, StoredChatMessage } from '../../lib/db'; // Import Dexie db instance
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
        
        // Try to load from new event-level storage first
        const storedEvents = await db.events
          .where('[owner+contract+characterId]')
          .equals([owner, contractAddress, characterId])
          .toArray();

        const storedChatMessages = await db.chatMessages
          .where('[owner+contract+characterId]')
          .equals([owner, contractAddress, characterId])
          .toArray();

        if (storedEvents.length > 0 || storedChatMessages.length > 0) {
          // Convert event-level storage back to block format for compatibility
          const blocksMap = new Map<string, CachedDataBlock>();
          
          // Process events
          storedEvents.forEach(event => {
            const blockKey = event.blockNumber;
            if (!blocksMap.has(blockKey)) {
              blocksMap.set(blockKey, {
                blockNumber: BigInt(event.blockNumber),
                timestamp: event.timestamp,
                chats: [],
                events: []
              });
            }
            
            const block = blocksMap.get(blockKey)!;
            block.events.push({
              logType: event.logType,
              index: event.logIndex,
              mainPlayerIndex: event.mainPlayerIndex,
              otherPlayerIndex: event.otherPlayerIndex,
              attackerName: event.attackerName,
              defenderName: event.defenderName,
              areaId: event.areaId,
              hit: event.hit,
              critical: event.critical,
              damageDone: event.damageDone,
              healthHealed: event.healthHealed,
              targetDied: event.targetDied,
              lootedWeaponID: event.lootedWeaponID,
              lootedArmorID: event.lootedArmorID,
              experience: event.experience,
              value: event.value
            });
          });

          // Process chat messages
          storedChatMessages.forEach(message => {
            const blockKey = message.blockNumber;
            if (!blocksMap.has(blockKey)) {
              blocksMap.set(blockKey, {
                blockNumber: BigInt(message.blockNumber),
                timestamp: message.timestamp,
                chats: [],
                events: []
              });
            }
            
            const block = blocksMap.get(blockKey)!;
            block.chats.push({
              logIndex: message.logIndex,
              content: message.content,
              timestamp: message.timestamp.toString(),
              senderId: message.senderId,
              senderName: message.senderName
            });
          });

          const deserializedBlocks = Array.from(blocksMap.values())
            .sort((a, b) => Number(a.blockNumber - b.blockNumber));

          const processedBlocksSet = new Set(deserializedBlocks.map(block => block.blockNumber.toString()));

          if (isMounted) {
            setInMemoryEvents(deserializedBlocks);
            setProcessedBlocks(processedBlocksSet);
          }

          console.log(`[CachedDataFeed] Loaded ${storedEvents.length} events and ${storedChatMessages.length} chat messages from event-level storage`);
        } else {
          // Fallback to legacy block-based storage for migration
          const recentStoredBlocks = await db.dataBlocks
            .where('[owner+contract+characterId]')
            .equals([owner, contractAddress, characterId])
            .toArray();

          if (recentStoredBlocks.length > 0) {
            console.log(`[CachedDataFeed] Migrating ${recentStoredBlocks.length} blocks from legacy storage`);
            
            recentStoredBlocks.sort((a, b) => parseInt(a.block, 10) - parseInt(b.block, 10));

            const deserializedBlocks = recentStoredBlocks.map(stored => ({
              blockNumber: BigInt(stored.block),
              timestamp: stored.ts,
              chats: (stored.chats || []) as SerializedChatLog[], 
              events: (stored.events || []) as SerializedEventLog[] 
            }));

            const processedBlocksSet = new Set(recentStoredBlocks.map(stored => stored.block));

            if (isMounted) {
              setInMemoryEvents(deserializedBlocks);
              setProcessedBlocks(processedBlocksSet);
            }

            // TODO: Could add migration logic here to convert to event-level storage
          }
        }

        // Update character metadata with last active timestamp
        await db.characters.put({
          owner,
          characterId,
          lastActive: Date.now()
        });

        // Purge expired events and chat messages (TTL-based cleanup)
        const now = Date.now();
        const expirationTime = now - FEED_TTL;
        
        const expiredEventsCount = await db.events
          .where('[owner+contract+characterId]')
          .equals([owner, contractAddress, characterId])
          .and(item => item.storeTimestamp < expirationTime)
          .delete();

        const expiredChatCount = await db.chatMessages
          .where('[owner+contract+characterId]')
          .equals([owner, contractAddress, characterId])
          .and(item => item.storeTimestamp < expirationTime)
          .delete();

        if (expiredEventsCount > 0 || expiredChatCount > 0) {
          console.log(`[CachedDataFeed] Purged ${expiredEventsCount} expired events and ${expiredChatCount} expired chat messages for character ${characterId}`);
        }

      } catch (error) {
        console.error('[CachedDataFeed] Error loading initial events from storage:', error);
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
  }, [owner, characterId]);

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
  mainPlayerCharacter?: contract.Character, // Add main player character for name lookup
  endBlock?: bigint // Add endBlock to calculate absolute block numbers
): CachedDataBlock[] => {
  if (!dataFeeds || dataFeeds.length === 0) {
    return [];
  }

  // Calculate the base block number for absolute block calculation
  // DataFeed.blockNumber is relative to the query range
  const maxRelativeBlock = dataFeeds.reduce((max, feed) => {
    const feedBlock = feed.blockNumber ? Number(feed.blockNumber) : 0;
    return Math.max(max, feedBlock);
  }, 0);
  
  const baseBlock = endBlock ? Number(endBlock) - maxRelativeBlock : 0;
  console.log(`[processDataFeedsToCachedBlocks] Calculated baseBlock: ${baseBlock}, maxRelativeBlock: ${maxRelativeBlock}, endBlock: ${endBlock}`);

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
    const relativeBlockNumber = feed.blockNumber ? Number(feed.blockNumber) : undefined;
    if (relativeBlockNumber === undefined) continue;
    
    // Calculate absolute block number: baseBlock + relative offset
    const absoluteBlockNumber = baseBlock + relativeBlockNumber;
    const blockNumberBigInt = BigInt(absoluteBlockNumber);
    
    console.log(`[processDataFeedsToCachedBlocks] Feed relative block: ${relativeBlockNumber}, absolute: ${absoluteBlockNumber}`); 

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
 * NEW: Process individual events from data feeds for event-level storage
 * Replaces block-level processing with granular event processing
 */
export const processDataFeedsToEvents = (
  dataFeeds: contract.DataFeed[],
  combatantsContext: CharacterLite[] | undefined,
  nonCombatantsContext: CharacterLite[] | undefined,
  currentBlockNumber: bigint,
  fetchTimestamp: number,
  owner: string,
  characterId: string,
  playerAreaId?: bigint,
  mainPlayerCharacter?: contract.Character,
  endBlock?: bigint
): { events: StoredEvent[], chatMessages: StoredChatMessage[] } => {
  if (!dataFeeds || dataFeeds.length === 0) {
    return { events: [], chatMessages: [] };
  }

  const contractAddress = ENTRYPOINT_ADDRESS.toLowerCase();
  const storeTimestamp = Date.now();

  // Calculate the base block for absolute block calculation
  const maxRelativeBlock = dataFeeds.reduce((max, feed) => {
    const feedBlock = feed.blockNumber ? Number(feed.blockNumber) : 0;
    return Math.max(max, feedBlock);
  }, 0);
  
  const baseBlock = endBlock ? Number(endBlock) - maxRelativeBlock : 0;

  // Create character lookup map with cache fallbacks
  const characterLookup = new Map<number, { id: string; name: string; areaId: bigint }>();
  
  // 1. Start with cached characters
  characterNameCache.forEach((char, index) => {
    characterLookup.set(index, char);
  });
  
  // 2. Add/update current combatants
  (combatantsContext || []).forEach(c => {
    const charData = { id: c.id, name: c.name, areaId: c.areaId };
    characterLookup.set(c.index, charData);
    characterNameCache.set(c.index, charData);
  });
  
  // 3. Add/update current noncombatants
  (nonCombatantsContext || []).forEach(c => {
    const charData = { id: c.id, name: c.name, areaId: c.areaId };
    characterLookup.set(c.index, charData);
    characterNameCache.set(c.index, charData);
  });
  
  // 4. Add main player character
  if (mainPlayerCharacter) {
    const mainPlayerLite = mapCharacterToCharacterLite(mainPlayerCharacter);
    if (mainPlayerLite) {
      const charData = { 
        id: mainPlayerLite.id, 
        name: mainPlayerLite.name, 
        areaId: mainPlayerLite.areaId 
      };
      characterLookup.set(mainPlayerLite.index, charData);
      characterNameCache.set(mainPlayerLite.index, charData);
    }
  }

  const events: StoredEvent[] = [];
  const chatMessages: StoredChatMessage[] = [];

  for (const feed of dataFeeds) {
    const relativeBlockNumber = feed.blockNumber ? Number(feed.blockNumber) : undefined;
    if (relativeBlockNumber === undefined) continue;
    
    const absoluteBlockNumber = baseBlock + relativeBlockNumber;
    const blockNumberBigInt = BigInt(absoluteBlockNumber);
    const blockTimestamp = estimateBlockTimestamp(
      currentBlockNumber,
      fetchTimestamp,
      blockNumberBigInt
    );

    let chatLogArrayIndex = 0;

    (feed.logs || []).forEach((log: contract.Log) => {
      if (log.index === undefined || log.logType === undefined) return;
      
      const logIndexNum = typeof log.index === 'bigint' ? Number(log.index) : log.index;
      const logTypeNum = Number(log.logType);
      const eventKey = `${absoluteBlockNumber}-${logIndexNum}`;

      // Process event (all log types create events)
      const mainPlayerIndexNum = Number(log.mainPlayerIndex);
      const otherPlayerIndexNum = Number(log.otherPlayerIndex);
      const attackerInfo = characterLookup.get(mainPlayerIndexNum);
      const defenderInfo = characterLookup.get(otherPlayerIndexNum);

      const getCharacterFallbackName = (playerIndex: number, isAttacker: boolean): string => {
        if (playerIndex <= 0) return 'Unknown';
        if (playerIndex < 100) {
          return isAttacker ? `Player ${playerIndex}` : `Character ${playerIndex}`;
        } else {
          return isAttacker ? `Creature ${playerIndex}` : `Enemy ${playerIndex}`;
        }
      };

      // Check if names are resolved
      const isNameResolved = (attackerInfo !== undefined || mainPlayerIndexNum <= 0) && 
                            (defenderInfo !== undefined || otherPlayerIndexNum <= 0);

      events.push({
        owner,
        contract: contractAddress,
        characterId,
        eventKey,
        blockNumber: absoluteBlockNumber.toString(),
        logIndex: logIndexNum,
        logType: logTypeNum,
        mainPlayerIndex: mainPlayerIndexNum,
        otherPlayerIndex: otherPlayerIndexNum,
        attackerName: attackerInfo?.name || getCharacterFallbackName(mainPlayerIndexNum, true),
        defenderName: defenderInfo?.name || getCharacterFallbackName(otherPlayerIndexNum, false),
        areaId: String(playerAreaId || 0n),
        hit: log.hit,
        critical: log.critical,
        damageDone: log.damageDone,
        healthHealed: log.healthHealed,
        targetDied: log.targetDied,
        lootedWeaponID: log.lootedWeaponID,
        lootedArmorID: log.lootedArmorID,
        experience: log.experience,
        value: String(log.value || '0'),
        isNameResolved,
        timestamp: blockTimestamp,
        storeTimestamp
      });

      // Process chat message if log type is Chat (4)
      if (logTypeNum === 4) {
        const senderInfo = attackerInfo;
        const messageContent = feed.chatLogs?.[chatLogArrayIndex];
        chatLogArrayIndex++;
        
        if (messageContent) {
          const messageKey = `${absoluteBlockNumber}-${logIndexNum}`;
          chatMessages.push({
            owner,
            contract: contractAddress,
            characterId,
            messageKey,
            blockNumber: absoluteBlockNumber.toString(),
            logIndex: logIndexNum,
            content: messageContent,
            senderId: senderInfo?.id || 'unknown-id',
            senderName: senderInfo?.name || 'Unknown',
            timestamp: blockTimestamp,
            storeTimestamp,
            isConfirmed: true
          });
        }
      }
    });
  }

  return { events, chatMessages };
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
  endBlock: bigint, // Add endBlock parameter
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
    mainPlayerCharacter,
    endBlock // Pass the actual endBlock from the UI snapshot
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

  // 5. Store in Dexie (persistence) - Use add() instead of put() to prevent overwriting
  try {
    await db.transaction('rw', db.dataBlocks, async () => {
      // Use add() to prevent overwriting existing blocks, or merge if they exist
      for (const blockToStore of blocksToStore) {
        const existingBlock = await db.dataBlocks
          .where('[owner+contract+characterId+block]')
          .equals([blockToStore.owner, blockToStore.contract, blockToStore.characterId, blockToStore.block])
          .first();

        if (existingBlock) {
          // Merge chats and events instead of overwriting
          const mergedChats = [...(existingBlock.chats || []), ...(blockToStore.chats || [])];
          const mergedEvents = [...(existingBlock.events || []), ...(blockToStore.events || [])];
          
          // Deduplicate by logIndex
          const uniqueChats = Array.from(
            new Map(mergedChats.map(chat => [`${chat.logIndex}`, chat])).values()
          );
          const uniqueEvents = Array.from(
            new Map(mergedEvents.map(event => [`${event.index}`, event])).values()
          );

          await db.dataBlocks.put({
            ...existingBlock,
            chats: uniqueChats,
            events: uniqueEvents,
            ts: Math.max(existingBlock.ts, blockToStore.ts) // Keep latest timestamp
          });
          console.log(`[storeFeedData] Merged block ${blockToStore.block}: ${uniqueChats.length} chats, ${uniqueEvents.length} events`);
        } else {
          await db.dataBlocks.add(blockToStore);
          console.log(`[storeFeedData] Added new block ${blockToStore.block}: ${blockToStore.chats.length} chats, ${blockToStore.events.length} events`);
        }
      }
    });
    console.log(`[storeFeedData] Successfully processed ${blocksToStore.length} blocks in Dexie`);
  } catch (txError) {
     console.error("[storeFeedData] Dexie transaction failed:", txError);
  }

  return processedNewBlocks;
};

/**
 * NEW: Store individual events and chat messages with event-level deduplication
 * Replaces block-level storage with granular event storage
 */
export const storeEventData = async (
  owner: string,
  characterId: string,
  dataFeeds: contract.DataFeed[],
  combatantsContext: CharacterLite[] | undefined,
  nonCombatantsContext: CharacterLite[] | undefined,
  currentBlockNumber: bigint,
  fetchTimestamp: number,
  playerAreaId?: bigint,
  mainPlayerCharacter?: contract.Character,
  endBlock?: bigint
): Promise<{ storedEvents: number, storedChatMessages: number }> => {
  if (!owner || !characterId || !dataFeeds || dataFeeds.length === 0) {
    return { storedEvents: 0, storedChatMessages: 0 };
  }

  // Process data feeds into individual events and chat messages
  const { events, chatMessages } = processDataFeedsToEvents(
    dataFeeds,
    combatantsContext,
    nonCombatantsContext,
    currentBlockNumber,
    fetchTimestamp,
    owner,
    characterId,
    playerAreaId,
    mainPlayerCharacter,
    endBlock
  );

  let storedEvents = 0;
  let storedChatMessages = 0;

  try {
    await db.transaction('rw', [db.events, db.chatMessages], async () => {
      // Store events with deduplication
      for (const event of events) {
        const existingEvent = await db.events
          .where('[owner+contract+characterId+eventKey]')
          .equals([event.owner, event.contract, event.characterId, event.eventKey])
          .first();

        if (!existingEvent) {
          await db.events.add(event);
          storedEvents++;
        } else if (!existingEvent.isNameResolved && event.isNameResolved) {
          // Update event with resolved names
          await db.events.put({ ...existingEvent, ...event });
          console.log(`[storeEventData] Updated event ${event.eventKey} with resolved names`);
        }
      }

      // Store chat messages with deduplication
      for (const chatMessage of chatMessages) {
        const existingMessage = await db.chatMessages
          .where('[owner+contract+characterId+messageKey]')
          .equals([chatMessage.owner, chatMessage.contract, chatMessage.characterId, chatMessage.messageKey])
          .first();

        if (!existingMessage) {
          await db.chatMessages.add(chatMessage);
          storedChatMessages++;
        }
      }
    });

    console.log(`[storeEventData] Stored ${storedEvents} new events and ${storedChatMessages} new chat messages`);
  } catch (error) {
    console.error('[storeEventData] Error storing event data:', error);
  }

  return { storedEvents, storedChatMessages };
};