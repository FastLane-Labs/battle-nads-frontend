import { useMemo } from 'react';
import { ui, domain } from '../../types';
import { useUiSnapshot, SnapshotResult } from './useUiSnapshot';
import { worldSnapshotToGameState } from '../../mappers';

/**
 * Hook for managing game state and data
 * Uses React-Query for polling and state management
 */
export const useBattleNads = (owner: string | null) => {
  // Use the useUiSnapshot hook to poll for data
  const { 
    data: snapshot, 
    isLoading, 
    error, 
    refetch 
  } = useUiSnapshot(owner);

  // Map the data to a GameState using the mapper utility
  const gameState = useMemo(
    () => {
      if (!snapshot) return null;
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
      
      // Type assertion to satisfy the compiler - we've added the necessary fallbacks
      return worldSnapshotToGameState(safeData as domain.WorldSnapshot);
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