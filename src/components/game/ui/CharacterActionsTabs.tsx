import React, { useState } from 'react';
import { Box, Flex, Badge } from '@chakra-ui/react';
import { domain } from '@/types';
import CharacterInfo from '@/components/game/board/CharacterInfo';
import { AbilityControls } from '@/components/game/controls/AbilityControls';
import MovementControls from '@/components/game/controls/MovementControls';
import HealthBar from '@/components/game/ui/HealthBar';

interface CharacterActionsTabsProps {
  character: domain.Character;
  position: { x: number; y: number; z: number };
  combatants: domain.CharacterLite[];
  selectedTargetIndex: number | null;
  setSelectedTargetIndex: (index: number | null) => void;
  onMove: (direction: 'north' | 'south' | 'east' | 'west' | 'up' | 'down') => Promise<void>;
  onAttack: (targetIndex: number) => Promise<void>;
  isMoving: boolean;
  isAttacking: boolean;
  isInCombat: boolean;
}

const CharacterActionsTabs: React.FC<CharacterActionsTabsProps> = ({
  character,
  position,
  combatants,
  selectedTargetIndex,
  setSelectedTargetIndex,
  onMove,
  onAttack,
  isMoving,
  isAttacking,
  isInCombat
}) => {
  const [activeTab, setActiveTab] = useState<'character' | 'actions'>('character');

  return (
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
          className={`p-4 h-fit ${activeTab === 'character' ? 'block' : 'hidden'}`}
        >
          <CharacterInfo 
            character={character} 
            combatants={combatants.filter(combatant => !combatant.isDead)}
          />
        </div>
        
        {/* Actions tab content */}
        <div 
          className={`flex flex-col px-4 pb-4 gap-2 pt-3 h-fit justify-start items-center ${activeTab === 'actions' ? 'block' : 'hidden'}`}
        >
          
          <Box> 
            <h1 className='uppercase gold-text-light text-center mb-2 text-2xl font-semibold'>Abilities</h1>
            {selectedTargetIndex !== null ? (
              <AbilityControls 
                characterId={character?.id ?? null} 
                selectedTargetIndex={selectedTargetIndex}
                isInCombat={isInCombat}
                onAttack={onAttack}
                isAttacking={isAttacking}
                combatants={combatants}
              />
            ) : (
              <AbilityControls 
                characterId={character?.id ?? null} 
                selectedTargetIndex={-1} // Use -1 as invalid position when no target selected
                isInCombat={isInCombat}
                onAttack={onAttack}
                isAttacking={isAttacking}
                combatants={combatants}
              />
            )}
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
  );
};

export default CharacterActionsTabs; 