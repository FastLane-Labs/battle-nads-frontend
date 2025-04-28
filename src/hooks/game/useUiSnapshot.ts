import { useQuery } from '@tanstack/react-query';
import { useBattleNadsClient } from '../contracts/useBattleNadsClient';
import { contract, domain } from '../../types';
import { POLL_INTERVAL } from '../../config/env';
import { contractToWorldSnapshot } from '../../mappers';

/**
 * Hook for polling UI snapshot data from the blockchain
 * Uses React-Query for caching and deduplication of requests
 */
export const useUiSnapshot = (owner: string | null) => {
  const { client } = useBattleNadsClient();

  return useQuery<domain.WorldSnapshot & { __ts: number }>({
    queryKey: ['uiSnapshot', owner],
    enabled: !!owner && !!client,
    queryFn: async () => {
      if (!client || !owner) {
        throw new Error('Client or owner address missing');
      }
      
      // Get last known block - could be cached in localStorage or react-query cache
      const lastKnownBlock = BigInt(0); // TODO: track endBlock if desired
      
      // Get UI snapshot
      const raw = await client.getUiSnapshot(owner, lastKnownBlock);
      
      // Convert contract data to domain model
      const snapshot = contractToWorldSnapshot(raw, owner);
      
      // Add timestamp for staleness checks
      return { ...snapshot, __ts: Date.now() };
    },
    refetchInterval: POLL_INTERVAL,
    staleTime: 0, // Consider all data immediately stale for real-time updates
    refetchOnWindowFocus: true, // React-Query automatically pauses when tab hidden
  });
}; 