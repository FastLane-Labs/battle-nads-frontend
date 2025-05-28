import React, { useState } from 'react';
import { Box, Grid, GridItem, Flex, Badge } from '@chakra-ui/react';
import { domain } from '@/types';
import Minimap from '@/components/game/board/Minimap';
import CharacterInfo from '@/components/game/board/CharacterInfo';
import MovementControls from '@/components/game/controls/MovementControls';
import CombatTargets from '@/components/game/controls/CombatTargets';
import EventFeed from '@/components/game/feed/EventFeed';
import ChatPanel from '@/components/game/feed/ChatPanel';
import { AbilityControls } from '@/components/game/controls/AbilityControls';
import HealthBar from '@/components/game/ui/HealthBar';
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
  const [activeTab, setActiveTab] = useState<'character' | 'actions'>('character');

  // Check if we're in development mode
  const isDev = false; // process.env.NODE_ENV === 'development';

  // Use mock data in development for testing
  const finalChatLogs = isDev ? MOCK_CHAT_LOGS : chatLogs;
  const finalEventLogs = isDev ? MOCK_EVENT_LOGS : eventLogs;

  return (
    <Grid
      templateAreas={{
        base: `"tab combat chat"
             "tab combat chat"
             "tab feed chat"`
      }}
      gridTemplateRows={{ base: 'auto auto 1fr', md: '1fr 1fr auto' }}
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
        <div className="flex flex-col h-full">
          {/* Tab Buttons */}
          <div className="flex ">
            <button
              className={`uppercase bg-brown rounded-lg border-black/40 border-t border-x w-1/2 !rounded-b-none py-2 hover:transform-none hover:translate-y-0 border-b-2 ${activeTab === 'character' ? 'border-b-brown' : 'border-b-black/40'}`}
              onClick={() => setActiveTab('character')}
              style={{ transform: 'none' }}
            >
              {activeTab === 'character' ? 
                <span className="gold-text-light font-semibold text-2xl">Character</span> : 
                <span className="gray-text font-semibold text-2xl">Character</span>
              }
            </button>
            <button
              className={`uppercase bg-brown rounded-lg border-black/40 border-t border-x w-1/2 !rounded-b-none py-2 hover:transform-none hover:translate-y-0 border-b-2 ${activeTab === 'actions' ? 'border-b-brown' : 'border-b-black/40'}`}
              onClick={() => setActiveTab('actions')}
              style={{ transform: 'none' }}
            >
              {activeTab === 'actions' ? 
                <span className="gold-text-light font-semibold text-2xl">Actions</span> : 
                <span className="gray-text font-semibold text-2xl">Actions</span>
              }
            </button>
          </div>
          
          {/* Tab Panels */}
          <div className="flex-grow bg-brown border-black/40 border-b border-x rounded-b-lg">
            {/* Character header - shared between both tabs */}
            <div className='grid gap-1.5 p-2 bg-dark-brown rounded-lg border border-black/40 mx-4 mt-4'>
              <Flex justify="space-between" align="center">
                <h1 className='gold-text-light text-2xl font-bold tracking-tight'>{character?.name || 'Unnamed Character'}</h1>
                {Number(character?.level) && (
                  <Box 
                  backgroundImage="/assets/bg/level.png"
                  backgroundSize="contain"
                  backgroundRepeat="no-repeat"
                  backgroundPosition="center"
                  px={3}
                  py={1}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  minWidth="120px"
                  height="40px"
                  className='text-yellow-400/90 font-bold text-center font-serif text-xl'
                  >
                    Level {Number(character?.level)}
                  </Box>
                )}
              </Flex>
            
            
              {/* Health Bar */}
              <HealthBar 
                health={character.health} 
                maxHealth={character.maxHealth} 
                size="medium"
                />
                
                {/* Combat Indicator */}
                {isInCombat && (() => {
                  const livingCombatants = combatants.filter(combatant => !combatant.isDead);
                  const combatIndicatorText = livingCombatants.length === 1 
                    ? `Fighting: ${livingCombatants[0]?.name || 'Unknown'}`
                    : `Fighting: Multiple Enemies (${livingCombatants.length})`;
                  
                  return (
                    <Badge colorScheme="red" variant="solid" p={1} textAlign="center" w="100%">
                      ⚔️ {combatIndicatorText} ⚔️
                    </Badge>
                  );
                })()}
            </div>

            {/* Character tab content */}
            <div 
              className={`p-4  h-full ${activeTab === 'character' ? 'block' : 'hidden'}`}
            >
              <CharacterInfo 
                character={character} 
                combatants={combatants.filter(combatant => !combatant.isDead)}
              />
            </div>
            
            {/* Actions tab content */}
            <div 
              className={`flex flex-col px-4 pb-4 h-full justify-start items-center ${activeTab === 'actions' ? 'block' : 'hidden'}`}
            >
              
              <Box className='mb-2 p-4'> 
                <h1 className='uppercase gold-text-light text-center mb-2 text-3xl font-semibold'>Abilities</h1>
                <AbilityControls 
                  characterId={character?.id ?? null} 
                  selectedTargetIndex={selectedTargetIndex}
                  isInCombat={isInCombat}
                  onAttack={onAttack}
                  isAttacking={isAttacking}
                />
              </Box>
              <Box>
                <MovementControls 
                  onMove={onMove} 
                  isMoving={isMoving} 
                  position={position}
                  isInCombat={isInCombat}
                  movementOptions={character.movementOptions}
                />
              </Box>
            </div>
          </div>
        </div>
      </GridItem>

      {/* Combat */}
      <GridItem area="combat" display={{ base: 'none', md: 'block' }}>
          {/* Combat Panel */}
            <Box borderRadius="md" className='h-full card-bg p-4 flex flex-col'>
            <CombatTargets 
              combatants={combatants} 
              selectedTargetIndex={selectedTargetIndex}
              onSelectTarget={setSelectedTargetIndex}
            />
            
          </Box>
      </GridItem>

      {/* Event Feed */}
      <GridItem area="feed" overflow="auto" maxH={{ base: '200px', md: '100%' }} className='min-h-72'>
        <Box p={4} borderRadius="md" h="100%" className='card-bg'>
          <EventFeed 
            playerIndex={character.index} 
            eventLogs={finalEventLogs}
            combatants={combatants}
            isCacheLoading={isCacheLoading}
          />
        </Box>
      </GridItem>

      {/* Chat Panel and Wallet Balances in a single grid item */}
      <GridItem area="chat" className="flex flex-col h-full card-bg-dark">
        {/* Chat Panel - will grow to fill available space */}
        <Box pt={4} pb={1} borderRadius="md" className='flex-grow overflow-auto'>
          <ChatPanel 
            characterId={character.id} 
            chatLogs={finalChatLogs}
            onSendChatMessage={onSendChatMessage}
            addOptimisticChatMessage={addOptimisticChatMessage}
            isCacheLoading={isCacheLoading}
          />
        </Box>
        
        {/* Wallet Balances - takes only the space it needs */}
        <Box className="flex-shrink-0">
          <WalletBalances />
        </Box>
      </GridItem>

    </Grid>
  );
};

export default GameView; 