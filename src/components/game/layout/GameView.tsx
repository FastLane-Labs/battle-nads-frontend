import React, { useState } from 'react';
import { Box, Grid, GridItem, Heading } from '@chakra-ui/react';
import { domain } from '@/types';
import Minimap from '@/components/game/board/Minimap';
import CharacterInfo from '@/components/game/board/CharacterInfo';
import MovementControls from '@/components/game/controls/MovementControls';
import CombatTargets from '@/components/game/controls/CombatTargets';
import EventFeed from '@/components/game/feed/EventFeed';
import ChatPanel from '@/components/game/feed/ChatPanel';
import { AbilityControls } from '@/components/game/controls/AbilityControls';
// --- Import Mock Data ---
import { MOCK_CHAT_LOGS, MOCK_EVENT_LOGS } from '@/hooks/dev/mockFeedData';

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
  isInCombat: boolean;
  isCacheLoading: boolean;
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
  isInCombat,
  isCacheLoading
}) => {
  const [selectedTargetIndex, setSelectedTargetIndex] = useState<number | null>(null);

  // --- Conditionally Use Mock Data --- 
  const isDev = false//process.env.NODE_ENV === 'development';
  const finalChatLogs = isDev ? MOCK_CHAT_LOGS : chatLogs;
  const finalEventLogs = isDev ? MOCK_EVENT_LOGS : eventLogs;
  // -----------------------------------

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
              selectedTargetIndex={selectedTargetIndex}
              onSelectTarget={setSelectedTargetIndex}
            />
            {/* Render Ability Controls below Combat Targets */}
            <Box mt={4}> 
              <Heading size="md" mb={2}>Abilities</Heading> 
              <AbilityControls 
                characterId={character?.id ?? null} 
                selectedTargetIndex={selectedTargetIndex}
                isInCombat={isInCombat}
              />
            </Box>
          </Box>
        </Grid>
      </GridItem>

      {/* Event Feed */}
      <GridItem area="feed" overflow="auto" maxH={{ base: '200px', md: '100%' }}>
        <Box p={4} bg="gray.800" borderRadius="md" h="100%">
          <EventFeed 
            playerIndex={character.index} 
            eventLogs={finalEventLogs}
            combatants={combatants}
            isCacheLoading={isCacheLoading}
          />
        </Box>
      </GridItem>

      {/* Chat Panel */}
      <GridItem area="chat" overflow="auto" maxH={{ base: '200px', md: '100%' }}>
        <Box p={4} bg="gray.800" borderRadius="md" h="100%">
          <ChatPanel 
            characterId={character.id} 
            chatLogs={finalChatLogs}
            onSendChatMessage={onSendChatMessage}
            addOptimisticChatMessage={addOptimisticChatMessage}
            isCacheLoading={isCacheLoading}
          />
        </Box>
      </GridItem>
    </Grid>
  );
};

export default GameView; 