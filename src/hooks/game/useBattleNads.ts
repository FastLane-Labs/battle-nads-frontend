import { useMemo, useRef } from 'react';
import { ui, domain, contract } from '../../types';
import { useUiSnapshot } from './useUiSnapshot';
import { worldSnapshotToGameState, contractToWorldSnapshot } from '../../mappers';
import { safeStringify } from '../../utils/bigintSerializer';

/**
 * Hook for managing game state and data
 * Uses React-Query for polling and state management
 */
export const useBattleNads = (owner: string | null) => {
  /* ---------- snapshot polling ---------- */
  const { 
    data: rawData, 
    isLoading, 
    error, 
    refetch 
  } = useUiSnapshot(owner);

  /* ---------- preserve previous data ---------- */
  const previousGameStateRef = useRef<ui.GameState | null>(null);

  // Map the raw data to a GameState using the mapper utility
  const gameState = useMemo(
    () => {
      if (!rawData) {
        // return last good state during refetch to avoid "flash of empty"
        return previousGameStateRef.current;
      }
           
      try {
        // First convert contract data to domain model
        const domainSnapshot = contractToWorldSnapshot(rawData, owner);
        
        if (!domainSnapshot) {
          return previousGameStateRef.current;
        }
        
        // Safe log to help with debugging BigInt issues
        console.log(`[useBattleNads] Processing snapshot with sessionKey: ${safeStringify(domainSnapshot.sessionKeyData)}`);
        
        // Then convert domain model to UI model
        const mapped = worldSnapshotToGameState(domainSnapshot);
        
        // store for next render cycle
        previousGameStateRef.current = mapped;
        return mapped;
      } catch (error) {
        console.error("[useBattleNads] Error processing game state:", error);
        console.log("[useBattleNads] Problematic data:", safeStringify(rawData));
        return previousGameStateRef.current;
      }
    },
    [rawData, owner]
  );

  return {
    gameState,
    raw: rawData,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch
  };
}; 