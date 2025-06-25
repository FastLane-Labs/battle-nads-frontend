/**
 * Tests for fog-of-war storage utilities with contract address support
 */

import {
  loadFogOfWar,
  saveFogOfWar,
  addRevealedArea,
  isAreaRevealed,
  clearFogOfWar,
  getRevealedCellsForFloor,
  getFloorBounds,
  getExplorationStats,
  loadStairsData,
  saveStairsData,
} from '../fogOfWar';

// Mock the environment config
jest.mock('../../config/env', () => ({
  ENTRYPOINT_ADDRESS: '0x1234567890abcdef1234567890abcdef12345678'
}));

// Mock area ID utilities
jest.mock('../../utils/areaId', () => ({
  createAreaID: jest.fn((depth: number, x: number, y: number) => {
    return BigInt(depth | (x << 8) | (y << 16));
  }),
  parseAreaID: jest.fn((areaId: bigint) => {
    const depth = Number(areaId & 0xFFn);
    const x = Number((areaId >> 8n) & 0xFFn);
    const y = Number((areaId >> 16n) & 0xFFn);
    return { depth, x, y };
  }),
}));

// Helper to clean up localStorage between tests
const cleanupLocalStorage = () => {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('battleNads:fogOfWar:')) {
      keys.push(key);
    }
  }
  keys.forEach(key => localStorage.removeItem(key));
};

describe('fogOfWar', () => {
  const testCharacterId = 'character123';
  const testContract1 = '0xcontract1234567890abcdef1234567890abcdef12';
  const testContract2 = '0xcontract9876543210fedcba9876543210fedcba98';
  const testAreaId1 = BigInt(1 | (5 << 8) | (10 << 16)); // depth=1, x=5, y=10
  const testAreaId2 = BigInt(2 | (15 << 8) | (20 << 16)); // depth=2, x=15, y=20

  beforeEach(() => {
    cleanupLocalStorage();
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanupLocalStorage();
  });

  describe('storage key generation', () => {
    it('should generate different keys for different contracts', () => {
      // Save data for contract 1
      const areas1 = new Set([testAreaId1]);
      saveFogOfWar(testCharacterId, areas1, undefined, undefined, testContract1);

      // Save data for contract 2
      const areas2 = new Set([testAreaId2]);
      saveFogOfWar(testCharacterId, areas2, undefined, undefined, testContract2);

      // Load data for each contract
      const loaded1 = loadFogOfWar(testCharacterId, testContract1);
      const loaded2 = loadFogOfWar(testCharacterId, testContract2);

      expect(loaded1.has(testAreaId1)).toBe(true);
      expect(loaded1.has(testAreaId2)).toBe(false);
      expect(loaded2.has(testAreaId2)).toBe(true);
      expect(loaded2.has(testAreaId1)).toBe(false);
    });

    it('should use default contract when none provided', () => {
      const areas = new Set([testAreaId1]);
      saveFogOfWar(testCharacterId, areas);

      const loaded = loadFogOfWar(testCharacterId);
      expect(loaded.has(testAreaId1)).toBe(true);
    });

    it('should normalize contract addresses to lowercase', () => {
      const upperCaseContract = testContract1.toUpperCase();
      const lowerCaseContract = testContract1.toLowerCase();
      
      const areas = new Set([testAreaId1]);
      saveFogOfWar(testCharacterId, areas, undefined, undefined, upperCaseContract);

      const loaded = loadFogOfWar(testCharacterId, lowerCaseContract);
      expect(loaded.has(testAreaId1)).toBe(true);
    });
  });

  describe('multi-contract data separation', () => {
    it('should maintain separate fog data per contract', () => {
      // Set up data for two different contracts
      const areas1 = new Set([testAreaId1, BigInt(100)]);
      const areas2 = new Set([testAreaId2, BigInt(200)]);
      
      saveFogOfWar(testCharacterId, areas1, undefined, undefined, testContract1);
      saveFogOfWar(testCharacterId, areas2, undefined, undefined, testContract2);

      // Verify contract 1 data
      const loaded1 = loadFogOfWar(testCharacterId, testContract1);
      expect(loaded1.size).toBe(2);
      expect(loaded1.has(testAreaId1)).toBe(true);
      expect(loaded1.has(BigInt(100))).toBe(true);
      expect(loaded1.has(testAreaId2)).toBe(false);

      // Verify contract 2 data
      const loaded2 = loadFogOfWar(testCharacterId, testContract2);
      expect(loaded2.size).toBe(2);
      expect(loaded2.has(testAreaId2)).toBe(true);
      expect(loaded2.has(BigInt(200))).toBe(true);
      expect(loaded2.has(testAreaId1)).toBe(false);
    });

    it('should maintain separate stairs data per contract', () => {
      const stairsUp1 = new Set(['5,10,1']);
      const stairsDown1 = new Set(['5,10,1']);
      const stairsUp2 = new Set(['15,20,2']);
      const stairsDown2 = new Set(['15,20,2']);

      // Save stairs for different contracts
      saveStairsData(testCharacterId, stairsUp1, stairsDown1, testContract1);
      saveStairsData(testCharacterId, stairsUp2, stairsDown2, testContract2);

      // Load and verify separation
      const stairs1 = loadStairsData(testCharacterId, testContract1);
      const stairs2 = loadStairsData(testCharacterId, testContract2);

      expect(stairs1.stairsUp.has('5,10,1')).toBe(true);
      expect(stairs1.stairsUp.has('15,20,2')).toBe(false);
      expect(stairs2.stairsUp.has('15,20,2')).toBe(true);
      expect(stairs2.stairsUp.has('5,10,1')).toBe(false);
    });

    it('should clear only specific contract data', () => {
      // Set up data for both contracts
      const areas1 = new Set([testAreaId1]);
      const areas2 = new Set([testAreaId2]);
      
      saveFogOfWar(testCharacterId, areas1, undefined, undefined, testContract1);
      saveFogOfWar(testCharacterId, areas2, undefined, undefined, testContract2);

      // Clear only contract 1
      clearFogOfWar(testCharacterId, testContract1);

      // Verify contract 1 is cleared but contract 2 remains
      const loaded1 = loadFogOfWar(testCharacterId, testContract1);
      const loaded2 = loadFogOfWar(testCharacterId, testContract2);

      expect(loaded1.size).toBe(0);
      expect(loaded2.size).toBe(1);
      expect(loaded2.has(testAreaId2)).toBe(true);
    });
  });

  describe('backward compatibility', () => {
    it('should handle loading data without contract address', () => {
      const areas = new Set([testAreaId1, testAreaId2]);
      saveFogOfWar(testCharacterId, areas);

      const loaded = loadFogOfWar(testCharacterId);
      expect(loaded.size).toBe(2);
      expect(loaded.has(testAreaId1)).toBe(true);
      expect(loaded.has(testAreaId2)).toBe(true);
    });

    it('should handle utility functions without contract address', () => {
      // Test addRevealedArea
      const areas = addRevealedArea(testCharacterId, testAreaId1);
      expect(areas.has(testAreaId1)).toBe(true);

      // Test isAreaRevealed
      expect(isAreaRevealed(testCharacterId, testAreaId1)).toBe(true);
      expect(isAreaRevealed(testCharacterId, testAreaId2)).toBe(false);

      // Test getRevealedCellsForFloor
      const { createAreaID } = require('../../utils/areaId');
      createAreaID.mockImplementation((depth: number, x: number, y: number) => {
        return BigInt(depth | (x << 8) | (y << 16));
      });

      const floorCells = getRevealedCellsForFloor(testCharacterId, 1);
      expect(floorCells.has('5,10')).toBe(true);
    });

    it('should handle stairs operations without contract address', () => {
      const stairsUp = new Set(['5,10,1']);
      const stairsDown = new Set(['5,10,1']);

      saveStairsData(testCharacterId, stairsUp, stairsDown);
      const loaded = loadStairsData(testCharacterId);

      expect(loaded.stairsUp.has('5,10,1')).toBe(true);
      expect(loaded.stairsDown.has('5,10,1')).toBe(true);
    });
  });

  describe('floor-based operations with contracts', () => {
    beforeEach(() => {
      // Mock parseAreaID to return predictable results
      const { parseAreaID } = require('../../utils/areaId');
      parseAreaID.mockImplementation((areaId: bigint) => {
        const depth = Number(areaId & 0xFFn);
        const x = Number((areaId >> 8n) & 0xFFn);
        const y = Number((areaId >> 16n) & 0xFFn);
        return { depth, x, y };
      });
    });

    it('should get floor cells for specific contract', () => {
      const floor1Areas = new Set([
        BigInt(1 | (5 << 8) | (10 << 16)), // depth=1, x=5, y=10
        BigInt(1 | (6 << 8) | (11 << 16)), // depth=1, x=6, y=11
        BigInt(2 | (7 << 8) | (12 << 16)), // depth=2, x=7, y=12
      ]);

      saveFogOfWar(testCharacterId, floor1Areas, undefined, undefined, testContract1);

      const floor1Cells = getRevealedCellsForFloor(testCharacterId, 1, testContract1);
      const floor2Cells = getRevealedCellsForFloor(testCharacterId, 2, testContract1);

      expect(floor1Cells.size).toBe(2);
      expect(floor1Cells.has('5,10')).toBe(true);
      expect(floor1Cells.has('6,11')).toBe(true);
      
      expect(floor2Cells.size).toBe(1);
      expect(floor2Cells.has('7,12')).toBe(true);
    });

    it('should get floor bounds for specific contract', () => {
      const areas = new Set([
        BigInt(1 | (5 << 8) | (10 << 16)), // depth=1, x=5, y=10
        BigInt(1 | (15 << 8) | (20 << 16)), // depth=1, x=15, y=20
        BigInt(1 | (25 << 8) | (5 << 16)), // depth=1, x=25, y=5
      ]);

      saveFogOfWar(testCharacterId, areas, undefined, undefined, testContract1);

      const bounds = getFloorBounds(testCharacterId, 1, testContract1);
      expect(bounds).toEqual({
        minX: 5,
        maxX: 25,
        minY: 5,
        maxY: 20,
      });
    });

    it('should get exploration stats for specific contract', () => {
      const areas = new Set([
        BigInt(1 | (5 << 8) | (10 << 16)), // depth=1
        BigInt(1 | (6 << 8) | (11 << 16)), // depth=1
        BigInt(2 | (7 << 8) | (12 << 16)), // depth=2
        BigInt(3 | (8 << 8) | (13 << 16)), // depth=3
      ]);

      saveFogOfWar(testCharacterId, areas, undefined, undefined, testContract1);

      const stats = getExplorationStats(testCharacterId, testContract1);
      expect(stats.totalRevealed).toBe(4);
      expect(stats.floorsVisited).toBe(3); // floors 1, 2, 3
      // Percentage is rounded to 2 decimal places, so very small values become 0
      expect(stats.percentageExplored).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle corrupted localStorage data gracefully', () => {
      // Manually set corrupted data
      localStorage.setItem('battleNads:fogOfWar:default:character123', 'invalid json');

      const loaded = loadFogOfWar(testCharacterId);
      expect(loaded.size).toBe(0);
    });

    it('should handle version mismatch gracefully', () => {
      // Set data with wrong version
      const badData = {
        version: 999,
        states: { [testCharacterId]: ['123'] },
      };
      localStorage.setItem('battleNads:fogOfWar:default:character123', JSON.stringify(badData));

      const loaded = loadFogOfWar(testCharacterId);
      expect(loaded.size).toBe(0);
    });

    it('should handle missing character data gracefully', () => {
      const emptyData = {
        version: 1,
        states: {},
      };
      localStorage.setItem('battleNads:fogOfWar:default:character123', JSON.stringify(emptyData));

      const loaded = loadFogOfWar(testCharacterId);
      expect(loaded.size).toBe(0);
    });
  });
});