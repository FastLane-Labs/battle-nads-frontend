/**
 * Tests for experience calculation helpers
 */

import {
  experienceNeededForLevel,
  cumulativeExperienceForLevel,
  calculateLevelFromExperience,
  calculateLevelProgress,
  getExperienceTable,
  getCharacterExperienceInfo
} from '../experienceHelpers';

describe('experienceHelpers', () => {
  describe('experienceNeededForLevel', () => {
    it('should return 0 for level 0 or negative levels', () => {
      expect(experienceNeededForLevel(0)).toBe(0);
      expect(experienceNeededForLevel(-1)).toBe(0);
    });

    it('should calculate correct experience for each level using formula level * 100 + level² * 5', () => {
      expect(experienceNeededForLevel(1)).toBe(105); // 1*100 + 1²*5 = 105
      expect(experienceNeededForLevel(2)).toBe(220); // 2*100 + 2²*5 = 220
      expect(experienceNeededForLevel(3)).toBe(345); // 3*100 + 3²*5 = 345
      expect(experienceNeededForLevel(7)).toBe(945); // 7*100 + 7²*5 = 945
      expect(experienceNeededForLevel(10)).toBe(1500); // 10*100 + 10²*5 = 1500
    });
  });

  describe('cumulativeExperienceForLevel', () => {
    it('should return 0 for level 0 or negative levels', () => {
      expect(cumulativeExperienceForLevel(0)).toBe(0);
      expect(cumulativeExperienceForLevel(-1)).toBe(0);
    });

    it('should calculate cumulative experience correctly', () => {
      expect(cumulativeExperienceForLevel(1)).toBe(105);
      expect(cumulativeExperienceForLevel(2)).toBe(325); // 105 + 220
      expect(cumulativeExperienceForLevel(3)).toBe(670); // 105 + 220 + 345
    });
  });

  describe('calculateLevelFromExperience', () => {
    it('should return level 1 for 0 or negative experience', () => {
      expect(calculateLevelFromExperience(0)).toBe(1);
      expect(calculateLevelFromExperience(-100)).toBe(1);
    });

    it('should calculate correct level from total experience', () => {
      expect(calculateLevelFromExperience(50)).toBe(1); // Partial level 1
      expect(calculateLevelFromExperience(104)).toBe(1); // Almost level 1 complete
      expect(calculateLevelFromExperience(105)).toBe(2); // Start of level 2
      expect(calculateLevelFromExperience(324)).toBe(2); // Almost level 2 complete
      expect(calculateLevelFromExperience(325)).toBe(3); // Start of level 3
      expect(calculateLevelFromExperience(669)).toBe(3); // Almost level 3 complete
    });
  });

  describe('calculateLevelProgress', () => {
    it('should handle level 1 correctly', () => {
      const progress = calculateLevelProgress(50, 1);
      expect(progress.currentExp).toBe(50);
      expect(progress.requiredExp).toBe(105);
      expect(progress.percentage).toBeCloseTo(47.62, 1);
    });

    it('should handle completed level 1', () => {
      const progress = calculateLevelProgress(105, 1);
      expect(progress.currentExp).toBe(105);
      expect(progress.requiredExp).toBe(105);
      expect(progress.percentage).toBe(100);
    });

    it('should handle higher levels correctly', () => {
      // Character with 400 total exp at level 3
      // Cumulative: Level 1 = 105, Level 2 = 325, so level 3 starts at 325
      // 400 - 325 = 75 exp into level 3 (out of 345 needed for level 3)
      const progress = calculateLevelProgress(400, 3);
      expect(progress.currentExp).toBe(75); 
      expect(progress.requiredExp).toBe(345);
      expect(progress.percentage).toBeCloseTo(21.74, 1);
    });

    it('should handle partial progress in higher levels', () => {
      // Character with 200 total exp at level 2
      // Level 1 cumulative = 105, so 200 - 105 = 95 exp into level 2 (out of 220 needed)
      const progress = calculateLevelProgress(200, 2);
      expect(progress.currentExp).toBe(95);
      expect(progress.requiredExp).toBe(220);
      expect(progress.percentage).toBeCloseTo(43.18, 1);
    });
  });

  describe('getExperienceTable', () => {
    it('should generate correct experience table', () => {
      const table = getExperienceTable(3);
      
      expect(table).toHaveLength(3);
      expect(table[0]).toEqual({
        level: 1,
        requiredExp: 105,
        cumulativeExp: 105
      });
      expect(table[1]).toEqual({
        level: 2,
        requiredExp: 220,
        cumulativeExp: 325
      });
      expect(table[2]).toEqual({
        level: 3,
        requiredExp: 345,
        cumulativeExp: 670
      });
    });
  });

  describe('getCharacterExperienceInfo', () => {
    it('should return comprehensive experience information', () => {
      const info = getCharacterExperienceInfo(200, 2);
      
      expect(info.currentLevel).toBe(2);
      expect(info.totalExperience).toBe(200);
      expect(info.levelProgress.currentExp).toBe(95);
      expect(info.levelProgress.requiredExp).toBe(220);
      expect(info.experienceToNextLevel).toBe(125); // 220 - 95
    });

    it('should handle completed levels', () => {
      const info = getCharacterExperienceInfo(325, 2);
      
      expect(info.currentLevel).toBe(2);
      expect(info.totalExperience).toBe(325);
      expect(info.levelProgress.currentExp).toBe(220);
      expect(info.levelProgress.requiredExp).toBe(220);
      expect(info.experienceToNextLevel).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle very high levels', () => {
      const expForLevel50 = experienceNeededForLevel(50);
      expect(expForLevel50).toBe(17500); // 50*100 + 50²*5 = 17500
    });

    it('should handle zero experience consistently', () => {
      const progress = calculateLevelProgress(0, 1);
      expect(progress.currentExp).toBe(0);
      expect(progress.percentage).toBe(0);
    });
  });
});