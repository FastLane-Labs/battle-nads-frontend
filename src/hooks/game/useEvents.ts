import { useMemo } from 'react';
import { useUiSnapshot } from './useUiSnapshot';
import { useWallet } from '../../providers/WalletProvider';
import { domain } from '../../types';
import { getFlattenedEventLogs } from '../../utils/dataFeedSelectors';

/**
 * Hook for getting event logs directly from dataFeeds
 * Returns properly typed domain event messages
 */
export const useEvents = () => {
  const { injectedWallet } = useWallet();
  const owner = injectedWallet?.address || null;
  
  // Get raw data directly from useUiSnapshot
  const { data: rawData, isLoading, error } = useUiSnapshot(owner);
  
  // Transform raw logs to domain event messages
  const eventLogs = useMemo(() => {
    if (!rawData?.dataFeeds) return [];
    
    // First, get flattened logs from dataFeeds
    const flattenedLogs = getFlattenedEventLogs(rawData.dataFeeds);
    
    // Then map them to domain event messages
    return flattenedLogs
      .filter(log => log && typeof log.logType !== 'undefined')
      .map(log => {
        return {
          message: String(log.logType || 'Unknown'), // Safely convert to string
          timestamp: Number(rawData.endBlock || Date.now()),
          type: (log.logType !== undefined) ? 
            (log.logType as domain.LogType) : 
            domain.LogType.Unknown // Use Unknown for undefined types
        } as domain.EventMessage;
      });
  }, [rawData?.dataFeeds, rawData?.endBlock]);
  
  return {
    eventLogs,
    isLoading,
    error: error ? (error as Error).message : null
  };
};