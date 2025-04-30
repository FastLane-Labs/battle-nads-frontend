import { useQuery } from '@tanstack/react-query';
import { useBattleNadsClient } from '../contracts/useBattleNadsClient';
import { contract, domain } from '../../types';
import { POLL_INTERVAL } from '../../config/env';
import { contractToWorldSnapshot } from '../../mappers';

// Define specific result type to avoid TypeScript issues
export type SnapshotResult = {
  data: Partial<domain.WorldSnapshot> & { __ts: number };
  raw: contract.PollFrontendDataReturn;
};

/**
 * Hook for polling UI snapshot data from the blockchain
 * Uses React-Query for caching and deduplication of requests
 * Returns both mapped domain data and raw contract data
 */
export const useUiSnapshot = (owner: string | null) => {
  const { client } = useBattleNadsClient();

  return useQuery<SnapshotResult, Error>({
    queryKey: ['uiSnapshot', owner],
    enabled: !!owner && !!client,
    
    /** 
     * placeholderData from the selector function ensures we always
     * render the last-known snapshot while a new poll is in-flight,
     * eliminating the brief "empty array" glitch where
     * messages/events disappear and then pop back in.
     */
    placeholderData: (previousData) => previousData,

    /** 
     * staleTime equal to POLL_INTERVAL means a cached snapshot is treated
     * as "fresh" until the next scheduled poll – so React-Query will not
     * replace it with `undefined` between refetches.
     */
    staleTime: POLL_INTERVAL,

    /** the original refetch cadence */
    refetchInterval: POLL_INTERVAL,
    
    queryFn: async (): Promise<SnapshotResult> => {
      console.log(`[useUiSnapshot] queryFn executing for owner: ${owner}`);
      if (!client || !owner) {
        throw new Error('Client or owner address missing');
      }
      
      // Get last known block - could be cached in localStorage or react-query cache
      const lastKnownBlock = BigInt(0); // TODO: track endBlock if desired
      
      // Get UI snapshot
      const raw = await client.getUiSnapshot(owner, lastKnownBlock);
      
      // Convert contract data to domain model
      const snapshot = contractToWorldSnapshot(raw, owner);
      
      // Create fully typed object with type assertion for safety
      const result: SnapshotResult = {
        raw,
        data: { ...snapshot as any, __ts: Date.now() }
      };
      
      return result;
    },
    refetchOnWindowFocus: true, // React-Query automatically pauses when tab hidden
    structuralSharing: false // Disable structural sharing to handle BigInts
  });
}; 