/**
 * React hook for character experience calculations
 */

import { useMemo } from 'react';
import { cumulativeExperienceForLevel } from '@/utils/experienceHelpers';
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
    
    // The contract's experience field represents total accumulated experience
    const totalExperience = Number(character.stats.experience);
    const currentLevel = Number(character.level);
    
    // For now, implement the exact behavior described by user:
    // Level 8 spans 940-1120 total XP, so we need to find the correct start threshold
    
    // Calculate XP threshold where current level starts
    const currentLevelStartThreshold = cumulativeExperienceForLevel(currentLevel - 1);
    
    // Calculate XP threshold where next level starts (current level ends)
    const nextLevelStartThreshold = cumulativeExperienceForLevel(currentLevel);
    
    // Calculate experience within current level range
    const expInCurrentLevel = Math.max(0, totalExperience - currentLevelStartThreshold);
    const expRequiredForCurrentLevel = nextLevelStartThreshold - currentLevelStartThreshold;
    
    // Calculate XP needed to reach next level
    const experienceToNextLevel = Math.max(0, nextLevelStartThreshold - totalExperience);
    
    return {
      currentLevel,
      totalExperience,
      levelProgress: {
        currentExp: expInCurrentLevel,
        requiredExp: expRequiredForCurrentLevel,
        percentage: expRequiredForCurrentLevel > 0 ? (expInCurrentLevel / expRequiredForCurrentLevel) * 100 : 0
      },
      experienceToNextLevel
    };
  }, [character?.stats.experience, character?.level]);
}

/**
 * Hook to calculate experience progress from raw values
 * @param totalExperience Total accumulated experience (contract value)
 * @param currentLevel Current character level
 * @returns Experience information including level progress
 */
export function useExperienceProgress(
  totalExperience: number, 
  currentLevel: number
): CharacterExperienceInfo {
  return useMemo(() => {
    // Calculate XP threshold where current level starts
    const currentLevelStartThreshold = cumulativeExperienceForLevel(currentLevel - 1);
    
    // Calculate XP threshold where next level starts (current level ends)
    const nextLevelStartThreshold = cumulativeExperienceForLevel(currentLevel);
    
    // Calculate experience within current level range
    const expInCurrentLevel = Math.max(0, totalExperience - currentLevelStartThreshold);
    const expRequiredForCurrentLevel = nextLevelStartThreshold - currentLevelStartThreshold;
    
    // Calculate XP needed to reach next level
    const experienceToNextLevel = Math.max(0, nextLevelStartThreshold - totalExperience);
    
    return {
      currentLevel,
      totalExperience,
      levelProgress: {
        currentExp: expInCurrentLevel,
        requiredExp: expRequiredForCurrentLevel,
        percentage: expRequiredForCurrentLevel > 0 ? (expInCurrentLevel / expRequiredForCurrentLevel) * 100 : 0
      },
      experienceToNextLevel
    };
  }, [totalExperience, currentLevel]);
}