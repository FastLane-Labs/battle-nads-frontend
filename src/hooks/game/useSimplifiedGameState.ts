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

  // Always include actions but return empty functions if disabled
  const actions = includeActions ? gameActions : {
    hasWallet: false,
    connectWallet: () => {},
    isInitialized: false,
    isWalletInitialized: false,
    moveCharacter: async (_direction: any) => {},
    attack: async (_targetCharacterIndex: number) => {},
    allocatePoints: async (_strength: bigint, _vitality: bigint, _dexterity: bigint, _quickness: bigint, _sturdiness: bigint, _luck: bigint) => {},
    sendChatMessage: async (_message: string) => {},
    updateSessionKey: async () => {},
    isMoving: false,
    isAttacking: false,
    isAllocatingPoints: false,
    isSendingChat: false,
    isUpdatingSessionKey: false,
    moveError: null,
    attackError: null,
    allocatePointsError: null,
    chatError: null,
    sessionKeyError: null,
    addOptimisticChatMessage: (_message: string) => {},
  };

  return {
    // Core game state (with null safety)
    ...(gameData || {}),
    
    // Actions (always included) - spread after to allow action overrides
    ...actions,
    
    // Explicitly preserve fogOfWar from gameData if it exists
    ...(gameData?.fogOfWar ? { fogOfWar: gameData.fogOfWar } : {}),
  };
};