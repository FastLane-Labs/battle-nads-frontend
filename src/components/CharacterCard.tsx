import React, { useMemo } from 'react';
import { Box, Heading, Text, Badge, Flex, Progress, VStack, Divider } from '@chakra-ui/react';
import { BattleNad } from '../types/gameTypes';

// Character component for displaying BattleNad information
interface CharacterCardProps {
  character: BattleNad; // Properly typed with BattleNad interface
}

// Constants from the smart contract
const EXP_BASE = 100; // Base experience points required per level
const EXP_SCALE = 10; // Scaling factor for experience requirements

// Helper to format ShGold value (18 decimals)
const formatShGold = (value: number | undefined): string => {
  if (value === undefined) return '0';
  
  // Convert to string and handle 18 decimals
  const valueString = value.toString();
  
  // If the value is small, pad with zeros
  if (valueString.length <= 18) {
    const paddedValue = '0.' + valueString.padStart(18, '0').replace(/0+$/, '');
    return paddedValue === '0.' ? '0' : paddedValue;
  }
  
  // Insert decimal point 18 places from the right
  const decimalPosition = valueString.length - 18;
  const integerPart = valueString.slice(0, decimalPosition);
  const decimalPart = valueString.slice(decimalPosition, decimalPosition + 4).replace(/0+$/, '');
  
  return decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
};

export const CharacterCard: React.FC<CharacterCardProps> = ({ character }) => {
  if (!character) return null;

  const { stats, weapon, armor, name, inventory } = character;
  const healthPercentage = (stats.health / stats.maxHealth) * 100;
  
  // Calculate experience progress using the same formula as the smart contract
  const experienceProgress = useMemo(() => {
    const currentLevel = stats.level;
    const currentExperience = stats.experience;
    
    // Formula from Character.sol: (currentLevel * EXP_BASE) + (currentLevel * currentLevel * EXP_SCALE)
    const experienceNeededForNextLevel = (currentLevel * EXP_BASE) + (currentLevel * currentLevel * EXP_SCALE);
    
    // Calculate percentage of progress to next level
    return (currentExperience / experienceNeededForNextLevel) * 100;
  }, [stats.level, stats.experience]);

  return (
    <Box borderWidth="1px" borderRadius="lg" p={4} boxShadow="md" bg="gray.800" color="white">
      <VStack spacing={3} align="stretch">
        {/* Character Name and Level */}
        <Flex justify="space-between" align="center">
          <Heading as="h3" size="md">
            {name || 'Unnamed Character'}
          </Heading>
          <Badge colorScheme="purple" fontSize="sm" p={1}>
            Level {stats.level}
          </Badge>
        </Flex>
        
        <Divider />
        
        {/* Health Bar */}
        <Box>
          <Flex justify="space-between" mb={1}>
            <Text fontSize="sm">Health</Text>
            <Text fontSize="sm">{stats.health} / {stats.maxHealth}</Text>
          </Flex>
          <Progress value={healthPercentage} colorScheme="green" size="sm" />
        </Box>
        
        {/* Character Stats */}
        <Box>
          <Text fontWeight="bold" mb={2}>Stats</Text>
          <Flex wrap="wrap" justify="space-between">
            <StatItem label="STR" value={stats.strength} />
            <StatItem label="VIT" value={stats.vitality} />
            <StatItem label="DEX" value={stats.dexterity} />
            <StatItem label="QCK" value={stats.quickness} />
            <StatItem label="STR" value={stats.sturdiness} />
            <StatItem label="LCK" value={stats.luck} />
          </Flex>
        </Box>
        
        <Divider />
        
        {/* Equipment */}
        <Box>
          <Text fontWeight="bold" mb={2}>Equipment</Text>
          <VStack align="stretch" spacing={1}>
            <Flex justify="space-between">
              <Text fontSize="sm">Weapon:</Text>
              <Text fontSize="sm" fontWeight="medium">{weapon.name}</Text>
            </Flex>
            <Flex justify="space-between">
              <Text fontSize="sm">Armor:</Text>
              <Text fontSize="sm" fontWeight="medium">{armor.name}</Text>
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
                  {stats.experience} / {(stats.level * EXP_BASE) + (stats.level * stats.level * EXP_SCALE)}
                </Text>
              </Flex>
              <Progress 
                value={experienceProgress} 
                colorScheme="blue" 
                size="sm" 
                mb={2}
              />
            </Box>
            <Flex justify="space-between">
              <Text fontSize="sm">ShGold:</Text>
              <Text fontSize="sm" fontWeight="medium">{formatShGold(inventory?.balance)}</Text>
            </Flex>
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
};

// Helper component for displaying individual stats
const StatItem: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <Box width="30%" mb={2}>
    <Flex direction="column" align="center">
      <Badge colorScheme="blue" mb={1}>
        {label}
      </Badge>
      <Text fontSize="md" fontWeight="bold">
        {value}
      </Text>
    </Flex>
  </Box>
); 