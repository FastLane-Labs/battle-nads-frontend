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
  // sender: string;       // Sender (wallet address or character name) - REMOVE
  content: string;      // Raw Message content string
  timestamp: string;    // Block timestamp as string
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
 * Loads initial historical blocks from Dexie and handles purging.
 * Does NOT perform network fetches itself anymore.
 */
export const useCachedDataFeed = (owner: string | null) => {
  const [cachedBlocks, setCachedBlocks] = useState<CachedDataBlock[]>([]);
  // Removed: latestBlock state
  const [isHistoryLoading, setIsHistoryLoading] = useState(true); // Renamed from isLoading
  // Removed: storageErrorOccurred state

  // --- Function to load recent blocks into state --- 
  const loadRecentBlocksIntoState = useCallback(async (owner: string) => {
    // Removed: console.time
    setIsHistoryLoading(true); 

    try {
      
      // Query Dexie for ALL blocks for the owner, ordered descending by block
      const recentStoredBlocks = await db.dataBlocks
        .where('owner').equals(owner)
        .reverse() // Get newest first (relative order)
        .sortBy('blockNumber'); // Sort ascending by block number before mapping

      const deserializedBlocks = recentStoredBlocks.map(stored => ({
        blockNumber: BigInt(stored.block),
        timestamp: stored.ts,
        chats: stored.chats,
        events: stored.events
      }));
      
      setCachedBlocks(deserializedBlocks);
    } catch (error) {
      console.error('[CachedDataFeed] Error loading recent blocks from Dexie:', error);
      setCachedBlocks([]); // Clear cache on error
    } finally {
      setIsHistoryLoading(false); 
      // Removed: console.timeEnd
    }
  }, []); // No dependencies needed for this function itself
  // ------------------------------------------------

  // Effect for initial load from Dexie and purging
  useEffect(() => {
    let isMounted = true;
    if (!owner) { // Removed client check here, only owner needed for Dexie ops
      if (isMounted) {
        setCachedBlocks([]);
        // Removed: setLatestBlock(BigInt(0));
        setIsHistoryLoading(false); // Ensure loading is false if no owner
      }
      return;
    }

    const initialLoadAndPurge = async () => {
      if (!isMounted) return;
      
      // 1. Load initial historical data from Dexie
      await loadRecentBlocksIntoState(owner); // Await the initial load

      // 2. Purge expired blocks (can run async without blocking the main flow)
      // This runs independently in the background
      const now = Date.now();
      const expirationTime = now - FEED_TTL;
      db.dataBlocks
        .where('ts').below(expirationTime)
        .delete()
        .then(deleteCount => {
            // Removed: Purge count log
        }).catch(err => {
            // Removed: Purge error log 
        });

      // NOTE: No network fetch (getDataFeed) or storage (bulkPut) happens here anymore.
      // The 'isLoading duration' timer was removed as it measured the removed network fetch.
    };

    initialLoadAndPurge();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  // Dependencies: owner. Rerun when owner changes. loadRecentBlocksIntoState is stable.
  }, [owner, loadRecentBlocksIntoState]); 

  // Return only the historical blocks and the loading state for that history
  return {
    historicalBlocks: cachedBlocks, // Renamed blocks to historicalBlocks for clarity
    isHistoryLoading // Expose the loading state related to Dexie history read
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
  // const currentTimestamp = Date.now();
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
    // -------------------------------------


    const serializedChatsForBlock: SerializedChatLog[] = [];
    const serializedEventsForBlock: SerializedEventLog[] = []; 

    // Process logs to find chat messages and map senders
    (feed.logs || []).forEach((log: contract.Log) => { // Removed unused logIndexInArray
      // Map general event log data
      const eventLog: SerializedEventLog = {
        logType: log.logType,
        index: log.index,
        mainPlayerIndex: log.mainPlayerIndex,
        otherPlayerIndex: log.otherPlayerIndex,
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
            content: messageContent,
            // Use the blockTimestamp derived earlier
            // timestamp: blockTimestamp.toString(), // Store timestamp string matching interface
            // Use the ESTIMATED timestamp for the chat message object itself
            // Note: Consider if the ChatMessage domain type should store block number instead/as well
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
        // timestamp: blockTimestamp, // Use the derived numeric timestamp
        // Use the ESTIMATED timestamp for the CachedDataBlock (used for Dexie TTL)
        timestamp: estimatedBlockTimestamp,
        chats: serializedChatsForBlock,
        events: serializedEventsForBlock 
      });
    }
  }
  return processedBlocks;
};
// --- End Utility Function ---


// --- Utility function to store feed data (can be called from useUiSnapshot) ---
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
    currentBlockNumber, // Pass currentBlockNumber down
    fetchTimestamp // Pass fetchTimestamp down
  );

  // 2. Transform processed blocks into the format needed for Dexie (StoredDataBlock)
  const blocksToStore: StoredDataBlock[] = processedBlocks.map(block => ({
    owner: owner,
    block: block.blockNumber.toString(), // Store block number as string
    ts: block.timestamp, // Store numeric timestamp // Store the estimated numeric timestamp
    chats: block.chats, // Already in correct format
    events: block.events // Already in correct format
  }));


  // 3. Store in Dexie
  if (blocksToStore.length > 0) {
    console.log(`[storeFeedData] Storing ${blocksToStore.length} processed blocks to Dexie...`); // Updated log message
    try {
      await db.transaction('rw', db.dataBlocks, async () => {
        await db.dataBlocks.bulkPut(blocksToStore);
      });
    } catch (txError) {
       console.error("[storeFeedData] Dexie transaction failed:", txError);
    }
  }
};
// --- End Store Utility Function ---