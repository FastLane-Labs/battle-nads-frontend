import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Text, 
  Progress, 
  Divider, 
  Flex, 
  Badge,
  VStack,
  Image,
  Button
} from '@chakra-ui/react';
import { domain } from '@/types';
import { EquipmentPanel } from '@/components/game/equipment/EquipmentPanel';
import { StatDisplay } from './StatDisplay';
import { useGameCombatState } from '@/hooks/game/selectors';
import { useTransactionBalance } from '@/hooks/wallet/useWalletState';
import { useCharacterExperience } from '@/hooks/game/useCharacterExperience';
import { GameTooltip } from '../../ui';
import { LevelUpCelebration } from '@/components/game/ui/LevelUpCelebration';


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
  const [showCelebration, setShowCelebration] = useState(false);
  const [previousLevel, setPreviousLevel] = useState(character?.level);

  // Get game state and actions
  const { worldSnapshot, allocatePoints, isAllocatingPoints, isInCombat } = useGameCombatState();

  // Transaction balance validation
  const { isTransactionDisabled, insufficientBalanceMessage } = useTransactionBalance();

  // Get experience info using the new helper
  const experienceInfo = useCharacterExperience(character);

  // Check for level up
  useEffect(() => {
    if (character?.level && previousLevel && Number(character.level) > Number(previousLevel)) {
      setShowCelebration(true);
    }
    setPreviousLevel(character?.level);
  }, [character?.level, previousLevel]);

  if (!character) return null;

  // Destructure needed props from character
  const { inventory, level, stats, class: characterClass } = character;
  
  // Add this line to convert level to a regular number
  const displayLevel = Number(level);
  
  // Use actual unallocated attribute points from character stats
  const unallocatedAttributePoints = character?.stats.unspentAttributePoints || 0;
  
  // Get the character class name
  const getClassDisplayName = (classValue: domain.CharacterClass): string => {
    return domain.CharacterClass[classValue] || 'Unknown';
  };
  

  return (
    <Box borderRadius="md" h="100%">
      <VStack spacing={3} align="stretch">
        {/* Level Up Celebration */}
        {showCelebration && (
          <LevelUpCelebration
            level={displayLevel}
            unspentPoints={unallocatedAttributePoints}
            onClose={() => setShowCelebration(false)}
          />
        )}
        
        {/* Character Stats - Use stats directly from props */}
        <Box>
          {/* Alert for unallocated points */}
          {unallocatedAttributePoints > 0 && (
            <div className="card-bg-dark border-2 !border-amber-600 shadow-md shadow-amber-800/30 p-4 mb-3 relative" data-testid="level-up-notification">
              <div className="absolute -top-2 left-4 px-3 py-1">
                <div className="relative">
                  <div className="absolute inset-0 bg-yellow-500/10 rounded-md blur-md z-0 animate-pulse-slow" />
                  <div className="card-bg border border-amber-600/60 rounded px-3 py-1 relative z-10">
                    <Text className="gold-text text-sm font-serif font-bold" data-testid="level-up-banner">⚡ LEVEL UP ⚡</Text>
                  </div>
                </div>
              </div>
              <div className="pt-2">
                <Flex align="center" justify="space-between">
                  <Text className="gold-text-light font-serif text-lg font-medium" data-testid="attribute-points-label">
                    Attribute Points Available
                  </Text>
                  <div className="px-3 py-1 bg-amber-900/30 border border-amber-600/40 rounded-md">
                    <Text className="gold-text font-serif text-xl font-bold" data-testid="attribute-points-count">
                      {unallocatedAttributePoints}
                    </Text>
                  </div>
                </Flex>
                <Text className="text-amber-200/80 text-sm font-serif italic">
                  Enhance your abilities by allocating points to your desired attributes
                </Text>
              </div>
            </div>
          )}
          
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
            <StatDisplay 
              stats={stats}
              unallocatedAttributePoints={unallocatedAttributePoints}
              allocatePoints={allocatePoints}
              isAllocatingPoints={isAllocatingPoints}
              isInCombat={isInCombat}
              isTransactionDisabled={isTransactionDisabled}
              insufficientBalanceMessage={insufficientBalanceMessage}
            />
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
                <Text className="gold-text text-2xl font-serif mb-1 font-semibold">Level {displayLevel}</Text>
                <span className="text-amber-300 font-black font-serif">
                  {experienceInfo?.levelProgress.currentExp || 0} / {experienceInfo?.levelProgress.requiredExp || 0}
                </span>
              </Flex>
              <GameTooltip 
                customLabel={`${(experienceInfo?.levelProgress.percentage || 0).toFixed(1)}% progress in level ${displayLevel}`}
                variant="simple"
                placement="top"
                useWrapper={false}
              >
                <Progress 
                  value={experienceInfo?.levelProgress.percentage || 0} 
                  colorScheme="blue" 
                  size="md"
                  borderRadius="sm" 
                  mb={2}
                  cursor="help"
                />
              </GameTooltip>
              <Flex justify="space-between" align="center" fontSize="sm" className="text-amber-200/80">
                <Text>Total XP: {experienceInfo?.totalExperience || 0}</Text>
                <Text>XP to next level: {experienceInfo?.experienceToNextLevel || 0}</Text>
              </Flex>
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