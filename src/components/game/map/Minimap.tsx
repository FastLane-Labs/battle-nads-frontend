import React, { useMemo, useState, memo } from 'react';
import { Box, Grid, GridItem, Text, Flex } from '@chakra-ui/react';
import { domain, hooks } from '@/types';
import { GameTooltip } from '@/components/ui/GameTooltip';

interface MinimapProps {
  /** Current character position */
  currentPosition: domain.Position | null;
  /** Character ID for fog-of-war data */
  characterId: string | null;
  /** Callback when a cell is clicked */
  onCellClick?: (x: number, y: number) => void;
  /** Size of the viewport (e.g., 21 means 21x21 grid) */
  viewportSize?: number;
  /** Current floor depth being displayed */
  currentDepth?: number;
  /** Fog-of-war data from parent hook */
  fogOfWar?: hooks.UseGameDataReturn['fogOfWar'];
}

const Minimap: React.FC<MinimapProps> = memo(({
  currentPosition,
  characterId,
  onCellClick,
  viewportSize = 21,
  currentDepth,
  fogOfWar,
}) => {
  // Use the current position's depth if not specified
  const displayDepth = currentDepth ?? (currentPosition?.depth ? Number(currentPosition.depth) : 1);
  
  // Use fog-of-war data from parent
  const getFloorCells = fogOfWar?.getFloorCells || (() => new Set<string>());
  const getStairsUp = fogOfWar?.getStairsUp || (() => new Set<string>());
  const getStairsDown = fogOfWar?.getStairsDown || (() => new Set<string>());
  const isLoading = fogOfWar?.isLoading || false;
  
  const revealedCells = useMemo(
    () => getFloorCells(displayDepth),
    [getFloorCells, displayDepth]
  );
  const stairsUpCells = useMemo(
    () => getStairsUp(displayDepth),
    [getStairsUp, displayDepth]
  );
  const stairsDownCells = useMemo(
    () => getStairsDown(displayDepth),
    [getStairsDown, displayDepth]
  );
  
  // Calculate viewport bounds centered on player - only recalculate when position or viewport size changes
  const viewportBounds = useMemo(() => {
    const halfSize = Math.floor(viewportSize / 2);
    const centerX = currentPosition?.x ? Number(currentPosition.x) : 25;
    const centerY = currentPosition?.y ? Number(currentPosition.y) : 25;
    
    return {
      minX: Math.max(0, centerX - halfSize),
      maxX: Math.min(50, centerX + halfSize),
      minY: Math.max(0, centerY - halfSize),
      maxY: Math.min(50, centerY + halfSize),
    };
  }, [currentPosition?.x, currentPosition?.y, viewportSize]);
  
  // Generate grid cells - only recalculate when key dependencies change
  const gridCells = useMemo(() => {
    const cells = [];
    
    for (let y = viewportBounds.minY; y <= viewportBounds.maxY; y++) {
      for (let x = viewportBounds.minX; x <= viewportBounds.maxX; x++) {
        const isCurrentPosition = 
          currentPosition?.x && Number(currentPosition.x) === x && 
          currentPosition?.y && Number(currentPosition.y) === y && 
          currentPosition?.depth && Number(currentPosition.depth) === displayDepth;
        
        const isRevealed = revealedCells.has(`${x},${y}`);
        const cellKey = `${x},${y}`;
        const hasStairsUp = stairsUpCells.has(cellKey);
        const hasStairsDown = stairsDownCells.has(cellKey);
        
        cells.push({
          x,
          y,
          key: cellKey,
          isCurrentPosition,
          isRevealed,
          hasStairsUp,
          hasStairsDown,
        });
      }
    }
    
    return cells;
  }, [
    viewportBounds.minX,
    viewportBounds.minY,
    viewportBounds.maxX,
    viewportBounds.maxY,
    currentPosition?.x,
    currentPosition?.y,
    currentPosition?.depth,
    displayDepth,
    revealedCells,
    stairsUpCells,
    stairsDownCells
  ]);
  
  const gridColumns = viewportBounds.maxX - viewportBounds.minX + 1;
  const gridRows = viewportBounds.maxY - viewportBounds.minY + 1;
  
  if (isLoading) {
    return (
      <Box className="bg-dark-brown border border-black/40 rounded-lg p-3">
        <Text className="gold-text text-center">Loading map...</Text>
      </Box>
    );
  }
  
  return (
    <Box className="bg-dark-brown border border-black/40 rounded-lg p-3">
      {/* Header */}
      <Flex justify="space-between" align="center" mb={3}>
        <Text className="gold-text text-xl font-serif font-semibold">
          Map - Floor {displayDepth}
        </Text>
        <Text className="text-amber-200/80 text-xs">
          ({viewportBounds.minX},{viewportBounds.minY}) - ({viewportBounds.maxX},{viewportBounds.maxY})
        </Text>
      </Flex>
      
      {/* Grid */}
      <Grid
        templateColumns={`repeat(${gridColumns}, 16px)`}
        templateRows={`repeat(${gridRows}, 16px)`}
        gap="1px"
        className="bg-brown border border-black/40 rounded-md p-2"
        width="fit-content"
        height="fit-content"
      >
        {gridCells.map((cell) => {
          // Only show tooltips for revealed areas
          if (!cell.isRevealed && !cell.isCurrentPosition) {
            return (
              <GridItem
                key={cell.key}
                className={`
                  cursor-pointer transition-all duration-200 w-4 h-4 rounded-sm relative
                  bg-black/60 opacity-50 hover:opacity-70 border border-gray-800 fog-overlay
                `}
                onClick={() => onCellClick?.(cell.x, cell.y)}
              />
            );
          }
          
          // Build tooltip content for revealed areas
          let tooltipContent = `(${cell.x}, ${cell.y})`;
          if (cell.hasStairsUp || cell.hasStairsDown) {
            const stairInfo = [];
            if (cell.hasStairsUp) stairInfo.push('Stairs Up');
            if (cell.hasStairsDown) stairInfo.push('Stairs Down');
            tooltipContent += ` - ${stairInfo.join(' & ')}`;
          }
          
          return (
          <GameTooltip
            key={cell.key}
            title={tooltipContent}
            placement="top"
          >
            <GridItem
              className={`
                cursor-pointer transition-all duration-200 w-4 h-4 rounded-sm relative
                ${cell.isCurrentPosition 
                  ? 'bg-yellow-400 animate-pulse border-2 border-amber-300' 
                  : 'bg-amber-800/60 hover:bg-amber-700/80 border border-amber-600/40'
                }
              `}
              onClick={() => onCellClick?.(cell.x, cell.y)}
            >
              {/* Stair indicators */}
              {cell.isRevealed && (cell.hasStairsUp || cell.hasStairsDown) && (
                <Box
                  position="absolute"
                  top="0"
                  left="0"
                  right="0"
                  bottom="0"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  fontSize="8px"
                  fontWeight="bold"
                  color="gold"
                  textShadow="1px 1px 1px black"
                >
                  {cell.hasStairsUp && cell.hasStairsDown ? '⇕' : 
                   cell.hasStairsUp ? '⇑' : 
                   cell.hasStairsDown ? '⇓' : null}
                </Box>
              )}
            </GridItem>
          </GameTooltip>
          );
        })}
      </Grid>
      
      {/* Legend */}
      <Box mt={3}>
        {/* Map Legend */}
        <Flex gap={4} justify="center" className="text-xs mb-2">
          <Flex align="center" gap={1}>
            <Box w={3} h={3} className="bg-yellow-400 rounded-sm border border-amber-300" />
            <Text className="text-amber-200/80">You</Text>
          </Flex>
          <Flex align="center" gap={1}>
            <Box w={3} h={3} className="bg-amber-800/60 rounded-sm border border-amber-600/40" />
            <Text className="text-amber-200/80">Explored</Text>
          </Flex>
          <Flex align="center" gap={1}>
            <Box w={3} h={3} className="bg-black/60 opacity-50 rounded-sm border border-gray-800" />
            <Text className="text-amber-200/80">Unexplored</Text>
          </Flex>
        </Flex>
        
        {/* Stairs Legend */}
        <Flex gap={4} justify="center" className="text-xs">
          <Flex align="center" gap={1}>
            <Text className="text-yellow-400 font-bold" style={{ textShadow: '1px 1px 1px black' }}>⇑</Text>
            <Text className="text-amber-200/80">Stairs Up</Text>
          </Flex>
          <Flex align="center" gap={1}>
            <Text className="text-yellow-400 font-bold" style={{ textShadow: '1px 1px 1px black' }}>⇓</Text>
            <Text className="text-amber-200/80">Stairs Down</Text>
          </Flex>
          <Flex align="center" gap={1}>
            <Text className="text-yellow-400 font-bold" style={{ textShadow: '1px 1px 1px black' }}>⇕</Text>
            <Text className="text-amber-200/80">Both</Text>
          </Flex>
        </Flex>
      </Box>
    </Box>
  );
});

Minimap.displayName = 'Minimap';

export default Minimap;