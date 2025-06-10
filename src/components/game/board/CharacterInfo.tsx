import React, { useMemo, useState, memo, useCallback } from 'react';
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
import { useGame } from '@/hooks/game/useGame';

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

// Memoized StatRow component to prevent re-renders
const StatRow = memo<{
  label: string;
  value: number;
  allocationKey: string;
  allocation: number;
  hasPointsToAllocate: boolean;
  pointsUsed: number;
  unallocatedAttributePoints: number;
  onIncrement: (key: string) => void;
  onDecrement: (key: string) => void;
}>(({ label, value, allocationKey, allocation, hasPointsToAllocate, pointsUsed, unallocatedAttributePoints, onIncrement, onDecrement }) => {
  const handleIncrement = useCallback(() => onIncrement(allocationKey), [allocationKey, onIncrement]);
  const handleDecrement = useCallback(() => onDecrement(allocationKey), [allocationKey, onDecrement]);
  
  return (
    <div className="flex justify-between items-center gold-text-light">
      <span>{label}</span>
      <div className="flex items-center gap-1">
        <span className="text-xl">{value}</span>
        {allocation > 0 && (
          <span className="px-2 py-1 rounded text-sm font-medium green-text">
            +{allocation}
          </span>
        )}
        {hasPointsToAllocate && (
          <div className="flex gap-1 ml-2">
            <button 
              className={`relative flex items-center justify-center w-[30px] h-[30px] ${allocation <= 0 ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 transition-transform duration-200'}`}
              onClick={handleDecrement}
              disabled={allocation <= 0}
            >
              <img 
                src="/assets/buttons/-.webp" 
                alt="-" 
                className="w-full h-full object-contain"
              />
              <div className="absolute inset-0 rounded-md bg-red-400/20 filter blur-sm opacity-0 hover:opacity-100 transition-opacity duration-200"></div>
            </button>
            <button 
              className={`relative flex items-center justify-center w-[30px] h-[30px] ${pointsUsed >= unallocatedAttributePoints ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 transition-transform duration-200'}`}
              onClick={handleIncrement}
              disabled={pointsUsed >= unallocatedAttributePoints}
            >
              <img 
                src="/assets/buttons/+.webp" 
                alt="+" 
                className="w-full h-full object-contain"
              />
              <div className="absolute inset-0 rounded-md bg-teal-400/20 filter blur-sm opacity-0 hover:opacity-100 transition-opacity duration-200"></div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

StatRow.displayName = 'StatRow';

// Memoized StatDisplay component to prevent re-renders that cause button flickering
const StatDisplay = memo<{
  stats: domain.Character['stats'];
  unallocatedAttributePoints: number;
  allocatePoints: (strength: bigint, vitality: bigint, dexterity: bigint, quickness: bigint, sturdiness: bigint, luck: bigint) => Promise<any>;
  isAllocatingPoints: boolean;
}>(({ stats, unallocatedAttributePoints, allocatePoints, isAllocatingPoints }) => {
  const [allocation, setAllocation] = useState({
    strength: 0,
    vitality: 0,
    dexterity: 0,
    quickness: 0,
    sturdiness: 0,
    luck: 0
  });

  const handleAllocatePoints = useCallback(async () => {
    try {
      await allocatePoints(
        BigInt(allocation.strength),
        BigInt(allocation.vitality),
        BigInt(allocation.dexterity),
        BigInt(allocation.quickness),
        BigInt(allocation.sturdiness),
        BigInt(allocation.luck)
      );
      // Reset allocation on success
      setAllocation({
        strength: 0,
        vitality: 0,
        dexterity: 0,
        quickness: 0,
        sturdiness: 0,
        luck: 0
      });
    } catch (error) {
      console.error('Error allocating points:', error);
    }
  }, [allocation, allocatePoints]);

  const handleIncrement = useCallback((key: string) => {
    setAllocation(prev => ({
      ...prev,
      [key]: prev[key as keyof typeof prev] + 1
    }));
  }, []);

  const handleDecrement = useCallback((key: string) => {
    setAllocation(prev => ({
      ...prev,
      [key]: Math.max(0, prev[key as keyof typeof prev] - 1)
    }));
  }, []);

  // Calculate points used
  const pointsUsed = allocation.strength + allocation.vitality + allocation.dexterity + allocation.quickness + allocation.sturdiness + allocation.luck;
  const hasPointsToAllocate = unallocatedAttributePoints > 0;

  return (
    <VStack spacing={3}>
      <div className="grid grid-cols-2 gap-2 text-xl w-full">
        <StatRow 
          label="STR" 
          value={Number(stats?.strength)} 
          allocationKey="strength"
          allocation={allocation.strength}
          hasPointsToAllocate={hasPointsToAllocate}
          pointsUsed={pointsUsed}
          unallocatedAttributePoints={unallocatedAttributePoints}
          onIncrement={handleIncrement}
          onDecrement={handleDecrement}
        />
        <StatRow 
          label="DEX" 
          value={Number(stats?.dexterity)} 
          allocationKey="dexterity"
          allocation={allocation.dexterity}
          hasPointsToAllocate={hasPointsToAllocate}
          pointsUsed={pointsUsed}
          unallocatedAttributePoints={unallocatedAttributePoints}
          onIncrement={handleIncrement}
          onDecrement={handleDecrement}
        />
        <StatRow 
          label="VIT" 
          value={Number(stats?.vitality)} 
          allocationKey="vitality"
          allocation={allocation.vitality}
          hasPointsToAllocate={hasPointsToAllocate}
          pointsUsed={pointsUsed}
          unallocatedAttributePoints={unallocatedAttributePoints}
          onIncrement={handleIncrement}
          onDecrement={handleDecrement}
        />
        <StatRow 
          label="STD" 
          value={Number(stats?.sturdiness)} 
          allocationKey="sturdiness"
          allocation={allocation.sturdiness}
          hasPointsToAllocate={hasPointsToAllocate}
          pointsUsed={pointsUsed}
          unallocatedAttributePoints={unallocatedAttributePoints}
          onIncrement={handleIncrement}
          onDecrement={handleDecrement}
        />
        <StatRow 
          label="QCK" 
          value={Number(stats?.quickness)} 
          allocationKey="quickness"
          allocation={allocation.quickness}
          hasPointsToAllocate={hasPointsToAllocate}
          pointsUsed={pointsUsed}
          unallocatedAttributePoints={unallocatedAttributePoints}
          onIncrement={handleIncrement}
          onDecrement={handleDecrement}
        />
        <StatRow 
          label="LCK" 
          value={Number(stats?.luck)} 
          allocationKey="luck"
          allocation={allocation.luck}
          hasPointsToAllocate={hasPointsToAllocate}
          pointsUsed={pointsUsed}
          unallocatedAttributePoints={unallocatedAttributePoints}
          onIncrement={handleIncrement}
          onDecrement={handleDecrement}
        />
      </div>

      {hasPointsToAllocate && pointsUsed > 0 && (
        <VStack spacing={2} w="100%">
          <Flex justify="space-between" alignItems="center" width="100%">
            <Text fontSize="md" className="gold-text-light">Points remaining:</Text>
            <span className={`text-xl font-medium ${unallocatedAttributePoints - pointsUsed > 0 ? 'gold-text-light' : 'gold-text-light opacity-25'}`}>
              {unallocatedAttributePoints - pointsUsed}
            </span>
          </Flex>
          
          <div className="relative w-full group">
            {/* Background image - Confirm Allocation Button */}
            <img 
              src="/assets/buttons/primary-button.webp" 
              alt="" 
              className="absolute inset-0 w-full h-[45px] object-fill z-0 transition-all duration-200 
                group-hover:brightness-125 group-hover:scale-[1.02] group-active:brightness-90 group-active:scale-[0.98]" 
            />
            
            <button 
              className={`relative h-[45px] w-full text-lg font-bold uppercase z-[2] bg-transparent border-0
                ${(pointsUsed === 0 || isAllocatingPoints) 
                  ? 'opacity-50 cursor-not-allowed' 
                  : ''}`}
              onClick={handleAllocatePoints}
              disabled={pointsUsed === 0 || isAllocatingPoints}
              style={{ transform: 'translateZ(0)' }}

            >
              <p className='gold-text transition-transform duration-200 group-hover:scale-[1.02] group-active:scale-95'>
                {isAllocatingPoints ? 'Allocating...' : 'Confirm Allocation'}
              </p>
            </button>
          </div>
        </VStack>
      )}
    </VStack>
  );
});

StatDisplay.displayName = 'StatDisplay';

interface CharacterInfoProps {
  character: domain.Character;
  combatants: domain.CharacterLite[];
}

const CharacterInfo: React.FC<CharacterInfoProps> = ({ character, combatants }) => {
  if (!character) return null;

  // Get game state and actions
  const { worldSnapshot, allocatePoints, isAllocatingPoints } = useGame();

  // Destructure needed props from character
  const { inventory, level, stats, class: characterClass } = character;
  
  // Add this line to convert level to a regular number
  const displayLevel = Number(level);
  
  // Use actual unallocated attribute points from world snapshot
  const unallocatedAttributePoints = worldSnapshot?.unallocatedAttributePoints || 0;
  
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
          {/* Alert for unallocated points */}
          {unallocatedAttributePoints > 0 && (
            <div className="card-bg-dark border-2 !border-amber-600 shadow-sm shadow-amber-800 p-4 mb-3 relative" data-testid="level-up-notification">
              <div className="absolute -top-2 left-4 px-3 py-1 card-bg border border-amber-600/60 rounded">
                <Text className="gold-text text-sm font-serif font-bold" data-testid="level-up-banner">⚡ LEVEL UP ⚡</Text>
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