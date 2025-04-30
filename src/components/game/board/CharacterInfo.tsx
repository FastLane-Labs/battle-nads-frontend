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
import { domain } from '../../../types';
import { calculateMaxHealth } from '../../../utils/gameDataConverters';

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
}

const CharacterInfo: React.FC<CharacterInfoProps> = ({ character }) => {
  const [currentStats, setCurrentStats] = useState<typeof character.stats>(character.stats);
  
  // Update current stats when props change
  useEffect(() => {
    if (character?.stats) {
      setCurrentStats(character.stats);
    }
  }, [character?.stats]);
  
  // Listen for character stats updates
  useEffect(() => {
    const handleStatsChanged = (event: CustomEvent) => {
      // Check if this event is for our character
      const isMatchingId = event.detail?.character?.id === character?.id;
      
      // Apply stats update if this is for our character
      if (event.detail?.stats && isMatchingId) {
        // Update stats state
        setCurrentStats(event.detail.stats);
      }
    };
    
    // Listen to the characterStatsChanged event
    window.addEventListener('characterStatsChanged', handleStatsChanged as EventListener);
    
    // Clean up
    return () => {
      window.removeEventListener('characterStatsChanged', handleStatsChanged as EventListener);
    };
  }, [character]);

  if (!character) return null;

  const { weapon, armor, name, inventory, level, health } = character;
  
  // Calculate max health using the utility function
  const maxHealth = calculateMaxHealth(currentStats);
  const healthPercentage = health ? (Number(health) / maxHealth) * 100 : 0;
  
  // Calculate experience progress
  const experienceProgress = useMemo(() => {
    const currentLevel = Number(level);
    const currentExperience = Number(currentStats?.experience);
    
    // Formula from Character.sol: (currentLevel * EXP_BASE) + (currentLevel * currentLevel * EXP_SCALE)
    const experienceNeededForNextLevel = (currentLevel * EXP_BASE) + (currentLevel * currentLevel * EXP_SCALE);
    
    // Calculate percentage of progress to next level
    return (currentExperience / experienceNeededForNextLevel) * 100;
  }, [level, currentStats?.experience]);

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
        
        <Divider />
        
        {/* Health Bar */}
        <Box mb={2}>
          <Flex justify="space-between" mb={1}>
            <Text fontSize="sm">Health</Text>
            <Text fontSize="sm">{Math.max(0, Number(health))} / {maxHealth}</Text>
          </Flex>
          <Progress 
            value={healthPercentage} 
            colorScheme={healthPercentage > 60 ? "green" : healthPercentage > 30 ? "yellow" : "red"}
            size="sm" 
            borderRadius="md"
          />
        </Box>
        
        {/* Character Stats */}
        <Box>
          <Text fontWeight="bold" mb={2}>Stats</Text>
          <SimpleGrid columns={3} spacing={2}>
            <Stat size="sm">
              <StatLabel fontSize="xs">STR</StatLabel>
              <StatNumber fontSize="md">{Number(currentStats?.strength)}</StatNumber>
            </Stat>
            <Stat size="sm">
              <StatLabel fontSize="xs">VIT</StatLabel>
              <StatNumber fontSize="md">{Number(currentStats?.vitality)}</StatNumber>
            </Stat>
            <Stat size="sm">
              <StatLabel fontSize="xs">DEX</StatLabel>
              <StatNumber fontSize="md">{Number(currentStats?.dexterity)}</StatNumber>
            </Stat>
            <Stat size="sm">
              <StatLabel fontSize="xs">QCK</StatLabel>
              <StatNumber fontSize="md">{Number(currentStats?.quickness)}</StatNumber>
            </Stat>
            <Stat size="sm">
              <StatLabel fontSize="xs">STD</StatLabel>
              <StatNumber fontSize="md">{Number(currentStats?.sturdiness)}</StatNumber>
            </Stat>
            <Stat size="sm">
              <StatLabel fontSize="xs">LCK</StatLabel>
              <StatNumber fontSize="md">{Number(currentStats?.luck)}</StatNumber>
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
                  {Number(currentStats?.experience)} / {(Number(level) * EXP_BASE) + (Number(level) * Number(level) * EXP_SCALE)}
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