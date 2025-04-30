import React from 'react';
import {
  Box, 
  Button, 
  Grid,
  GridItem,
  Heading, 
  VStack, 
  HStack, 
  Spacer, 
  Tooltip,
  IconButton
} from '@chakra-ui/react';
import { 
  ChevronUpIcon, 
  ChevronDownIcon, 
  ArrowBackIcon,
  ArrowForwardIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@chakra-ui/icons';
import { domain } from '../../../types';

interface MovementControlsProps {
  onMove: (direction: 'north' | 'south' | 'east' | 'west' | 'up' | 'down') => Promise<void>;
  isMoving: boolean;
  position: { x: number; y: number; z: number };
}

const MovementControls: React.FC<MovementControlsProps> = ({ onMove, isMoving, position }) => {

  const getTooltipLabel = (dir: 'north' | 'south' | 'east' | 'west' | 'up' | 'down') => {
    if (!position) return 'Move';
    let x = Number(position.x);
    let y = Number(position.y);
    let z = Number(position.z);
    
    switch (dir) {
      case 'north': y += 1; break;
      case 'south': y -= 1; break;
      case 'east':  x += 1; break;
      case 'west':  x -= 1; break;
      case 'up':    z += 1; break;
      case 'down':  z -= 1; break;
    }
    return `Move ${dir} (${x}, ${y}, ${z})`;
  };

  return (
    <Box>
      <Heading size="md" mb={4} textAlign="center">Movement</Heading>
      
      <Grid
        templateAreas={`
          ". north ."
          "west  .  east"
          ". south ."
          "up    .  down"
        `}
        gridTemplateColumns={'auto 1fr auto'}
        gridTemplateRows={'auto auto auto auto'}
        gap={2}
        alignItems="center"
        justifyItems="center"
      >
        <GridItem area="north">
          <Tooltip label={getTooltipLabel('north')} placement="top" hasArrow>
            <IconButton
              aria-label="Move North"
              icon={<ChevronUpIcon boxSize={6} />}
              size="md"
              onClick={() => onMove('north')}
              isDisabled={isMoving}
              colorScheme="blue"
            />
          </Tooltip>
        </GridItem>

        <GridItem area="west">
          <Tooltip label={getTooltipLabel('west')} placement="left" hasArrow>
            <IconButton
              aria-label="Move West"
              icon={<ArrowBackIcon boxSize={6} />}
              size="md"
              onClick={() => onMove('west')}
              isDisabled={isMoving}
              colorScheme="blue"
            />
          </Tooltip>
        </GridItem>

        <GridItem area="east">
          <Tooltip label={getTooltipLabel('east')} placement="right" hasArrow>
            <IconButton
              aria-label="Move East"
              icon={<ArrowForwardIcon boxSize={6} />}
              size="md"
              onClick={() => onMove('east')}
              isDisabled={isMoving}
              colorScheme="blue"
            />
          </Tooltip>
        </GridItem>

        <GridItem area="south">
          <Tooltip label={getTooltipLabel('south')} placement="bottom" hasArrow>
            <IconButton
              aria-label="Move South"
              icon={<ChevronDownIcon boxSize={6} />}
              size="md"
              onClick={() => onMove('south')}
              isDisabled={isMoving}
              colorScheme="blue"
            />
          </Tooltip>
        </GridItem>

        <GridItem area="up">
          <Tooltip label={getTooltipLabel('up')} placement="bottom" hasArrow>
            <IconButton 
              aria-label="Move Up"
              icon={<ChevronUpIcon boxSize={5} />}
              size="md" 
              onClick={() => onMove('up')} 
              isDisabled={isMoving}
              colorScheme="purple"
            />
          </Tooltip>
        </GridItem>

        <GridItem area="down">
          <Tooltip label={getTooltipLabel('down')} placement="bottom" hasArrow>
            <IconButton
              aria-label="Move Down"
              icon={<ChevronDownIcon boxSize={5} />}
              size="md" 
              onClick={() => onMove('down')} 
              isDisabled={isMoving}
              colorScheme="purple"
            />
          </Tooltip>
        </GridItem>
      </Grid>
    </Box>
  );
};

export default MovementControls; 