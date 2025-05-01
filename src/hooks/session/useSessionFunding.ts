import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBattleNadsClient } from '../contracts/useBattleNadsClient';
import { useSessionKey } from './useSessionKey';
import { useWallet } from '../../providers/WalletProvider';
import { invalidateSessionKey } from '../utils';

/**
 * Hook for managing session key funding and deactivation
 */
export const useSessionFunding = (characterId: string | null) => {
  const { client } = useBattleNadsClient();
  const queryClient = useQueryClient();
  const { sessionKey } = useSessionKey(characterId);
  const { injectedWallet } = useWallet();
  
  // Query for balance shortfall (example, assuming it exists elsewhere or defined here)
  const { data: balanceShortfall, refetch: refetchBalanceShortfall } = useQuery({
    queryKey: ['balanceShortfall', characterId, injectedWallet?.address],
    queryFn: async () => {
      if (!client || !characterId || !injectedWallet?.address) return BigInt(0);
      // Replace with actual logic to fetch balance shortfall if needed
      // Example: return await client.getBalanceShortfall(characterId, injectedWallet.address);
      console.warn("Balance shortfall query needs implementation in useSessionFunding");
      return BigInt(0); 
    },
    enabled: !!client && !!characterId && !!injectedWallet?.address,
  });
  
  // Mutation for replenishing gas balance
  const replenishBalanceMutation = useMutation({
    mutationKey: ['replenishBalance', characterId, injectedWallet?.address],
    mutationFn: async (amount: bigint) => {
      if (!client) {
        throw new Error('Client missing');
      }
      // Assuming replenishGasBalance doesn't need owner address directly
      // Adjust if client.replenishGasBalance signature requires it
      return client.replenishGasBalance(amount);
    },
    onSuccess: () => {
      // Invalidate shortfall and session key using the correct query keys
      queryClient.invalidateQueries({ queryKey: ['balanceShortfall', characterId, injectedWallet?.address] });
      invalidateSessionKey(queryClient, injectedWallet?.address, characterId);
      // No direct refetchShortfall needed if using invalidateQueries
    }
  });
  
  // Mutation for deactivating session key
  const deactivateKeyMutation = useMutation({
    mutationKey: ['deactivateKey', characterId, sessionKey?.key, injectedWallet?.address],
    mutationFn: async () => {
      if (!client || !sessionKey?.key) {
        throw new Error('Client or session key missing');
      }
      // Adjust if client.deactivateSessionKey signature requires owner
      return client.deactivateSessionKey(sessionKey.key);
    },
    onSuccess: () => {
      // Invalidate session key using the correct query key
      invalidateSessionKey(queryClient, injectedWallet?.address, characterId);
    }
  });

  return {
    balanceShortfall,
    replenishBalance: replenishBalanceMutation.mutate,
    isReplenishing: replenishBalanceMutation.isPending,
    deactivateKey: deactivateKeyMutation.mutate,
    isDeactivating: deactivateKeyMutation.isPending,
    // Expose sessionKey data if needed by consumers of this hook
    sessionKey
  };
}; 