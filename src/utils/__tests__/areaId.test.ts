/**
 * Tests for Area ID utility functions
 */

import { createAreaID, parseAreaID, isValidAreaID } from '../areaId';

describe('Area ID utilities', () => {
  describe('createAreaID', () => {
    it('should create correct area ID for origin (0,0,0)', () => {
      const areaId = createAreaID(0, 0, 0);
      expect(areaId).toBe(0n);
    });

    it('should create correct area ID for position (1,10,5)', () => {
      const areaId = createAreaID(1, 10, 5);
      // depth=1, x=10 (<<8), y=5 (<<16)
      // 1 | (10 << 8) | (5 << 16) = 1 | 2560 | 327680 = 330241 = 0x50A01
      expect(areaId).toBe(330241n);
    });

    it('should create correct area ID for position (2,25,25)', () => {
      const areaId = createAreaID(2, 25, 25);
      // depth=2, x=25 (<<8), y=25 (<<16)  
      // 2 | (25 << 8) | (25 << 16) = 2 | 6400 | 1638400 = 1644802 = 0x191902
      expect(areaId).toBe(1644802n);
    });

    it('should handle maximum values correctly', () => {
      const areaId = createAreaID(255, 255, 255);
      // depth=255, x=255 (<<8), y=255 (<<16)
      // 255 | (255 << 8) | (255 << 16) = 255 | 65280 | 16711680 = 16777215 = 0xFFFFFF
      expect(areaId).toBe(16777215n);
    });
  });

  describe('parseAreaID', () => {
    it('should parse origin area ID correctly', () => {
      const areaId = 0n;
      const parsed = parseAreaID(areaId);
      expect(parsed).toEqual({ depth: 0, x: 0, y: 0 });
    });

    it('should parse complex area ID correctly', () => {
      const areaId = 330241n; // 0x50A01
      const parsed = parseAreaID(areaId);
      expect(parsed).toEqual({ depth: 1, x: 10, y: 5 });
    });

    it('should be reversible with createAreaID', () => {
      const originalDepth = 3;
      const originalX = 15;
      const originalY = 20;
      
      const areaId = createAreaID(originalDepth, originalX, originalY);
      const parsed = parseAreaID(areaId);
      
      expect(parsed.depth).toBe(originalDepth);
      expect(parsed.x).toBe(originalX);
      expect(parsed.y).toBe(originalY);
    });
  });

  describe('isValidAreaID', () => {
    it('should validate correct area IDs', () => {
      expect(isValidAreaID(0n)).toBe(true);
      expect(isValidAreaID(330241n)).toBe(true);
      expect(isValidAreaID(16777215n)).toBe(true);
    });

    it('should reject invalid area IDs', () => {
      expect(isValidAreaID('')).toBe(false);
      expect(isValidAreaID('invalid')).toBe(false);
      expect(isValidAreaID(123)).toBe(false); // number instead of bigint
      expect(isValidAreaID(-1n)).toBe(false); // negative bigint
      expect(isValidAreaID(null)).toBe(false);
      expect(isValidAreaID(undefined)).toBe(false);
    });
  });
});