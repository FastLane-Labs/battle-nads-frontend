import { useQuery } from '@tanstack/react-query';
import { useBattleNadsClient } from '../contracts/useBattleNadsClient';
import { mapUiSnapshotToGameState } from '../../types/gameMaps';
import { PollFrontendDataReturn } from '../../types/contracts/BattleNadsEntrypoint';
import { POLL_INTERVAL } from '../../config/env';

/**
 * Hook for polling UI snapshot data from the blockchain
 * Uses React-Query for caching and deduplication of requests
 */
export const useUiSnapshot = (owner: string | null) => {
  const { client } = useBattleNadsClient();

  return useQuery<PollFrontendDataReturn & { __ts: number }>({
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
      
      // Add timestamp for staleness checks
      return { ...raw, __ts: Date.now() };
    },
    refetchInterval: POLL_INTERVAL,
    staleTime: 0, // Consider all data immediately stale for real-time updates
    refetchOnWindowFocus: true, // React-Query automatically pauses when tab hidden
  });
}; 