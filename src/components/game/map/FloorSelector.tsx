import React, { useMemo } from 'react';
import { Select, Text, Flex, Box } from '@chakra-ui/react';
import { useFogOfWar } from '@/hooks/game/useFogOfWar';

interface FloorSelectorProps {
  /** Current floor depth */
  currentDepth: number;
  /** Callback when floor is changed */
  onDepthChange: (depth: number) => void;
  /** Character ID for fog-of-war data */
  characterId: string | null;
  /** Character's actual depth (to show current floor indicator) */
  characterDepth?: number;
}

const FloorSelector: React.FC<FloorSelectorProps> = ({
  currentDepth,
  onDepthChange,
  characterId,
  characterDepth,
}) => {
  // Get fog-of-war data to know which floors have been explored
  const { revealedAreas } = useFogOfWar(characterId);
  
  // Calculate which floors have revealed areas
  const exploredFloors = useMemo(() => {
    const floors = new Set<number>();
    
    for (const areaId of revealedAreas) {
      const depth = Number(areaId & 0xFFn);
      floors.add(depth);
    }
    
    return floors;
  }, [revealedAreas]);
  
  // Generate floor options - show all visited floors for easy navigation
  const floorOptions = useMemo(() => {
    const options = [];
    
    // Get all discovered floors
    const discoveredFloors = Array.from(exploredFloors).sort((a, b) => a - b);
    
    // Always include current character floor even if not fully explored yet
    const currentFloor = characterDepth !== undefined ? Number(characterDepth) : null;
    if (currentFloor !== null && !discoveredFloors.includes(currentFloor)) {
      discoveredFloors.push(currentFloor);
      discoveredFloors.sort((a, b) => a - b);
    }
    
    // Show all discovered floors - user can select any of them
    for (const depth of discoveredFloors) {
      // Skip floor 0 as it doesn't exist in the game
      if (depth === 0) continue;
      
      const isExplored = exploredFloors.has(depth);
      const isCurrent = currentFloor !== null && depth === currentFloor;
      
      options.push({
        value: depth,
        label: `Floor ${depth}${isCurrent ? ' (Current)' : ''}${isExplored ? ' ✓' : ''}`,
        isExplored,
        isCurrent,
      });
    }
    
    return options;
  }, [exploredFloors, characterDepth]);
  
  return (
    <Box className="bg-dark-brown border border-black/40 rounded-lg p-3">
      <Flex direction="column" gap={2}>
        <Text className="gold-text text-lg font-serif font-semibold">
          Select Floor
        </Text>
        
        <Select
          value={currentDepth}
          onChange={(e) => onDepthChange(Number(e.target.value))}
          className="border border-yellow-800/80 rounded-md bg-dark-brown text-amber-200"
          size="sm"
          bg="var(--chakra-colors-dark-brown)"
          borderColor="rgb(133 77 14 / 0.8)"
          color="rgb(253 230 138 / 0.8)"
          _hover={{ borderColor: "rgb(217 119 6)" }}
          _focus={{ borderColor: "rgb(217 119 6)", boxShadow: "0 0 0 1px rgb(217 119 6)" }}
        >
          {floorOptions.map((option) => (
            <option 
              key={option.value} 
              value={option.value}
              className={`
                ${option.isCurrent ? 'font-bold' : ''}
                ${option.isExplored ? 'text-green-400' : ''}
              `}
            >
              {option.label}
            </option>
          ))}
        </Select>
        
        <Flex gap={3} className="text-xs mt-1">
          <Text className="text-amber-200/80">
            {exploredFloors.size} floors explored
          </Text>
          {characterDepth !== undefined && Number(characterDepth) !== currentDepth && (
            <Text className="text-yellow-400">
              You are on floor {Number(characterDepth)}
            </Text>
          )}
        </Flex>
      </Flex>
    </Box>
  );
};

export default FloorSelector;