/**
 * React hook for character experience calculations
 */

import { useMemo } from 'react';
import { getCharacterExperienceInfo } from '@/utils/experienceHelpers';
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
    
    return getCharacterExperienceInfo(
      Number(character.stats.experience),
      Number(character.level)
    );
  }, [character?.stats.experience, character?.level]);
}

/**
 * Hook to calculate experience progress from raw values
 * @param totalExperience Total accumulated experience
 * @param currentLevel Current character level
 * @returns Experience information including level progress
 */
export function useExperienceProgress(
  totalExperience: number, 
  currentLevel: number
): CharacterExperienceInfo {
  return useMemo(() => {
    return getCharacterExperienceInfo(totalExperience, currentLevel);
  }, [totalExperience, currentLevel]);
}