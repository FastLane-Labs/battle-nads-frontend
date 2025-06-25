/**
 * Tests for experience calculation helpers
 */

import {
  experienceNeededForLevel,
  cumulativeExperienceForLevel,
  calculateLevelFromExperience,
  calculateLevelProgress,
  getExperienceTable
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

    it('should return level start thresholds for each level', () => {
      // Returns the XP threshold where each level starts
      expect(cumulativeExperienceForLevel(1)).toBe(0); // Level 1 starts at 0 XP
      expect(cumulativeExperienceForLevel(2)).toBe(105); // Level 2 starts at 105 XP
      expect(cumulativeExperienceForLevel(3)).toBe(220); // Level 3 starts at 220 XP
      expect(cumulativeExperienceForLevel(4)).toBe(345); // Level 4 starts at 345 XP
      expect(cumulativeExperienceForLevel(8)).toBe(945); // Level 8 starts at 945 XP
      expect(cumulativeExperienceForLevel(9)).toBe(1120); // Level 9 starts at 1120 XP
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
      expect(calculateLevelFromExperience(105)).toBe(2); // Exactly at level 1 threshold, now level 2
      expect(calculateLevelFromExperience(106)).toBe(2); // Start of level 2
      expect(calculateLevelFromExperience(324)).toBe(2); // Almost level 2 complete
      expect(calculateLevelFromExperience(325)).toBe(3); // Exactly at level 2 threshold, now level 3
      expect(calculateLevelFromExperience(326)).toBe(3); // Start of level 3
      expect(calculateLevelFromExperience(669)).toBe(3); // Almost level 3 complete
      expect(calculateLevelFromExperience(235)).toBe(2); // Screenshot case: 235 XP should be level 2
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
      // Character with 200 exp within level 3 (not cumulative)
      const progress = calculateLevelProgress(200, 3);
      expect(progress.currentExp).toBe(200); 
      expect(progress.requiredExp).toBe(345);
      expect(progress.percentage).toBeCloseTo(57.97, 1);
    });

    it('should handle partial progress in higher levels', () => {
      // Character with 95 exp within level 2 (not cumulative)
      const progress = calculateLevelProgress(95, 2);
      expect(progress.currentExp).toBe(95);
      expect(progress.requiredExp).toBe(220);
      expect(progress.percentage).toBeCloseTo(43.18, 1);
    });

    it('should handle the screenshot case correctly', () => {
      // Level 7 character with 890 XP within the level
      const progress = calculateLevelProgress(890, 7);
      expect(progress.currentExp).toBe(890);
      expect(progress.requiredExp).toBe(945);
      expect(progress.percentage).toBeCloseTo(94.18, 1);
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