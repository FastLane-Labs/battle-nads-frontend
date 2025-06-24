import { useBattleNadsClient } from '../contracts/useBattleNadsClient';
import { useSessionKey } from './useSessionKey';
import { useWallet } from '../../providers/WalletProvider';
import { useSimplifiedGameState } from '../game/useSimplifiedGameState';
import { useGameMutation } from '../game/useGameMutation';

/**
 * Hook for managing session key funding and deactivation
 * Derives balance shortfall from useBattleNads
 */
export const useSessionFunding = (characterId: string | null) => {
  const { client } = useBattleNadsClient();
  const { sessionKeyData } = useSessionKey(characterId);
  const { injectedWallet, embeddedWallet } = useWallet();
  const ownerAddress = injectedWallet?.address ?? null;

  const { balanceShortfall: rawBalanceShortfall } = useSimplifiedGameState();
  const balanceShortfall = rawBalanceShortfall ?? BigInt(0);

  // Mutation for replenishing gas balance
  const replenishBalanceMutation = useGameMutation(
    async (amount: bigint) => {
      if (!client) {
        throw new Error('Client missing');
      }
      return client.replenishGasBalance(amount);
    },
    {
      successMessage: 'Gas balance replenished successfully!',
      errorMessage: (error) => `Failed to replenish gas balance: ${error.message}`,
      mutationKey: ['replenishBalance', characterId || 'unknown', ownerAddress || 'unknown'],
    }
  );
  
  // Mutation for deactivating session key
  const deactivateKeyMutation = useGameMutation(
    async () => {
      const keyToDeactivate = sessionKeyData?.key;
      console.log('[useSessionFunding] Deactivating session key:', {
        ownerAddress,
        characterId,
        keyToDeactivate,
        sessionKeyData
      });
      
      if (!client || !keyToDeactivate) {
        throw new Error('Client or session key address missing');
      }
      return client.deactivateSessionKey(keyToDeactivate);
    },
    {
      successMessage: 'Session key deactivated successfully!',
      errorMessage: (error) => `Failed to deactivate session key: ${error.message}`,
      mutationKey: ['deactivateKey', characterId || 'unknown', sessionKeyData?.key || 'unknown', ownerAddress || 'unknown'],
      onSuccess: () => {
        console.log('[useSessionFunding] Session key deactivated successfully, invalidating snapshot for:', ownerAddress);
      }
    }
  );

  return {
    balanceShortfall,
    replenishBalance: replenishBalanceMutation.mutate,
    isReplenishing: replenishBalanceMutation.isPending,
    deactivateKey: deactivateKeyMutation.mutate,
    isDeactivating: deactivateKeyMutation.isPending,
    sessionKeyAddress: sessionKeyData?.key
  };
}; 