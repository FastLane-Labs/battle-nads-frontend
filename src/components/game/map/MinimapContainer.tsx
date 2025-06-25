import React, { useState, useCallback } from 'react';
import { Box, Flex, Text, Button } from '@chakra-ui/react';
import { domain } from '@/types';
import { useFogOfWar } from '@/hooks/game/useFogOfWar';
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
}

const MinimapContainer: React.FC<MinimapContainerProps> = ({
  currentPosition,
  characterId,
  onNavigate,
}) => {
  // Track which floor we're viewing (defaults to character's floor)
  const [viewingDepth, setViewingDepth] = useState<number>(
    currentPosition?.depth ? Number(currentPosition.depth) : 1
  );
  
  // Get fog-of-war stats
  const { stats, clearFog } = useFogOfWar(characterId, currentPosition);
  
  // Handle cell clicks on the minimap
  const handleCellClick = useCallback((x: number, y: number) => {
    if (onNavigate) {
      onNavigate(x, y, viewingDepth);
    }
  }, [onNavigate, viewingDepth]);
  
  // Handle floor changes
  const handleDepthChange = useCallback((depth: number) => {
    setViewingDepth(depth);
  }, []);
  
  // Sync viewing depth with character position when it changes
  React.useEffect(() => {
    if (currentPosition && Number(currentPosition.depth) !== viewingDepth) {
      const currentDepthNum = Number(currentPosition.depth);
      // Only auto-follow if we're already viewing the character's floor
      if (viewingDepth === (currentDepthNum - 1) || 
          viewingDepth === (currentDepthNum + 1)) {
        setViewingDepth(currentDepthNum);
      }
    }
  }, [currentPosition, viewingDepth]);
  
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
      />
      
      {/* Minimap */}
      <Minimap
        currentPosition={currentPosition}
        characterId={characterId}
        onCellClick={handleCellClick}
        currentDepth={viewingDepth}
        viewportSize={21}
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
};

export default MinimapContainer;