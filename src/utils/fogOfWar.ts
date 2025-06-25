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
 * @param stairsUp - Set of stairs up positions ("x,y,depth" format)
 * @param stairsDown - Set of stairs down positions ("x,y,depth" format)
 */
export function saveFogOfWar(
  characterId: string, 
  revealedAreas: Set<bigint>,
  stairsUp?: Set<string>,
  stairsDown?: Set<string>
): void {
  try {
    const key = getStorageKey(characterId);
    
    // Load existing data to preserve other characters' data
    let existingData: FogOfWarStorage = {
      version: FOG_STORAGE_VERSION,
      states: {},
      stairs: {},
    };
    
    const existingRaw = localStorage.getItem(key);
    if (existingRaw) {
      try {
        existingData = JSON.parse(existingRaw);
        // Ensure stairs object exists
        if (!existingData.stairs) {
          existingData.stairs = {};
        }
      } catch (e) {
        console.warn('[saveFogOfWar] Failed to parse existing data, using defaults');
      }
    }
    
    // Convert Set to array of strings for JSON serialization
    const areaIdStrings = Array.from(revealedAreas).map(id => id.toString());
    
    // Limit the number of stored areas if needed
    if (areaIdStrings.length > DEFAULT_FOG_CONFIG.maxStoredAreas) {
      // Keep the most recent areas (assuming they're added in order)
      areaIdStrings.splice(0, areaIdStrings.length - DEFAULT_FOG_CONFIG.maxStoredAreas);
    }
    
    // Update revealed areas
    existingData.states[characterId] = areaIdStrings;
    
    // Update stairs data if provided
    if (stairsUp || stairsDown) {
      existingData.stairs![characterId] = {
        up: stairsUp ? Array.from(stairsUp) : (existingData.stairs![characterId]?.up || []),
        down: stairsDown ? Array.from(stairsDown) : (existingData.stairs![characterId]?.down || []),
      };
    }
    
    localStorage.setItem(key, JSON.stringify(existingData));
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
          stairs: stairsUp || stairsDown ? {
            [characterId]: {
              up: stairsUp ? Array.from(stairsUp) : [],
              down: stairsDown ? Array.from(stairsDown) : [],
            }
          } : {},
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
    // Skip floor 0 as it doesn't exist in the game  
    if (position.depth === depth && position.depth > 0) {
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
  let validRevealedCount = 0;
  
  for (const areaId of revealedAreas) {
    const position = parseAreaID(areaId);
    // Only count floors 1-50 (skip floor 0 as it doesn't exist)
    if (position.depth > 0) {
      floorSet.add(position.depth);
      validRevealedCount++;
    }
  }
  
  const totalPossibleAreas = 50 * 51 * 51; // 1-50 for depth, 0-50 for x,y
  const percentageExplored = (validRevealedCount / totalPossibleAreas) * 100;
  
  return {
    totalRevealed: validRevealedCount,
    floorsVisited: floorSet.size,
    percentageExplored: Math.round(percentageExplored * 100) / 100,
  };
}

/**
 * Load stairs data for a character from localStorage
 * @param characterId - The character's unique identifier
 * @returns Object with stairs up and down sets
 */
export function loadStairsData(characterId: string): {
  stairsUp: Set<string>;
  stairsDown: Set<string>;
} {
  try {
    const key = getStorageKey(characterId);
    const data = localStorage.getItem(key);
    
    if (!data) {
      return { stairsUp: new Set(), stairsDown: new Set() };
    }
    
    const parsed: FogOfWarStorage = JSON.parse(data);
    const stairsData = parsed.stairs?.[characterId];
    
    return {
      stairsUp: new Set(stairsData?.up || []),
      stairsDown: new Set(stairsData?.down || []),
    };
  } catch (error) {
    console.error('Error loading stairs data:', error);
    return { stairsUp: new Set(), stairsDown: new Set() };
  }
}

/**
 * Save only stairs data for a character (preserves existing revealed areas)
 * @param characterId - The character's unique identifier
 * @param stairsUp - Set of stairs up positions ("x,y,depth" format)
 * @param stairsDown - Set of stairs down positions ("x,y,depth" format)
 */
export function saveStairsData(
  characterId: string,
  stairsUp: Set<string>,
  stairsDown: Set<string>
): void {
  // Load existing revealed areas and save everything together
  const revealedAreas = loadFogOfWar(characterId);
  saveFogOfWar(characterId, revealedAreas, stairsUp, stairsDown);
}