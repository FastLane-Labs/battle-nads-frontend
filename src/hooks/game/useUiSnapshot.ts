import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useBattleNadsClient } from '../contracts/useBattleNadsClient';
import { useWallet } from '../../providers/WalletProvider';
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
  const { embeddedWallet } = useWallet();
  const queryClient = useQueryClient();

  // Only log when wallet addresses change or on first load
  const prevOwnerRef = React.useRef<string | null>(null);
  const prevEmbeddedRef = React.useRef<string | null>(null);
  
  React.useEffect(() => {
    const embeddedAddress = embeddedWallet?.address ?? null;
    if (prevOwnerRef.current !== owner || prevEmbeddedRef.current !== embeddedAddress) {
      // Only log if not the initial render
      if (prevOwnerRef.current !== null || prevEmbeddedRef.current !== null) {
        console.log('[useUiSnapshot] Wallet change detected:', {
          previousOwner: prevOwnerRef.current,
          newOwner: owner,
          previousEmbedded: prevEmbeddedRef.current,
          newEmbedded: embeddedAddress
        });
      }
      prevOwnerRef.current = owner;
      prevEmbeddedRef.current = embeddedAddress;
    }
  }, [owner, embeddedWallet?.address]);

  return useQuery<contract.PollFrontendDataReturn, Error>({
    queryKey: ['uiSnapshot', owner, embeddedWallet?.address],
    enabled: !!owner && !!client,
    staleTime: POLL_INTERVAL,
    refetchInterval: POLL_INTERVAL,
    
    queryFn: async () => {
      if (!client || !owner) throw new Error('Missing client or owner');
      
      const previousData = queryClient.getQueryData<contract.PollFrontendDataReturn>(['uiSnapshot', owner, embeddedWallet?.address]);
      
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

      // Debug log the session key data
      console.log('[useUiSnapshot] Session key data fetched:', {
        owner,
        embeddedWalletAddress: embeddedWallet?.address,
        sessionKeyData: mappedData.sessionKeyData,
        characterId: mappedData.character?.id,
        endBlock: mappedData.endBlock
      });

      // Asynchronously store the newly fetched feeds
      const liveFeeds = mappedData.dataFeeds;
      // Pass combatants/noncombatants context needed for sender mapping
      const domainCombatantsContext = (mappedData.combatants || []).map(mapCharacterLite);
      const domainNonCombatantsContext = (mappedData.noncombatants || []).map(mapCharacterLite);

      if (liveFeeds && liveFeeds.length > 0 && mappedData.character?.id) {
        // Call storeFeedData with mapped context but DO NOT await it
        storeFeedData(
          owner,
          mappedData.character.id, // Extract character ID from the fetched data
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