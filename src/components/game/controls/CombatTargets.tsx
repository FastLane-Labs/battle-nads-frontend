import React from 'react';
import { Box, Button, VStack, Text, Flex } from '@chakra-ui/react';
import { domain } from '../../../types';
import HealthBar from '../ui/HealthBar';

interface CombatTargetsProps {
  combatants: domain.CharacterLite[];
  noncombatants: domain.CharacterLite[];
  selectedTargetIndex: number | null;
  onSelectTarget: (index: number | null) => void;
}

const CombatTargets: React.FC<CombatTargetsProps> = ({ 
  combatants, 
  noncombatants,
  selectedTargetIndex,
  onSelectTarget
}) => {
  // Filter out dead characters from combat targets to prevent targeting dead enemies
  const validCombatants = combatants.filter(combatant => !combatant.isDead);
  
  // Filter out dead characters from non-combatants as well
  const validNoncombatants = noncombatants.filter(noncombatant => !noncombatant.isDead);
  
  // Get the character class name
  const getClassDisplayName = (classValue: domain.CharacterClass): string => {
    return domain.CharacterClass[classValue] || 'Unknown';
  };
  
  // Render character button component
  const renderCharacterButton = (character: domain.CharacterLite, arrayIndex: number, isNoncombatant: boolean = false) => {
    // Use the character's position index for targeting, not array index
    const positionIndex = character.index;
    const isSelected = selectedTargetIndex === positionIndex;
    
    return (
      <Button
        key={character.id} // Use character ID as key for stability
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
        opacity={isNoncombatant ? 0.7 : 1}
        border={isNoncombatant ? "1px dashed" : "1px solid"}
        borderColor={isNoncombatant ? "gray.500" : "transparent"}
      >
        {/* Top row: Name, Class, Level */}
        <Flex justify="space-between" align="center" w="100%" mb={2}>
          <Flex align="center" gap={2}>
            <Text fontSize="sm" className={isNoncombatant ? 'text-gray-300' : 'gold-text-light'}>
              {character.name || `${isNoncombatant ? 'Player' : 'Enemy'} #${arrayIndex + 1}`}
            </Text>
            {isNoncombatant && (
              <Text fontSize="xs" className="text-gray-400 italic">
                (non-combatant)
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
              className={isNoncombatant ? 'text-gray-400 text-center font-serif text-sm' : 'text-yellow-400/90 text-center font-serif text-sm'}
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
              className={isNoncombatant ? 'text-gray-400 text-center font-serif text-sm' : 'text-yellow-400/90 text-center font-serif text-sm'}
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
      
      {validCombatants.length === 0 && validNoncombatants.length === 0 ? (
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
                renderCharacterButton(combatant, arrayIndex, false)
              )}
            </Box>
          )}
          
          {/* Non-Combatants Section */}
          {validNoncombatants.length > 0 && (
            <Box p={2} borderRadius="md" mb={2} overflowY="auto" className='bg-dark-brown/50'>
              <Text className='text-gray-300 text-sm font-bold mb-2 uppercase tracking-wide'>Other Players</Text>
              {validNoncombatants.map((noncombatant, arrayIndex) => 
                renderCharacterButton(noncombatant, arrayIndex, true)
              )}
            </Box>
          )}
        </VStack>
      )}
    </Box>
  );
};

export default CombatTargets; 