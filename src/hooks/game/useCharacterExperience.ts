/**
 * React hook for character experience calculations
 */

import { useMemo } from 'react';
import { calculateLevelProgress, cumulativeExperienceForLevel } from '@/utils/experienceHelpers';
import type { Character } from '@/types/domain/character';
import type { CharacterExperienceInfo } from '@/types/domain/experience';

/**
 * Hook to calculate experience progress for a character
 * @param character The character object
 * @returns Experience information including level progress
 */
export function useCharacterExperience(character: Character | null): CharacterExperienceInfo | null {
  return useMemo(() => {
    if (!character) return null;
    
    // The contract's experience field represents experience within the current level
    const experienceInCurrentLevel = Number(character.stats.experience);
    const currentLevel = Number(character.level);
    
    const levelProgress = calculateLevelProgress(experienceInCurrentLevel, currentLevel);
    const experienceToNextLevel = levelProgress.requiredExp - levelProgress.currentExp;
    
    // Calculate total experience (cumulative) for display
    const totalExperience = cumulativeExperienceForLevel(currentLevel - 1) + experienceInCurrentLevel;
    
    return {
      currentLevel,
      totalExperience,
      levelProgress,
      experienceToNextLevel
    };
  }, [character?.stats.experience, character?.level]);
}

/**
 * Hook to calculate experience progress from raw values
 * @param experienceInCurrentLevel Experience within the current level
 * @param currentLevel Current character level
 * @returns Experience information including level progress
 */
export function useExperienceProgress(
  experienceInCurrentLevel: number, 
  currentLevel: number
): CharacterExperienceInfo {
  return useMemo(() => {
    const levelProgress = calculateLevelProgress(experienceInCurrentLevel, currentLevel);
    const experienceToNextLevel = levelProgress.requiredExp - levelProgress.currentExp;
    const totalExperience = cumulativeExperienceForLevel(currentLevel - 1) + experienceInCurrentLevel;
    
    return {
      currentLevel,
      totalExperience,
      levelProgress,
      experienceToNextLevel
    };
  }, [experienceInCurrentLevel, currentLevel]);
}