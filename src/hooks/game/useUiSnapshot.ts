import { useQuery } from '@tanstack/react-query';
import { useBattleNadsClient } from '../contracts/useBattleNadsClient';
import { contract } from '../../types';
import { POLL_INTERVAL } from '../../config/env';
import { useCachedDataFeed, CachedDataBlock } from './useCachedDataFeed';

/**
 * Hook for polling UI snapshot data from the blockchain
 * Uses React-Query for caching and deduplication of requests
 * Returns raw contract data with dataFeeds as the source of truth
 * Integrates cached data from useCachedDataFeed
 */
export const useUiSnapshot = (owner: string | null) => {
  const { client } = useBattleNadsClient();
  const { blocks: cachedDataBlocks, latest: latestCachedBlock } = useCachedDataFeed(owner);

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
          // If it's neither an array nor the expected object, it's an unknown structure
          throw new Error("Invalid data structure received from getUiSnapshot");
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
      
      // --- Combine Cached and Live Chat/Event Logs --- 
      const liveFeeds = mappedData.dataFeeds || [];
      const liveFeedBlockNumbers = new Set(liveFeeds.map(f => f.blockNumber.toString()));

      // Convert cached blocks, filtering out any block also present in the live feed
      const historicalCachedFeeds: contract.DataFeed[] = cachedDataBlocks
        .filter((cachedBlock: CachedDataBlock) => !liveFeedBlockNumbers.has(cachedBlock.block.toString()))
        .map((block: CachedDataBlock) => {
          // Map cached events (SerializedEventLog[]) back to contract.Log[]
          const contractLogs: contract.Log[] = (block.events || []).map((e: any) => ({
            logType: e.logType,
            index: e.index,
            mainPlayerIndex: e.mainPlayerIndex,
            otherPlayerIndex: e.otherPlayerIndex,
            hit: e.hit,
            critical: e.critical,
            damageDone: e.damageDone,
            healthHealed: e.healthHealed,
            targetDied: e.targetDied,
            lootedWeaponID: e.lootedWeaponID,
            lootedArmorID: e.lootedArmorID,
            experience: e.experience,
            value: BigInt(e.value || '0') // Convert string back to BigInt
          }));
          
          // Ensure blockNumber is BigInt for the DataFeed type
          const blockNumBigInt = typeof block.block === 'bigint' 
              ? block.block 
              : BigInt(block.block || '0'); // Convert string/fallback to BigInt

          return {
            blockNumber: blockNumBigInt, 
            logs: contractLogs, 
            chatLogs: (block.chats || []).map((chat: any) => chat.content)
          };
        });

      // Combine: Live feeds first, then filtered historical feeds
      const combinedFeeds = [...liveFeeds, ...historicalCachedFeeds];

      // Sort just to be safe
      combinedFeeds.sort((a, b) => Number(a.blockNumber - b.blockNumber));
      
      // --- Merged Feeds Ready --- 

      // Return the snapshot using the correctly prioritized combined feeds
      return {
        ...mappedData,
        dataFeeds: combinedFeeds
      };
    },
    refetchOnWindowFocus: true,
    structuralSharing: false // Disable structural sharing to handle BigInts
  });
};