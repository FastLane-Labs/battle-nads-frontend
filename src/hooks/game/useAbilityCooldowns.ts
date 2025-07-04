import { useMemo, useCallback, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { domain, hooks } from '@/types';
import { AbilityStage } from '@/types/domain/enums';
import { useSimplifiedGameState } from './useSimplifiedGameState';
import { useBattleNadsClient } from '../contracts/useBattleNadsClient';
import { useWallet } from '@/providers/WalletProvider';
import { useToast } from '@chakra-ui/react';
import { AVG_BLOCK_TIME_MS } from '@/config/gas';
import { useGameMutation } from './useGameMutation';
import { useOptimisticAbilities } from '../optimistic/useOptimisticAbilities';

// Define ability-specific cooldown durations in blocks (after final stage completion)
const ABILITY_COOLDOWN_BLOCKS: Record<domain.Ability, number> = {
  [domain.Ability.None]: 0,
  [domain.Ability.ShieldBash]: 24,
  [domain.Ability.ShieldWall]: 24, 
  [domain.Ability.EvasiveManeuvers]: 18,
  [domain.Ability.ApplyPoison]: 64,
  [domain.Ability.Pray]: 72,
  [domain.Ability.Smite]: 24,
  [domain.Ability.Fireball]: 56,
  [domain.Ability.ChargeUp]: 36,
  [domain.Ability.SingSong]: 0, // Bard abilities have no cooldown
  [domain.Ability.DoDance]: 0,  // Bard abilities have no cooldown
};

// Generic fallback for unknown abilities
const DEFAULT_ABILITY_TIMEOUT_BLOCKS = 200;

export interface AbilityStatus {
  ability: domain.Ability;
  stage: AbilityStage;
  /** The block number when the ability's action/charge completes (from contract) */
  targetBlock: number; 
  /** The current latest block number from the snapshot */
  currentBlock: number;
  /** Estimated seconds until the ability is ready again */
  secondsLeft: number;
  /** Whether the ability can be used now */
  isReady: boolean;
  /** User-friendly description of the ability and its current state */
  description: string;
  /** Indicates if a gas shortfall might be preventing cooldown progression */
  gasShortfall: boolean;
  /** The initial total seconds for the current cooldown/charging period, if known */
  currentCooldownInitialTotalSeconds?: number;
}

/**
 * Hook for managing ability cooldowns and status
 * @param characterId The character ID
 * @returns Ability statuses and actions
 */
export const useAbilityCooldowns = (characterId: string | null): hooks.UseAbilityCooldownsReturn => {
  const { injectedWallet } = useWallet();
  const { client } = useBattleNadsClient();
  const toast = useToast();
  
  // Owner address
  const owner = injectedWallet?.address || null;
  
  // Get game state for ability data
  const {
    gameState,
    isLoading: isGameLoading,
    error: gameError,
    balanceShortfall: rawBalanceShortfall,
    rawEndBlock,
  } = useSimplifiedGameState({ includeActions: false, includeHistory: false });

  // Current block from the snapshot
  const currentBlock = useMemo(() => {
    const blockNum = Number(rawEndBlock || 0);
    return blockNum;
  }, [rawEndBlock]);
  
  // Determine if there's a gas shortfall
  const hasGasShortfall = useMemo(() => {
    return typeof rawBalanceShortfall !== 'undefined' && Number(rawBalanceShortfall) > 0;
  }, [rawBalanceShortfall]);

  // Get ability details from character and class
  const character = gameState?.character;
  const characterName = character?.name || 'Character';
  

  // Use centralized optimistic ability system
  const {
    addOptimisticAbilityUse,
    confirmAbilityUse,
    optimisticAbilityUses
  } = useOptimisticAbilities();

  const abilitiesFromGameState = useMemo(() => {
    if (!character || typeof character.class === 'undefined') return [];
    
    // Get available abilities based on character class
    const availableAbilities = getAbilitiesForClass(character.class);
    
    // Map abilities to their status
    return availableAbilities.map(ability => {
      let stage = AbilityStage.READY;
      let originalTargetBlock = 0;
      let readyAgainBlock = 0;
      let secondsLeft = 0;
      let isReady = true;

      // Check if this is the currently active ability on the character
      if (character.ability.ability === ability && character.ability.stage !== AbilityStage.READY) {
        stage = character.ability.stage as AbilityStage;
        originalTargetBlock = character.ability.targetBlock;
        

        // Determine when the ability will be ready based on its stage
        if (stage === AbilityStage.CHARGING) {
          // Ready when charging completes
          readyAgainBlock = originalTargetBlock;
        } else if (stage === AbilityStage.ACTION || stage === AbilityStage.COOLDOWN) {
          // Ready after the ability-specific cooldown period post-targetBlock
          const cooldownBlocks = ABILITY_COOLDOWN_BLOCKS[ability] || DEFAULT_ABILITY_TIMEOUT_BLOCKS;
          readyAgainBlock = originalTargetBlock + cooldownBlocks;
        }
        
        // Calculate seconds left until ready
        if (readyAgainBlock > 0) {
           secondsLeft = Math.max(0, readyAgainBlock - currentBlock) * (AVG_BLOCK_TIME_MS / 1000);
        }

        // Determine readiness based on current block vs readyAgainBlock
        isReady = currentBlock >= readyAgainBlock;

      } else {
        // If it's not the active ability, or the active ability is READY, it's ready.
        stage = AbilityStage.READY;
        originalTargetBlock = 0;
        readyAgainBlock = 0;
        secondsLeft = 0;
        isReady = true;
      }
      
      let initialTotalSecondsForCurrentStage: number | undefined = undefined;
      if (stage === AbilityStage.COOLDOWN) {
        const cooldownBlocks = ABILITY_COOLDOWN_BLOCKS[ability] || DEFAULT_ABILITY_TIMEOUT_BLOCKS;
        initialTotalSecondsForCurrentStage = cooldownBlocks * (AVG_BLOCK_TIME_MS / 1000);
      } else if (stage === AbilityStage.CHARGING || stage === AbilityStage.ACTION) {
        // For CHARGING/ACTION, targetBlock is the end. secondsLeft is (targetBlock - currentBlock).
        // The initial total would have been (targetBlock - block_stage_started_at).
        // This is hard to get perfectly without block_stage_started_at.
        // As a proxy, if secondsLeft is positive, we can assume it started with at least that much.
        // Or, we could use the static map here if we want, but let's leave it undefined for now
        // if a more precise value isn't easily derived directly from current contract state.
      }

      return {
        ability,
        stage,
        targetBlock: originalTargetBlock, // Keep original target block for reference
        currentBlock,
        secondsLeft,
        isReady,
        description: getAbilityDescription(ability, stage, characterName),
        // Gas shortfall might prevent progression only if the ability is *supposed* to be cooling down/charging
        gasShortfall: hasGasShortfall && !isReady && stage !== AbilityStage.READY,
        currentCooldownInitialTotalSeconds: initialTotalSecondsForCurrentStage,
      };
    });
  }, [character, currentBlock, hasGasShortfall, characterName, getAbilityDescription]);

  // This useMemo applies the optimistic update to the abilities derived from gameState
  const finalAbilities = useMemo(() => {
    if (!characterId) return abilitiesFromGameState;
    
    return abilitiesFromGameState.map(status => {
      // Check if there's an optimistic update for this ability
      const optimisticUse = optimisticAbilityUses.find(use => 
        use.characterId === characterId && use.abilityIndex === status.ability
      );
      
      if (optimisticUse) {
        // Calculate optimistic cooldown properties
        const cooldownBlocks = ABILITY_COOLDOWN_BLOCKS[status.ability] || DEFAULT_ABILITY_TIMEOUT_BLOCKS;
        const optimisticReadyAgainBlock = Number(optimisticUse.blockUsed) + cooldownBlocks;
        const optimisticSecondsLeft = Math.max(0, optimisticReadyAgainBlock - currentBlock) * (AVG_BLOCK_TIME_MS / 1000);
        const optimisticIsReady = currentBlock >= optimisticReadyAgainBlock;

        let optimisticDescription = '';
        if (optimisticIsReady) {
          optimisticDescription = getAbilityDescription(status.ability, AbilityStage.READY, characterName);
        } else {
          optimisticDescription = getAbilityDescription(status.ability, AbilityStage.COOLDOWN, characterName);
        }

        const optimisticInitialTotalSeconds = cooldownBlocks * (AVG_BLOCK_TIME_MS / 1000);

        return {
          ...status,
          isReady: optimisticIsReady,
          stage: optimisticIsReady ? AbilityStage.READY : AbilityStage.COOLDOWN,
          secondsLeft: optimisticSecondsLeft,
          description: optimisticDescription,
          currentCooldownInitialTotalSeconds: optimisticInitialTotalSeconds,
          gasShortfall: !optimisticIsReady && status.gasShortfall
        };
      }
      
      return status;
    });
  }, [abilitiesFromGameState, characterId, currentBlock, getAbilityDescription, characterName, optimisticAbilityUses]);

  // Effect to clear the optimistic flag once the gameState confirms the ability is no longer ready
  useEffect(() => {
    if (!characterId) return;
    
    // Check each ability from game state to see if it's now confirmed as not ready
    abilitiesFromGameState.forEach(status => {
      const hasOptimisticUse = optimisticAbilityUses.some(use => 
        use.characterId === characterId && use.abilityIndex === status.ability
      );
      
      if (!status.isReady && hasOptimisticUse) {
        // The ability is confirmed to be on cooldown, we can remove the optimistic update
        confirmAbilityUse(characterId, status.ability);
      }
    });
  }, [abilitiesFromGameState, characterId, optimisticAbilityUses, confirmAbilityUse]);

  // Mutation for using an ability
  const abilityMutation = useGameMutation(
    async ({ abilityIndex, targetIndex }: { abilityIndex: domain.Ability, targetIndex: number }) => {
      if (!client || !characterId) {
        throw new Error('Client or Character ID not available for using ability');
      }
      return client.useAbility(characterId, abilityIndex, targetIndex);
    },
    {
      successMessage: 'Your ability has been activated!',
      errorMessage: (error) => error.message || 'Failed to use ability',
      mutationKey: ['useAbility', characterId || 'unknown', owner || 'unknown'],
      onSuccess: (_, variables) => {
        if (characterId) {
          // Add optimistic ability use with current block
          addOptimisticAbilityUse(
            variables.abilityIndex,
            BigInt(currentBlock),
            characterId
          );
        }
      },
    }
  );

  // Function to use an ability
  const useAbility = useCallback((abilityIndex: domain.Ability, targetIndex: number = 0) => {
    if (!characterId) {
      console.error('[useAbilityCooldowns] Cannot use ability, characterId missing.');
      return;
    }
    
    const abilityStatus = finalAbilities.find(a => a.ability === abilityIndex);
    
    if (!abilityStatus) {
       // Let useGameMutation handle the error toast
       abilityMutation.mutate({ abilityIndex, targetIndex });
       return;
    }
    
    // Use the calculated isReady flag
    if (!abilityStatus.isReady) { 
      // For ability not ready, we still show a custom warning toast
      // since this is a validation error, not a mutation error
      toast({
        title: 'Ability Not Ready',
        description: `This ability is currently ${getStageDescription(abilityStatus.stage)}. ${abilityStatus.secondsLeft.toFixed(0)}s remaining.`,
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    // Execute the mutation
    abilityMutation.mutate({ abilityIndex, targetIndex });
  }, [characterId, finalAbilities, abilityMutation, toast]);

  return {
    abilities: finalAbilities,
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
    case domain.CharacterClass.Bard:
      return [domain.Ability.SingSong, domain.Ability.DoDance];
    case domain.CharacterClass.Warrior:
      return [domain.Ability.ShieldBash, domain.Ability.ShieldWall];
    case domain.CharacterClass.Rogue:
      return [domain.Ability.EvasiveManeuvers, domain.Ability.ApplyPoison];
    case domain.CharacterClass.Monk:
      return [domain.Ability.Pray, domain.Ability.Smite];
    case domain.CharacterClass.Sorcerer:
      return [domain.Ability.Fireball, domain.Ability.ChargeUp];
    case domain.CharacterClass.Basic:
    case domain.CharacterClass.Elite:
    case domain.CharacterClass.Boss:
    case domain.CharacterClass.Null:
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
      return 'in an unknown state';
  }
}

/**
 * Get ability description based on ability type, stage, and character name
 */
function getAbilityDescription(ability: domain.Ability, stage: AbilityStage, characterName: string): string {
  // Base ability name (more readable)
  const abilityName = (domain.Ability[ability] || 'Unknown Ability').replace(/([A-Z])/g, ' $1').trim();

  // Stage-specific descriptions
  if (stage === AbilityStage.CHARGING) {
    return `${characterName} is charging ${abilityName}`;
  } else if (stage === AbilityStage.ACTION) {
    return `${characterName} is using ${abilityName}`; // Or `${abilityName} (Active)` if preferred
  } else if (stage === AbilityStage.COOLDOWN) {
    return `${characterName} is recovering from ${abilityName}`; // Or `${abilityName} (Cooldown)`
  } else if (stage === AbilityStage.READY) {
     return `${abilityName} (Ready)`;
  }

  // Fallback for unknown stages
  return `${abilityName} (${getStageDescription(stage)})`;
} 