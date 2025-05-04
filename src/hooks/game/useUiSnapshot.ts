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
      
      if (!Array.isArray(rawArrayData)) {
          throw new Error("Invalid data structure received from getUiSnapshot");
      }
      
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
          dataFeeds: rawArrayData[9] || [],
          balanceShortfall: rawArrayData[10],
          unallocatedAttributePoints: rawArrayData[11],
          endBlock: rawArrayData[12],
        };
      } catch (mappingError) {
        console.error("[useUiSnapshot] Error during array mapping:", mappingError);
        const errorMessage = mappingError instanceof Error ? mappingError.message : String(mappingError);
        throw new Error(`Failed to map snapshot array: ${errorMessage}`);
      }
      
      // Asynchronously store the newly fetched feeds
      const liveFeeds = mappedData.dataFeeds;
      // Pass combatants/noncombatants context needed for sender mapping
      // Map contract types to domain types using the mapper
      const domainCombatantsContext = (mappedData.combatants || []).map(mapCharacterLite);
      const domainNonCombatantsContext = (mappedData.noncombatants || []).map(mapCharacterLite);

      if (liveFeeds && liveFeeds.length > 0) {
        // Call storeFeedData with mapped context but DO NOT await it
        storeFeedData(owner, liveFeeds, domainCombatantsContext, domainNonCombatantsContext)
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