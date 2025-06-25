import React, { useState, useCallback, memo } from 'react';
import { Box, Flex, Text, Button } from '@chakra-ui/react';
import { domain, hooks } from '@/types';
import Minimap from './Minimap';
import FloorSelector from './FloorSelector';
import { GameTooltip } from '@/components/ui/GameTooltip';

interface MinimapContainerProps {
  /** Current character position */
  currentPosition: domain.Position | null;
  /** Character ID for fog-of-war data */
  characterId: string | null;
  /** Optional callback when trying to move to a location */
  onNavigate?: (x: number, y: number, depth: number) => void;
  /** Fog-of-war data from parent hook */
  fogOfWar?: hooks.UseGameDataReturn['fogOfWar'];
}

const MinimapContainer: React.FC<MinimapContainerProps> = memo(({
  currentPosition,
  characterId,
  onNavigate,
  fogOfWar,
}) => {
  // Track which floor we're viewing (defaults to character's floor)
  const [viewingDepth, setViewingDepth] = useState<number>(
    currentPosition?.depth ? Number(currentPosition.depth) : 1
  );
  
  // Use fog-of-war data from parent
  const stats = fogOfWar?.stats || { totalRevealed: 0, floorsVisited: 0, percentageExplored: 0 };
  const clearFog = fogOfWar?.clearFog || (() => {});
  
  // Handle cell clicks on the minimap
  const handleCellClick = useCallback((x: number, y: number) => {
    if (onNavigate) {
      onNavigate(x, y, viewingDepth);
    }
  }, [onNavigate, viewingDepth]);
  
  // Handle floor changes
  const handleDepthChange = useCallback((depth: number) => {
    setViewingDepth(depth);
    setUserSelectedFloor(true);
    
    // Reset user selection flag after a delay to allow auto-follow again
    setTimeout(() => setUserSelectedFloor(false), 2000);
  }, []);
  
  // Update viewing depth only when character moves to a new floor (not when user manually selects)
  const [userSelectedFloor, setUserSelectedFloor] = React.useState(false);
  
  React.useEffect(() => {
    if (currentPosition && !userSelectedFloor) {
      const currentDepthNum = Number(currentPosition.depth);
      if (currentDepthNum !== viewingDepth) {
        setViewingDepth(currentDepthNum);
      }
    }
  }, [currentPosition?.depth, userSelectedFloor, viewingDepth]);
  
  return (
    <Flex direction="column" gap={3}>
      {/* Header with stats */}
      <Box className="bg-dark-brown border border-black/40 rounded-lg p-3">
        <Flex direction="column" gap={2}>
          <Text className="gold-text text-xl font-serif font-semibold">
            World Map
          </Text>
          <Text className="text-amber-200/80 text-sm">
            {stats.totalRevealed} areas explored ({stats.percentageExplored}%)
          </Text>
        </Flex>
      </Box>
      
      {/* Floor selector */}
      <FloorSelector
        currentDepth={viewingDepth}
        onDepthChange={handleDepthChange}
        characterId={characterId}
        characterDepth={currentPosition?.depth ? Number(currentPosition.depth) : undefined}
        fogOfWar={fogOfWar}
      />
      
      {/* Minimap */}
      <Minimap
        currentPosition={currentPosition}
        characterId={characterId}
        onCellClick={handleCellClick}
        currentDepth={viewingDepth}
        viewportSize={21}
        fogOfWar={fogOfWar}
      />
      
      {/* Instructions */}
      <Box className="bg-dark-brown border border-black/40 rounded-lg p-3">
        <Text className="text-amber-200/80 text-xs text-center">
          Click on any explored cell to navigate there. The map reveals as you explore new areas.
        </Text>
      </Box>

      {/* Clear Map Button */}
      <Box className="bg-dark-brown border border-black/40 rounded-lg p-3">
        <GameTooltip title="Clear all exploration data" placement="top">
          <Button
            size="sm"
            variant="outline"
            width="100%"
            className="border-red-600/60 text-red-400 hover:bg-red-900/20 hover:border-red-500 transition-all duration-200"
            onClick={() => {
              if (window.confirm('Clear all exploration data? This cannot be undone.')) {
                clearFog();
              }
            }}
          >
            Clear Map Data
          </Button>
        </GameTooltip>
      </Box>
    </Flex>
  );
});

MinimapContainer.displayName = 'MinimapContainer';

export default MinimapContainer;