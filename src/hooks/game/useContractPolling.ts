import { useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useBattleNadsClient } from '../contracts/useBattleNadsClient';
import { contract } from '../../types';
import { POLL_INTERVAL } from '../../config/env';

/**
 * Layer 1: Pure contract data polling
 * Focused only on fetching fresh contract data without transformations
 */

// Store counter in sessionStorage to persist across hot reloads
const getRequestCounter = () => {
  if (typeof window === 'undefined') return 0;
  const stored = sessionStorage.getItem('contractPollingCounter');
  return stored ? parseInt(stored, 10) : 0;
};

const incrementRequestCounter = () => {
  if (typeof window === 'undefined') return 1;
  const current = getRequestCounter();
  const next = current + 1;
  sessionStorage.setItem('contractPollingCounter', next.toString());
  return next;
};

// Global flag to force fresh data fetch (e.g., after combat actions)
let forceFreshData = false;

export const clearContractPollingCache = () => {
  forceFreshData = true;
  console.log('[useContractPolling] Cache cleared - will fetch fresh data on next poll');
};

export const useContractPolling = (owner: string | null) => {
  const { client } = useBattleNadsClient();
  
  // Use ref to persist rate limit state across renders without causing re-renders
  const rateLimitStateRef = useRef({
    isLimited: false,
    resetTime: 0,
    retryCount: 0,
    lastGoodData: null as contract.PollFrontendDataReturn | null
  });

  return useQuery<contract.PollFrontendDataReturn, Error>({
    queryKey: ['contractPolling', owner], // Shared cache for all hooks
    enabled: !!owner && !!client,
    staleTime: 0,
    gcTime: 0, // Disable all caching
    refetchInterval: () => {
      const state = rateLimitStateRef.current;
      
      // Check if we're currently rate limited
      if (state.isLimited && Date.now() < state.resetTime) {
        const remainingTime = state.resetTime - Date.now();
        console.log(`[useContractPolling] Still rate limited, waiting ${Math.ceil(remainingTime / 1000)}s`);
        return Math.max(remainingTime, 1000); // At least 1 second
      }
      
      // If we were rate limited but time has passed, clear the flag
      if (state.isLimited && Date.now() >= state.resetTime) {
        console.log('[useContractPolling] Rate limit period expired, resuming normal polling');
        state.isLimited = false;
        state.retryCount = 0;
      }
      
      // Normal polling interval
      return POLL_INTERVAL;
    },
    
    queryFn: async () => {
      if (!client || !owner) throw new Error('Missing client or owner');
      
      const state = rateLimitStateRef.current;
      
      // Check if we need to force fresh data
      if (forceFreshData) {
        console.log('[useContractPolling] Forcing fresh data fetch');
        state.lastGoodData = null;
        forceFreshData = false;
      }
      
      // If we're rate limited and have cached data, return it
      if (state.isLimited && Date.now() < state.resetTime && state.lastGoodData && !forceFreshData) {
        const remainingSeconds = Math.ceil((state.resetTime - Date.now()) / 1000);
        console.log(`[useContractPolling] Rate limited, returning cached data. Retry in ${remainingSeconds}s`);
        
        // Return the last good data with an updated timestamp to prevent stale detection
        return {
          ...state.lastGoodData,
          fetchTimestamp: Date.now(),
          isRateLimited: true
        } as contract.PollFrontendDataReturn & { isRateLimited: boolean };
      }
      
      const requestCounter = incrementRequestCounter();
      const startBlock = BigInt(requestCounter);
      
      try {
        const rawArrayData = await client.getUiSnapshot(owner, startBlock);
        const fetchTimestamp = Date.now();
        
        if (!rawArrayData || typeof (rawArrayData as any)[0] === 'undefined' || typeof (rawArrayData as any)[11] === 'undefined') {
          throw new Error("Invalid data structure received from getUiSnapshot");
        }
        
        const dataAsAny = rawArrayData as any;
        
        const result: contract.PollFrontendDataReturn = {
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
          endBlock: dataAsAny[11],
          fetchTimestamp: fetchTimestamp,
        };
        
        // Store successful result for rate limit fallback
        state.lastGoodData = result;
        
        // Reset rate limit state on success
        if (state.isLimited) {
          state.isLimited = false;
          state.resetTime = 0;
          state.retryCount = 0;
          console.log('[useContractPolling] Rate limit cleared - resuming normal polling');
        }
        
        return result;
      } catch (error: any) {
        // Check if this is a rate limit error
        if (error?.code === -32005 || error?.message?.includes('rate limit')) {
          state.isLimited = true;
          // Set cooldown period with exponential backoff
          const backoffSeconds = Math.min(5 * Math.pow(2, state.retryCount), 60); // Max 60s
          state.resetTime = Date.now() + (backoffSeconds * 1000);
          state.retryCount += 1;
          
          console.log(`[useContractPolling] Rate limited - backing off for ${backoffSeconds}s`);
          
          // If we have cached data, return it instead of throwing
          if (state.lastGoodData) {
            console.log('[useContractPolling] Returning cached data during rate limit');
            return {
              ...state.lastGoodData,
              fetchTimestamp: Date.now(),
              isRateLimited: true
            } as contract.PollFrontendDataReturn & { isRateLimited: boolean };
          }
          
          // Only throw if we have no cached data
          throw new Error(`Network is busy. Retrying in ${backoffSeconds} seconds...`);
        }
        
        // Check if this is a missing revert data error (contract call failure)
        if (error?.code === 'CALL_EXCEPTION' || error?.message?.includes('missing revert data')) {
          console.warn('[useContractPolling] Contract call failed, likely a transient error');
          
          // If we have cached data, return it
          if (state.lastGoodData) {
            console.log('[useContractPolling] Using cached data after contract error');
            return {
              ...state.lastGoodData,
              fetchTimestamp: Date.now()
            };
          }
          
          // Otherwise, throw a more user-friendly error
          throw new Error('Unable to fetch game data. Please try again.');
        }
        
        // Re-throw other errors
        throw error;
      }
    },
    
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    structuralSharing: false,
    retry: false // No retry needed - we poll every 500ms anyway
  });
};