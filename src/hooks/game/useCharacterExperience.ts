/**
 * React hook for character experience calculations
 */

import { useMemo } from 'react';
import {
  thresholdForLevelStart,
} from '@/utils/experienceHelpers';
import type { Character } from '@/types/domain/character';
import type { CharacterExperienceInfo } from '@/types/domain/experience';

/**
 * Level-aware XP progress for a live Character object.
 */
export function useCharacterExperience(
  character: Character | null,
): CharacterExperienceInfo | null {
  return useMemo(() => {
    if (!character) return null;

    const total = Number(character.stats.experience);   // contract value
    const level = Number(character.level);

    const start = thresholdForLevelStart(level);        // e.g. level 8 → 945
    const end   = thresholdForLevelStart(level + 1);    // level 9 → 1120
    const span  = end - start;                          // 175
    const inLvl = Math.max(0, total - start);           // clamp < 0

    return {
      currentLevel: level,
      totalExperience: total,
      levelProgress: {
        currentExp: inLvl,
        requiredExp: span,
        percentage: span > 0 ? (inLvl / span) * 100 : 0,
      },
      experienceToNextLevel: Math.max(0, end - total),
    };
  }, [character?.stats.experience, character?.level]);
}

/**
 * Pure variant when you already have raw values.
 */
export function useExperienceProgress(
  totalExperience: number,
  currentLevel: number,
): CharacterExperienceInfo {
  return useMemo(() => {
    const start = thresholdForLevelStart(currentLevel);
    const end   = thresholdForLevelStart(currentLevel + 1);
    const span  = end - start;
    const inLvl = Math.max(0, totalExperience - start);

    return {
      currentLevel,
      totalExperience,
      levelProgress: {
        currentExp: inLvl,
        requiredExp: span,
        percentage: span > 0 ? (inLvl / span) * 100 : 0,
      },
      experienceToNextLevel: Math.max(0, end - totalExperience),
    };
  }, [totalExperience, currentLevel]);
}