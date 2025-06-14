import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useBattleNadsClient } from '../contracts/useBattleNadsClient';
import { contract } from '../../types';
import { POLL_INTERVAL, INITIAL_SNAPSHOT_LOOKBACK_BLOCKS } from '../../config/env';
import { storeFeedData } from './useCachedDataFeed';
import { mapCharacterLite } from '@/mappers';

/**
 * Hook for polling UI snapshot data from the blockchain
 * Uses React-Query for caching and deduplication of requests
 * Returns raw contract data including dataFeeds directly from the poll.
 * Asynchronously stores fetched feeds to Dexie via storeFeedData utility.
 */
export const useUiSnapshot = (owner: string | null) => {
  const { client } = useBattleNadsClient();
  const queryClient = useQueryClient();

  return useQuery<contract.PollFrontendDataReturn, Error>({
    queryKey: ['uiSnapshot', owner],
    enabled: !!owner && !!client,
    staleTime: POLL_INTERVAL,
    refetchInterval: POLL_INTERVAL,
    
    queryFn: async () => {
      if (!client || !owner) throw new Error('Missing client or owner');
      
      const previousData = queryClient.getQueryData<contract.PollFrontendDataReturn>(['uiSnapshot', owner]);
      
      const startBlock = previousData?.endBlock 
        ? previousData.endBlock + 1n 
        : (await client.getLatestBlockNumber()) - BigInt(INITIAL_SNAPSHOT_LOOKBACK_BLOCKS);
      
      const rawArrayData = await client.getUiSnapshot(owner, startBlock);

      // Capture the timestamp immediately after the fetch completes
      const fetchTimestamp = Date.now();
      
      // Check if it *looks* like the array-like Result object
      if (!rawArrayData || typeof (rawArrayData as any)[0] === 'undefined' || typeof (rawArrayData as any)[12] === 'undefined') {
          console.error("[useUiSnapshot] Invalid array-like data structure received:", rawArrayData);
          throw new Error("Invalid data structure received from getUiSnapshot");
      }
      
      let mappedData: contract.PollFrontendDataReturn;
      try {
        const dataAsAny = rawArrayData as any; 

        mappedData = {
          characterID: dataAsAny[0],
          sessionKeyData: dataAsAny[1],
          character: dataAsAny[2],
          combatants: dataAsAny[3],
          noncombatants: dataAsAny[4],
          equipableWeaponIDs: dataAsAny[5],
          equipableWeaponNames: dataAsAny[6],
          equipableArmorIDs: dataAsAny[7],
          equipableArmorNames: dataAsAny[8],
          dataFeeds: dataAsAny[9] || [],
          balanceShortfall: dataAsAny[10],
          unallocatedAttributePoints: dataAsAny[11],
          endBlock: dataAsAny[12],
          fetchTimestamp: fetchTimestamp,
        };
      } catch (mappingError) {
        console.error("[useUiSnapshot] Error during array mapping:", mappingError);
        const errorMessage = mappingError instanceof Error ? mappingError.message : String(mappingError);
        throw new Error(`Failed to map snapshot array: ${errorMessage}`);
      }

      // Asynchronously store the newly fetched feeds
      const liveFeeds = mappedData.dataFeeds;
      // Pass combatants/noncombatants context needed for sender mapping
      const domainCombatantsContext = (mappedData.combatants || []).map(mapCharacterLite);
      const domainNonCombatantsContext = (mappedData.noncombatants || []).map(mapCharacterLite);

      if (liveFeeds && liveFeeds.length > 0) {
        // Call storeFeedData with mapped context but DO NOT await it
        storeFeedData(
          owner, 
          liveFeeds, 
          domainCombatantsContext, 
          domainNonCombatantsContext, 
          mappedData.endBlock, 
          mappedData.fetchTimestamp
        )
          .catch(storageError => {
            console.error("[useUiSnapshot] Background feed storage failed:", storageError);
          });
      }
      
      return mappedData;
    },
    refetchOnWindowFocus: true,
    structuralSharing: false
  });
};