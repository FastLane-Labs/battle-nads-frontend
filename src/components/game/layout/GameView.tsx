import React, { useState, useMemo, useEffect } from 'react';
import { Box, Grid, GridItem } from '@chakra-ui/react';
import { domain, hooks } from '@/types';
import CombatTargets from '@/components/game/controls/CombatTargets';
import EventFeed from '@/components/game/feed/EventFeed';
import ChatPanel from '@/components/game/feed/ChatPanel';
import CharacterActionsTabs from '@/components/game/ui/CharacterActionsTabs';
import WalletBalances from '@/components/WalletBalances';
import { createAreaID } from '@/utils/areaId';

interface GameViewProps {
  character: domain.Character;
  position: { x: number; y: number; z: number };
  combatants: domain.CharacterLite[];
  noncombatants: domain.CharacterLite[];
  chatLogs: domain.ChatMessage[];
  eventLogs: domain.EventMessage[];
  onMove: (direction: 'north' | 'south' | 'east' | 'west' | 'up' | 'down') => Promise<void>;
  onAttack: (targetIndex: number) => Promise<void>;
  onSendChatMessage: (message: string) => Promise<void>;
  isMoving: boolean;
  isAttacking: boolean;
  isSendingChat: boolean;
  isInCombat: boolean;
  isCacheLoading: boolean;
  equipableWeaponIDs?: number[];
  equipableWeaponNames?: string[];
  equipableArmorIDs?: number[];
  equipableArmorNames?: string[];
  fogOfWar?: hooks.UseGameDataReturn['fogOfWar'];
  currentBlock?: number; // Add current block for combat task status
}

const GameView: React.FC<GameViewProps> = ({
  character: originalCharacter,
  position,
  combatants,
  noncombatants,
  chatLogs,
  eventLogs,
  onMove,
  onAttack,
  onSendChatMessage,
  isMoving,
  isAttacking,
  isSendingChat,
  isInCombat,
  isCacheLoading,
  equipableWeaponIDs,
  equipableWeaponNames,
  equipableArmorIDs,
  equipableArmorNames,
  fogOfWar,
  currentBlock
}) => {
  // For development testing: simulate 1 unspent attribute point
  const character = process.env.NODE_ENV === 'development' 
    ? { 
        ...originalCharacter, 
        stats: { 
          ...originalCharacter.stats, 
          unspentAttributePoints: 1 
        } 
      }
    : originalCharacter;

  const [selectedTargetIndex, setSelectedTargetIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'character' | 'actions' | 'map'>('character');

  // Auto switch to character tab when attribute points become available
  useEffect(() => {
    if (character.stats.unspentAttributePoints > 0) {
      setActiveTab('character');
    }
  }, [character.stats.unspentAttributePoints]);

  const finalEventLogs = eventLogs;

  // Calculate current area ID for event filtering
  const currentAreaId = useMemo(() => {
    return createAreaID(position.z, position.x, position.y);
  }, [position.x, position.y, position.z]);

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
        base: `"tab"
               "combat"
               "feed"
               "chat"`,
        md: `"tab chat"
             "combat chat"
             "feed chat"`,
        lg: `"tab combat chat"
             "tab combat chat"
             "tab feed chat"`
      }}
      gridTemplateRows={{ 
        base: 'auto auto 1fr auto', 
        md: 'auto auto 1fr',
        lg: '1fr 1fr auto' 
      }}
      gridTemplateColumns={{ 
        base: '1fr', 
        md: '1fr 1fr',
        lg: '1.5fr 1.5fr 1fr' 
      }}
      h={{ base: "auto", lg: "100%" }}
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
          noncombatants={noncombatants}
          selectedTargetIndex={selectedTargetIndex}
          setSelectedTargetIndex={handleSelectTarget}
          onMove={onMove}
          onAttack={onAttack}
          isMoving={isMoving}
          isAttacking={isAttacking}
          isInCombat={isInCombat}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          fogOfWar={fogOfWar}
        />
      </GridItem>

      {/* Combat */}
      <GridItem area="combat">
          {/* Combat Panel */}
            <Box borderRadius="md" className='h-full card-bg p-4 flex flex-col overflow-auto'>
            <CombatTargets 
              combatants={combatants}
              noncombatants={noncombatants}
              selectedTargetIndex={selectedTargetIndex}
              onSelectTarget={handleSelectTarget}
              currentPlayerId={character.id}
              currentPlayerLevel={character.level}
              activeTask={character.activeTask}
              currentBlock={currentBlock}
              isInCombat={isInCombat}
            />
            
          </Box>
      </GridItem>

      {/* Event Feed */}
      <GridItem area="feed" maxH={{ base: '300px', md: '400px', lg: '350px' }}>
        <Box p={4} borderRadius="md" h="100%" className='card-bg'>
          <EventFeed 
            eventLogs={eventLogs}
            combatants={combatants}
            isCacheLoading={isCacheLoading}
            equipableWeaponIDs={equipableWeaponIDs}
            equipableWeaponNames={equipableWeaponNames}
            equipableArmorIDs={equipableArmorIDs}
            equipableArmorNames={equipableArmorNames}
            currentAreaId={currentAreaId}
            playerCharacter={character}
          />
        </Box>
      </GridItem>

      {/* Chat Panel and Wallet Balances in a single grid item */}
      <GridItem 
        area="chat" 
        className="flex flex-col h-full card-bg-dark"
        minH={{ base: '420px', md: 'auto' }}
      >
        {/* Chat Panel - will grow to fill available space */}
        <Box pt={4} pb={1} borderRadius="md" className='flex-grow overflow-auto'>
          <ChatPanel 
            characterId={character.id}
            chatLogs={chatLogs}
            onSendChatMessage={onSendChatMessage}
            isCacheLoading={isCacheLoading}
            isSendingChat={isSendingChat}
            currentAreaId={currentAreaId}
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