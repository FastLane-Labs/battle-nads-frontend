import React, { useState } from 'react';
import { 
  Box, 
  Grid, 
  GridItem, 
  VStack, 
  HStack, 
  Text, 
  Center, 
  Flex,
  IconButton,
  Tooltip,
  Spinner,
  Badge
} from '@chakra-ui/react';
import { ChevronUpIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { Character, AreaInfo } from '../../types/gameTypes';

interface GameBoardProps {
  character: Character; // Current player's character data
  areaCharacters: Character[]; // Characters in the area
  miniMap?: any[][]; // The 5x5 grid of area info from frontend data
  onMove: (direction: 'north' | 'south' | 'east' | 'west' | 'up' | 'down') => void;
  onAttack: (targetIndex: number) => void;
  isMoving?: boolean; // Whether a movement action is in progress
  isAttacking?: boolean; // Whether an attack action is in progress
}

export const GameBoard: React.FC<GameBoardProps> = ({ 
  character, 
  areaCharacters,
  miniMap = [],
  onMove, 
  onAttack,
  isMoving = false,
  isAttacking = false
}) => {
  // Add lastMove state to track movement direction for animations
  const [lastMove, setLastMove] = useState<string | null>(null);
  
  if (!character) {
    return <Center>Loading character data...</Center>;
  }

  // Helper function to determine if a position is adjacent to the player
  const isAdjacentPosition = (x: number, y: number) => {
    const playerX = character.position.x;
    const playerY = character.position.y;
    
    return (
      (Math.abs(x - playerX) <= 1 && y === playerY) || 
      (Math.abs(y - playerY) <= 1 && x === playerX)
    );
  };

  // Convert tile coordinates to world coordinates
  const getTileWorldCoordinates = (tileX: number, tileY: number) => {
    const gridSize = 5;
    const centerOffset = Math.floor(gridSize / 2);
    const worldX = character.position.x - centerOffset + tileX;
    const worldY = character.position.y - centerOffset + tileY;
    return { worldX, worldY };
  };

  // Render the game grid (5x5 minimap)
  const renderGrid = () => {
    const grid = [];
    const gridSize = 5;
    
    for (let y = 0; y < gridSize; y++) {
      const row = [];
      for (let x = 0; x < gridSize; x++) {
        const { worldX, worldY } = getTileWorldCoordinates(x, y);
        const isPlayerPosition = worldX === character.position.x && worldY === character.position.y;
        
        // Find characters at this position
        const charactersAtPosition = areaCharacters.filter(c => 
          c.position.x === worldX && c.position.y === worldY
        );
        
        // A tile is attackable if it has characters that aren't the player and is adjacent
        const isAttackable = charactersAtPosition.length > 0 && 
                            charactersAtPosition.some(c => c.id !== character.id) && 
                            isAdjacentPosition(worldX, worldY);

        // Get area info from miniMap if available
        const tileInfo = miniMap && miniMap[y] && miniMap[y][x] ? miniMap[y][x] : null;
        const hasPlayers = tileInfo && tileInfo.playerCount > 0;
        const hasMonsters = tileInfo && tileInfo.monsterCount > 0;
        const tileDescription = tileInfo && tileInfo.description ? tileInfo.description : '';

        row.push(
          <GridItem 
            key={`${x}-${y}`} 
            w="50px" 
            h="50px" 
            bg={isPlayerPosition ? "blue.500" : isAttackable ? "red.400" : "gray.700"}
            border="1px solid"
            borderColor="gray.600"
            borderRadius="md"
            className={`game-tile ${lastMove && isPlayerPosition ? `animate-move-${lastMove}` : ''}`}
            position="relative"
            onClick={() => {
              if (isAttackable && !isMoving && !isAttacking) {
                // Find the target index in the area characters array
                const targetIndex = areaCharacters.findIndex(c => 
                  c.position.x === worldX && 
                  c.position.y === worldY && 
                  c.id !== character.id
                );
                
                if (targetIndex !== -1) {
                  onAttack(targetIndex);
                }
              }
            }}
            cursor={isAttackable && !isMoving && !isAttacking ? "pointer" : "default"}
            opacity={isMoving || isAttacking ? 0.7 : 1}
            transition="transform 0.2s ease-in-out, background-color 0.2s ease-out"
            _hover={{
              transform: "scale(1.05)",
              bg: isPlayerPosition ? "blue.500" : isAttackable ? "red.400" : "gray.600"
            }}
          >
            <Box p={1}>
              {/* Player/Monster indicators */}
              {(hasPlayers || hasMonsters) && !isPlayerPosition && (
                <Flex direction="column" gap={1}>
                  {hasPlayers && <Badge colorScheme="green" fontSize="2xs">P: {tileInfo.playerCount}</Badge>}
                  {hasMonsters && <Badge colorScheme="red" fontSize="2xs">M: {tileInfo.monsterCount}</Badge>}
                </Flex>
              )}
              
              {/* Player marker */}
              {isPlayerPosition && (
                <Center h="100%">
                  {isMoving ? (
                    <Spinner size="xs" color="white" />
                  ) : (
                    <Text fontSize="sm" color="white" fontWeight="bold">@</Text>
                  )}
                </Center>
              )}
              
              {/* Characters at this position */}
              {charactersAtPosition.length > 0 && !isPlayerPosition && (
                <Center h="100%">
                  <Text fontSize="xs" color="white">
                    {charactersAtPosition.length}
                  </Text>
                </Center>
              )}
            </Box>
            
            {/* Tooltip for tile info */}
            {tileDescription && (
              <Box 
                position="absolute" 
                opacity={0}
                pointerEvents="none"
                transition="opacity 0.2s"
                _groupHover={{ opacity: 1 }}
                bg="gray.800"
                p={2}
                borderRadius="md"
                fontSize="xs"
                zIndex={10}
                bottom="100%"
                left="50%"
                transform="translateX(-50%)"
                w="120px"
                textAlign="center"
              >
                {tileDescription}
              </Box>
            )}
          </GridItem>
        );
      }
      grid.push(
        <HStack key={y} spacing={0}>
          {row}
        </HStack>
      );
    }
    
    return (
      <VStack spacing={0}>
        {grid}
      </VStack>
    );
  };

  // Render movement controls
  const renderControls = () => {
    // Function to handle movement with animation
    const handleMovement = (direction: 'north' | 'south' | 'east' | 'west' | 'up' | 'down') => {
      if (!isMoving && !isAttacking) {
        setLastMove(direction);
        onMove(direction);
      }
    };

    return (
      <Grid
        templateAreas={`
          ". north ."
          "west . east"
          ". south ."
          "up . down"
        `}
        gridTemplateRows={'1fr 1fr 1fr 1fr'}
        gridTemplateColumns={'1fr 1fr 1fr'}
        gap={2}
        mt={4}
      >
        <GridItem area="north">
          <Tooltip label="Move North">
            <IconButton
              aria-label="Move North"
              icon={isMoving ? <Spinner size="sm" /> : <ChevronUpIcon />}
              onClick={() => handleMovement('north')}
              size="md"
              isDisabled={isMoving || isAttacking}
              opacity={isMoving || isAttacking ? 0.6 : 1}
            />
          </Tooltip>
        </GridItem>
        <GridItem area="west">
          <Tooltip label="Move West">
            <IconButton
              aria-label="Move West"
              icon={isMoving ? <Spinner size="sm" /> : <ChevronLeftIcon />}
              onClick={() => handleMovement('west')}
              size="md"
              isDisabled={isMoving || isAttacking}
              opacity={isMoving || isAttacking ? 0.6 : 1}
            />
          </Tooltip>
        </GridItem>
        <GridItem area="east">
          <Tooltip label="Move East">
            <IconButton
              aria-label="Move East"
              icon={isMoving ? <Spinner size="sm" /> : <ChevronRightIcon />}
              onClick={() => handleMovement('east')}
              size="md"
              isDisabled={isMoving || isAttacking}
              opacity={isMoving || isAttacking ? 0.6 : 1}
            />
          </Tooltip>
        </GridItem>
        <GridItem area="south">
          <Tooltip label="Move South">
            <IconButton
              aria-label="Move South"
              icon={isMoving ? <Spinner size="sm" /> : <ChevronDownIcon />}
              onClick={() => handleMovement('south')}
              size="md"
              isDisabled={isMoving || isAttacking}
              opacity={isMoving || isAttacking ? 0.6 : 1}
            />
          </Tooltip>
        </GridItem>
        <GridItem area="up">
          <Tooltip label="Move Up">
            <IconButton
              aria-label="Move Up"
              icon={isMoving ? <Spinner size="sm" /> : <ChevronUpIcon />}
              onClick={() => handleMovement('up')}
              size="md"
              isDisabled={isMoving || isAttacking}
              opacity={isMoving || isAttacking ? 0.6 : 1}
            />
          </Tooltip>
        </GridItem>
        <GridItem area="down">
          <Tooltip label="Move Down">
            <IconButton
              aria-label="Move Down"
              icon={isMoving ? <Spinner size="sm" /> : <ChevronDownIcon />}
              onClick={() => handleMovement('down')}
              size="md"
              isDisabled={isMoving || isAttacking}
              opacity={isMoving || isAttacking ? 0.6 : 1}
            />
          </Tooltip>
        </GridItem>
      </Grid>
    );
  };

  return (
    <Box bg="gray.800" p={4} borderRadius="md" maxW="500px" mx="auto">
      <Box fontSize="lg" mb={2} color="white" display="flex" alignItems="center">
        <Text>
          Character: {character.name} at ({character.position.x}, {character.position.y}, Depth: {character.position.depth})
        </Text>
        {isMoving && <Spinner size="xs" ml={2} />}
      </Box>
      
      <Flex direction="column" align="center">
        {renderGrid()}
        {renderControls()}
      </Flex>
      
      <Text fontSize="sm" mt={4} color="gray.400">
        {isMoving ? "Moving character..." : 
         isAttacking ? "Attacking target..." : 
         "Click on adjacent red tiles to attack enemies."}
      </Text>
    </Box>
  );
};

export default GameBoard; 