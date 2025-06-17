import React, { useState } from 'react';
import { Box, Grid, GridItem, Flex, Badge } from '@chakra-ui/react';
import { domain } from '@/types';
import Minimap from '@/components/game/board/Minimap';
import CombatTargets from '@/components/game/controls/CombatTargets';
import EventFeed from '@/components/game/feed/EventFeed';
import ChatPanel from '@/components/game/feed/ChatPanel';
import CharacterActionsTabs from '@/components/game/ui/CharacterActionsTabs';
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
  equipableWeaponIDs?: number[];
  equipableWeaponNames?: string[];
  equipableArmorIDs?: number[];
  equipableArmorNames?: string[];
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
  isCacheLoading,
  equipableWeaponIDs,
  equipableWeaponNames,
  equipableArmorIDs,
  equipableArmorNames
}) => {
  const [selectedTargetIndex, setSelectedTargetIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'character' | 'actions'>('character');

  // Check if we're in development mode
  const isDev = false; // process.env.NODE_ENV === 'development';

  // Use mock data in development for testing
  const finalChatLogs = isDev ? MOCK_CHAT_LOGS : chatLogs;
  const finalEventLogs = isDev ? MOCK_EVENT_LOGS : eventLogs;

  // Handle target selection with automatic tab switching
  const handleSelectTarget = (index: number | null) => {
    setSelectedTargetIndex(index);
    
    // Switch to "Actions" tab when a target is selected (not when deselecting)
    if (index !== null) {
      setActiveTab('actions');
    }
  };

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
        <CharacterActionsTabs 
          character={character}
          position={position}
          combatants={combatants}
          selectedTargetIndex={selectedTargetIndex}
          setSelectedTargetIndex={handleSelectTarget}
          onMove={onMove}
          onAttack={onAttack}
          isMoving={isMoving}
          isAttacking={isAttacking}
          isInCombat={isInCombat}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      </GridItem>

      {/* Combat */}
      <GridItem area="combat" display={{ base: 'none', md: 'block' }}>
          {/* Combat Panel */}
            <Box borderRadius="md" className='h-full card-bg p-4 flex flex-col'>
            <CombatTargets 
              combatants={combatants} 
              selectedTargetIndex={selectedTargetIndex}
              onSelectTarget={handleSelectTarget}
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
            equipableWeaponIDs={equipableWeaponIDs}
            equipableWeaponNames={equipableWeaponNames}
            equipableArmorIDs={equipableArmorIDs}
            equipableArmorNames={equipableArmorNames}
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