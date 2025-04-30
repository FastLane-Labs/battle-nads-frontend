import { useQuery } from '@tanstack/react-query';
import { useBattleNadsClient } from '../contracts/useBattleNadsClient';
import { contract } from '../../types';
import { POLL_INTERVAL } from '../../config/env';
import useCachedChatLogs, { CachedChatBlock } from './useCachedChatLogs';

/**
 * Hook for polling UI snapshot data from the blockchain
 * Uses React-Query for caching and deduplication of requests
 * Returns raw contract data with dataFeeds as the source of truth
 * Integrates cached chat logs from useCachedChatLogs
 */
export const useUiSnapshot = (owner: string | null) => {
  const { client } = useBattleNadsClient();
  const { latest: latestCachedBlock, blocks: cachedChatBlocks } = useCachedChatLogs(owner);

  return useQuery<contract.PollFrontendDataReturn, Error>({
    queryKey: ['uiSnapshot', owner],
    enabled: !!owner && !!client,
    staleTime: POLL_INTERVAL,
    refetchInterval: POLL_INTERVAL,
    
    queryFn: async () => {
      if (!client || !owner) throw new Error('Missing client or owner');
      
      const startBlock = latestCachedBlock > 0n
        ? latestCachedBlock + 1n
        : (await client.getLatestBlockNumber()) - 2n * 60n * 10n;
        
      // Get the raw array data
      const rawArrayData = await client.getUiSnapshot(owner, startBlock);

      // --- VALIDATE AND MAP ARRAY TO OBJECT ---
      // Check if the received data is NOT an array
      if (!Array.isArray(rawArrayData)) {
        console.error("[useUiSnapshot] Expected array from getUiSnapshot, received:", rawArrayData);
        // Attempt to use it directly if it might already be the correct object structure
        if (typeof rawArrayData === 'object' && rawArrayData !== null && 'characterID' in rawArrayData) {
           console.warn("[useUiSnapshot] Received object instead of array, attempting to use directly.");
           // If it looks like the correct object, we might try returning it directly
           // NOTE: This path assumes the chat merging logic below is not needed or handled differently
           // For now, let's just proceed cautiously, but ideally the source returns consistently.
           // Consider if returning rawArrayData directly here is the right recovery.
           // For safety, we will still throw an error for now to enforce consistency.
           throw new Error("Inconsistent data structure: Received object instead of array.");
        } else {
          // If it's neither an array nor the expected object, it's an unknown structure
          throw new Error("Invalid data structure received from getUiSnapshot");
        }
      }
      
      // --- At this point, rawArrayData is confirmed to be an array ---

      // Explicitly map array elements to named fields based on PollFrontendDataReturn order
      let mappedData: contract.PollFrontendDataReturn;
      try {
        mappedData = {
          characterID: rawArrayData[0],
          sessionKeyData: rawArrayData[1],
          character: rawArrayData[2],
          combatants: rawArrayData[3],
          noncombatants: rawArrayData[4],
          equipableWeaponIDs: rawArrayData[5],
          equipableWeaponNames: rawArrayData[6],
          equipableArmorIDs: rawArrayData[7],
          equipableArmorNames: rawArrayData[8],
          dataFeeds: rawArrayData[9], // Assuming dataFeeds is at index 9
          balanceShortfall: rawArrayData[10],
          unallocatedAttributePoints: rawArrayData[11],
          endBlock: rawArrayData[12],
          movementOptions: { 
            canMoveNorth: false, canMoveSouth: false, canMoveEast: false, 
            canMoveWest: false, canMoveUp: false, canMoveDown: false 
          } 
        };
      } catch (mappingError) {
        console.error("[useUiSnapshot] Error during array mapping:", mappingError);
        // console.error("[useUiSnapshot] rawArrayData at time of error:", rawArrayData); 
        // Type check before accessing message property
        const errorMessage = mappingError instanceof Error ? mappingError.message : String(mappingError);
        throw new Error(`Failed to map snapshot array: ${errorMessage}`); // Re-throw to let React Query handle it
      }
      // ---------------------------------------------
      
      // If we have cached chat blocks, merge them with the dataFeeds
      if (cachedChatBlocks.length > 0) {
        // First convert cached chat blocks to a compatible DataFeed format
        const cachedDataFeeds: contract.DataFeed[] = cachedChatBlocks.map((block) => {
          // Convert each chat block to a DataFeed
          return {
            blockNumber: typeof block.block === 'string' ? BigInt(block.block) : block.block,
            logs: [], // No logs in the cached data
            chatLogs: block.chats.map(chat => `${chat.sender}: ${chat.content}`)
          };
        });
        
        // Merge the cached feeds with the fetched feeds, ensuring no duplicates
        const combinedFeeds = [...cachedDataFeeds];
        
        // Track block numbers we've already seen to avoid duplicates
        const seenBlocks = new Set(cachedDataFeeds.map(feed => feed.blockNumber.toString()));
        
        // Add remote feeds that don't overlap with the cache
        for (const feed of mappedData.dataFeeds) {
          if (!seenBlocks.has(feed.blockNumber.toString())) {
            combinedFeeds.push(feed);
            seenBlocks.add(feed.blockNumber.toString());
          }
        }
        
        // Sort the feeds by block number
        combinedFeeds.sort((a, b) => {
          return Number(a.blockNumber - b.blockNumber);
        });
        
        // Return the enriched data with cached + remote data, using the mapped object
        return {
          ...mappedData, // Use the mapped object here
          dataFeeds: combinedFeeds
        };
      }
      
      // If no cached blocks, just return the mapped data object
      return mappedData; // Return the mapped object here too
    },
    refetchOnWindowFocus: true,
    structuralSharing: false // Disable structural sharing to handle BigInts
  });
};