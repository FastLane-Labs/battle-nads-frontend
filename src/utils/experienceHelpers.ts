/**
 * Experience progression utilities for calculating level progress bars
 * Based on the smart contract's experience formula: level * 100 + level² * 5
 */

import type { LevelProgress, ExperienceRequirement, CharacterExperienceInfo } from '@/types/domain/experience';

export const EXP_BASE = 100;
export const EXP_SCALE = 5;

/** XP required to go FROM `level` TO `level + 1` (Solidity formula) */
export const experienceNeededForNextLevel = (level: number): number =>
  (level * EXP_BASE) + (level * level * EXP_SCALE);

/** XP held at the *start* of a level (-1 because level-1 has just been cleared) */
export const thresholdForLevelStart = (level: number): number =>
  level <= 1 ? 0 : experienceNeededForNextLevel(level - 1);

/**
 * Legacy function - kept for backward compatibility
 * @deprecated Use experienceNeededForNextLevel instead
 */
export function experienceNeededForLevel(level: number): number {
  if (level <= 0) return 0;
  return experienceNeededForNextLevel(level);
}

/**
 * Legacy function - kept for backward compatibility  
 * @deprecated Use thresholdForLevelStart instead
 */
export function cumulativeExperienceForLevel(level: number): number {
  return thresholdForLevelStart(level);
}

/**
 * Calculate which level a character should be based on their total experience
 * @param totalExperience The character's total accumulated experience
 * @returns The character's current level
 */
export function calculateLevelFromExperience(totalExperience: number): number {
  if (totalExperience <= 0) return 1;
  
  let level = 1;
  let cumulativeExp = 0;
  
  while (cumulativeExp < totalExperience) {
    const expForNextLevel = experienceNeededForLevel(level);
    if (cumulativeExp + expForNextLevel > totalExperience) {
      break;
    }
    cumulativeExp += expForNextLevel;
    level++;
  }
  
  return level;
}

/**
 * Calculate experience progress within the current level
 * @param experienceInCurrentLevel Experience points within the current level (not cumulative)
 * @param currentLevel The character's current level
 * @returns Object with current progress and total needed for this level
 */
export function calculateLevelProgress(experienceInCurrentLevel: number, currentLevel: number): LevelProgress {
  const expRequiredForCurrentLevel = experienceNeededForLevel(currentLevel);
  const expInLevel = Math.max(0, Math.min(experienceInCurrentLevel, expRequiredForCurrentLevel));
  
  return {
    currentExp: expInLevel,
    requiredExp: expRequiredForCurrentLevel,
    percentage: expRequiredForCurrentLevel > 0 ? (expInLevel / expRequiredForCurrentLevel) * 100 : 0
  };
}

/**
 * Get experience requirements for multiple levels at once
 * Useful for displaying level progression tables
 * @param maxLevel Maximum level to calculate (inclusive)
 * @returns Array of level requirements with cumulative totals
 */
export function getExperienceTable(maxLevel: number): ExperienceRequirement[] {
  const table = [];
  let cumulative = 0;
  
  for (let level = 1; level <= maxLevel; level++) {
    const required = experienceNeededForLevel(level);
    cumulative += required;
    table.push({
      level,
      requiredExp: required,
      cumulativeExp: cumulative
    });
  }
  
  return table;
}

