import React from 'react';
import { Box, Button, SimpleGrid, Heading, VStack, HStack, Spacer } from '@chakra-ui/react';
import { ChevronUpIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';

interface MovementControlsProps {
  onMove: (direction: 'north' | 'south' | 'east' | 'west' | 'up' | 'down') => Promise<void>;
  isMoving: boolean;
}

const MovementControls: React.FC<MovementControlsProps> = ({ onMove, isMoving }) => {
  return (
    <Box>
      <Heading size="md" mb={4}>Movement</Heading>
      
      <VStack spacing={2} align="stretch">
        {/* Cardinal Directions */}
        <SimpleGrid columns={3} spacing={2}>
          {/* North-West */}
          <Button 
            size="md" 
            onClick={() => onMove('north')} 
            isDisabled={isMoving}
            variant="outline"
            opacity={0.5}
            _hover={{ opacity: 1 }}
          >
            NW
          </Button>
          
          {/* North */}
          <Button 
            size="md" 
            onClick={() => onMove('north')} 
            isDisabled={isMoving}
            leftIcon={<ChevronUpIcon boxSize={6} />}
            colorScheme="blue"
          >
            North
          </Button>
          
          {/* North-East */}
          <Button 
            size="md" 
            onClick={() => onMove('north')} 
            isDisabled={isMoving}
            variant="outline"
            opacity={0.5}
            _hover={{ opacity: 1 }}
          >
            NE
          </Button>
          
          {/* West */}
          <Button 
            size="md" 
            onClick={() => onMove('west')} 
            isDisabled={isMoving}
            leftIcon={<ChevronLeftIcon boxSize={6} />}
            colorScheme="blue"
          >
            West
          </Button>
          
          {/* Center (disabled placeholder) */}
          <Button size="md" isDisabled={true} variant="ghost">
            Here
          </Button>
          
          {/* East */}
          <Button 
            size="md" 
            onClick={() => onMove('east')} 
            isDisabled={isMoving}
            rightIcon={<ChevronRightIcon boxSize={6} />}
            colorScheme="blue"
          >
            East
          </Button>
          
          {/* South-West */}
          <Button 
            size="md" 
            onClick={() => onMove('south')} 
            isDisabled={isMoving}
            variant="outline"
            opacity={0.5}
            _hover={{ opacity: 1 }}
          >
            SW
          </Button>
          
          {/* South */}
          <Button 
            size="md" 
            onClick={() => onMove('south')} 
            isDisabled={isMoving}
            leftIcon={<ChevronDownIcon boxSize={6} />}
            colorScheme="blue"
          >
            South
          </Button>
          
          {/* South-East */}
          <Button 
            size="md" 
            onClick={() => onMove('south')} 
            isDisabled={isMoving}
            variant="outline"
            opacity={0.5}
            _hover={{ opacity: 1 }}
          >
            SE
          </Button>
        </SimpleGrid>
        
        {/* Up/Down Controls */}
        <HStack mt={4}>
          <Button 
            size="md" 
            onClick={() => onMove('up')} 
            isDisabled={isMoving}
            flex={1}
          >
            Up
          </Button>
          <Spacer />
          <Button 
            size="md" 
            onClick={() => onMove('down')} 
            isDisabled={isMoving}
            flex={1}
          >
            Down
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
};

export default MovementControls; 