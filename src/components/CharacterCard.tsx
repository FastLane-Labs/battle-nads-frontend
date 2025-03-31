import React from 'react';
import { Box, Heading, Text, Badge, Flex, Progress, VStack, HStack, Divider } from '@chakra-ui/react';

// Character component for displaying BattleNad information
interface CharacterCardProps {
  character: any; // Using 'any' for simplicity, ideally we'd have a properly typed interface
}

export const CharacterCard: React.FC<CharacterCardProps> = ({ character }) => {
  if (!character) return null;

  const { id, stats, weapon, armor, name } = character;
  const healthPercentage = (stats.health / 100) * 100; // Assuming max health is 100 for now

  return (
    <Box borderWidth="1px" borderRadius="lg" p={4} boxShadow="md" bg="white">
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
            <Text fontSize="sm">{stats.health}</Text>
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
        
        {/* Location */}
        <Box>
          <Text fontWeight="bold" mb={2}>Location</Text>
          <Text fontSize="sm">
            Depth: {stats.depth}, Position: ({stats.x}, {stats.y})
          </Text>
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