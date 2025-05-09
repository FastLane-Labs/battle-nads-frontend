import React from 'react';
import {
  Box, 
  Grid,
  GridItem,
  Heading, 
  Tooltip,
  IconButton,
  Image
} from '@chakra-ui/react';
import { 
  ChevronUpIcon, 
  ChevronDownIcon
} from '@chakra-ui/icons';

interface MovementControlsProps {
  onMove: (direction: 'north' | 'south' | 'east' | 'west' | 'up' | 'down') => Promise<void>;
  isMoving: boolean;
  position: { x: number; y: number; z: number };
  isInCombat: boolean;
}

const MovementControls: React.FC<MovementControlsProps> = ({ onMove, isMoving, position, isInCombat }) => {

  const getTooltipLabel = (dir: 'north' | 'south' | 'east' | 'west' | 'up' | 'down') => {
    if (isInCombat) {
      return "⚔️ Cannot move while in combat";
    }
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
      <h1 className='gold-text text-center mb-2 text-3xl font-semibold'>Movement</h1>
      <div
        className='border border-yellow-800/80 rounded-md w-max px-10 py-3 mx-auto'

      >
      <Grid
        templateAreas={`
          ".    north   ."
          "west  .      east"
          ".    south   ."
          "up    .      down"
          `}
          gridTemplateColumns={'auto 62px auto'}
          gridTemplateRows={'auto auto auto auto'}
          gap={0}
          alignItems="center"
          justifyItems="center"
          mx="auto"
          maxW="224px"
          >
        <GridItem area="north" mb="-12px">
          <Tooltip label={getTooltipLabel('north')} placement="top" hasArrow>
            <Box
              as="button"
              onClick={() => onMove('north')}
              disabled={isMoving || isInCombat}
              opacity={isMoving || isInCombat ? 0.5 : 1}
              cursor={isMoving || isInCombat ? 'not-allowed' : 'pointer'}
              width="75px"
              height="75px"
              aria-label="Move North"
              className={`transition-all duration-300 ${!isMoving && !isInCombat ? 'hover:!-translate-y-1 hover:!scale-105' : ''}`}
              >
              <Image 
                src="/assets/buttons/north.png" 
                alt="Move North" 
                width="100%" 
                height="100%"
                />
            </Box>
          </Tooltip>
        </GridItem>

        <GridItem area="west">
          <Tooltip label={getTooltipLabel('west')} placement="left" hasArrow>
            <Box
              as="button"
              onClick={() => onMove('west')}
              disabled={isMoving || isInCombat}
              opacity={isMoving || isInCombat ? 0.5 : 1}
              cursor={isMoving || isInCombat ? 'not-allowed' : 'pointer'}
              width="75px"
              height="75px"
              aria-label="Move West"
              className={`transition-all duration-300 ${!isMoving && !isInCombat ? 'hover:!-translate-x-1 hover:!scale-105' : ''}`}
              >
              <Image 
                src="/assets/buttons/west.png" 
                alt="Move West" 
                width="100%" 
                height="100%"
                />
            </Box>
          </Tooltip>
        </GridItem>

        <GridItem area="east">
          <Tooltip label={getTooltipLabel('east')} placement="right" hasArrow>
            <Box
              as="button"
              onClick={() => onMove('east')}
              disabled={isMoving || isInCombat}
              opacity={isMoving || isInCombat ? 0.5 : 1}
              cursor={isMoving || isInCombat ? 'not-allowed' : 'pointer'}
              width="75px"
              height="75px"
              aria-label="Move East"
              className={`transition-all duration-300 ${!isMoving && !isInCombat ? 'hover:!translate-x-1 hover:!scale-105' : ''}`}
              >
              <Image 
                src="/assets/buttons/east.png" 
                alt="Move East" 
                width="100%" 
                height="100%"
                />
            </Box>
          </Tooltip>
        </GridItem>

        <GridItem area="south" mt="-13px">
          <Tooltip label={getTooltipLabel('south')} placement="bottom" hasArrow>
            <Box
              as="button"
              onClick={() => onMove('south')}
              disabled={isMoving || isInCombat}
              opacity={isMoving || isInCombat ? 0.5 : 1}
              cursor={isMoving || isInCombat ? 'not-allowed' : 'pointer'}
              width="75px"
              height="75px"
              aria-label="Move South"
              className={`transition-all duration-300 ${!isMoving && !isInCombat ? 'hover:!translate-y-1 hover:!scale-105' : ''}`}
              >
              <Image 
                src="/assets/buttons/south.png" 
                alt="Move South" 
                width="100%" 
                height="100%"
                />
            </Box>
          </Tooltip>
        </GridItem>

        <GridItem area="up" mt="-8px" mr="10px">
        <Tooltip label={getTooltipLabel('up')} placement="bottom" hasArrow>
          <Box
              as="button"
              onClick={() => onMove('up')} 
              disabled={isMoving || isInCombat}
              opacity={isMoving || isInCombat ? 0.5 : 1}
              cursor={isMoving || isInCombat ? 'not-allowed' : 'pointer'}
              width="60px"
              height="60px"
              aria-label="Move Up"
              className={`transition-all duration-300 ${!isMoving && !isInCombat ? 'hover:!-translate-y-1 hover:!scale-105' : ''}`}
              >
              <Image 
                src="/assets/buttons/up.png" 
                alt="Move Up" 
                width="100%" 
                height="100%"
                />
            </Box>
          </Tooltip>
        </GridItem>
        
        <GridItem area="down" mt="-8px" ml="10px">
        <Tooltip label={getTooltipLabel('down')} placement="bottom" hasArrow>
        <Box
              as="button"
              onClick={() => onMove('down')} 
              disabled={isMoving || isInCombat}
              opacity={isMoving || isInCombat ? 0.5 : 1}
              cursor={isMoving || isInCombat ? 'not-allowed' : 'pointer'}
              width="60px"
              height="60px"
              aria-label="Move Down"
              className={`transition-all duration-300 ${!isMoving && !isInCombat ? 'hover:!translate-y-1 hover:!scale-105' : ''}`}
              >
              <Image 
                src="/assets/buttons/down.png" 
                alt="Move Down" 
                width="100%" 
                height="100%"
                />
            </Box>
          </Tooltip>
        </GridItem>

      </Grid>
     </div>
    </Box>
  );
};

export default MovementControls; 