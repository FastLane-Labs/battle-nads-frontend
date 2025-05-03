import React from 'react';
import { Box, Grid, GridItem } from '@chakra-ui/react';
import { domain } from '../../../types';
import Minimap from '@/components/game/board/Minimap';
import CharacterInfo from '@/components/game/board/CharacterInfo';
import MovementControls from '@/components/game/controls/MovementControls';
import CombatTargets from '@/components/game/controls/CombatTargets';
import EventFeed from '@/components/game/feed/EventFeed';
import ChatPanel from '@/components/game/feed/ChatPanel';

interface GameViewProps {
  character: domain.Character;
  position: { x: number; y: number; z: number };
  combatants: domain.CharacterLite[];
  chatLogs: domain.ChatMessage[];
  eventLogs: domain.EventMessage[];
  onMove: (direction: 'north' | 'south' | 'east' | 'west' | 'up' | 'down') => Promise<void>;
  onAttack: (targetIndex: number) => Promise<void>;
  onSendChatMessage: (message: string) => Promise<void>;
  addOptimisticChatMessage: (message: string) => void;
  isMoving: boolean;
  isAttacking: boolean;
  characterId: string;
  isInCombat: boolean;
}

const GameView: React.FC<GameViewProps> = ({
  character,
  position,
  combatants,
  chatLogs,
  eventLogs,
  onMove,
  onAttack,
  onSendChatMessage,
  addOptimisticChatMessage,
  isMoving,
  isAttacking,
  characterId,
  isInCombat
}) => {
  return (
    <Grid
      templateAreas={{
        base: `"map character"
               "controls controls"
               "feed chat"`,
        md: `"map character feed"
             "controls controls chat"`
      }}
      gridTemplateRows={{ base: 'auto auto 1fr', md: '1fr auto' }}
      gridTemplateColumns={{ base: '1fr 1fr', md: '1.5fr 1.5fr 1fr' }}
      h="100%"
      gap="4"
      p="4"
      color="white"
    >
      {/* Game Map */}
      <GridItem area="map">
        <Minimap character={character} position={position} />
      </GridItem>

      {/* Character Info */}
      <GridItem area="character">
        <CharacterInfo 
          character={character} 
          combatants={combatants}
        />
      </GridItem>

      {/* Game Controls */}
      <GridItem area="controls">
        <Grid templateColumns="1fr 1fr" gap={4}>
          {/* Movement Panel */}
          <Box p={4} bg="gray.800" borderRadius="md">
            <MovementControls 
              onMove={onMove} 
              isMoving={isMoving} 
              position={position}
              isInCombat={isInCombat}
            />
          </Box>

          {/* Combat Panel */}
          <Box p={4} bg="gray.800" borderRadius="md">
            <CombatTargets 
              combatants={combatants} 
              onAttack={onAttack} 
              isAttacking={isAttacking} 
            />
          </Box>
        </Grid>
      </GridItem>

      {/* Event Feed */}
      <GridItem area="feed" overflow="auto" maxH={{ base: '200px', md: '100%' }}>
        <Box p={4} bg="gray.800" borderRadius="md" h="100%">
          <EventFeed 
            characterId={characterId} 
            eventLogs={eventLogs}
            combatants={combatants}
          />
        </Box>
      </GridItem>

      {/* Chat Panel */}
      <GridItem area="chat" overflow="auto" maxH={{ base: '200px', md: '100%' }}>
        <Box p={4} bg="gray.800" borderRadius="md" h="100%">
          <ChatPanel 
            characterId={characterId} 
            chatLogs={chatLogs}
            onSendChatMessage={onSendChatMessage}
            addOptimisticChatMessage={addOptimisticChatMessage}
          />
        </Box>
      </GridItem>
    </Grid>
  );
};

export default GameView; 