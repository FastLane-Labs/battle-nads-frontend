/**
 * Domain types for experience and level progression
 */

export interface LevelProgress {
  /** Experience earned within the current level */
  currentExp: number;
  /** Total experience required for the current level */
  requiredExp: number;
  /** Progress percentage (0-100) within the current level */
  percentage: number;
}

export interface ExperienceRequirement {
  /** The level */
  level: number;
  /** Experience required to advance from previous level to this level */
  requiredExp: number;
  /** Total cumulative experience needed to reach this level */
  cumulativeExp: number;
}

export interface CharacterExperienceInfo {
  /** Current character level */
  currentLevel: number;
  /** Total accumulated experience */
  totalExperience: number;
  /** Progress within current level */
  levelProgress: LevelProgress;
  /** Experience needed to reach next level */
  experienceToNextLevel: number;
}