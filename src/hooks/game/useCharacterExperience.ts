/**
 * React hook for character experience calculations
 */

import { useMemo } from 'react';
import { calculateLevelProgress, experienceNeededForLevel } from '@/utils/experienceHelpers';
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
    
    // Calculate how much experience is needed for the current level
    const expRequiredForCurrentLevel = experienceNeededForLevel(currentLevel);
    
    // For progress within current level, we interpret the total XP as progress toward current level
    // This handles the case where a level 7 character has 890 XP (should show 890/945 progress)
    const expInCurrentLevel = Math.min(totalExperience, expRequiredForCurrentLevel);
    
    const levelProgress = calculateLevelProgress(expInCurrentLevel, currentLevel);
    const experienceToNextLevel = levelProgress.requiredExp - levelProgress.currentExp;
    
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
 * @param totalExperience Total accumulated experience (contract value)
 * @param currentLevel Current character level
 * @returns Experience information including level progress
 */
export function useExperienceProgress(
  totalExperience: number, 
  currentLevel: number
): CharacterExperienceInfo {
  return useMemo(() => {
    // Calculate how much experience is needed for the current level
    const expRequiredForCurrentLevel = experienceNeededForLevel(currentLevel);
    
    // For progress within current level, we interpret the total XP as progress toward current level
    const expInCurrentLevel = Math.min(totalExperience, expRequiredForCurrentLevel);
    
    const levelProgress = calculateLevelProgress(expInCurrentLevel, currentLevel);
    const experienceToNextLevel = levelProgress.requiredExp - levelProgress.currentExp;
    
    return {
      currentLevel,
      totalExperience,
      levelProgress,
      experienceToNextLevel
    };
  }, [totalExperience, currentLevel]);
}