import { useMemo, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { domain } from '@/types';
import { AbilityStage } from '@/types/domain/enums';
import { AVG_BLOCK_TIME } from '@/config/gas';
import { useBattleNads } from './useBattleNads';
import { useBattleNadsClient } from '../contracts/useBattleNadsClient';
import { useWallet } from '@/providers/WalletProvider';
import { useToast } from '@chakra-ui/react';

export interface AbilityStatus {
  ability: domain.Ability;
  stage: AbilityStage;
  targetBlock: number;
  currentBlock: number;
  secondsLeft: number;
  isReady: boolean;
  description: string;
  gasShortfall: boolean;
}

/**
 * Hook for managing ability cooldowns and status
 * @param characterId The character ID
 * @returns Ability statuses and actions
 */
export const useAbilityCooldowns = (characterId: string | null) => {
  const { injectedWallet } = useWallet();
  const { client } = useBattleNadsClient();
  const queryClient = useQueryClient();
  const toast = useToast();
  
  // Owner address
  const owner = injectedWallet?.address || null;
  
  // Get game state for ability data
  const {
    gameState,
    isLoading: isGameLoading,
    error: gameError,
    rawBalanceShortfall,
    rawEndBlock,
  } = useBattleNads(owner);

  // Current block from the snapshot
  const currentBlock = useMemo(() => Number(rawEndBlock || 0), [rawEndBlock]);
  
  // Determine if there's a gas shortfall
  const hasGasShortfall = useMemo(() => {
    return typeof rawBalanceShortfall !== 'undefined' && Number(rawBalanceShortfall) > 0;
  }, [rawBalanceShortfall]);

  // Get ability details from character and class
  const abilities = useMemo(() => {
    if (!gameState?.character) return [];
    
    const character = gameState.character;
    const characterClass = character.class;
    
    // Default ability status
    const getDefaultStatus = (ability: domain.Ability): AbilityStatus => ({
      ability,
      stage: AbilityStage.READY,
      targetBlock: 0,
      currentBlock,
      secondsLeft: 0,
      isReady: true,
      description: getAbilityDescription(ability, AbilityStage.READY),
      gasShortfall: hasGasShortfall // Gas shortfall affects readiness implicitly if ability is not ready
    });

    // Get available abilities based on character class
    const availableAbilities = getAbilitiesForClass(characterClass);
    
    // Map abilities to their status
    return availableAbilities.map(ability => {
      // If this is the active ability for the character
      if (character.ability.ability === ability) {
        const stage = character.ability.stage as AbilityStage;
        const targetBlock = character.ability.targetBlock;
        const secondsLeft = stage === AbilityStage.READY ? 0 : Math.max(0, targetBlock - currentBlock) * AVG_BLOCK_TIME;
        const isReady = stage === AbilityStage.READY || (stage > AbilityStage.READY && secondsLeft <= 0);
        
        return {
          ability,
          stage,
          targetBlock,
          currentBlock,
          secondsLeft,
          isReady,
          description: getAbilityDescription(ability, stage),
          // Gas shortfall is relevant only if the ability is *supposed* to be cooling down/charging but might be stuck
          gasShortfall: hasGasShortfall && !isReady
        };
      }
      
      // For non-active abilities or if no ability is active, it's ready
      return getDefaultStatus(ability);
    });
  }, [gameState?.character, currentBlock, hasGasShortfall]);

  // Mutation for using an ability
  const abilityMutation = useMutation({
    mutationFn: async ({ abilityIndex, targetIndex }: { abilityIndex: domain.Ability, targetIndex: number }) => {
      if (!client || !characterId) {
        throw new Error('Client or Character ID not available for using ability');
      }
      console.log(`[useAbilityCooldowns] Using ability ${abilityIndex} on target ${targetIndex} for char ${characterId}`);
      return client.useAbility(characterId, abilityIndex, targetIndex);
    },
    onSuccess: (data, variables) => {
      console.log(`[useAbilityCooldowns] Ability ${variables.abilityIndex} used successfully. Tx:`, data?.hash);
      toast({
        title: 'Ability Used',
        description: 'Your ability has been activated!',
        status: 'success',
        duration: 3000,
      });
      // Invalidate queries to refetch game state after success
      queryClient.invalidateQueries({ queryKey: ['uiSnapshot', owner] });
    },
    onError: (error: Error, variables) => {
      console.error(`[useAbilityCooldowns] Error using ability ${variables.abilityIndex}:`, error);
      toast({
        title: 'Ability Failed',
        description: error.message || 'Failed to use ability',
        status: 'error',
        duration: 5000,
      });
    }
  });

  // Function to use an ability
  const useAbility = useCallback((abilityIndex: domain.Ability, targetIndex: number = 0) => {
    if (!characterId) {
      console.error('[useAbilityCooldowns] Cannot use ability, characterId missing.');
      return;
    }
    
    const abilityStatus = abilities.find(a => a.ability === abilityIndex);
    
    if (!abilityStatus) {
       console.error(`[useAbilityCooldowns] Status not found for ability ${abilityIndex}`);
       return;
    }

    if (!abilityStatus.isReady) {
      console.warn(`[useAbilityCooldowns] Ability ${abilityIndex} is not ready.`);
      toast({
        title: 'Ability Not Ready',
        description: `This ability is currently ${getStageDescription(abilityStatus.stage)}. ${abilityStatus.secondsLeft.toFixed(1)}s remaining.`,
        status: 'warning',
        duration: 3000,
      });
      return;
    }
    
    // Execute the mutation
    abilityMutation.mutate({ abilityIndex, targetIndex });
  }, [characterId, abilities, abilityMutation, toast, client, owner, queryClient]); // Added missing dependencies

  return {
    abilities,
    useAbility,
    isUsingAbility: abilityMutation.isPending,
    abilityError: abilityMutation.error,
    isLoading: isGameLoading,
    error: gameError
  };
};

/**
 * Get available abilities for a character class
 */
function getAbilitiesForClass(characterClass: domain.CharacterClass): domain.Ability[] {
  switch (characterClass) {
    case domain.CharacterClass.Warrior:
      return [domain.Ability.ShieldBash, domain.Ability.ShieldWall];
    case domain.CharacterClass.Rogue:
      return [domain.Ability.EvasiveManeuvers, domain.Ability.ApplyPoison];
    case domain.CharacterClass.Monk:
      return [domain.Ability.Pray, domain.Ability.Smite];
    case domain.CharacterClass.Sorcerer:
      return [domain.Ability.Fireball, domain.Ability.ChargeUp];
    case domain.CharacterClass.Bard:
      return [domain.Ability.SingSong, domain.Ability.DoDance];
    // Add other classes if they exist
    // case domain.CharacterClass.Basic:
    // case domain.CharacterClass.Elite:
    // case domain.CharacterClass.Boss:
    default:
      return []; // Monsters or unhandled classes have no usable abilities
  }
}

/**
 * Get user-friendly stage description
 */
function getStageDescription(stage: AbilityStage): string {
  switch (stage) {
    case AbilityStage.READY:
      return 'ready';
    case AbilityStage.CHARGING:
      return 'charging';
    case AbilityStage.ACTION:
      return 'in action';
    case AbilityStage.COOLDOWN:
      return 'on cooldown';
    default:
      // Should not happen with valid stage numbers, but handle defensively
      console.warn(`[useAbilityCooldowns] Unknown ability stage: ${stage}`);
      return 'unavailable';
  }
}

/**
 * Get ability description based on ability type and stage
 */
function getAbilityDescription(ability: domain.Ability, stage: AbilityStage): string {
  // Base description from Ability enum name (fallback)
  let baseDescription = domain.Ability[ability] || 'Unknown Ability';
  // Make it more readable
  baseDescription = baseDescription.replace(/([A-Z])/g, ' $1').trim(); 

  // Ability-specific descriptions (override fallback if needed)
  switch (ability) {
    case domain.Ability.ShieldBash:
      baseDescription = 'Bash target with shield, dealing damage and stunning';
      break;
    case domain.Ability.ShieldWall:
      baseDescription = 'Defensive stance reducing incoming damage';
      break;
    case domain.Ability.EvasiveManeuvers:
      baseDescription = 'Dodge attacks with increased chance';
      break;
    case domain.Ability.ApplyPoison:
      baseDescription = 'Apply poison to weapon, causing damage over time';
      break;
    case domain.Ability.Pray:
      baseDescription = 'Pray for divine healing';
      break;
    case domain.Ability.Smite:
      baseDescription = 'Channel divine energy to smite enemies';
      break;
    case domain.Ability.Fireball:
      baseDescription = 'Cast a fireball at target';
      break;
    case domain.Ability.ChargeUp:
      baseDescription = 'Charge magical energy for increased damage';
      break;
    case domain.Ability.SingSong:
      baseDescription = 'Sing to boost morale or heal'; // Generic description
      break;
    case domain.Ability.DoDance:
      baseDescription = 'Perform a distracting or inspiring dance'; // Generic description
      break;
    // No default needed as we use the enum name fallback
  }
  
  // Add stage-specific suffix
  let suffix = '';
  if (stage === AbilityStage.CHARGING) {
    suffix = ' (Charging)';
  } else if (stage === AbilityStage.ACTION) {
    suffix = ' (Active)';
  } else if (stage === AbilityStage.COOLDOWN) {
    suffix = ' (Cooldown)';
  }
  
  return baseDescription + suffix;
} 