import React, { useMemo, useState } from 'react';
import { Box, Grid, GridItem, Text, Flex } from '@chakra-ui/react';
import { domain } from '@/types';
import { useFogOfWar } from '@/hooks/game/useFogOfWar';
import { GameTooltip } from '@/components/ui/GameTooltip';

interface MinimapProps {
  /** Current character position */
  currentPosition: domain.Position | null;
  /** Character ID for fog-of-war data */
  characterId: string | null;
  /** Callback when a cell is clicked */
  onCellClick?: (x: number, y: number) => void;
  /** Size of the viewport (e.g., 11 means 11x11 grid) */
  viewportSize?: number;
  /** Current floor depth being displayed */
  currentDepth?: number;
}

const Minimap: React.FC<MinimapProps> = ({
  currentPosition,
  characterId,
  onCellClick,
  viewportSize = 11,
  currentDepth,
}) => {
  // Use the current position's depth if not specified
  const displayDepth = currentDepth ?? (currentPosition?.depth ? Number(currentPosition.depth) : 1);
  
  // Get fog-of-war data
  const { getFloorCells, isLoading } = useFogOfWar(characterId, currentPosition);
  const revealedCells = useMemo(
    () => getFloorCells(displayDepth),
    [getFloorCells, displayDepth]
  );
  
  // Calculate viewport bounds centered on player
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
  }, [currentPosition, viewportSize]);
  
  // Generate grid cells
  const gridCells = useMemo(() => {
    const cells = [];
    
    for (let y = viewportBounds.minY; y <= viewportBounds.maxY; y++) {
      for (let x = viewportBounds.minX; x <= viewportBounds.maxX; x++) {
        const isCurrentPosition = 
          currentPosition?.x && Number(currentPosition.x) === x && 
          currentPosition?.y && Number(currentPosition.y) === y && 
          currentPosition?.depth && Number(currentPosition.depth) === displayDepth;
        
        const isRevealed = revealedCells.has(`${x},${y}`);
        
        cells.push({
          x,
          y,
          key: `${x},${y}`,
          isCurrentPosition,
          isRevealed,
        });
      }
    }
    
    return cells;
  }, [viewportBounds, currentPosition, displayDepth, revealedCells]);
  
  const gridColumns = viewportBounds.maxX - viewportBounds.minX + 1;
  const gridRows = viewportBounds.maxY - viewportBounds.minY + 1;
  
  if (isLoading) {
    return (
      <Box className="bg-gray-800 border border-amber-600 rounded-lg p-4">
        <Text className="gold-text text-center">Loading map...</Text>
      </Box>
    );
  }
  
  return (
    <Box className="bg-gray-800 border border-amber-600 rounded-lg p-4">
      {/* Header */}
      <Flex justify="space-between" align="center" mb={3}>
        <Text className="gold-text text-lg font-serif uppercase">
          Map - Floor {displayDepth}
        </Text>
        <Text className="gold-text-light text-sm">
          ({viewportBounds.minX},{viewportBounds.minY}) - ({viewportBounds.maxX},{viewportBounds.maxY})
        </Text>
      </Flex>
      
      {/* Grid */}
      <Grid
        templateColumns={`repeat(${gridColumns}, 1fr)`}
        templateRows={`repeat(${gridRows}, 1fr)`}
        gap={0.5}
        className="bg-gray-900 p-2 rounded"
      >
        {gridCells.map((cell) => (
          <GameTooltip
            key={cell.key}
            title={`(${cell.x}, ${cell.y})`}
            placement="top"
          >
            <GridItem
              className={`
                aspect-square cursor-pointer transition-all duration-200
                ${cell.isCurrentPosition 
                  ? 'bg-blue-500 animate-pulse shadow-lg shadow-blue-400/50' 
                  : cell.isRevealed 
                    ? 'bg-gray-700 hover:bg-gray-600' 
                    : 'bg-gray-900 opacity-50 hover:opacity-70'
                }
                ${!cell.isRevealed && !cell.isCurrentPosition ? 'fog-overlay' : ''}
              `}
              onClick={() => onCellClick?.(cell.x, cell.y)}
              border="1px solid"
              borderColor={cell.isCurrentPosition ? 'blue.300' : 'gray.700'}
            />
          </GameTooltip>
        ))}
      </Grid>
      
      {/* Legend */}
      <Flex mt={3} gap={4} justify="center" className="text-xs">
        <Flex align="center" gap={1}>
          <Box w={3} h={3} className="bg-blue-500 rounded" />
          <Text className="gold-text-light">You</Text>
        </Flex>
        <Flex align="center" gap={1}>
          <Box w={3} h={3} className="bg-gray-700 rounded" />
          <Text className="gold-text-light">Explored</Text>
        </Flex>
        <Flex align="center" gap={1}>
          <Box w={3} h={3} className="bg-gray-900 opacity-50 rounded" />
          <Text className="gold-text-light">Unexplored</Text>
        </Flex>
      </Flex>
    </Box>
  );
};

export default Minimap;