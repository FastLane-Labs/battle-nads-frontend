import { useEffect, useState } from 'react';
import localforage from 'localforage';
import { contract } from '../../types';
import { useBattleNadsClient } from '../contracts/useBattleNadsClient';

// Create a SerializedChatLog type to match what we store
interface SerializedChatLog {
  sender: string;       // Sender (wallet address or character name)
  content: string;      // Message content
  timestamp: string;    // Block timestamp as string
}

// Cached chat block schema
export type CachedChatBlock = {
  block: string | bigint;  // canonical block number (string in storage, bigint when returned)
  ts: number;              // Date.now() when we stored it
  chats: SerializedChatLog[]
};

// Constants
const CHAT_CACHE = 'bn-chat-cache';          // localForage store name
const CHAT_TTL = 1000 * 60 * 60;             // 1 hour in ms
const BLOCKS_PER_MINUTE = 2;
const DEFAULT_MINUTES_WINDOW = 10;

// Helper to get the owner-specific localStorage key
const getLastBlockKey = (owner: string) => `bn-last-chat-block:${owner}`;

// Initialize localForage
localforage.config({
  name: CHAT_CACHE,
  storeName: CHAT_CACHE,
  description: 'Battle Nads chat log cache'
});

/**
 * Hook to manage cached chat logs with seamless incremental fetching
 */
export const useCachedChatLogs = (owner: string | null) => {
  const { client } = useBattleNadsClient();
  const [cachedBlocks, setCachedBlocks] = useState<CachedChatBlock[]>([]);
  const [latestBlock, setLatestBlock] = useState<bigint>(BigInt(0));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Skip if no owner or client
    if (!owner || !client) {
      setCachedBlocks([]);
      setLatestBlock(BigInt(0));
      setIsLoading(false);
      return;
    }

    // Load and update cache
    const updateCache = async () => {
      try {
        setIsLoading(true);
        
        // 1. Get current block
        const currentBlock = await client.getLatestBlockNumber();
        
        // 2. Calculate default block window
        const defaultBlockWindow = BigInt(BLOCKS_PER_MINUTE * 60 * DEFAULT_MINUTES_WINDOW);
        
        // 3. Get last fetched block from localStorage
        const lastBlockKey = getLastBlockKey(owner);
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
        const storedBlocks: CachedChatBlock[] = [];
        const now = Date.now();
        
        // Get all keys in the store
        const keys = await localforage.keys();
        
        // Filter owner-specific blocks
        const ownerPrefix = `${owner}:`;
        const ownerKeys = keys.filter(key => key.startsWith(ownerPrefix));
        
        // Load and filter blocks by TTL
        for (const key of ownerKeys) {
          const block = await localforage.getItem<CachedChatBlock>(key);
          if (block) {
            if (now - block.ts <= CHAT_TTL) {
              storedBlocks.push(block);
            } else {
              // Remove expired blocks
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
            for (const feed of dataFeeds) {
              if (feed.blockNumber && feed.chatLogs && feed.chatLogs.length > 0) {
                const blockNumber = BigInt(feed.blockNumber);
                
                // DataFeed contains chatLogs as an array of strings, not ChatLog objects
                // we need to convert them to an intermediate format we can store
                const serializedChats = feed.chatLogs.map(chatString => {
                  // Try to parse the content to extract character name - same logic as in the mapper
                  let characterName = "";
                  let message = chatString;
                  
                  if (chatString && chatString.includes(":")) {
                    const colonIndex = chatString.indexOf(":");
                    characterName = chatString.substring(0, colonIndex).trim();
                    message = chatString.substring(colonIndex + 1).trim();
                  } else {
                    characterName = "System";
                  }
                  
                  // Create a compatible object for storage
                  return {
                    sender: characterName, // The sender is the character name parsed from the message
                    content: message,
                    timestamp: blockNumber.toString(),
                    realTimestamp: Date.now() // Store when we processed this message
                  };
                });
                
                const newBlock: CachedChatBlock = {
                  block: blockNumber.toString(), // Store as string to avoid BigInt serialization issues
                  ts: Date.now(),
                  chats: serializedChats
                };
                
                // Store in IndexedDB
                const key = `${owner}:${blockNumber.toString()}`;
                await localforage.setItem(key, newBlock);
                
                // Add to state
                storedBlocks.push(newBlock);
              }
            }
            
            // Update last fetched block in localStorage
            localStorage.setItem(lastBlockKey, currentBlock.toString());
          } catch (error) {
            console.error('Error fetching data feeds:', error);
            // On error, still use cached blocks
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
        console.error('Error in useCachedChatLogs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    updateCache();
  }, [owner, client]);

  // Convert serialized blocks back to expected format when returning
  const deserializedBlocks = cachedBlocks.map(block => {
    return {
      ...block,
      // Convert string block back to BigInt
      block: block.block ? BigInt(block.block) : BigInt(0),
      chats: block.chats.map(chat => {
        // Ensure chat timestamp is BigInt if it's stored as a string
        if (typeof chat.timestamp === 'string') {
          return {
            ...chat,
            timestamp: BigInt(chat.timestamp || Date.now()),
          };
        }
        // If it's not a string but might be undefined, ensure we have a valid BigInt
        if (chat.timestamp === undefined || chat.timestamp === null) {
          return {
            ...chat,
            timestamp: Date.now(),
          };
        }
        return chat;
      })
    };
  });

  return {
    blocks: deserializedBlocks,
    latest: latestBlock,
    isLoading
  };
};

export default useCachedChatLogs;