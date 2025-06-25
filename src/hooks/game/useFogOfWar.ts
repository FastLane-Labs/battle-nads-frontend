/**
 * Fog of War Hook
 * 
 * This hook manages the fog-of-war state for a character, providing methods to
 * reveal areas, check visibility, and track exploration progress. It integrates
 * with the game's position updates to automatically reveal visited areas.
 */

import { useCallback, useEffect, useState, useRef } from 'react';
import { 
  loadFogOfWar, 
  saveFogOfWar, 
  clearFogOfWar as clearFogStorage,
  getExplorationStats,
  loadStairsData,
  saveStairsData,
} from '@/lib/fogOfWar';
import { ENTRYPOINT_ADDRESS } from '@/config/env';
import { createAreaID } from '@/utils/areaId';
import { DEFAULT_FOG_CONFIG } from '@/types/domain/fogOfWar';
import type { Position } from '@/types/domain/character';

export interface UseFogOfWarReturn {
  /** Set of all revealed areaIds */
  revealedAreas: Set<bigint>;
  
  /** Check if a specific position is revealed */
  isRevealed: (position: Position) => boolean;
  
  /** Check if a specific areaId is revealed */
  isAreaRevealed: (areaId: bigint) => boolean;
  
  /** Manually reveal an area */
  revealArea: (areaId: bigint) => void;
  
  /** Reveal a position */
  revealPosition: (position: Position) => void;
  
  /** Get revealed cells for a specific floor */
  getFloorCells: (depth: number) => Set<string>;
  
  /** Get stairs up for a specific floor */
  getStairsUp: (depth: number) => Set<string>;
  
  /** Get stairs down for a specific floor */
  getStairsDown: (depth: number) => Set<string>;
  
  /** Get bounds of explored area on a floor */
  getFloorExplorationBounds: (depth: number) => { minX: number; maxX: number; minY: number; maxY: number } | null;
  
  /** Clear all fog-of-war data */
  clearFog: () => void;
  
  /** Get exploration statistics */
  stats: {
    totalRevealed: number;
    floorsVisited: number;
    percentageExplored: number;
  };
  
  /** Whether data is being loaded */
  isLoading: boolean;
}

/**
 * Hook for managing fog-of-war state
 * @param characterId - The character's unique identifier
 * @param currentPosition - The character's current position (optional, for auto-reveal)
 * @param movementOptions - Movement options for stair detection (optional)
 */
export function useFogOfWar(
  characterId: string | null,
  currentPosition?: Position | null,
  movementOptions?: { canMoveUp?: boolean; canMoveDown?: boolean } | null,
  contractAddress?: string
): UseFogOfWarReturn {
  const currentContract = contractAddress?.toLowerCase() || ENTRYPOINT_ADDRESS.toLowerCase();
  const [revealedAreas, setRevealedAreas] = useState<Set<bigint>>(new Set());
  const [stairsUp, setStairsUp] = useState<Set<string>>(new Set()); // "x,y,depth" format
  const [stairsDown, setStairsDown] = useState<Set<string>>(new Set()); // "x,y,depth" format
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevealed: 0,
    floorsVisited: 0,
    percentageExplored: 0,
  });
  
  // Debounce saving with useRef and setTimeout
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSaveRef = useRef<Set<bigint> | null>(null);
  
  // Load initial data
  useEffect(() => {
    if (!characterId) {
      setRevealedAreas(new Set());
      setStairsUp(new Set());
      setStairsDown(new Set());
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      const loaded = loadFogOfWar(characterId, currentContract);
      const stairsData = loadStairsData(characterId, currentContract);
      setRevealedAreas(loaded);
      setStairsUp(stairsData.stairsUp);
      setStairsDown(stairsData.stairsDown);
      setStats(getExplorationStats(characterId, currentContract));
    } catch (error) {
      console.error('Error loading fog-of-war data:', error);
      setRevealedAreas(new Set());
      setStairsUp(new Set());
      setStairsDown(new Set());
    } finally {
      setIsLoading(false);
    }
  }, [characterId, currentContract]);
  
  // Debounced save effect
  useEffect(() => {
    if (!characterId || isLoading || !DEFAULT_FOG_CONFIG.autoSave) {
      return;
    }
    
    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set pending save data
    pendingSaveRef.current = revealedAreas;
    
    // Schedule save after debounce delay
    saveTimeoutRef.current = setTimeout(() => {
      if (pendingSaveRef.current && pendingSaveRef.current.size > 0) {
        try {
          saveFogOfWar(characterId, pendingSaveRef.current, stairsUp, stairsDown, currentContract);
          setStats(getExplorationStats(characterId, currentContract));
        } catch (error) {
          console.error('Error saving fog-of-war data:', error);
        }
      }
      saveTimeoutRef.current = null;
      pendingSaveRef.current = null;
    }, DEFAULT_FOG_CONFIG.saveDebounceMs);
    
    // Cleanup on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [characterId, currentContract, revealedAreas, stairsUp, stairsDown, isLoading]);
  
  // Auto-reveal current position and track stairs
  useEffect(() => {
    if (!characterId || !currentPosition || isLoading) {
      return;
    }
    
    const currentAreaId = createAreaID(
      currentPosition.depth,
      currentPosition.x,
      currentPosition.y
    );
    
    if (!revealedAreas.has(currentAreaId)) {
      setRevealedAreas(prev => {
        const updated = new Set(prev);
        updated.add(currentAreaId);
        return updated;
      });
    }
    
    // Track stair positions based on movement options
    if (movementOptions) {
      const positionKey = `${currentPosition.x},${currentPosition.y},${currentPosition.depth}`;
      
      if (movementOptions.canMoveUp) {
        setStairsUp(prev => {
          const updated = new Set(prev);
          updated.add(positionKey);
          return updated;
        });
      }
      
      if (movementOptions.canMoveDown) {
        setStairsDown(prev => {
          const updated = new Set(prev);
          updated.add(positionKey);
          return updated;
        });
      }
    }
  }, [characterId, currentContract, currentPosition, movementOptions, isLoading, revealedAreas]);
  
  // Check if a position is revealed
  const isRevealed = useCallback((position: Position): boolean => {
    const areaId = createAreaID(position.depth, position.x, position.y);
    return revealedAreas.has(areaId);
  }, [revealedAreas]);
  
  // Check if an areaId is revealed
  const isAreaRevealed = useCallback((areaId: bigint): boolean => {
    return revealedAreas.has(areaId);
  }, [revealedAreas]);
  
  // Manually reveal an area
  const revealArea = useCallback((areaId: bigint): void => {
    if (!characterId) return;
    
    setRevealedAreas(prev => {
      if (prev.has(areaId)) return prev;
      
      const updated = new Set(prev);
      updated.add(areaId);
      return updated;
    });
  }, [characterId]);
  
  // Reveal a position
  const revealPosition = useCallback((position: Position): void => {
    const areaId = createAreaID(position.depth, position.x, position.y);
    revealArea(areaId);
  }, [revealArea]);
  
  // Get revealed cells for a floor
  const getFloorCells = useCallback((depth: number): Set<string> => {
    if (!characterId) return new Set();
    
    // Calculate from current revealed areas for consistency
    const cells = new Set<string>();
    for (const areaId of revealedAreas) {
      const areaDepth = Number(areaId & 0xFFn);
      // Skip floor 0 as it doesn't exist in the game
      if (areaDepth === depth && areaDepth > 0) {
        const x = Number((areaId >> 8n) & 0xFFn);
        const y = Number((areaId >> 16n) & 0xFFn);
        cells.add(`${x},${y}`);
      }
    }
    return cells;
  }, [characterId, revealedAreas]);

  // Get stairs up for a floor
  const getStairsUpForFloor = useCallback((depth: number): Set<string> => {
    if (!characterId) return new Set();
    
    const floorStairs = new Set<string>();
    for (const stairKey of stairsUp) {
      const parts = stairKey.split(',');
      if (parts.length === 3 && Number(parts[2]) === depth) {
        floorStairs.add(`${parts[0]},${parts[1]}`); // Return as "x,y" for display
      }
    }
    return floorStairs;
  }, [characterId, stairsUp]);

  // Get stairs down for a floor
  const getStairsDownForFloor = useCallback((depth: number): Set<string> => {
    if (!characterId) return new Set();
    
    const floorStairs = new Set<string>();
    for (const stairKey of stairsDown) {
      const parts = stairKey.split(',');
      if (parts.length === 3 && Number(parts[2]) === depth) {
        floorStairs.add(`${parts[0]},${parts[1]}`); // Return as "x,y" for display
      }
    }
    return floorStairs;
  }, [characterId, stairsDown]);
  
  // Get floor exploration bounds
  const getFloorExplorationBounds = useCallback((depth: number): { 
    minX: number; 
    maxX: number; 
    minY: number; 
    maxY: number;
  } | null => {
    if (!characterId) return null;
    
    const cells = getFloorCells(depth);
    if (cells.size === 0) return null;
    
    let minX = 50, maxX = 0, minY = 50, maxY = 0;
    
    for (const cell of cells) {
      const [x, y] = cell.split(',').map(Number);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    
    return { minX, maxX, minY, maxY };
  }, [characterId, getFloorCells]);
  
  // Clear all fog data
  const clearFog = useCallback(() => {
    if (!characterId) return;
    
    clearFogStorage(characterId, currentContract);
    setRevealedAreas(new Set());
    setStairsUp(new Set());
    setStairsDown(new Set());
    setStats({
      totalRevealed: 0,
      floorsVisited: 0,
      percentageExplored: 0,
    });
  }, [characterId, currentContract]);
  
  return {
    revealedAreas,
    isRevealed,
    isAreaRevealed,
    revealArea,
    revealPosition,
    getFloorCells,
    getStairsUp: getStairsUpForFloor,
    getStairsDown: getStairsDownForFloor,
    getFloorExplorationBounds,
    clearFog,
    stats,
    isLoading,
  };
}