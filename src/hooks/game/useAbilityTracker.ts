import { useMemo } from 'react';
import { domain } from '@/types';
import { AbilityStage } from '@/types/domain/enums';
import { useSimplifiedGameState } from './useSimplifiedGameState';
import { AVG_BLOCK_TIME_MS } from '@/config/gas';

// Define stage durations for each ability (in blocks)
const ABILITY_STAGE_DURATIONS: Record<domain.Ability, { charging: number; action: number; cooldown: number }> = {
  [domain.Ability.None]: { charging: 0, action: 0, cooldown: 0 },
  // Warrior abilities
  [domain.Ability.ShieldBash]: { charging: 4, action: 2, cooldown: 24 },
  [domain.Ability.ShieldWall]: { charging: 3, action: 3, cooldown: 24 },
  // Rogue abilities  
  [domain.Ability.EvasiveManeuvers]: { charging: 2, action: 2, cooldown: 18 },
  [domain.Ability.ApplyPoison]: { charging: 5, action: 40, cooldown: 16 }, // Stage 1: 5 blocks, Stages 2-11: 40 blocks total, Stage 12: 16 blocks
  // Monk abilities
  [domain.Ability.Pray]: { charging: 8, action: 4, cooldown: 72 },
  [domain.Ability.Smite]: { charging: 3, action: 1, cooldown: 24 },
  // Sorcerer abilities
  [domain.Ability.Fireball]: { charging: 8, action: 4, cooldown: 56 },
  [domain.Ability.ChargeUp]: { charging: 4, action: 2, cooldown: 36 },
  // Bard abilities (no cooldown)
  [domain.Ability.SingSong]: { charging: 2, action: 2, cooldown: 0 },
  [domain.Ability.DoDance]: { charging: 2, action: 2, cooldown: 0 },
};

export interface AbilityTrackerData {
  /** Current ability from contract */
  activeAbility: domain.Ability;
  /** Current stage from contract or calculated */
  currentStage: AbilityStage;
  /** Target block for current stage */
  targetBlock: number;
  /** Estimated stage progress (0-100) */
  stageProgress: number;
  /** Time remaining in current stage (seconds) */
  timeRemaining: number;
  /** Total duration of current stage (seconds) */
  stageDuration: number;
  /** Whether ability data is from contract or optimistic */
  isOptimistic: boolean;
}

/**
 * Enhanced ability tracker hook that provides detailed ability state information
 * @returns Ability tracking data
 */
export const useAbilityTracker = () => {
  const { gameState, rawEndBlock } = useSimplifiedGameState({ 
    includeActions: false, 
    includeHistory: false 
  });

  const currentBlock = Number(rawEndBlock || 0);
  const character = gameState?.character;
  const contractAbility = character?.ability;

  const trackerData: AbilityTrackerData | null = useMemo(() => {
    if (!contractAbility) {
      return null;
    }

    const ability = contractAbility.ability;
    const stage = contractAbility.stage;
    const targetBlock = contractAbility.targetBlock;
    

    // Get stage durations for this ability
    const durations = ABILITY_STAGE_DURATIONS[ability] || ABILITY_STAGE_DURATIONS[domain.Ability.None];
    
    // Calculate stage-specific information
    let stageDurationBlocks = 0;
    let stageStartBlock = targetBlock;
    
    switch (stage) {
      case AbilityStage.CHARGING:
        stageDurationBlocks = durations.charging;
        stageStartBlock = targetBlock - stageDurationBlocks;
        break;
      case AbilityStage.ACTION:
        stageDurationBlocks = durations.action;
        stageStartBlock = targetBlock - stageDurationBlocks;
        break;
      case AbilityStage.COOLDOWN:
        stageDurationBlocks = durations.cooldown;
        stageStartBlock = targetBlock - stageDurationBlocks;
        break;
      case AbilityStage.READY:
      default:
        return {
          activeAbility: ability,
          currentStage: AbilityStage.READY,
          targetBlock: 0,
          stageProgress: 100,
          timeRemaining: 0,
          stageDuration: 0,
          isOptimistic: false
        };
    }

    // Calculate progress
    const blocksElapsed = Math.max(0, currentBlock - stageStartBlock);
    const blocksRemaining = Math.max(0, targetBlock - currentBlock);
    const progress = stageDurationBlocks > 0 
      ? Math.min(100, (blocksElapsed / stageDurationBlocks) * 100)
      : 100;

    // Convert blocks to seconds
    const timeRemaining = blocksRemaining * (AVG_BLOCK_TIME_MS / 1000);
    const stageDuration = stageDurationBlocks * (AVG_BLOCK_TIME_MS / 1000);

    const result = {
      activeAbility: ability,
      currentStage: stage,
      targetBlock,
      stageProgress: progress,
      timeRemaining,
      stageDuration,
      isOptimistic: false
    };
    
    
    return result;
  }, [contractAbility, currentBlock]);

  return {
    abilityTracker: trackerData,
    hasActiveAbility: trackerData !== null && trackerData.activeAbility !== domain.Ability.None,
    isAbilityActive: trackerData !== null && trackerData.currentStage !== AbilityStage.READY
  };
}; 