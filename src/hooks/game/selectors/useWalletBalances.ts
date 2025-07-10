import { useGameData } from '../useGameData';

/**
 * Focused selector hook for wallet balances display.
 * Used by components that show wallet balance information.
 */
export const useWalletBalances = () => {
  const { 
    gameState,
    error 
  } = useGameData({
    includeHistory: false,
    includeSessionKey: false
  });

  return {
    gameState,
    error
  };
};