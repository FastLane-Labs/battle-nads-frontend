import { useMemo, useCallback, useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { domain } from '@/types';
import { AbilityStage } from '@/types/domain/enums';
import { useBattleNads } from './useBattleNads';
import { useBattleNadsClient } from '../contracts/useBattleNadsClient';
import { useWallet } from '@/providers/WalletProvider';
import { useToast } from '@chakra-ui/react';
import { AVG_BLOCK_TIME_MS } from '@/config/gas';

// Define the cooldown timeout period in blocks
const ABILITY_TIMEOUT_BLOCKS = 200;

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
  const character = gameState?.character;
  const characterName = character?.name || 'Character';

  // State to hold the ability index that was just optimistically used
  const [optimisticallyUsedAbility, setOptimisticallyUsedAbility] = useState<domain.Ability | null>(null);
  // State to hold the block number when the optimistic cooldown started
  const [blockOfOptimisticUse, setBlockOfOptimisticUse] = useState<number | null>(null);

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
          // Ready after the 200 block timeout period post-targetBlock
          readyAgainBlock = originalTargetBlock + ABILITY_TIMEOUT_BLOCKS;
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
        initialTotalSecondsForCurrentStage = ABILITY_TIMEOUT_BLOCKS * (AVG_BLOCK_TIME_MS / 1000);
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
    if (!optimisticallyUsedAbility || blockOfOptimisticUse === null) {
      return abilitiesFromGameState;
    }
    return abilitiesFromGameState.map(status => {
      // Check if the current status object is for the optimistically used ability
      if (status.ability === optimisticallyUsedAbility) {
        // Calculate optimistic cooldown properties regardless of the underlying gameState for this ability
        const optimisticReadyAgainBlock = blockOfOptimisticUse + ABILITY_TIMEOUT_BLOCKS;
        const optimisticSecondsLeft = Math.max(0, optimisticReadyAgainBlock - currentBlock) * (AVG_BLOCK_TIME_MS / 1000);
        const optimisticIsReady = currentBlock >= optimisticReadyAgainBlock;
        
        let optimisticDescription = '';
        if (optimisticIsReady) {
          optimisticDescription = getAbilityDescription(status.ability, AbilityStage.READY, characterName);
        } else {
          // Align with the standard getAbilityDescription for COOLDOWN stage, but acknowledge it's optimistic indirectly by context
          // The main getAbilityDescription already formats this well.
          optimisticDescription = getAbilityDescription(status.ability, AbilityStage.COOLDOWN, characterName);
        }

        const optimisticInitialTotalSeconds = ABILITY_TIMEOUT_BLOCKS * (AVG_BLOCK_TIME_MS / 1000);

        return {
          ...status, // Spread the original status to keep other properties like base damage, etc.
          isReady: optimisticIsReady,
          stage: optimisticIsReady ? AbilityStage.READY : AbilityStage.COOLDOWN,
          secondsLeft: optimisticSecondsLeft,
          description: optimisticDescription,
          currentCooldownInitialTotalSeconds: optimisticInitialTotalSeconds,
          gasShortfall: !optimisticIsReady && status.gasShortfall // Only show if optimistically cooling and original state had it
        };
      }
      // If not the optimistically used ability, return its status from gameState as is
      return status;
    });
  }, [abilitiesFromGameState, optimisticallyUsedAbility, blockOfOptimisticUse, characterName, currentBlock, getAbilityDescription]);

  // Effect to clear the optimistic flag once the gameState confirms the ability is no longer ready
  useEffect(() => {
    if (optimisticallyUsedAbility) {
      const confirmedStatus = abilitiesFromGameState.find(s => s.ability === optimisticallyUsedAbility);
      if (confirmedStatus && !confirmedStatus.isReady) {
        setOptimisticallyUsedAbility(null);
        setBlockOfOptimisticUse(null); // Clear block reference too
      }
    }
  }, [abilitiesFromGameState, optimisticallyUsedAbility]);

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
      setOptimisticallyUsedAbility(variables.abilityIndex); // Set optimistic flag
      setBlockOfOptimisticUse(currentBlock); // Capture current block at time of use
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
    
    const abilityStatus = finalAbilities.find(a => a.ability === abilityIndex);
    
    if (!abilityStatus) {
       console.error(`[useAbilityCooldowns] Status not found for ability ${abilityIndex}`);
       toast({ title: 'Error', description: `Could not find status for ability ${domain.Ability[abilityIndex]}.`, status: 'error' });
       return;
    }

    // Use the calculated isReady flag
    if (!abilityStatus.isReady) { 
      console.warn(`[useAbilityCooldowns] Ability ${abilityIndex} is not ready.`);
      toast({
        title: 'Ability Not Ready',
        description: `This ability is currently ${getStageDescription(abilityStatus.stage)}. ${abilityStatus.secondsLeft.toFixed(0)}s remaining.`,
        status: 'warning',
        duration: 3000,
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
      return 'in an unknown state'; // More descriptive default
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