import { useMemo, useRef, useEffect } from 'react';
import { ui, domain } from '../../types';
import { useUiSnapshot, SnapshotResult } from './useUiSnapshot';
import { worldSnapshotToGameState } from '../../mappers';
import { safeStringify } from '../../utils/bigintSerializer';

/**
 * Hook for managing game state and data
 * Uses React-Query for polling and state management
 */
export const useBattleNads = (owner: string | null) => {
  /* ---------- snapshot polling ---------- */
  const { 
    data: snapshot, 
    isLoading, 
    error, 
    refetch 
  } = useUiSnapshot(owner);

  /* ---------- preserve previous data ---------- */
  const previousGameStateRef = useRef<ui.GameState | null>(null);

  // Map the data to a GameState using the mapper utility
  const gameState = useMemo(
    () => {
      if (!snapshot) {
        // return last good state during refetch to avoid "flash of empty"
        return previousGameStateRef.current;
      }
      
      // Use the appropriate snapshot fields with null check for missing fields
      const data = (snapshot as unknown as SnapshotResult).data;
      
      // Force non-nullable character property to satisfy the type system
      const safeData = {
        ...data,
        character: data.character ?? null,
        combatants: data.combatants ?? [],
        noncombatants: data.noncombatants ?? [],
        eventLogs: data.eventLogs ?? [],
        chatLogs: data.chatLogs ?? []
      };
      
      try {
        // Safe log to help with debugging BigInt issues
        console.log(`[useBattleNads] Processing snapshot with sessionKey: ${safeStringify(safeData.sessionKeyData)}`);
        
        // Type assertion to satisfy the compiler - we've added the necessary fallbacks
        const mapped = worldSnapshotToGameState(safeData as domain.WorldSnapshot);
        
        // store for next render cycle
        previousGameStateRef.current = mapped;
        return mapped;
      } catch (error) {
        console.error("[useBattleNads] Error processing game state:", error);
        console.log("[useBattleNads] Problematic data:", safeStringify(safeData));
        return previousGameStateRef.current;
      }
    },
    [snapshot]
  );

  return {
    gameState,
    raw: snapshot ? (snapshot as unknown as SnapshotResult).raw : null,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch
  };
}; 