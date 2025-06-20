/**
 * Event filtering utilities for area-based and historical log filtering
 */

import { domain } from '@/types';

/**
 * Filters events by area ID
 * @param events - Array of events to filter
 * @param areaId - Area ID to filter by (0n for origin area)
 * @returns Filtered events matching the area ID
 */
export function filterEventsByArea(events: domain.EventMessage[], areaId: bigint): domain.EventMessage[] {
  return events.filter(event => event.areaId === areaId);
}

/**
 * Filters events by multiple area IDs
 * @param events - Array of events to filter
 * @param areaIds - Array of area IDs to include
 * @returns Filtered events matching any of the area IDs
 */
export function filterEventsByAreas(events: domain.EventMessage[], areaIds: bigint[]): domain.EventMessage[] {
  const areaIdSet = new Set(areaIds);
  return events.filter(event => areaIdSet.has(event.areaId));
}

/**
 * Groups events by area ID
 * @param events - Array of events to group
 * @returns Map of area ID to events array
 */
export function groupEventsByArea(events: domain.EventMessage[]): Map<bigint, domain.EventMessage[]> {
  const grouped = new Map<bigint, domain.EventMessage[]>();
  
  for (const event of events) {
    const areaEvents = grouped.get(event.areaId) || [];
    areaEvents.push(event);
    grouped.set(event.areaId, areaEvents);
  }
  
  return grouped;
}

/**
 * Gets unique area IDs from events
 * @param events - Array of events to analyze
 * @returns Array of unique area IDs, sorted numerically
 */
export function getUniqueAreaIds(events: domain.EventMessage[]): bigint[] {
  const areaIds = new Set<bigint>();
  events.forEach(event => areaIds.add(event.areaId));
  return Array.from(areaIds).sort((a, b) => Number(a - b));
}

/**
 * Filters events by time range and area
 * @param events - Array of events to filter
 * @param areaId - Area ID to filter by
 * @param startTime - Start timestamp (inclusive)
 * @param endTime - End timestamp (inclusive)
 * @returns Filtered events
 */
export function filterEventsByAreaAndTime(
  events: domain.EventMessage[], 
  areaId: bigint, 
  startTime: number, 
  endTime: number
): domain.EventMessage[] {
  return events.filter(event => 
    event.areaId === areaId && 
    event.timestamp >= startTime && 
    event.timestamp <= endTime
  );
}

/**
 * Gets area statistics from events
 * @param events - Array of events to analyze
 * @returns Statistics per area
 */
export function getAreaStatistics(events: domain.EventMessage[]): {
  areaId: bigint;
  eventCount: number;
  latestTimestamp: number;
  earliestTimestamp: number;
}[] {
  const grouped = groupEventsByArea(events);
  
  return Array.from(grouped.entries()).map(([areaId, areaEvents]) => ({
    areaId,
    eventCount: areaEvents.length,
    latestTimestamp: Math.max(...areaEvents.map(e => e.timestamp)),
    earliestTimestamp: Math.min(...areaEvents.map(e => e.timestamp))
  })).sort((a, b) => Number(a.areaId - b.areaId));
}

/**
 * Demonstrates area-based filtering with position coordinates
 * @param events - Array of events to filter
 * @param depth - Depth level to filter by
 * @param x - X coordinate to filter by
 * @param y - Y coordinate to filter by  
 * @returns Events from the specified position
 */
export function filterEventsByPosition(
  events: domain.EventMessage[], 
  depth: number, 
  x: number, 
  y: number
): domain.EventMessage[] {
  // Calculate the area ID for the given position
  const targetAreaId = BigInt(depth) | (BigInt(x) << 8n) | (BigInt(y) << 16n);
  return filterEventsByArea(events, targetAreaId);
}