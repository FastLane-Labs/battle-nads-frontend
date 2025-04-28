import { useMemo } from 'react';
import { ui, domain } from '../../types';
import { useUiSnapshot } from './useUiSnapshot';
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
    () => (snapshot?.data ? worldSnapshotToGameState(snapshot.data) : null),
    [snapshot?.data]
  );

  return {
    gameState,
    raw: snapshot?.raw ?? null,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch
  };
}; 