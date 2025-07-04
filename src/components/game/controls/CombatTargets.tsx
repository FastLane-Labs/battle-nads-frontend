import React from 'react';
import { Box, Button, VStack, Text, Flex } from '@chakra-ui/react';
import { domain } from '../../../types';
import HealthBar from '../ui/HealthBar';
import { calculateThreatLevel, getThreatColors } from '@/utils/threatLevel';
import { CombatTaskStatusBar } from './CombatTaskStatusBar';

interface CombatTargetsProps {
  combatants: domain.CharacterLite[];
  noncombatants: domain.CharacterLite[];
  selectedTargetIndex: number | null;
  onSelectTarget: (index: number | null) => void;
  currentPlayerId?: string; // Add current player ID to filter them out
  currentPlayerLevel?: number; // Add current player level for threat calculation
  activeTask?: domain.CombatTracker; // Add active task for combat task status
  currentBlock?: number; // Add current block for task countdown
  isInCombat?: boolean; // Add combat state for task bar persistence
}

const CombatTargets: React.FC<CombatTargetsProps> = ({ 
  combatants, 
  noncombatants,
  selectedTargetIndex,
  onSelectTarget,
  currentPlayerId,
  currentPlayerLevel,
  activeTask,
  currentBlock,
  isInCombat
}) => {
  // Helper function to check if a character class is a player class
  const isPlayerClass = (classValue: domain.CharacterClass): boolean => {
    return classValue >= domain.CharacterClass.Bard && classValue <= domain.CharacterClass.Sorcerer;
  };

  // Helper function to check if a character class is an enemy class
  const isEnemyClass = (classValue: domain.CharacterClass): boolean => {
    return classValue >= domain.CharacterClass.Basic && classValue <= domain.CharacterClass.Boss;
  };

  // Filter out dead characters from combat targets to prevent targeting dead enemies
  const validCombatants = combatants.filter(combatant => !combatant.isDead);
  
  // Create a set of combatant IDs for efficient lookup
  const combatantIds = new Set(validCombatants.map(combatant => combatant.id));
  
  // First, deduplicate noncombatants by ID to prevent duplicate entries
  const uniqueNoncombatants = noncombatants.reduce((acc, current) => {
    const existing = acc.find(item => item.id === current.id);
    if (!existing) {
      acc.push(current);
    }
    return acc;
  }, [] as domain.CharacterLite[]);
  
  // Filter out dead characters, current player, and anyone who is already a combatant
  const validNoncombatants = uniqueNoncombatants.filter(noncombatant => 
    !noncombatant.isDead && 
    noncombatant.id !== currentPlayerId &&
    !combatantIds.has(noncombatant.id)
  );
  
  // Split non-combatants into players and enemies based on character class
  const playerNoncombatants = validNoncombatants.filter(character => {
    return isPlayerClass(character.class);
  });
  const enemyNoncombatants = validNoncombatants.filter(character => {
    return isEnemyClass(character.class);
  });
  
  // Get the character class name
  const getClassDisplayName = (classValue: domain.CharacterClass): string => {
    return domain.CharacterClass[classValue] || 'Unknown';
  };
  
  // Render character button component
  const renderCharacterButton = (character: domain.CharacterLite, arrayIndex: number, characterType: 'combatant' | 'player' | 'enemy' = 'combatant') => {
    // Use the character's position index for targeting, not array index
    const positionIndex = character.index;
    const isSelected = selectedTargetIndex === positionIndex;
    
    // Calculate threat level for players, enemies, and combatants (except current player)
    const shouldApplyThreat = currentPlayerLevel && (
      characterType === 'player' || 
      characterType === 'enemy' || 
      (characterType === 'combatant' && character.id !== currentPlayerId)
    );
    
    const threatInfo = shouldApplyThreat 
      ? calculateThreatLevel(currentPlayerLevel, character.level)
      : null;
    const threatColors = threatInfo ? getThreatColors(threatInfo.level) : null;
    
    // Determine styling based on character type and threat level
    const getBorderStyle = () => {
      if (threatColors) return { border: "1px dashed", borderColor: threatColors.chakraColor + ".500" };
      if (characterType === 'combatant') return { border: "1px solid", borderColor: "transparent" };
      if (characterType === 'player') return { border: "1px dashed", borderColor: "gray.500" };
      if (characterType === 'enemy') return { border: "1px dashed", borderColor: "red.400" };
      return { border: "1px solid", borderColor: "transparent" };
    };
    
    const getOpacity = () => {
      return characterType === 'combatant' ? 1 : 0.75;
    };
    
    const getDefaultName = () => {
      if (characterType === 'player') return `Player #${arrayIndex + 1}`;
      if (characterType === 'enemy') return `Enemy #${arrayIndex + 1}`;
      return `Target #${arrayIndex + 1}`;
    };
    
    return (
      <Button
        key={`${characterType}-${character.id}-${arrayIndex}`} // Use character type + ID + index for truly unique keys
        size="sm"
        variant={isSelected ? "solid" : "ghost"}
        colorScheme={isSelected ? "whiteAlpha" : "gray"}
        justifyContent="flex-start"
        width="100%"
        mb={1}
        p={3}
        h="auto"
        onClick={() => onSelectTarget(isSelected ? null : positionIndex)}
        flexDirection="column"
        alignItems="stretch"
        opacity={getOpacity()}
        {...getBorderStyle()}
      >
        {/* Top row: Name, Class, Level */}
        <Flex justify="space-between" align="center" w="100%" mb={2}>
          <Flex align="center" gap={2}>
            <Text fontSize="sm" className={
              threatColors ? threatColors.text : 
              characterType === 'combatant' ? 'gold-text-light' : 
              characterType === 'player' ? 'text-gray-300' : 
              'text-red-300'
            }>
              {character.name || getDefaultName()}
            </Text>
            {characterType === 'player' && (
              <Text fontSize="xs" className={threatColors ? threatColors.text + ' italic' : 'text-gray-400 italic'}>
                (player{threatInfo && currentPlayerLevel && Math.abs(Number(character.level) - Number(currentPlayerLevel)) > 2 ? ` ${Number(character.level) > Number(currentPlayerLevel) ? '+' : ''}${Number(character.level) - Number(currentPlayerLevel)}` : ''})
              </Text>
            )}
            {characterType === 'enemy' && (
              <Text fontSize="xs" className={threatColors ? threatColors.text + ' italic' : 'text-red-400 italic'}>
                (enemy{threatInfo && currentPlayerLevel && Math.abs(Number(character.level) - Number(currentPlayerLevel)) > 2 ? ` ${Number(character.level) > Number(currentPlayerLevel) ? '+' : ''}${Number(character.level) - Number(currentPlayerLevel)}` : ''})
              </Text>
            )}
            {characterType === 'combatant' && threatInfo && character.id !== currentPlayerId && (
              <Text fontSize="xs" className={threatColors ? threatColors.text + ' italic' : 'text-yellow-400/80 italic'}>
                ({isEnemyClass(character.class) ? 'enemy' : 'target'}{currentPlayerLevel && Math.abs(Number(character.level) - Number(currentPlayerLevel)) > 2 ? ` ${Number(character.level) > Number(currentPlayerLevel) ? '+' : ''}${Number(character.level) - Number(currentPlayerLevel)}` : ''})
              </Text>
            )}
          </Flex>
          <Flex gap={1}>
            <Box 
              backgroundImage="/assets/bg/level.png"
              backgroundSize="contain"
              backgroundRepeat="no-repeat"
              backgroundPosition="center"
              px={2}
              py={1}
              display="flex"
              alignItems="center"
              justifyContent="center"
              minWidth="60px"
              height="24px"
              className={
                threatColors ? threatColors.text + ' text-center font-serif text-sm' : 
                characterType === 'combatant' ? 'text-yellow-400/90 text-center font-serif text-sm' : 
                characterType === 'player' ? 'text-gray-400 text-center font-serif text-sm' : 
                'text-red-400 text-center font-serif text-sm'
              }
            >
              {getClassDisplayName(character.class)}
            </Box>
            <Box 
              backgroundImage="/assets/bg/level.png"
              backgroundSize="contain"
              backgroundRepeat="no-repeat"
              backgroundPosition="center"
              px={2}
              py={1}
              display="flex"
              alignItems="center"
              justifyContent="center"
              minWidth="50px"
              height="24px"
              className={
                threatColors ? threatColors.text + ' text-center font-serif text-sm' : 
                characterType === 'combatant' ? 'text-yellow-400/90 text-center font-serif text-sm' : 
                characterType === 'player' ? 'text-gray-400 text-center font-serif text-sm' : 
                'text-red-400 text-center font-serif text-sm'
              }
            >
              Lvl {character.level || '?'}
            </Box>
          </Flex>
        </Flex>
        
        {/* Bottom row: Health Bar */}
        <Box w="100%">
          <HealthBar 
            health={character.health}
            maxHealth={character.maxHealth}
            size="small"
            showLabel={true}
          />
        </Box>
      </Button>
    );
  };
  
  return (
    <Box h="100%" display="flex" flexDirection="column">
      <h2 className='uppercase gold-text-light text-2xl font-bold tracking-tight mb-2 text-center'>Combat</h2>
      
      {/* Combat Task Status Bar */}
      {activeTask && currentBlock !== undefined && (
        <CombatTaskStatusBar 
          activeTask={activeTask}
          currentBlock={currentBlock}
          isInCombat={isInCombat}
        />
      )}
      
      {validCombatants.length === 0 && playerNoncombatants.length === 0 && enemyNoncombatants.length === 0 ? (
        <Box className="flex items-center justify-center h-full w-full bg-dark-brown rounded-md">
          <Text className='gold-text-light text-lg'>No targets in this area</Text>
        </Box>
      ) : (
        <VStack spacing={2} align="stretch">
          {/* Combatants Section */}
          {validCombatants.length > 0 && (
            <Box p={2} borderRadius="md" mb={2} overflowY="auto" className='bg-dark-brown'>
              <Text className='gold-text-light text-sm font-bold mb-2 uppercase tracking-wide'>Active Combatants</Text>
              {validCombatants.map((combatant, arrayIndex) => 
                renderCharacterButton(combatant, arrayIndex, 'combatant')
              )}
            </Box>
          )}
          
          {/* Other Players Section */}
          {playerNoncombatants.length > 0 && (
            <Box p={2} borderRadius="md" mb={2} className='bg-dark-brown/50'>
              <Text className='text-gray-300 text-sm font-bold mb-2 uppercase tracking-wide'>Other Players</Text>
              {playerNoncombatants.map((player, arrayIndex) => 
                renderCharacterButton(player, arrayIndex, 'player')
              )}
            </Box>
          )}
          
          {/* Enemies Section */}
          {enemyNoncombatants.length > 0 && (
            <Box p={2} borderRadius="md" mb={2} overflowY="auto" className='bg-red-900/30'>
              <Text className='text-red-300 text-sm font-bold mb-2 uppercase tracking-wide'>Enemies</Text>
              {enemyNoncombatants.map((enemy, arrayIndex) => 
                renderCharacterButton(enemy, arrayIndex, 'enemy')
              )}
            </Box>
          )}
        </VStack>
      )}
    </Box>
  );
};

export default CombatTargets; 