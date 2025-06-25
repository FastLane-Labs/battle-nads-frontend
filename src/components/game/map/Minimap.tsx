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
  /** Size of the viewport (e.g., 21 means 21x21 grid) */
  viewportSize?: number;
  /** Current floor depth being displayed */
  currentDepth?: number;
}

const Minimap: React.FC<MinimapProps> = ({
  currentPosition,
  characterId,
  onCellClick,
  viewportSize = 21,
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
        {gridCells.map((cell) => (
          <GameTooltip
            key={cell.key}
            title={`(${cell.x}, ${cell.y})`}
            placement="top"
          >
            <GridItem
              className={`
                cursor-pointer transition-all duration-200 w-4 h-4 rounded-sm
                ${cell.isCurrentPosition 
                  ? 'bg-yellow-400 animate-pulse border-2 border-amber-300' 
                  : cell.isRevealed 
                    ? 'bg-amber-800/60 hover:bg-amber-700/80 border border-amber-600/40' 
                    : 'bg-black/60 opacity-50 hover:opacity-70 border border-gray-800'
                }
                ${!cell.isRevealed && !cell.isCurrentPosition ? 'fog-overlay' : ''}
              `}
              onClick={() => onCellClick?.(cell.x, cell.y)}
            />
          </GameTooltip>
        ))}
      </Grid>
      
      {/* Legend */}
      <Flex mt={3} gap={4} justify="center" className="text-xs">
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
    </Box>
  );
};

export default Minimap;