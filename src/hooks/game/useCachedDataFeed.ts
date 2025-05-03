import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { contract } from '../../types';
import { useBattleNadsClient } from '../contracts/useBattleNadsClient';
import { db, StoredDataBlock } from '../../lib/db'; // Import Dexie db instance

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

// Return type still aims to match the old CachedDataBlock structure for compatibility
// with useUiSnapshot mapping logic
export interface CachedDataBlock { 
  block: bigint; 
  ts: number;
  chats: SerializedChatLog[];
  events: SerializedEventLog[];
}

// Constants
// Removed: const FEED_CACHE = 'bn-feed-cache';
const FEED_TTL = 1000 * 60 * 60; // 1 hour in ms 
const BLOCKS_PER_MINUTE = 2;
const DEFAULT_MINUTES_WINDOW = 10;

// Helper to get the owner-specific localStorage key for the last processed block
const getLastFeedBlockKey = (owner: string) => `bn-last-feed-block:${owner}`; // RENAMED function and key pattern

// Removed: localforage config and driver logging

/**
 * Hook to manage cached data feed blocks using Dexie
 */
export const useCachedDataFeed = (owner: string | null) => {
  const { client } = useBattleNadsClient();
  const queryClient = useQueryClient();
  const [cachedBlocks, setCachedBlocks] = useState<CachedDataBlock[]>([]); // Still returns this type
  const [latestBlock, setLatestBlock] = useState<bigint>(BigInt(0));
  const [isLoading, setIsLoading] = useState(true);
  // Removed: const [storageErrorOccurred, setStorageErrorOccurred] = useState(false);

  useEffect(() => {
    // Removed: Early bailout for storageErrorOccurred
    
    if (!owner || !client) {
      setCachedBlocks([]);
      setLatestBlock(BigInt(0));
      setIsLoading(false);
      return;
    }

    const updateCache = async () => {
      try {
        // 1. Get current block number from client
        const currentBlock = await client.getLatestBlockNumber();
        setLatestBlock(currentBlock);

        // 2. Purge expired blocks using Dexie index
        const now = Date.now();
        const expirationTime = now - FEED_TTL;
        const expiredKeys = await db.dataBlocks
          .where('ts').below(expirationTime)
          .primaryKeys();
        if (expiredKeys.length > 0) {
          console.log(`[CachedDataFeed] Purging ${expiredKeys.length} expired blocks...`);
          await db.dataBlocks.bulkDelete(expiredKeys);
        }

        // 3. Get all currently stored blocks for the owner
        const storedBlocks = await db.dataBlocks.where('owner').equals(owner).toArray();

        // 4. Determine the latest block stored for this owner
        let lastStoredBlockNum = 0n;
        if (storedBlocks.length > 0) {
          lastStoredBlockNum = storedBlocks.reduce((max, block) => {
            const blockNum = BigInt(block.block);
            return blockNum > max ? blockNum : max;
          }, 0n);
        }
        
        // 5. Calculate fetch range (startBlock)
        const defaultBlockWindow = BigInt(BLOCKS_PER_MINUTE * 60 * DEFAULT_MINUTES_WINDOW);
        let startBlock: bigint;
        if (lastStoredBlockNum === 0n) {
          // Cold start
          startBlock = currentBlock - defaultBlockWindow;
        } else {
          // Incremental fetch
          startBlock = lastStoredBlockNum + 1n;
          // Apply lookback window limit if gap is too large
          if (currentBlock - lastStoredBlockNum > defaultBlockWindow) {
            startBlock = currentBlock - defaultBlockWindow;
          }
        }
        // Ensure startBlock is not negative
        startBlock = startBlock < 0n ? 0n : startBlock; 

        // Declare blocksToStore here to make it accessible later
        let blocksToStore: StoredDataBlock[] = [];

        // 6. Fetch new data if needed
        if (startBlock <= currentBlock) {
          const dataFeeds = await client.getDataFeed(owner, startBlock, currentBlock);
          
          // 7. Prepare blocks for Dexie storage
          for (const feed of dataFeeds) {
            if (feed.blockNumber && ((feed.chatLogs && feed.chatLogs.length > 0) || (feed.logs && feed.logs.length > 0))) {
              const blockNumber = BigInt(feed.blockNumber);
              const serializedChats = (feed.chatLogs || []).map(chatString => ({
                content: chatString,
                timestamp: blockNumber.toString()
              }));
              const serializedEvents = (feed.logs || []).map((log: contract.Log) => ({
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
              }));

              blocksToStore.push({ 
                owner: owner, // Add owner for compound key
                block: blockNumber.toString(), // Use string for compound key
                ts: Date.now(),
                chats: serializedChats,
                events: serializedEvents
              });
            }
          }
          
          // 8. Store new blocks in Dexie
          if (blocksToStore.length > 0) {
            // --- Wrap write in explicit transaction ---
            try {
              await db.transaction('rw', db.dataBlocks, async () => {
                // Operations within this block are transactional
                await db.dataBlocks.bulkPut(blocksToStore);
                // console.log(`[CachedDataFeed] Dexie transaction: Stored ${blocksToStore.length} new blocks.`);

                // Optional: Verify read WITHIN the transaction
                const firstStoredKey = { owner: owner, block: blocksToStore[0].block };
                const verifyRead = await db.dataBlocks.get(firstStoredKey);
                // console.log(`[CachedDataFeed] Dexie transaction: Verification read for block ${firstStoredKey.block}:`, verifyRead ? 'Found' : 'NOT FOUND');
              
              }); // Transaction commits here if no errors were thrown

              // Invalidation happens AFTER successful transaction commit
              queryClient.invalidateQueries({ queryKey: ['uiSnapshot', owner] });
              // console.log(`[CachedDataFeed] Invalidated uiSnapshot query for owner: ${owner} after successful transaction.`);

              // --- Update In-Memory State --- 
              // Convert the newly stored blocks back to the CachedDataBlock format for the state
              const newlyDeserializedBlocks = blocksToStore.map(stored => ({
                  block: BigInt(stored.block),
                  ts: stored.ts,
                  chats: stored.chats,
                  events: stored.events
              }));
              
              setCachedBlocks(prevBlocks => {
                // Combine previous blocks and newly added ones
                const combined = [...prevBlocks, ...newlyDeserializedBlocks];
                
                // Apply TTL purging to the combined in-memory array
                const now = Date.now();
                const expirationTime = now - FEED_TTL;
                const purged = combined.filter(block => block.ts >= expirationTime);
                
                // Sort the final, purged blocks by block number
                purged.sort((a, b) => (a.block < b.block ? -1 : 1));
                // console.log(`[CachedDataFeed] Updating in-memory state with ${newlyDeserializedBlocks.length} new blocks, ${purged.length} total after purge.`);
                return purged;
              });
              // --- End Update In-Memory State ---

              /* // Update local state *after* successful transaction and invalidation (OLD WAY)
              storedBlocks.push(...blocksToStore); */

            } catch (txError) {
               console.error("[CachedDataFeed] Dexie transaction failed:", txError);
               // Rethrow the error to ensure the calling code knows the transaction failed
               throw txError; 
               // Handle transaction error - maybe don't invalidate or update local state?
               // For now, we will let the process continue and potentially use stale local state,
               // but ideally, more robust error handling would go here.
            }
            // --- End transaction wrap ---

            /* // ---> Verify write immediately (Moved inside transaction)
            const firstStoredKey = { owner: owner, block: blocksToStore[0].block };
            const verifyRead = await db.dataBlocks.get(firstStoredKey);
            console.log(`[CachedDataFeed] Verification read for block ${firstStoredKey.block}:`, verifyRead ? 'Found' : 'NOT FOUND');
            // <--- End verification

            // ---> Invalidate uiSnapshot query after successful cache write (Moved after transaction)
            queryClient.invalidateQueries({ queryKey: ['uiSnapshot', owner] });
            console.log(`[CachedDataFeed] Invalidated uiSnapshot query for owner: ${owner}`);
            // Combine newly stored blocks with previously stored ones for the current state
            // This avoids needing a second read query immediately after writing
            storedBlocks.push(...blocksToStore); */
          }
        }
        
        // 9. Prepare final state (convert StoredDataBlock back to CachedDataBlock format for consumer)
        // THIS SECTION IS NOW ONLY FOR INITIAL LOAD or if no new blocks were fetched
        const initialDeserializedBlocks = storedBlocks
            .filter(block => block.ts >= (Date.now() - FEED_TTL)) // Apply TTL filter here too for initial load
            .map(stored => ({
                block: BigInt(stored.block),
                ts: stored.ts,
                chats: stored.chats,
                events: stored.events
            }));
        
        // Sort final blocks by block number (ascending)
        initialDeserializedBlocks.sort((a, b) => {
          return a.block < b.block ? -1 : 1;
        });

        // Only set state if it hasn't potentially been updated by the new block logic already
        // Check if blocksToStore had content; if so, state was likely updated already.
        if (!(blocksToStore && blocksToStore.length > 0)) {
            // console.log(`[CachedDataFeed] Setting initial/unchanged state with ${initialDeserializedBlocks.length} blocks.`);
            setCachedBlocks(initialDeserializedBlocks);
        }

      } catch (error) {
        console.error('Error in useCachedDataFeed updateCache:', error);
        setCachedBlocks([]); // Clear cache on error
        // Optionally, still try to set latestBlock if possible
        client?.getLatestBlockNumber().then(setLatestBlock).catch(console.error); 
      } finally {
        setIsLoading(false);
      }
    };

    updateCache();
  // Dependencies: owner and client. Rerun when they change.
  }, [owner, client]); 

  // Return value remains compatible with useUiSnapshot's expectations
  return {
    blocks: cachedBlocks, 
    latest: latestBlock,
    isLoading
  };
};