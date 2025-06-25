/**
 * Experience progression utilities for calculating level progress bars
 * Based on the smart contract's experience formula: level * 100 + level² * 5
 */

import type { LevelProgress, ExperienceRequirement, CharacterExperienceInfo } from '@/types/domain/experience';

const EXP_BASE = 100;
const EXP_SCALE = 5;

/**
 * Calculate the total experience required to reach a specific level
 * @param level The target level (1-based)
 * @returns Total experience needed from level 0 to reach this level
 */
export function experienceNeededForLevel(level: number): number {
  if (level <= 0) return 0;
  return (level * EXP_BASE) + (level * level * EXP_SCALE);
}

/**
 * Calculate total experience threshold needed to reach a specific level
 * Based on smart contract logic: each level has an absolute XP threshold
 * @param level The target level
 * @returns Total experience threshold needed to reach this level
 */
export function cumulativeExperienceForLevel(level: number): number {
  if (level <= 0) return 0;
  
  // The smart contract uses: experienceNeededForNextLevel = (currentLevel * EXP_BASE) + (currentLevel * currentLevel * EXP_SCALE)
  // This gives the absolute XP threshold to reach the NEXT level
  // So to reach level N, we need the threshold calculated from level N-1
  return experienceNeededForLevel(level);
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

