import React from 'react';
import {
  Box, 
  Grid,
  GridItem, 
  Image,
  Text
} from '@chakra-ui/react';
import { MovementOptions } from '@/types/domain';
import { useTransactionBalance } from '@/hooks/wallet/useWalletState';
import { GameTooltip } from '../../ui';

interface MovementControlsProps {
  onMove: (direction: 'north' | 'south' | 'east' | 'west' | 'up' | 'down') => Promise<void>;
  isMoving: boolean;
  position: { x: number; y: number; z: number };
  movementOptions?: MovementOptions;
}

const MovementControls: React.FC<MovementControlsProps> = ({ 
  onMove, 
  isMoving, 
  position, 
  movementOptions 
}) => {

  // Transaction balance validation
  const { isTransactionDisabled, insufficientBalanceMessage } = useTransactionBalance();

  const getTooltipLabel = (dir: 'north' | 'south' | 'east' | 'west' | 'up' | 'down') => {
    if (Number(position.z) === 0) {
      return "🚫 Cannot move while spawning - please wait";
    }
    
    if (isTransactionDisabled) {
      return insufficientBalanceMessage || "Insufficient balance";
    }
    
    // Check movement options for restrictions
    if (movementOptions) {
      switch (dir) {
        case 'north':
          if (!movementOptions.canMoveNorth) return "⚠️ Cannot move further north";
          break;
        case 'south':
          if (!movementOptions.canMoveSouth) return "⚠️ Cannot move further south";
          break;
        case 'east':
          if (!movementOptions.canMoveEast) return "⚠️ Cannot move further east";
          break;
        case 'west':
          if (!movementOptions.canMoveWest) return "⚠️ Cannot move further west";
          break;
        case 'up':
          if (!movementOptions.canMoveUp) return "⚠️ No stairs or ladder at this location";
          break;
        case 'down':
          if (!movementOptions.canMoveDown) return "⚠️ No stairs or ladder at this location";
          break;
      }
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

  // Check if a direction is disabled
  const isDirectionDisabled = (dir: 'north' | 'south' | 'east' | 'west' | 'up' | 'down'): boolean => {
    // Disable movement when at spawn location (z=0)
    if (Number(position.z) === 0) return true;
    
    if (isMoving || isTransactionDisabled) return true;
    
    if (movementOptions) {
      switch (dir) {
        case 'north': return !movementOptions.canMoveNorth;
        case 'south': return !movementOptions.canMoveSouth;
        case 'east': return !movementOptions.canMoveEast;
        case 'west': return !movementOptions.canMoveWest;
        case 'up': return !movementOptions.canMoveUp;
        case 'down': return !movementOptions.canMoveDown;
      }
    }
    
    return false;
  };

  return (
    <Box>
      
      <h1 className='uppercase gold-text-light text-center mb-2 text-2xl font-semibold'>Movement</h1>
      
      <div
        className='border border-yellow-800/80 rounded-md w-max px-10 py-3 mx-auto bg-dark-brown'

      >
      {/* Player Position */}
      <div className='leading-snug mb-1'>
        <Text fontSize="lg" className='gold-text-light font-semibold'>Location</Text>
        {Number(position.x) === 0 && Number(position.y) === 0 && Number(position.z) === 0 ? (
          <Text fontSize="lg" className='gold-text-light'>Spawning...</Text>
        ) : (
          <Text fontSize="lg" className='gold-text-light'>Position ({Number(position.x)}, {Number(position.y)}), Depth {Number(position.z)}</Text>
        )}
      </div>
      <Grid
        templateAreas={`
          ".    north   ."
          "west  .      east"
          "up    south   down"
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
          <GameTooltip 
            customLabel={getTooltipLabel('north')} 
            variant="simple" 
            placement="top"
          >
            <Box
              as="button"
              onClick={() => onMove('north')}
              disabled={isDirectionDisabled('north')}
              opacity={isDirectionDisabled('north') ? 0.5 : 1}
              cursor={isDirectionDisabled('north') ? 'not-allowed' : 'pointer'}
              width="75px"
              height="75px"
              aria-label="Move North"
              className={`transition-all duration-300 ${!isDirectionDisabled('north') ? 'hover:!-translate-y-1 hover:!scale-105' : ''}`}
              >
              <Image 
                src="/assets/buttons/north.png" 
                alt="Move North" 
                width="100%" 
                height="100%"
                />
            </Box>
          </GameTooltip>
        </GridItem>

        <GridItem area="west">
          <GameTooltip 
            customLabel={getTooltipLabel('west')} 
            variant="simple" 
            placement="left"
          >
            <Box
              as="button"
              onClick={() => onMove('west')}
              disabled={isDirectionDisabled('west')}
              opacity={isDirectionDisabled('west') ? 0.5 : 1}
              cursor={isDirectionDisabled('west') ? 'not-allowed' : 'pointer'}
              width="75px"
              height="75px"
              aria-label="Move West"
              className={`transition-all duration-300 ${!isDirectionDisabled('west') ? 'hover:!-translate-x-1 hover:!scale-105' : ''}`}
              >
              <Image 
                src="/assets/buttons/west.png" 
                alt="Move West" 
                width="100%" 
                height="100%"
                />
            </Box>
          </GameTooltip>
        </GridItem>

        <GridItem area="east">
          <GameTooltip 
            customLabel={getTooltipLabel('east')} 
            variant="simple" 
            placement="right"
          >
            <Box
              as="button"
              onClick={() => onMove('east')}
              disabled={isDirectionDisabled('east')}
              opacity={isDirectionDisabled('east') ? 0.5 : 1}
              cursor={isDirectionDisabled('east') ? 'not-allowed' : 'pointer'}
              width="75px"
              height="75px"
              aria-label="Move East"
              className={`transition-all duration-300 ${!isDirectionDisabled('east') ? 'hover:!translate-x-1 hover:!scale-105' : ''}`}
              >
              <Image 
                src="/assets/buttons/east.png" 
                alt="Move East" 
                width="100%" 
                height="100%"
                />
            </Box>
          </GameTooltip>
        </GridItem>

        <GridItem area="south" mt="-13px">
          <GameTooltip 
            customLabel={getTooltipLabel('south')} 
            variant="simple" 
            placement="bottom"
          >
            <Box
              as="button"
              onClick={() => onMove('south')}
              disabled={isDirectionDisabled('south')}
              opacity={isDirectionDisabled('south') ? 0.5 : 1}
              cursor={isDirectionDisabled('south') ? 'not-allowed' : 'pointer'}
              width="75px"
              height="75px"
              aria-label="Move South"
              className={`transition-all duration-300 ${!isDirectionDisabled('south') ? 'hover:!translate-y-1 hover:!scale-105' : ''}`}
              >
              <Image 
                src="/assets/buttons/south.png" 
                alt="Move South" 
                width="100%" 
                height="100%"
                />
            </Box>
          </GameTooltip>
        </GridItem>

        <GridItem area="up" mr="10px">
        <GameTooltip 
          customLabel={getTooltipLabel('up')} 
          variant="simple" 
          placement="bottom"
        >
          <Box
              as="button"
              onClick={() => onMove('up')} 
              disabled={isDirectionDisabled('up')}
              opacity={isDirectionDisabled('up') ? 0.5 : 1}
              cursor={isDirectionDisabled('up') ? 'not-allowed' : 'pointer'}
              width="60px"
              height="60px"
              aria-label="Move Up"
              className={`transition-all duration-300 ${!isDirectionDisabled('up') ? 'hover:!-translate-y-1 hover:!scale-105' : ''}`}
              >
              <Image 
                src="/assets/buttons/up.png" 
                alt="Move Up" 
                width="100%" 
                height="100%"
                />
            </Box>
          </GameTooltip>
        </GridItem>
        
        <GridItem area="down" ml="10px">
        <GameTooltip 
          customLabel={getTooltipLabel('down')} 
          variant="simple" 
          placement="bottom"
        >
        <Box
              as="button"
              onClick={() => onMove('down')} 
              disabled={isDirectionDisabled('down')}
              opacity={isDirectionDisabled('down') ? 0.5 : 1}
              cursor={isDirectionDisabled('down') ? 'not-allowed' : 'pointer'}
              width="60px"
              height="60px"
              aria-label="Move Down"
              className={`transition-all duration-300 ${!isDirectionDisabled('down') ? 'hover:!translate-y-1 hover:!scale-105' : ''}`}
              >
              <Image 
                src="/assets/buttons/down.png" 
                alt="Move Down" 
                width="100%" 
                height="100%"
                />
            </Box>
          </GameTooltip>
        </GridItem>

      </Grid>
     </div>
    </Box>
  );
};

export default MovementControls; 