import { useMemo } from 'react';
// Remove useUiSnapshot import
// import { useUiSnapshot } from './useUiSnapshot';
import { useWallet } from '../../providers/WalletProvider';
// Import useBattleNads
import { useBattleNads } from './useBattleNads'; 
import { domain } from '../../types';
// Remove dataFeedSelectors import
// import { getFlattenedEventLogs } from '../../utils/dataFeedSelectors';

/**
 * Hook for getting event logs
 * Returns event logs from the processed game state
 */
export const useEvents = () => {
  const { injectedWallet } = useWallet();
  const owner = injectedWallet?.address || null;
  
  // Get processed game state, which includes mapped event logs
  const { gameState, isLoading, error } = useBattleNads(owner);
  
  // Directly return the event logs from the game state
  const eventLogs = gameState?.eventLogs || [];

  /* Remove the old useMemo mapping logic
  const eventLogs = useMemo(() => {
    // ... old logic ...
  }, [rawData?.dataFeeds, rawData?.endBlock]);
  */
  
  return {
    eventLogs,
    isLoading,
    error // Pass the error from useBattleNads
  };
};