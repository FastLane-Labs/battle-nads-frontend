import React, { useState } from 'react';
import { Box, Grid, GridItem, Heading, Tabs, TabList, Tab, TabPanels, TabPanel } from '@chakra-ui/react';
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
import WalletBalances from '@/components/WalletBalances';

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
        md: `"tab combat chat"
             "tab combat chat"
             "tab feed balances"`
      }}
      gridTemplateRows={{ base: 'auto auto 1fr', md: '1fr auto' }}
      gridTemplateColumns={{ base: '1fr 1fr', md: '1.5fr 1.5fr 1fr' }}
      h="100%"
      gap="4"
      p="4"
      color="white"
    >
      {/* Game Map */}
      {/* <GridItem area="map">
        <Minimap character={character} position={position} />
      </GridItem> */}

      {/* Tab component */}
      <GridItem area="tab" className='h-full'>
        <Tabs variant="enclosed" colorScheme="blue">
          <TabList>
            <Tab>Character</Tab>
            <Tab>Actions</Tab>
          </TabList>
          <TabPanels>
            {/* tab 1 (Character) */}
            <TabPanel>
              <CharacterInfo 
                character={character} 
                combatants={combatants}
              />
            </TabPanel>
            {/* tab 2 (Actions) */}
            <TabPanel className='card-bg'>
              <Box my={4}> 
              <h1 className='gold-text-light text-center mb-2 text-3xl font-semibold'>Abilities</h1>
              <AbilityControls 
                  characterId={character?.id ?? null} 
                  selectedTargetIndex={selectedTargetIndex}
                  isInCombat={isInCombat}
                />
              </Box>
              <Box>
                <MovementControls 
                  onMove={onMove} 
                  isMoving={isMoving} 
                  position={position}
                  isInCombat={isInCombat}
                />
              </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </GridItem>

      {/* Combat */}
      <GridItem area="combat" display={{ base: 'none', md: 'block' }}>
          {/* Combat Panel */}
            <Box borderRadius="md" className='h-full card-bg p-4 flex flex-col'>
            <CombatTargets 
              combatants={combatants} 
              onAttack={onAttack} 
              isAttacking={isAttacking} 
              selectedTargetIndex={selectedTargetIndex}
              onSelectTarget={setSelectedTargetIndex}
            />
            
          </Box>
      </GridItem>

      {/* Event Feed */}
      <GridItem area="feed" overflow="auto" maxH={{ base: '200px', md: '100%' }}>
        <Box p={4} borderRadius="md" h="100%" className='card-bg'>
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
        <Box p={4} borderRadius="md" h="100%" className='card-bg !bg-dark-brown'>
          <ChatPanel 
            characterId={character.id} 
            chatLogs={finalChatLogs}
            onSendChatMessage={onSendChatMessage}
            addOptimisticChatMessage={addOptimisticChatMessage}
            isCacheLoading={isCacheLoading}
          />
        </Box>
      </GridItem>

      {/* Wallet Balances */}
      <GridItem area="balances" overflow="auto" maxH={{ base: '200px', md: '100%' }}>
      <WalletBalances />
    </GridItem>

    </Grid>
  );
};

export default GameView; 