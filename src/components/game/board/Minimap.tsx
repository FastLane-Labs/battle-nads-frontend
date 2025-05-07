import React from 'react';
import { Box, Heading, Grid, Center, Text } from '@chakra-ui/react';
import { domain } from '@/types';

interface MinimapProps {
  character: domain.Character;
  position: { x: number; y: number; z: number };
}

const Minimap: React.FC<MinimapProps> = ({ character, position }) => {
  const GRID_SIZE = 7;
  const ZONE_SIZE = 7;

  const playerX = Number(position.x);
  const playerY = Number(position.y);

  const zoneX = Math.floor(playerX / ZONE_SIZE);
  const zoneY = Math.floor(playerY / ZONE_SIZE);

  const clampedGridX = Math.min(GRID_SIZE - 1, zoneX);
  const clampedGridY = Math.min(GRID_SIZE - 1, zoneY);

  return (
    <Box borderRadius="md" h="100%" bg="gray.800" className='px-4 pt-4 pb-0'>
      <div className='flex justify-between w-full mb-3'>
        <Heading size="md">Game Map</Heading>
        <Text>Level: {Number(position.z)}</Text>
      </div>
      
      
      <Grid 
        templateColumns="repeat(7, 1fr)" // Use 7x7 grid
        templateRows="repeat(7, 1fr)"
        gap={1}
        bg="gray.700"
        p={2}
        borderRadius="md"
        h="calc(100% - 80px)"
      >
        {/* This would be populated with actual map tiles based on data */}
        {Array(GRID_SIZE * GRID_SIZE).fill(0).map((_, index) => { // Use GRID_SIZE
          const x = index % GRID_SIZE; // Use GRID_SIZE
          const y = Math.floor(index / GRID_SIZE); // Use GRID_SIZE
          
          // Compare loop coords with calculated clamped coords
          const isPlayerPosition = x === clampedGridX && y === clampedGridY; 
          
          // Explicitly return the Box component
          return (
            <Box 
              key={index} 
              bg={isPlayerPosition ? "blue.500" : "gray.600"}
              borderRadius="sm"
            />
          );
        })}
      </Grid>
      
      <Center mt={3} className='leading-none'>
        <Text fontSize="md" fontWeight="semibold">Position: ({Number(position.x)}, {Number(position.y)}, {Number(position.z)})</Text>
      </Center>
    </Box>
  );
};

export default Minimap; 