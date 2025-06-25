/**
 * Fog of War Storage Utilities
 * 
 * This module provides utilities for managing fog-of-war data in localStorage.
 * It handles saving, loading, and updating the revealed areas for each character,
 * with built-in size management and error handling.
 */

import { FogOfWarStorage, FogOfWarState, DEFAULT_FOG_CONFIG } from '@/types/domain/fogOfWar';
import { parseAreaID, createAreaID } from '@/utils/areaId';

const FOG_STORAGE_PREFIX = 'battleNads:fogOfWar:';
const FOG_STORAGE_VERSION = 1;

/**
 * Get the localStorage key for a character's fog-of-war data
 */
function getStorageKey(characterId: string): string {
  return `${FOG_STORAGE_PREFIX}${characterId}`;
}

/**
 * Load fog-of-war data for a character from localStorage
 * @param characterId - The character's unique identifier
 * @returns Set of revealed areaIds, or empty set if no data exists
 */
export function loadFogOfWar(characterId: string): Set<bigint> {
  try {
    const key = getStorageKey(characterId);
    const stored = localStorage.getItem(key);
    
    if (!stored) {
      return new Set<bigint>();
    }
    
    const data: FogOfWarStorage = JSON.parse(stored);
    
    // Handle version migration if needed
    if (data.version !== FOG_STORAGE_VERSION) {
      console.warn(`Fog-of-war data version mismatch for ${characterId}, clearing data`);
      localStorage.removeItem(key);
      return new Set<bigint>();
    }
    
    // Convert string array back to bigint Set
    const areaIds = data.states[characterId] || [];
    return new Set(areaIds.map(id => BigInt(id)));
  } catch (error) {
    console.error('Error loading fog-of-war data:', error);
    return new Set<bigint>();
  }
}

/**
 * Save fog-of-war data for a character to localStorage
 * @param characterId - The character's unique identifier
 * @param revealedAreas - Set of revealed areaIds
 */
export function saveFogOfWar(characterId: string, revealedAreas: Set<bigint>): void {
  try {
    const key = getStorageKey(characterId);
    
    // Convert Set to array of strings for JSON serialization
    const areaIdStrings = Array.from(revealedAreas).map(id => id.toString());
    
    // Limit the number of stored areas if needed
    if (areaIdStrings.length > DEFAULT_FOG_CONFIG.maxStoredAreas) {
      // Keep the most recent areas (assuming they're added in order)
      areaIdStrings.splice(0, areaIdStrings.length - DEFAULT_FOG_CONFIG.maxStoredAreas);
    }
    
    const data: FogOfWarStorage = {
      version: FOG_STORAGE_VERSION,
      states: {
        [characterId]: areaIdStrings,
      },
    };
    
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving fog-of-war data:', error);
    
    // If localStorage is full, try to clear old fog data
    if (error instanceof DOMException && error.code === 22) {
      clearOldFogData();
      // Retry once
      try {
        const key = getStorageKey(characterId);
        const data: FogOfWarStorage = {
          version: FOG_STORAGE_VERSION,
          states: {
            [characterId]: Array.from(revealedAreas).map(id => id.toString()),
          },
        };
        localStorage.setItem(key, JSON.stringify(data));
      } catch (retryError) {
        console.error('Failed to save fog-of-war data after cleanup:', retryError);
      }
    }
  }
}

/**
 * Add a newly revealed area for a character
 * @param characterId - The character's unique identifier
 * @param areaId - The areaId to reveal
 * @returns Updated set of revealed areas
 */
export function addRevealedArea(characterId: string, areaId: bigint): Set<bigint> {
  const revealedAreas = loadFogOfWar(characterId);
  
  if (!revealedAreas.has(areaId)) {
    revealedAreas.add(areaId);
    saveFogOfWar(characterId, revealedAreas);
  }
  
  return revealedAreas;
}

/**
 * Check if an area is revealed for a character
 * @param characterId - The character's unique identifier
 * @param areaId - The areaId to check
 * @returns True if the area is revealed
 */
export function isAreaRevealed(characterId: string, areaId: bigint): boolean {
  const revealedAreas = loadFogOfWar(characterId);
  return revealedAreas.has(areaId);
}

/**
 * Clear fog-of-war data for a character
 * @param characterId - The character's unique identifier
 */
export function clearFogOfWar(characterId: string): void {
  try {
    const key = getStorageKey(characterId);
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error clearing fog-of-war data:', error);
  }
}

/**
 * Clear old fog-of-war data from localStorage to free up space
 */
function clearOldFogData(): void {
  try {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(FOG_STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    
    // Remove the oldest half of fog data
    const removeCount = Math.floor(keysToRemove.length / 2);
    for (let i = 0; i < removeCount; i++) {
      localStorage.removeItem(keysToRemove[i]);
    }
    
    console.log(`Cleared ${removeCount} old fog-of-war entries`);
  } catch (error) {
    console.error('Error clearing old fog data:', error);
  }
}

/**
 * Get all revealed areas for a specific floor
 * @param characterId - The character's unique identifier
 * @param depth - The floor depth (0-50)
 * @returns Set of "x,y" coordinate strings for revealed cells on this floor
 */
export function getRevealedCellsForFloor(
  characterId: string,
  depth: number
): Set<string> {
  const revealedAreas = loadFogOfWar(characterId);
  const revealedCells = new Set<string>();
  
  for (const areaId of revealedAreas) {
    const position = parseAreaID(areaId);
    if (position.depth === depth) {
      revealedCells.add(`${position.x},${position.y}`);
    }
  }
  
  return revealedCells;
}

/**
 * Get bounds of explored area for a specific floor
 * @param characterId - The character's unique identifier
 * @param depth - The floor depth (0-50)
 * @returns Bounds object or null if no areas revealed on this floor
 */
export function getFloorBounds(
  characterId: string,
  depth: number
): { minX: number; maxX: number; minY: number; maxY: number } | null {
  const revealedCells = getRevealedCellsForFloor(characterId, depth);
  
  if (revealedCells.size === 0) {
    return null;
  }
  
  let minX = 50, maxX = 0, minY = 50, maxY = 0;
  
  for (const cell of revealedCells) {
    const [x, y] = cell.split(',').map(Number);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  
  return { minX, maxX, minY, maxY };
}

/**
 * Get statistics about fog-of-war exploration
 * @param characterId - The character's unique identifier
 * @returns Exploration statistics
 */
export function getExplorationStats(characterId: string): {
  totalRevealed: number;
  floorsVisited: number;
  percentageExplored: number;
} {
  const revealedAreas = loadFogOfWar(characterId);
  const floorSet = new Set<number>();
  
  for (const areaId of revealedAreas) {
    const position = parseAreaID(areaId);
    floorSet.add(position.depth);
  }
  
  const totalPossibleAreas = 51 * 51 * 51; // 0-50 for each dimension
  const percentageExplored = (revealedAreas.size / totalPossibleAreas) * 100;
  
  return {
    totalRevealed: revealedAreas.size,
    floorsVisited: floorSet.size,
    percentageExplored: Math.round(percentageExplored * 100) / 100,
  };
}