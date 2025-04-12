import React from 'react';
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
}

const MovementControls: React.FC<MovementControlsProps> = ({ 
  onMove, 
  isDisabled = false 
}) => {
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
        <Tooltip label="Move North" hasArrow>
          <Button
            colorScheme="blue"
            onClick={() => onMove('north')}
            isDisabled={isDisabled}
            aria-label="Move North"
          >
            <ArrowUpIcon />
          </Button>
        </Tooltip>
      </GridItem>
      
      <GridItem area="west" justifySelf="center">
        <Tooltip label="Move West" hasArrow>
          <Button
            colorScheme="blue"
            onClick={() => onMove('west')}
            isDisabled={isDisabled}
            aria-label="Move West"
          >
            <ArrowLeftIcon />
          </Button>
        </Tooltip>
      </GridItem>
      
      <GridItem area="east" justifySelf="center">
        <Tooltip label="Move East" hasArrow>
          <Button
            colorScheme="blue"
            onClick={() => onMove('east')}
            isDisabled={isDisabled}
            aria-label="Move East"
          >
            <ArrowRightIcon />
          </Button>
        </Tooltip>
      </GridItem>
      
      <GridItem area="down" justifySelf="center">
        <Tooltip label="Move South" hasArrow>
          <Button
            colorScheme="blue"
            onClick={() => onMove('south')}
            isDisabled={isDisabled}
            aria-label="Move South"
          >
            <ArrowDownIcon />
          </Button>
        </Tooltip>
      </GridItem>
      
      <GridItem area="ascend" justifySelf="center">
        <Tooltip label="Move Up" hasArrow>
          <Button
            colorScheme="purple"
            onClick={() => onMove('up')}
            isDisabled={isDisabled}
            aria-label="Move Up"
            size="sm"
          >
            <ChevronUpIcon boxSize={6} />
          </Button>
        </Tooltip>
      </GridItem>
      
      <GridItem area="descend" justifySelf="center">
        <Tooltip label="Move Down" hasArrow>
          <Button
            colorScheme="purple"
            onClick={() => onMove('down')}
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