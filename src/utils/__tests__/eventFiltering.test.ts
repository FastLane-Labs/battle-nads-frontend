/**
 * Tests for event filtering utilities
 */

import { domain } from '@/types';
import { 
  filterEventsByArea, 
  filterEventsByAreas, 
  groupEventsByArea, 
  getUniqueAreaIds,
  filterEventsByAreaAndTime,
  getAreaStatistics,
  filterEventsByPosition
} from '../eventFiltering';
import { createAreaID } from '../areaId';

// Mock event data
const createMockEvent = (areaId: bigint, timestamp: number, logIndex: number): domain.EventMessage => ({
  logIndex,
  blocknumber: BigInt(100 + logIndex),
  timestamp,
  type: domain.LogType.Combat,
  areaId,
  isPlayerInitiated: false,
  details: {},
  displayMessage: `Event ${logIndex}`
});

describe('Event filtering utilities', () => {
  const area1 = createAreaID(0, 0, 0); // Origin
  const area2 = createAreaID(1, 10, 5); // Position (1,10,5)
  const area3 = createAreaID(2, 25, 25); // Position (2,25,25)

  const mockEvents: domain.EventMessage[] = [
    createMockEvent(area1, 1000, 1),
    createMockEvent(area2, 1100, 2),
    createMockEvent(area1, 1200, 3),
    createMockEvent(area3, 1300, 4),
    createMockEvent(area2, 1400, 5),
    createMockEvent(area1, 1500, 6),
  ];

  describe('filterEventsByArea', () => {
    it('should filter events by single area ID', () => {
      const filtered = filterEventsByArea(mockEvents, area1);
      expect(filtered).toHaveLength(3);
      expect(filtered.map(e => e.logIndex)).toEqual([1, 3, 6]);
    });

    it('should return empty array for non-existent area', () => {
      const nonExistentArea = createAreaID(99, 99, 99);
      const filtered = filterEventsByArea(mockEvents, nonExistentArea);
      expect(filtered).toHaveLength(0);
    });
  });

  describe('filterEventsByAreas', () => {
    it('should filter events by multiple area IDs', () => {
      const filtered = filterEventsByAreas(mockEvents, [area1, area3]);
      expect(filtered).toHaveLength(4);
      expect(filtered.map(e => e.logIndex)).toEqual([1, 3, 4, 6]);
    });

    it('should handle empty area IDs array', () => {
      const filtered = filterEventsByAreas(mockEvents, []);
      expect(filtered).toHaveLength(0);
    });
  });

  describe('groupEventsByArea', () => {
    it('should group events by area ID', () => {
      const grouped = groupEventsByArea(mockEvents);
      expect(grouped.size).toBe(3);
      expect(grouped.get(area1)).toHaveLength(3);
      expect(grouped.get(area2)).toHaveLength(2);
      expect(grouped.get(area3)).toHaveLength(1);
    });
  });

  describe('getUniqueAreaIds', () => {
    it('should return unique area IDs sorted numerically', () => {
      const unique = getUniqueAreaIds(mockEvents);
      expect(unique).toHaveLength(3);
      expect(unique).toEqual([area1, area2, area3].sort((a, b) => Number(a - b)));
    });
  });

  describe('filterEventsByAreaAndTime', () => {
    it('should filter by area and time range', () => {
      const filtered = filterEventsByAreaAndTime(mockEvents, area1, 1100, 1400);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].logIndex).toBe(3);
    });

    it('should return empty for time range with no events', () => {
      const filtered = filterEventsByAreaAndTime(mockEvents, area1, 2000, 3000);
      expect(filtered).toHaveLength(0);
    });
  });

  describe('getAreaStatistics', () => {
    it('should return statistics for each area', () => {
      const stats = getAreaStatistics(mockEvents);
      expect(stats).toHaveLength(3);
      
      const area1Stats = stats.find(s => s.areaId === area1);
      expect(area1Stats?.eventCount).toBe(3);
      expect(area1Stats?.earliestTimestamp).toBe(1000);
      expect(area1Stats?.latestTimestamp).toBe(1500);
    });
  });

  describe('filterEventsByPosition', () => {
    it('should filter events by position coordinates', () => {
      const filtered = filterEventsByPosition(mockEvents, 1, 10, 5);
      expect(filtered).toHaveLength(2);
      expect(filtered.map(e => e.logIndex)).toEqual([2, 5]);
    });

    it('should return empty for position with no events', () => {
      const filtered = filterEventsByPosition(mockEvents, 99, 99, 99);
      expect(filtered).toHaveLength(0);
    });
  });

  describe('integration with area ID calculation', () => {
    it('should correctly filter events by calculated area ID', () => {
      const calculatedAreaId = createAreaID(0, 0, 0);
      const filtered = filterEventsByArea(mockEvents, calculatedAreaId);
      expect(filtered).toHaveLength(3); // Should match area1 events
    });
  });
});