import React from 'react';
import { 
  Box, 
  Flex, 
  SimpleGrid 
} from '@chakra-ui/react';
import { CharacterCard } from '../CharacterCard'; // Adjusted path
import MovementControls from './MovementControls';
import CombatTargetsPanel from './CombatTargetsPanel'; // Import the new component
import DataFeed from './DataFeed';
import { domain } from '../../types'; // Assuming types are needed here

// Define necessary types (might need adjustment based on actual data structure)
type BattleNad = domain.Character;
type BattleNadLite = domain.CharacterLite;
type Position = domain.Position;

interface GameLayoutProps {
  character: BattleNad;
  position: Position | null;
  combatants: BattleNadLite[];
  onMove: (direction: 'north' | 'south' | 'east' | 'west' | 'up' | 'down') => void;
  onAttack: (targetIndex: number) => void;
  isMoving: boolean;
  isAttacking: boolean;
  characterId: string | null; // For DataFeed key
  onSendChatMessage: (message: string) => void;
}

export const GameLayout: React.FC<GameLayoutProps> = ({
  character,
  position,
  combatants,
  onMove,
  onAttack,
  isMoving,
  isAttacking,
  characterId,
  onSendChatMessage,
}) => {
  return (
    <Flex height="100%" flexGrow={1} overflow="hidden">
      {/* Main Game Area */}
      <Box flexBasis={{ base: '100%', lg: '70%' }} height="100%" width="100%" position="relative" p={4} overflowY="auto">
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
          {/* Character Info Panel */}
          <Box bg="gray.800" p={3} borderRadius="md">
             <CharacterCard character={character} />
          </Box>

          {/* Movement Controls Panel */}
          <Box bg="gray.800" p={3} borderRadius="md">
             <MovementControls
              onMove={onMove}
              isDisabled={isMoving || isAttacking}
              initialPosition={position || undefined}
            />
          </Box>

          {/* Combat Targets Panel */}
          <CombatTargetsPanel 
            combatants={combatants}
            onAttack={onAttack}
            isAttacking={isAttacking}
            isMoving={isMoving}
          />

        </SimpleGrid>
      </Box>

      {/* Data Feed Area */}
      <Box flexBasis={{ base: '100%', lg: '30%' }} bg="gray.900" height="100%" overflowY="hidden" borderLeft="1px" borderColor="gray.700">
        <DataFeed
          key={characterId || 'no-char'} // Use characterId for key stability
          characterId={characterId || ''}
          sendChatMessage={onSendChatMessage}
        />
      </Box>
    </Flex>
  );
};

export default GameLayout; 