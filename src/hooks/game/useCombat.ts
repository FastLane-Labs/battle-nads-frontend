import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBattleNadsClient } from '../contracts/useBattleNadsClient';
import { useWallet } from '../../providers/WalletProvider';
import { useBattleNads } from './useBattleNads';
import { domain } from '../../types';

/**
 * Hook for combat functionality
 * Provides combat-related data and actions
 */
export const useCombat = () => {
  const { injectedWallet } = useWallet();
  const { client } = useBattleNadsClient();
  const queryClient = useQueryClient();
  
  // Owner address
  const owner = injectedWallet?.address || null;
  
  // Get game state for character and combat data
  const { gameState } = useBattleNads(owner);
  
  // Character ID
  const characterId = gameState?.character?.id || null;
  
  // Character
  const character = gameState?.character || null;
  
  // Combat-related calculations
  const isInCombat = useMemo(() => character?.isInCombat || false, [character]);
  
  // Combatants (hostile characters)
  const combatants = useMemo(() => 
    gameState?.combatants || [], 
    [gameState?.combatants]
  );
  
  // Attack mutation
  const attackMutation = useMutation({
    mutationFn: async (targetIndex: number) => {
      if (!client || !characterId) {
        throw new Error('Client or character ID missing');
      }
      
      return client.attack(characterId, targetIndex);
    },
    onSuccess: () => {
      // Invalidate and refetch game state
      queryClient.invalidateQueries({ queryKey: ['uiSnapshot', owner] });
    }
  });
  
  // Use ability mutation
  const useAbilityMutation = useMutation({
    mutationFn: async ({ ability, targetIndex }: { ability: domain.Ability, targetIndex: number }) => {
      if (!client || !characterId) {
        throw new Error('Client or character ID missing');
      }
      
      return client.useAbility(characterId, ability, targetIndex);
    },
    onSuccess: () => {
      // Invalidate and refetch game state
      queryClient.invalidateQueries({ queryKey: ['uiSnapshot', owner] });
    }
  });
  
  return {
    character,
    isInCombat,
    combatants,
    
    // Attack functionality
    attack: (targetIndex: number) => attackMutation.mutate(targetIndex),
    isAttacking: attackMutation.isPending,
    attackError: attackMutation.error ? (attackMutation.error as Error).message : null,
    
    // Ability functionality
    useAbility: (ability: domain.Ability, targetIndex: number) => 
      useAbilityMutation.mutate({ ability, targetIndex }),
    isUsingAbility: useAbilityMutation.isPending,
    abilityError: useAbilityMutation.error ? (useAbilityMutation.error as Error).message : null
  };
}; 