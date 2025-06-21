import { useEffect, useState, useCallback } from 'react';
import { contract } from '../../types';
import { db, StoredEvent, StoredChatMessage } from '../../lib/db'; // Import Dexie db instance
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
 * Hook to manage cached data feed blocks using event-level storage with Dexie persistence.
 * Loads initial cached events from event-level storage with fallback to legacy block storage.
 * Provides backward-compatible interface for historical blocks display.
 */
export const useCachedDataFeed = (owner: string | null, characterId: string | null) => {
  const [inMemoryEvents, setInMemoryEvents] = useState<CachedDataBlock[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    if (!owner || !characterId) {
      if (isMounted) {
        setInMemoryEvents([]); 
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

          if (isMounted) {
            setInMemoryEvents(deserializedBlocks);
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

            if (isMounted) {
              setInMemoryEvents(deserializedBlocks);
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


  // Return the in-memory events and loading state, plus utility functions
  return {
    historicalBlocks: inMemoryEvents, // Keep same interface for compatibility
    isHistoryLoading,
    getAllCharactersForOwner, // For character switching UI
    getDataSummaryForOwner,   // For showing data availability per character
  };
};

/**
 * Process individual events from data feeds for event-level storage
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
  
  console.log(`[processDataFeedsToEvents] Processing ${dataFeeds.length} data feeds`);
  
  // Log the structure of the first data feed for debugging
  if (dataFeeds.length > 0) {
    const firstFeed = dataFeeds[0];
    console.log(`[processDataFeedsToEvents] First feed: block ${firstFeed.blockNumber}, logs: ${firstFeed.logs?.length || 0}, chatLogs: ${firstFeed.chatLogs?.length || 0}`);
    if (firstFeed.logs && firstFeed.logs.length > 0) {
      console.log(`[processDataFeedsToEvents] First log type: ${firstFeed.logs[0].logType}`);
    }
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
        console.log(`[processDataFeedsToEvents] Found chat log type 4, chatLogArrayIndex: ${chatLogArrayIndex}, chatLogs length: ${feed.chatLogs?.length || 0}`);
        const senderInfo = attackerInfo;
        const messageContent = feed.chatLogs?.[chatLogArrayIndex];
        chatLogArrayIndex++;
        
        if (messageContent) {
          const messageKey = `${absoluteBlockNumber}-${logIndexNum}`;
          console.log(`[processDataFeedsToEvents] Adding chat message: "${messageContent}" with key: ${messageKey}`);
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
        } else {
          console.log(`[processDataFeedsToEvents] Chat log type 4 found but no message content at index ${chatLogArrayIndex - 1}`);
        }
      }
    });
  }

  console.log(`[processDataFeedsToEvents] Finished processing: ${events.length} events, ${chatMessages.length} chat messages`);
  return { events, chatMessages };
};

/**
 * Store individual events and chat messages with event-level deduplication
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