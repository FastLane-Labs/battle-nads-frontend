import { useGameData, UseGameDataOptions } from './useGameData';
import { useGameActions, UseGameActionsOptions } from './useGameActions';

export interface UseSimplifiedGameStateOptions extends UseGameDataOptions, UseGameActionsOptions {
  /** Whether to include action mutations and wallet integration (default: true) */
  includeActions?: boolean;
}

/**
 * Unified hook that combines the simplified 2-layer architecture
 * This provides a drop-in replacement for the old useGameState hook
 * 
 * Architecture:
 * Layer 1: useContractPolling, useGameMutations (focused, pure)
 * Layer 2: useGameData, useGameActions (business logic)
 */
export const useSimplifiedGameState = (options: UseSimplifiedGameStateOptions = {}) => {
  const {
    includeActions = true,
    includeHistory = true,
    includeSessionKey = true,
    includeWallet = true,
    readOnly = false
  } = options;

  // Layer 2: Game data business logic
  const gameData = useGameData({ 
    includeHistory, 
    includeSessionKey 
  });

  // Layer 2: Game actions business logic (conditional)
  const gameActions = useGameActions({ 
    includeWallet: includeActions && includeWallet, 
    readOnly: readOnly || !includeActions 
  });

  return {
    // Core game state
    ...gameData,
    
    // Actions (conditional)
    ...(includeActions && gameActions),
  };
};