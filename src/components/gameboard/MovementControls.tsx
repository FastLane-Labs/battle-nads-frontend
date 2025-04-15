import React, { useState, useEffect } from 'react';
import { Grid, GridItem, Button, Tooltip } from '@chakra-ui/react';
import { 
  ArrowUpIcon, 
  ArrowDownIcon, 
  ArrowLeftIcon, 
  ArrowRightIcon,
  ChevronUpIcon,
  ChevronDownIcon
} from '@chakra-ui/icons';

interface MovementControlsProps {
  onMove: (direction: string) => void;
  isDisabled?: boolean;
  initialPosition?: { x: number, y: number, depth: number };
}

const MovementControls: React.FC<MovementControlsProps> = ({ 
  onMove, 
  isDisabled = false,
  initialPosition
}) => {
  // Keep track of the current position
  const [currentPosition, setCurrentPosition] = useState(initialPosition || { x: 0, y: 0, depth: 0 });
  
  // Update position from prop changes
  useEffect(() => {
    if (initialPosition) {
      setCurrentPosition(initialPosition);
    }
  }, [initialPosition]);
  
  // Listen for position changes from events
  useEffect(() => {
    const handlePositionChanged = (event: CustomEvent) => {
      console.log("[MovementControls] Received characterPositionChanged event:", event.detail);
      if (event.detail && event.detail.position) {
        setCurrentPosition(event.detail.position);
      }
    };
    
    // Add event listener
    window.addEventListener('characterPositionChanged', handlePositionChanged as EventListener);
    
    // Clean up
    return () => {
      window.removeEventListener('characterPositionChanged', handlePositionChanged as EventListener);
    };
  }, []);
  
  // Handle movement with position update
  const handleMovement = (direction: string) => {
    // Call the parent handler
    onMove(direction);
    
    // Optimistically update position for immediate feedback
    // This will be overridden by the event when it comes in
    let newPosition = { ...currentPosition };
    
    switch (direction) {
      case 'north':
        newPosition.y = currentPosition.y - 1;
        break;
      case 'south':
        newPosition.y = currentPosition.y + 1;
        break;
      case 'east':
        newPosition.x = currentPosition.x + 1;
        break;
      case 'west':
        newPosition.x = currentPosition.x - 1;
        break;
      case 'up':
        newPosition.depth = currentPosition.depth - 1;
        break;
      case 'down':
        newPosition.depth = currentPosition.depth + 1;
        break;
    }
    
    // Update local state for immediate feedback
    setCurrentPosition(newPosition);
  };
  
  return (
    <Grid
      templateAreas={`
        ".       up        ."
        "west     .       east"
        ".       down      ."
        "ascend    .     descend"
      `}
      gridTemplateRows={'1fr 1fr 1fr 1fr'}
      gridTemplateColumns={'1fr 1fr 1fr'}
      gap={2}
      justifyContent="center"
      alignItems="center"
    >
      <GridItem area="up" justifySelf="center">
        <Tooltip label={`Move North (${currentPosition.x}, ${currentPosition.y - 1})`} hasArrow>
          <Button
            colorScheme="blue"
            onClick={() => handleMovement('north')}
            isDisabled={isDisabled}
            aria-label="Move North"
          >
            <ArrowUpIcon />
          </Button>
        </Tooltip>
      </GridItem>
      
      <GridItem area="west" justifySelf="center">
        <Tooltip label={`Move West (${currentPosition.x - 1}, ${currentPosition.y})`} hasArrow>
          <Button
            colorScheme="blue"
            onClick={() => handleMovement('west')}
            isDisabled={isDisabled}
            aria-label="Move West"
          >
            <ArrowLeftIcon />
          </Button>
        </Tooltip>
      </GridItem>
      
      <GridItem area="east" justifySelf="center">
        <Tooltip label={`Move East (${currentPosition.x + 1}, ${currentPosition.y})`} hasArrow>
          <Button
            colorScheme="blue"
            onClick={() => handleMovement('east')}
            isDisabled={isDisabled}
            aria-label="Move East"
          >
            <ArrowRightIcon />
          </Button>
        </Tooltip>
      </GridItem>
      
      <GridItem area="down" justifySelf="center">
        <Tooltip label={`Move South (${currentPosition.x}, ${currentPosition.y + 1})`} hasArrow>
          <Button
            colorScheme="blue"
            onClick={() => handleMovement('south')}
            isDisabled={isDisabled}
            aria-label="Move South"
          >
            <ArrowDownIcon />
          </Button>
        </Tooltip>
      </GridItem>
      
      <GridItem area="ascend" justifySelf="center">
        <Tooltip label={`Move Up (Depth: ${currentPosition.depth - 1})`} hasArrow>
          <Button
            colorScheme="purple"
            onClick={() => handleMovement('up')}
            isDisabled={isDisabled}
            aria-label="Move Up"
            size="sm"
          >
            <ChevronUpIcon boxSize={6} />
          </Button>
        </Tooltip>
      </GridItem>
      
      <GridItem area="descend" justifySelf="center">
        <Tooltip label={`Move Down (Depth: ${currentPosition.depth + 1})`} hasArrow>
          <Button
            colorScheme="purple"
            onClick={() => handleMovement('down')}
            isDisabled={isDisabled}
            aria-label="Move Down"
            size="sm"
          >
            <ChevronDownIcon boxSize={6} />
          </Button>
        </Tooltip>
      </GridItem>
    </Grid>
  );
};

export default MovementControls; 