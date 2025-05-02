import React, { useState, useEffect, useMemo } from 'react';
import { 
  Box, 
  Heading, 
  Text, 
  Progress, 
  SimpleGrid, 
  Stat, 
  StatLabel, 
  StatNumber, 
  Divider, 
  Flex, 
  Badge,
  VStack
} from '@chakra-ui/react';
import { domain } from '@/types';

// Constants from the smart contract
const EXP_BASE = 100; // Base experience points required per level
const EXP_SCALE = 10; // Scaling factor for experience requirements

// Helper to format Gold value (18 decimals)
const formatGold = (value: number | bigint | undefined): string => {
  if (value === undefined) return '0';
  
  // Convert to string and handle 18 decimals
  const valueString = value.toString();
  
  // If the value is small, pad with zeros
  if (valueString.length <= 18) {
    const paddedValue = '0.' + valueString.padStart(18, '0');
    // Trim to 4 decimal places
    const trimmed = paddedValue.substring(0, paddedValue.indexOf('.') + 5);
    return trimmed === '0.' ? '0' : trimmed;
  }
  
  // Insert decimal point 18 places from the right
  const decimalPosition = valueString.length - 18;
  const integerPart = valueString.slice(0, decimalPosition);
  const decimalPart = valueString.slice(decimalPosition, decimalPosition + 4);
  
  return decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
};

interface CharacterInfoProps {
  character: domain.Character;
  combatants: domain.CharacterLite[];
}

const CharacterInfo: React.FC<CharacterInfoProps> = ({ character, combatants }) => {
  // No need for separate currentStats state if just reading from props now
  // const [currentStats, setCurrentStats] = useState<typeof character.stats>(character.stats);
  
  // Removed useEffect hooks related to currentStats and event listeners

  if (!character) return null;

  // Destructure health AND maxHealth directly from the character prop
  const { weapon, armor, name, inventory, level, health, maxHealth, stats } = character;
  
  // Use maxHealth directly from props. Ensure it's treated as a number.
  const currentMaxHealth = Number(maxHealth || 100); // Default to 100 if maxHealth is missing/0
  const currentHealth = Math.max(0, Number(health)); // Ensure health is not negative
  
  // Calculate percentage using health and maxHealth from props
  const healthPercentage = currentMaxHealth > 0 ? (currentHealth / currentMaxHealth) * 100 : 0;
  
  // Calculate experience progress (using stats from props)
  const experienceProgress = useMemo(() => {
    const currentLevel = Number(level);
    const currentExperience = Number(stats?.experience || 0);
    if (currentLevel <= 0) return 0; // Avoid division by zero or weird results for level 0
    const experienceNeededForNextLevel = (currentLevel * EXP_BASE) + (currentLevel * currentLevel * EXP_SCALE);
    if (experienceNeededForNextLevel <= 0) return 0; // Avoid division by zero
    return Math.min(100, (currentExperience / experienceNeededForNextLevel) * 100); // Cap at 100%
  }, [level, stats?.experience]);

  // Determine combat indicator text
  const isInCombat = combatants && combatants.length > 0;
  const combatIndicatorText = useMemo(() => {
    if (!isInCombat) return null;
    if (combatants.length === 1) {
      return `Fighting: ${combatants[0]?.name || 'Unknown'}`;
    }
    return `Fighting: Multiple Enemies (${combatants.length})`;
  }, [combatants, isInCombat]);

  return (
    <Box bg="gray.800" p={4} borderRadius="md" h="100%" overflowY="auto">
      <VStack spacing={3} align="stretch">
        {/* Character Name and Level */}
        <Flex justify="space-between" align="center">
          <Heading size="md">{name || 'Unnamed Character'}</Heading>
          {level && (
            <Badge colorScheme="purple" fontSize="sm" p={1}>
              Level {level}
            </Badge>
          )}
        </Flex>
        
        {/* Combat Indicator - NEW */}
        {isInCombat && (
          <Badge colorScheme="red" variant="solid" p={1} textAlign="center" w="100%">
            ⚔️ {combatIndicatorText} ⚔️
          </Badge>
        )}
        
        <Divider />
        
        {/* Health Bar */}
        <Box mb={2}>
          <Flex justify="space-between" mb={1}>
            <Text fontSize="sm">Health</Text>
            {/* Display health / maxHealth directly from props */}
            <Text fontSize="sm">{currentHealth} / {currentMaxHealth}</Text> 
          </Flex>
          <Progress 
            value={healthPercentage} 
            colorScheme={healthPercentage > 60 ? "green" : healthPercentage > 30 ? "yellow" : "red"}
            size="sm" 
            borderRadius="md"
          />
        </Box>
        
        {/* Character Stats - Use stats directly from props */}
        <Box>
          <Text fontWeight="bold" mb={2}>Stats</Text>
          <SimpleGrid columns={3} spacing={2}>
            <Stat size="sm">
              <StatLabel fontSize="xs">STR</StatLabel>
              <StatNumber fontSize="md">{Number(stats?.strength)}</StatNumber>
            </Stat>
            <Stat size="sm">
              <StatLabel fontSize="xs">VIT</StatLabel>
              <StatNumber fontSize="md">{Number(stats?.vitality)}</StatNumber>
            </Stat>
            <Stat size="sm">
              <StatLabel fontSize="xs">DEX</StatLabel>
              <StatNumber fontSize="md">{Number(stats?.dexterity)}</StatNumber>
            </Stat>
            <Stat size="sm">
              <StatLabel fontSize="xs">QCK</StatLabel>
              <StatNumber fontSize="md">{Number(stats?.quickness)}</StatNumber>
            </Stat>
            <Stat size="sm">
              <StatLabel fontSize="xs">STD</StatLabel>
              <StatNumber fontSize="md">{Number(stats?.sturdiness)}</StatNumber>
            </Stat>
            <Stat size="sm">
              <StatLabel fontSize="xs">LCK</StatLabel>
              <StatNumber fontSize="md">{Number(stats?.luck)}</StatNumber>
            </Stat>
          </SimpleGrid>
        </Box>
        
        <Divider />
        
        {/* Equipment */}
        <Box>
          <Text fontWeight="bold" mb={2}>Equipment</Text>
          <VStack align="stretch" spacing={2}>
            <Flex justify="space-between" align="center">
              <Text fontSize="sm">Weapon:</Text>
              <Text fontSize="sm" fontWeight="medium">{weapon?.name || `ID #${weapon?.id || 'None'}`}</Text>
            </Flex>
            <Flex justify="space-between" align="center">
              <Text fontSize="sm">Armor:</Text>
              <Text fontSize="sm" fontWeight="medium">{armor?.name || `ID #${armor?.id || 'None'}`}</Text>
            </Flex>
          </VStack>
        </Box>
        
        <Divider />
        
        {/* Character Progress */}
        <Box>
          <Text fontWeight="bold" mb={2}>Progress</Text>
          <VStack align="stretch" spacing={2}>
            {/* Experience Bar */}
            <Box>
              <Flex justify="space-between" mb={1}>
                <Text fontSize="sm">Experience</Text>
                <Text fontSize="sm">
                  {Number(stats?.experience)} / {(Number(level) * EXP_BASE) + (Number(level) * Number(level) * EXP_SCALE)}
                </Text>
              </Flex>
              <Progress 
                value={experienceProgress} 
                colorScheme="blue" 
                size="sm" 
                mb={2}
              />
            </Box>
            {/* Gold Display */}
            {inventory?.balance !== undefined && (
              <Flex justify="space-between">
                <Text fontSize="sm">Gold <Badge bg="gold" color="black" fontSize="xs" ml={1}>SHMONAD</Badge></Text>
                <Text fontSize="sm" fontWeight="medium">{formatGold(inventory.balance)}</Text>
              </Flex>
            )}
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
};

export default CharacterInfo; 