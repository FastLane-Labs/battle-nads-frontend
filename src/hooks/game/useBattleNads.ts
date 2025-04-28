import { useMemo } from 'react';
import { GameState } from '../../types/gameTypes';
import { useUiSnapshot } from './useUiSnapshot';
import { mapUiSnapshotToGameState } from '../../types/gameMaps';

/**
 * Hook for managing game state and data
 * Uses React-Query for polling and state management
 */
export const useBattleNads = (owner: string | null) => {
  // Use the new useUiSnapshot hook to poll for data
  const { 
    data, 
    isLoading, 
    error, 
    refetch 
  } = useUiSnapshot(owner);

  // Map the data to a GameState using the mapper utility
  const gameState = useMemo(
    () => (data ? mapUiSnapshotToGameState(data, owner) : null),
    [data, owner]
  );

  return {
    gameState,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch
  };
}; 