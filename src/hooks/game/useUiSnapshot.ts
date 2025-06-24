import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useBattleNadsClient } from '../contracts/useBattleNadsClient';
import { useWallet } from '../../providers/WalletProvider';
import { contract } from '../../types';
import { POLL_INTERVAL } from '../../config/env';

/**
 * Hook for polling UI snapshot data from the blockchain
 * Uses React-Query for caching and deduplication of requests
 * Returns raw contract data including dataFeeds directly from the poll.
 */
export const useUiSnapshot = (owner: string | null) => {
  const { client } = useBattleNadsClient();
  const { embeddedWallet } = useWallet();
  const queryClient = useQueryClient();

  // Only log when wallet addresses change or on first load
  const prevOwnerRef = React.useRef<string | null>(null);
  const prevEmbeddedRef = React.useRef<string | null>(null);
  const lastSessionKeyDataRef = React.useRef<string>('');
  
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
    staleTime: 0, // Always consider data stale to force fresh blockchain queries
    refetchInterval: POLL_INTERVAL,
    
    queryFn: async () => {
      if (!client || !owner) throw new Error('Missing client or owner');
      
      const previousData = queryClient.getQueryData<contract.PollFrontendDataReturn>(['uiSnapshot', owner, embeddedWallet?.address]);
      
      // Check if we have any cached data in IndexedDB to determine if this is initial load
      const { db } = await import('../../lib/db');
      const ENTRYPOINT_ADDRESS = (await import('../../config/env')).ENTRYPOINT_ADDRESS;
      const contractAddress = ENTRYPOINT_ADDRESS.toLowerCase();
      
      const existingEvents = await db.events
        .where('[owner+contract]')
        .equals([owner, contractAddress])
        .limit(1)
        .toArray();
      
      const hasHistoricalData = existingEvents.length > 0;
      
      // Strategy: Always request from block 0 to get maximum coverage
      // Contract automatically clamps to optimal range:
      // - startBlock < block.number - 20 → startBlock = block.number - 20 (gives 20-block range)
      // - startBlock >= block.number → startBlock = block.number - 1 (gives 1-block range)
      // By using startBlock = 0, we get the maximum 20-block window [current-20, current]
      const startBlock = BigInt(0);
      
      console.log(`[useUiSnapshot] Requesting from block 0 (contract will return last 20 blocks)`, {
        hasHistoricalData,
        previousEndBlock: previousData?.endBlock?.toString() || 'none'
      });
      
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
        
        // Log the actual range the contract used
        const actualRange = Number(mappedData.endBlock) - Number(startBlock);
        console.log(`[useUiSnapshot] Contract returned endBlock=${mappedData.endBlock}, dataFeeds.length=${mappedData.dataFeeds.length}, actualRange=${actualRange}`, {
          requestedStartBlock: startBlock.toString(),
          contractEndBlock: mappedData.endBlock.toString(),
          dataFeedsCount: mappedData.dataFeeds.length,
          actualRange
        });
      } catch (mappingError) {
        console.error("[useUiSnapshot] Error during array mapping:", mappingError);
        const errorMessage = mappingError instanceof Error ? mappingError.message : String(mappingError);
        throw new Error(`Failed to map snapshot array: ${errorMessage}`);
      }


      // Only log session key data if it's different from last fetch
      const sessionKeyDataString = JSON.stringify({
        key: mappedData.sessionKeyData?.key,
        expiration: mappedData.sessionKeyData?.expiration
      });
      
      if (lastSessionKeyDataRef.current !== sessionKeyDataString) {
        console.log('[useUiSnapshot] Session key data changed:', {
          owner,
          embeddedWalletAddress: embeddedWallet?.address,
          sessionKeyData: mappedData.sessionKeyData,
          characterId: mappedData.character?.id,
          endBlock: mappedData.endBlock
        });
        lastSessionKeyDataRef.current = sessionKeyDataString;
      }

      // Note: Feed storage is now handled by useGameState with proper block deduplication
      // useUiSnapshot focuses only on fetching fresh contract data
      
      return mappedData;
    },
    refetchOnWindowFocus: true,
    structuralSharing: false
  });
};