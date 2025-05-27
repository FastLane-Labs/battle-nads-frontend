import React, { useMemo } from 'react';
import { 
  Box, 
  Text, 
  Progress, 
  Divider, 
  Flex, 
  Badge,
  VStack,
  Image
} from '@chakra-ui/react';
import { domain } from '@/types';
import { EquipmentPanel } from '@/components/game/equipment/EquipmentPanel';

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
  if (!character) return null;

  // Destructure needed props from character
  const { inventory, level, stats, class: characterClass } = character;
  
  // Add this line to convert level to a regular number
  const displayLevel = Number(level);
  
  // Get the character class name
  const getClassDisplayName = (classValue: domain.CharacterClass): string => {
    return domain.CharacterClass[classValue] || 'Unknown';
  };
  
  // Calculate experience progress (using stats from props)
  const experienceProgress = useMemo(() => {
    const currentExperience = Number(stats?.experience || 0);
    if (displayLevel <= 0) return 0; // Avoid division by zero or weird results for level 0
    const experienceNeededForNextLevel = (displayLevel * EXP_BASE) + (displayLevel * displayLevel * EXP_SCALE);
    if (experienceNeededForNextLevel <= 0) return 0; // Avoid division by zero
    return Math.min(100, (currentExperience / experienceNeededForNextLevel) * 100); // Cap at 100%
  }, [displayLevel, stats?.experience]);

  return (
    <Box borderRadius="md" h="100%" overflowY="auto">
      <VStack spacing={3} align="stretch">
        
        {/* Character Stats - Use stats directly from props */}
        <Box>
          <div className="bg-dark-brown rounded-lg border border-black/40 p-3">
            <Flex justify="space-between" align="center" mb={2}>
              <h2 className="gold-text text-2xl font-serif font-semibold">Stats</h2>
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
                minWidth="100px"
                height="32px"
                className='text-yellow-400/90 font-bold text-center font-serif text-lg'
              >
                {getClassDisplayName(characterClass)}
              </Box>
            </Flex>
            <div className="grid grid-cols-2 gap-2 text-xl">
              <div className="flex justify-between gold-text-light">
                <span>STR</span>
                <span>{Number(stats?.strength)}</span>
              </div>
              <div className="flex justify-between gold-text-light">
                <span>DEX</span>
                <span>{Number(stats?.dexterity)}</span>
              </div>
              <div className="flex justify-between gold-text-light">
                <span>VIT</span>
                <span>{Number(stats?.vitality)}</span>
              </div>
              <div className="flex justify-between gold-text-light">
                <span>STD</span>
                <span>{Number(stats?.sturdiness)}</span>
              </div>
              <div className="flex justify-between gold-text-light">
                <span>QCK</span>
                <span>{Number(stats?.quickness)}</span>
              </div>
              <div className="flex justify-between gold-text-light">
                <span>LCK</span>
                <span>{Number(stats?.luck)}</span>
              </div>
            </div>
          </div>
        </Box>
        
        <Divider />
        
        {/* Equipment */}
        <EquipmentPanel characterId={character?.id} />
        
        <Divider />
        
        {/* Character Progress */}
        <Box>
          <VStack align="stretch" spacing={2}>
            {/* Experience Bar */}
            <Box>
              <Flex justify="space-between" mb={1}>
              <Text className="gold-text text-2xl font-serif mb-1 font-semibold">Experience</Text>
              <span className="text-amber-300 font-black font-serif">
              {Number(stats?.experience)} / {(displayLevel * EXP_BASE) + (displayLevel * displayLevel * EXP_SCALE)}
                </span>
              </Flex>
              <Progress 
                value={experienceProgress} 
                colorScheme="blue" 
                size="md"
                borderRadius="sm" 
                mb={2}
              />
            </Box>
            <Divider />

            {/* Gold Display */}
            {inventory?.balance !== undefined && (
              <Flex justify="space-between" align="center">
                <Flex align="center">
                  <Image src="/assets/icons/gold.png" alt="Gold" width="20px" height="20px" mr={1} />
                  <Text fontSize="md">
                    <span className='gold-text-light font-bold'>
                    Gold 
                    </span>
                    </Text>
                </Flex>
                <div className='flex items-center gap-1'>
                  <Text fontSize="md" fontWeight="medium" className='gold-text-light'>{formatGold(inventory.balance)}</Text>
                  <Badge bg="gold" color="black" fontSize="xs" ml={1}>SHMONAD</Badge>
                </div>
              </Flex>
            )}
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
};

export default CharacterInfo; 