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
 * Calculate cumulative experience required to reach a level
 * This sums up all experience needed from level 1 to the target level
 * @param level The target level
 * @returns Total cumulative experience needed
 */
export function cumulativeExperienceForLevel(level: number): number {
  if (level <= 0) return 0;
  
  let total = 0;
  for (let i = 1; i <= level; i++) {
    total += experienceNeededForLevel(i);
  }
  return total;
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
 * @param totalExperience The character's total accumulated experience
 * @param currentLevel The character's current level
 * @returns Object with current progress and total needed for this level
 */
export function calculateLevelProgress(totalExperience: number, currentLevel: number): LevelProgress {
  if (currentLevel <= 1) {
    const requiredExp = experienceNeededForLevel(1);
    return {
      currentExp: Math.min(totalExperience, requiredExp),
      requiredExp,
      percentage: Math.min((totalExperience / requiredExp) * 100, 100)
    };
  }
  
  const expForPreviousLevels = cumulativeExperienceForLevel(currentLevel - 1);
  const expRequiredForCurrentLevel = experienceNeededForLevel(currentLevel);
  const expInCurrentLevel = Math.max(0, totalExperience - expForPreviousLevels);
  
  return {
    currentExp: Math.min(expInCurrentLevel, expRequiredForCurrentLevel),
    requiredExp: expRequiredForCurrentLevel,
    percentage: Math.min((expInCurrentLevel / expRequiredForCurrentLevel) * 100, 100)
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

/**
 * Get comprehensive experience information for a character
 * @param totalExperience The character's total accumulated experience
 * @param currentLevel The character's current level
 * @returns Complete experience information including progress and next level requirements
 */
export function getCharacterExperienceInfo(totalExperience: number, currentLevel: number): CharacterExperienceInfo {
  const levelProgress = calculateLevelProgress(totalExperience, currentLevel);
  const experienceToNextLevel = levelProgress.requiredExp - levelProgress.currentExp;
  
  return {
    currentLevel,
    totalExperience,
    levelProgress,
    experienceToNextLevel
  };
}