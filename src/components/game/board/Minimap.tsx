import React from 'react';
import { Box, Heading, Grid, Center, Text } from '@chakra-ui/react';
import { domain } from '../../../types';

interface MinimapProps {
  character: domain.Character;
  position: { x: number; y: number; z: number };
}

const Minimap: React.FC<MinimapProps> = ({ character, position }) => {
  // In a real implementation, this would render a grid based on the minimap data
  // For now, we'll just show a placeholder
  
  return (
    <Box bg="gray.800" p={4} borderRadius="md" h="100%">
      <Heading size="md" mb={4}>Game Map</Heading>
      
      <Center mb={4}>
        <Text>Level: {position.z}</Text>
      </Center>
      
      <Grid 
        templateColumns="repeat(11, 1fr)" 
        templateRows="repeat(11, 1fr)"
        gap={1}
        bg="gray.700"
        p={2}
        borderRadius="md"
        h="calc(100% - 80px)"
      >
        {/* This would be populated with actual map tiles based on data */}
        {Array(121).fill(0).map((_, index) => {
          const x = index % 11;
          const y = Math.floor(index / 11);
          const isPlayerPosition = x === 5 && y === 5; // Center position
          
          return (
            <Box 
              key={index} 
              bg={isPlayerPosition ? "blue.500" : "gray.600"}
              borderRadius="sm"
            />
          );
        })}
      </Grid>
      
      <Center mt={4}>
        <Text fontSize="sm">Position: ({position.x}, {position.y}, {position.z})</Text>
      </Center>
    </Box>
  );
};

export default Minimap; 