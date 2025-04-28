import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBattleNadsClient } from '../contracts/useBattleNadsClient';
import { useWallet } from '../../providers/WalletProvider';
import { useBattleNads } from '../game/useBattleNads';
import { useSessionKey } from './useSessionKey';

/**
 * Hook for session key funding and management
 * Provides functions to replenish gas balance and deactivate session keys
 */
export const useSessionFunding = (characterId: string | null) => {
  const { injectedWallet, embeddedWallet } = useWallet();
  const { client } = useBattleNadsClient();
  const queryClient = useQueryClient();
  
  // Owner address
  const owner = injectedWallet?.address || null;
  
  // Get session key data
  const { 
    sessionKey, 
    sessionKeyState, 
    refreshSessionKey 
  } = useSessionKey(characterId);
  
  // Get game state for balance information
  const { gameState } = useBattleNads(owner);
  
  // Get balance shortfall
  const { data: balanceShortfall, refetch: refetchShortfall } = useQuery({
    queryKey: ['balanceShortfall', characterId],
    queryFn: async () => {
      if (!client || !characterId) {
        return BigInt(0);
      }
      
      return client.shortfallToRecommendedBalanceInMON(characterId);
    },
    enabled: !!client && !!characterId
  });
  
  // Check if funds are needed
  const needsFunding = balanceShortfall ? balanceShortfall > 0 : false;
  
  // Mutation for replenishing gas balance
  const replenishBalanceMutation = useMutation({
    mutationKey: ['replenishBalance', characterId],
    mutationFn: async (amount: bigint) => {
      if (!client) {
        throw new Error('Client missing');
      }
      
      return client.replenishGasBalance(amount);
    },
    onSuccess: () => {
      // Invalidate and refetch shortfall and session key data
      queryClient.invalidateQueries({ queryKey: ['balanceShortfall', characterId] });
      queryClient.invalidateQueries({ queryKey: ['sessionKey', characterId] });
      refreshSessionKey();
      refetchShortfall();
    }
  });
  
  // Mutation for deactivating session key
  const deactivateKeyMutation = useMutation({
    mutationKey: ['deactivateKey', characterId, sessionKey?.key],
    mutationFn: async () => {
      if (!client || !sessionKey?.key) {
        throw new Error('Client or session key missing');
      }
      
      return client.deactivateSessionKey(sessionKey.key);
    },
    onSuccess: () => {
      // Invalidate and refetch session key data
      queryClient.invalidateQueries({ queryKey: ['sessionKey', characterId] });
      refreshSessionKey();
    }
  });

  // Get session key balance from gameState
  const ownerCommittedAmount = gameState?.balanceShortfall ? BigInt(0) : BigInt(0);
  const keyBalance = sessionKey?.expiration ? BigInt(0) : BigInt(0);
  
  return {
    // Session key data
    sessionKey,
    sessionKeyState,
    
    // Balance information
    balanceShortfall: balanceShortfall || BigInt(0),
    needsFunding,
    ownerCommittedAmount,
    keyBalance,
    
    // Funding actions
    replenishBalance: (amount: bigint) => replenishBalanceMutation.mutate(amount),
    isReplenishing: replenishBalanceMutation.isPending,
    replenishError: replenishBalanceMutation.error ? (replenishBalanceMutation.error as Error).message : null,
    
    // Session key management
    deactivateKey: () => deactivateKeyMutation.mutate(),
    isDeactivating: deactivateKeyMutation.isPending,
    deactivateError: deactivateKeyMutation.error ? (deactivateKeyMutation.error as Error).message : null
  };
}; 