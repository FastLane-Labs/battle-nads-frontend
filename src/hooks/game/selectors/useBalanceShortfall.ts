import { useGameData } from '../useGameData';

/**
 * Focused selector hook for balance shortfall.
 * Used by components that need to check wallet balance requirements.
 */
export const useBalanceShortfall = () => {
  const { balanceShortfall } = useGameData({
    includeHistory: false,
    includeSessionKey: false
  });

  return balanceShortfall;
};