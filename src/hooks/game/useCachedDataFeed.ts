import { useEffect, useState, useCallback } from 'react';
import { contract } from '../../types';
import { db, StoredDataBlock } from '../../lib/db'; // Import Dexie db instance
import { LogType } from '@/types/domain/enums'; // Import LogType
import { CharacterLite } from '@/types/domain'; // Import CharacterLite
import { estimateBlockTimestamp } from '@/utils/blockUtils'; // Import the new utility function

// Define SerializedEventLog based on contract.Log, converting BigInts
// Export needed types
export interface SerializedEventLog {
  logType: number;
  index: number;
  mainPlayerIndex: number;
  otherPlayerIndex: number;
  attackerName?: string;
  defenderName?: string;
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
 */
export const useCachedDataFeed = (owner: string | null) => {
  const [historicalBlocks, setHistoricalBlocks] = useState<CachedDataBlock[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    if (!owner) {
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
        const recentStoredBlocks = await db.dataBlocks
          .where('owner').equals(owner)
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

        // Purge expired blocks 
        const now = Date.now();
        const expirationTime = now - FEED_TTL;
        db.dataBlocks
            .where('owner').equals(owner) // Also scope purge to owner
            .and(item => item.ts < expirationTime)
            .delete()
            .then(deleteCount => {
                if (deleteCount > 0) {
                    // console.log(`[CachedDataFeed] Purged ${deleteCount} expired blocks for owner.`);
                }
            }).catch(err => {
                console.error("[CachedDataFeed] Error purging expired blocks:", err);
            });

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
  }, [owner]); 

  // Return the historical blocks and loading state.
  return {
    historicalBlocks, // Return the state variable
    isHistoryLoading,
  };
};

export const processDataFeedsToCachedBlocks = (
  dataFeeds: contract.DataFeed[],
  combatantsContext: CharacterLite[] | undefined,
  nonCombatantsContext: CharacterLite[] | undefined,
  currentBlockNumber: bigint, // Add currentBlockNumber parameter
  fetchTimestamp: number // Add fetchTimestamp parameter
): CachedDataBlock[] => {
  if (!dataFeeds || dataFeeds.length === 0) {
    return [];
  }

  // Get the current timestamp once for the whole batch processing
  // Use the provided fetchTimestamp as the reference point
  const currentTimestamp = fetchTimestamp;

  // Create lookup maps from context (index -> {id, name})
  const characterLookup = new Map<number, { id: string; name: string }>();
  (combatantsContext || []).forEach(c => characterLookup.set(c.index, { id: c.id, name: c.name }));
  (nonCombatantsContext || []).forEach(c => characterLookup.set(c.index, { id: c.id, name: c.name }));
  
  const processedBlocks: CachedDataBlock[] = [];

  for (const feed of dataFeeds) {
    if (!feed.blockNumber) continue;

    const blockNumber = BigInt(feed.blockNumber);

    // Use the utility function to estimate the timestamp
    const estimatedBlockTimestamp = estimateBlockTimestamp(
      currentBlockNumber, // lastBlock (reference block)
      currentTimestamp,   // lastBlockTimestamp (reference time)
      blockNumber         // lookupBlock (block to estimate for)
    );


    const serializedChatsForBlock: SerializedChatLog[] = [];
    const serializedEventsForBlock: SerializedEventLog[] = []; 

    // Process logs to find chat messages and map senders
    (feed.logs || []).forEach((log: contract.Log) => { // Removed unused logIndexInArray
      // Find participant names using the lookup map available NOW
      const attackerInfo = characterLookup.get(Number(log.mainPlayerIndex));
      const defenderInfo = characterLookup.get(Number(log.otherPlayerIndex));

      // Map general event log data, including names
      const eventLog: SerializedEventLog = {
        logType: log.logType,
        index: log.index,
        mainPlayerIndex: log.mainPlayerIndex,
        otherPlayerIndex: log.otherPlayerIndex,
        attackerName: attackerInfo?.name,
        defenderName: defenderInfo?.name,
        hit: log.hit,
        critical: log.critical,
        damageDone: log.damageDone,
        healthHealed: log.healthHealed,
        targetDied: log.targetDied,
        lootedWeaponID: log.lootedWeaponID,
        lootedArmorID: log.lootedArmorID,
        experience: log.experience,
        value: String(log.value || '0')
      };
      serializedEventsForBlock.push(eventLog);

      // If it's a chat log, extract sender and find message
      if (Number(log.logType) === LogType.Chat) { // Compare as numbers
        const senderIndex = Number(log.mainPlayerIndex);
        const senderInfo = characterLookup.get(senderIndex);
        
        // Find corresponding chat string - REVISIT THIS ASSUMPTION
        const messageContent = feed.chatLogs?.[Number(log.index)]; 
        
        if (messageContent) { 
          serializedChatsForBlock.push({
            logIndex: Number(log.index),
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
        blockNumber: blockNumber, 
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
 * @param dataFeeds - dataFeeds to store
 * @param combatantsContext - combatantsContext to store
 * @param nonCombatantsContext - nonCombatantsContext to store
 * @param currentBlockNumber - currentBlockNumber to store
 * @param fetchTimestamp - fetchTimestamp to store
 * @returns 
 */
export const storeFeedData = async (
  owner: string,
  dataFeeds: contract.DataFeed[],
  combatantsContext: CharacterLite[] | undefined,
  nonCombatantsContext: CharacterLite[] | undefined,
  currentBlockNumber: bigint, // Add currentBlockNumber parameter
  fetchTimestamp: number // Add fetchTimestamp parameter
) => {
  if (!owner || !dataFeeds || dataFeeds.length === 0) {
    return; // No owner or data to store
  }

  // 1. Process the feeds using the new utility function
  const processedBlocks = processDataFeedsToCachedBlocks(
    dataFeeds,
    combatantsContext,
    nonCombatantsContext,
    currentBlockNumber, 
    fetchTimestamp
  );

  // 2. Transform processed blocks into the format needed for Dexie (StoredDataBlock)
  const blocksToStore: StoredDataBlock[] = processedBlocks.map(block => ({
    owner: owner,
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