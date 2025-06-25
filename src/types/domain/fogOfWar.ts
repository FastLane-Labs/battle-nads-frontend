/**
 * Fog of War Domain Types
 * 
 * This module defines types for the fog-of-war minimap system that tracks
 * which areas of the game world have been explored by each character.
 * The fog-of-war data is stored in localStorage and reveals areas as the
 * player visits them.
 */

/**
 * Represents the fog-of-war state for a single character.
 * Tracks which areas have been revealed through exploration.
 */
export interface FogOfWarState {
  /** Unique identifier for the character (address:contract) */
  characterId: string;
  
  /** Set of areaIds that have been revealed/visited */
  revealedAreas: Set<bigint>;
  
  /** Timestamp of last update */
  lastUpdated: number;
}

/**
 * Storage format for fog-of-war data in localStorage.
 * Uses arrays for JSON serialization compatibility.
 */
export interface FogOfWarStorage {
  /** Version for future migration support */
  version: number;
  
  /** Map of characterId to array of revealed areaId strings */
  states: Record<string, string[]>;
}

/**
 * Represents a single floor's fog-of-war data for rendering.
 * Used by the minimap component to efficiently display revealed areas.
 */
export interface FogOfWarFloor {
  /** The depth level (0-50) */
  depth: number;
  
  /** Set of revealed coordinates in "x,y" format for quick lookup */
  revealedCells: Set<string>;
  
  /** Bounds of explored area for viewport optimization */
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

/**
 * Configuration for fog-of-war system
 */
export interface FogOfWarConfig {
  /** Maximum number of areas to store before pruning old entries */
  maxStoredAreas: number;
  
  /** Whether to auto-save on each reveal */
  autoSave: boolean;
  
  /** Debounce delay for saving to localStorage (ms) */
  saveDebounceMs: number;
}

/**
 * Default configuration values
 */
export const DEFAULT_FOG_CONFIG: FogOfWarConfig = {
  maxStoredAreas: 10000, // ~40KB in localStorage
  autoSave: true,
  saveDebounceMs: 1000, // Save at most once per second
};