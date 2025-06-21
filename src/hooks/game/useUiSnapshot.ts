import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useBattleNadsClient } from '../contracts/useBattleNadsClient';
import { useWallet } from '../../providers/WalletProvider';
import { contract } from '../../types';
import { POLL_INTERVAL, INITIAL_SNAPSHOT_LOOKBACK_BLOCKS, POLL_LOOKBEHIND_BLOCKS } from '../../config/env';
import { mapCharacterLite } from '@/mappers';

/**
 * Hook for polling UI snapshot data from the blockchain
 * Uses React-Query for caching and deduplication of requests
 * Returns raw contract data including dataFeeds directly from the poll.
 */
export const useUiSnapshot = (owner: string | null) => {
  const { client } = useBattleNadsClient();
  const { embeddedWallet } = useWallet();
  const queryClient = useQueryClient();

  // Track consecutive failures to stop polling when contract is broken
  const consecutiveFailuresRef = React.useRef(0);
  const maxConsecutiveFailures = 3;

  // Only log when wallet addresses change or on first load
  const prevOwnerRef = React.useRef<string | null>(null);
  const prevEmbeddedRef = React.useRef<string | null>(null);
  const lastSessionKeyDataRef = React.useRef<string>('');
  
  React.useEffect(() => {
    const embeddedAddress = embeddedWallet?.address ?? null;
    if (prevOwnerRef.current !== owner || prevEmbeddedRef.current !== embeddedAddress) {
      // Reset failure count on wallet change
      consecutiveFailuresRef.current = 0;
      
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
    enabled: !!owner && !!client && consecutiveFailuresRef.current < maxConsecutiveFailures,
    staleTime: POLL_INTERVAL,
    refetchInterval: consecutiveFailuresRef.current < maxConsecutiveFailures ? POLL_INTERVAL : false,
    retry: (failureCount, error) => {
      // Don't retry on specific contract errors that indicate fundamental issues
      if (error.message.includes('missing revert data') || 
          error.message.includes('CALL_EXCEPTION') ||
          error.message.includes('execution reverted')) {
        console.warn('[useUiSnapshot] Contract call failed, stopping retries:', error.message);
        consecutiveFailuresRef.current++;
        return false;
      }
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnError: false, // Don't refetch on error
    
    queryFn: async () => {
      if (!client || !owner) throw new Error('Missing client or owner');
      
      const previousData = queryClient.getQueryData<contract.PollFrontendDataReturn>(['uiSnapshot', owner, embeddedWallet?.address]);
      
      const startBlock = previousData?.endBlock 
        ? previousData.endBlock - BigInt(POLL_LOOKBEHIND_BLOCKS)
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
      
      // Reset failure counter on successful call
      consecutiveFailuresRef.current = 0;
      
      return mappedData;
    },
    refetchOnWindowFocus: true,
    structuralSharing: false,
    onError: (error) => {
      console.error('[useUiSnapshot] Query failed:', error.message);
      if (consecutiveFailuresRef.current >= maxConsecutiveFailures) {
        console.warn('[useUiSnapshot] Too many consecutive failures, polling disabled. Please refresh the page or check contract deployment.');
      }
    }
  });
};