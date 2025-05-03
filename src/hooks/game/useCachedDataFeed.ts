import { useEffect, useState } from 'react';
import localforage from 'localforage';
import { contract } from '../../types';
import { useBattleNadsClient } from '../contracts/useBattleNadsClient';

// Define SerializedEventLog based on contract.Log, converting BigInts
interface SerializedEventLog {
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
interface SerializedChatLog {
  // sender: string;       // Sender (wallet address or character name) - REMOVE
  content: string;      // Raw Message content string
  timestamp: string;    // Block timestamp as string
}

// RENAME CachedChatBlock to CachedDataBlock and add events field
export type CachedDataBlock = {
  block: string | bigint;  // canonical block number (string in storage, bigint when returned)
  ts: number;              // Date.now() when we stored it
  chats: SerializedChatLog[]
  events: SerializedEventLog[]; // Add events array
};

// Constants
const FEED_CACHE = 'bn-feed-cache';          // localForage store name (RENAMED)
const FEED_TTL = 1000 * 60 * 60;             // 1 hour in ms (RENAMED for consistency)
const BLOCKS_PER_MINUTE = 2;
const DEFAULT_MINUTES_WINDOW = 10;

// Helper to get the owner-specific localStorage key for the last processed block
const getLastFeedBlockKey = (owner: string) => `bn-last-feed-block:${owner}`; // RENAMED function and key pattern

// Initialize localForage
localforage.config({
  name: FEED_CACHE, // Use renamed constant
  storeName: FEED_CACHE, // Use renamed constant
  description: 'Battle Nads data feed cache' // Updated description
});

/**
 * Hook to manage cached chat/event logs (DataFeed components) with seamless incremental fetching
 */
export const useCachedDataFeed = (owner: string | null) => {
  const { client } = useBattleNadsClient();
  const [cachedBlocks, setCachedBlocks] = useState<CachedDataBlock[]>([]); 
  const [latestBlock, setLatestBlock] = useState<bigint>(BigInt(0));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // console.log("[CachedDataFeed Effect] Running effect. Owner:", owner, "Client available:", !!client);

    // Skip if no owner or client
    if (!owner || !client) {
      setCachedBlocks([]);
      setLatestBlock(BigInt(0));
      setIsLoading(false);
      return;
    }

    // Load and update cache
    const updateCache = async () => {
      // console.log("[CachedDataFeed UpdateCache] Starting updateCache..."); // Log start of function
      try {
        setIsLoading(true);
        
        // 1. Get current block
        const currentBlock = await client.getLatestBlockNumber();
        
        // 2. Calculate default block window
        const defaultBlockWindow = BigInt(BLOCKS_PER_MINUTE * 60 * DEFAULT_MINUTES_WINDOW);
        
        // 3. Get last fetched block from localStorage
        const lastBlockKey = getLastFeedBlockKey(owner); // Use renamed function
        const storedLastBlock = localStorage.getItem(lastBlockKey);
        
        // 4. Calculate start block
        let startBlock: bigint;
        if (!storedLastBlock) {
          // Cold start: use default window
          startBlock = currentBlock - defaultBlockWindow;
        } else {
          // Incremental: continue from last block + 1
          const lastFetchedBlock = BigInt(storedLastBlock);
          
          // Ensure we don't request too many blocks if there's a large gap
          if (currentBlock - lastFetchedBlock > defaultBlockWindow) {
            startBlock = currentBlock - defaultBlockWindow;
          } else {
            startBlock = lastFetchedBlock + BigInt(1);
          }
        }
        
        // 5. Get stored blocks and purge expired ones
        // Update type for stored blocks
        const storedBlocks: CachedDataBlock[] = []; 
        const now = Date.now();
        
        // Get all keys in the store
        const keys = await localforage.keys();
        
        // Filter owner-specific blocks
        const ownerPrefix = `${owner}:`;
        const ownerKeys = keys.filter(key => key.startsWith(ownerPrefix));
        
        // Load and filter blocks by TTL
        for (const key of ownerKeys) {
          // Update type for getItem
          const block = await localforage.getItem<CachedDataBlock>(key);
          if (block) {
            if (now - block.ts <= FEED_TTL) { // Use renamed TTL constant
              storedBlocks.push(block);
            } else {
              await localforage.removeItem(key);
            }
          }
        }
        
        // 6. Only fetch if we need to (current block > last fetched block)
        if (startBlock < currentBlock) {
          try {
            // Fetch data feeds for the block range
            const dataFeeds = await client.getDataFeed(owner, startBlock, currentBlock);
            
            // Process and store each data feed
            let blockStorageSuccess = true; 
            for (const feed of dataFeeds) {
              // console.log('[CacheChat] Processing feed for block:', feed.blockNumber?.toString()); // Log feed block
              // Check if there are chats OR events to process
              if (feed.blockNumber && ((feed.chatLogs && feed.chatLogs.length > 0) || (feed.logs && feed.logs.length > 0))) { 
                const blockNumber = BigInt(feed.blockNumber);
                
                // --- Process Chats --- 
                const serializedChats = (feed.chatLogs || []).map(chatString => {
                  const chatLogEntry: SerializedChatLog = { 
                    content: chatString, 
                    timestamp: blockNumber.toString()
                  };
                  return chatLogEntry;
                });
                
                // --- Process Events --- 
                const serializedEvents = (feed.logs || []).map((log: contract.Log) => {
                  const eventLogEntry: SerializedEventLog = {
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
                    value: String(log.value || '0') // Convert BigInt to string
                  };
                  return eventLogEntry;
                });

                // Update type for the new block object
                const newDataBlock: CachedDataBlock = { 
                  block: blockNumber.toString(), 
                  ts: Date.now(),
                  chats: serializedChats,
                  events: serializedEvents // Add serialized events
                };
                
                // Store in IndexedDB
                const key = `${owner}:${blockNumber.toString()}`;
                try {
                  // console.log(`[CacheChat] Attempting to store block: ${key}`); // Log before storing
                  await localforage.setItem(key, newDataBlock); // Store the new block structure
                  // console.log(`[CacheChat] Successfully stored block: ${key}`); // Log after successful store
                  // Add to state (only if stored successfully)
                  storedBlocks.push(newDataBlock);
                } catch (storageError) {
                  console.error(`[CachedDataFeed] Failed to store block ${key}:`, storageError);
                  blockStorageSuccess = false; 
                }
              }
            }
            
            // Update last fetched block in localStorage ONLY if all blocks in range stored successfully
            if (blockStorageSuccess) {
              localStorage.setItem(lastBlockKey, currentBlock.toString());
              // console.log(`[CacheChat] Updated lastBlockKey for ${owner} to ${currentBlock.toString()}`);
            } else {
              // console.warn(`[CacheChat] Did not update lastBlockKey for ${owner} due to storage errors in the range.`);
            }

          } catch (error) {
            // console.error('[CacheChat] Error fetching data feeds:', error);
            // On error, still use cached blocks, DO NOT update lastBlockKey
          }
        }
        
        // 7. Sort blocks by block number (ascending)
        storedBlocks.sort((a, b) => {
          const blockA = BigInt(a.block);
          const blockB = BigInt(b.block);
          return blockA < blockB ? -1 : 1;
        });
        
        // Update state
        setCachedBlocks(storedBlocks);
        setLatestBlock(currentBlock);
      } catch (error) {
        console.error('Error in useCachedDataFeed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    updateCache();
  }, [owner, client]);

  // Convert serialized blocks back to expected format when returning
  // Adjust this final mapping as needed - for now, it returns CachedDataBlock[]
  const deserializedBlocks = cachedBlocks.map(block => {
    // Convert block number back to BigInt
    const blockBigInt = block.block ? BigInt(block.block) : BigInt(0);
    // Note: Events remain as SerializedEventLog[] here.
    // The consumer (useUiSnapshot) will handle mapping them back to contract.Log if needed.
    return {
      ...block,
      block: blockBigInt,
      // Chats deserialization might need adjustment if downstream expects domain.ChatMessage
      // For now, keeping it simple - assuming consumer handles it or type changes later
      chats: block.chats, // Already SerializedChatLog[]
      events: block.events // Already SerializedEventLog[] 
    };
  });

  return {
    // Return the processed blocks (containing SerializedEventLog)
    blocks: deserializedBlocks, 
    latest: latestBlock,
    isLoading
  };
};