import { useGameData } from '../useGameData';
import { useGameActions } from '../useGameActions';

/**
 * Focused selector hook for game combat state and actions.
 * Used by components that render game UI and need combat information.
 */
export const useGameCombatState = () => {
  const { 
    worldSnapshot,
    gameState,
    isInCombat,
    character,
    position,
    others,
    eventLogs,
    chatLogs,
    fogOfWar,
    isLoading,
    error
  } = useGameData({
    includeHistory: true,
    includeSessionKey: true
  });

  const {
    allocatePoints,
    isAllocatingPoints,
    allocatePointsError
  } = useGameActions({
    includeWallet: true,
    readOnly: false
  });

  return {
    worldSnapshot,
    gameState,
    isInCombat,
    character,
    position,
    others,
    eventLogs,
    chatLogs,
    fogOfWar,
    isLoading,
    error,
    allocatePoints,
    isAllocatingPoints,
    allocatePointsError
  };
};