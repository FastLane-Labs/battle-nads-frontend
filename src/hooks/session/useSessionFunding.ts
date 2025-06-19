import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBattleNadsClient } from '../contracts/useBattleNadsClient';
import { useSessionKey } from './useSessionKey';
import { useWallet } from '../../providers/WalletProvider';
import { useBattleNads } from '../game/useBattleNads';
import { invalidateSnapshot } from '../utils';

/**
 * Hook for managing session key funding and deactivation
 * Derives balance shortfall from useBattleNads
 */
export const useSessionFunding = (characterId: string | null) => {
  const { client } = useBattleNadsClient();
  const queryClient = useQueryClient();
  const { sessionKeyData } = useSessionKey(characterId);
  const { injectedWallet, embeddedWallet } = useWallet();
  const ownerAddress = injectedWallet?.address ?? null;

  const { rawBalanceShortfall } = useBattleNads(ownerAddress);
  const balanceShortfall = rawBalanceShortfall ?? BigInt(0);

  // Mutation for replenishing gas balance
  const replenishBalanceMutation = useMutation({
    mutationKey: ['replenishBalance', characterId, ownerAddress],
    mutationFn: async (amount: bigint) => {
      if (!client) {
        throw new Error('Client missing');
      }
      return client.replenishGasBalance(amount);
    },
    onSuccess: () => {
      invalidateSnapshot(queryClient, ownerAddress, embeddedWallet?.address);
    }
  });
  
  // Mutation for deactivating session key
  const deactivateKeyMutation = useMutation({
    mutationKey: ['deactivateKey', characterId, sessionKeyData?.key, ownerAddress],
    mutationFn: async () => {
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
    onSuccess: () => {
      console.log('[useSessionFunding] Session key deactivated successfully, invalidating snapshot for:', ownerAddress);
      invalidateSnapshot(queryClient, ownerAddress, embeddedWallet?.address);
    }
  });

  return {
    balanceShortfall,
    replenishBalance: replenishBalanceMutation.mutate,
    isReplenishing: replenishBalanceMutation.isPending,
    deactivateKey: deactivateKeyMutation.mutate,
    isDeactivating: deactivateKeyMutation.isPending,
    sessionKeyAddress: sessionKeyData?.key
  };
}; 