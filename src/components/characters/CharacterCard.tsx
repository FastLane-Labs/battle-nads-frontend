import React, { useMemo, useState, useEffect } from 'react';
import { Box, Heading, Text, Badge, Flex, Progress, VStack, Divider, Button, Stat, StatLabel, StatNumber } from '@chakra-ui/react';
import { Character } from '@/types/domain/character';
import { calculateMaxHealth } from '@/utils/calculateMaxHealth';
import { EquipmentPanel } from '@/components/game/equipment/EquipmentPanel';
import { useGameCombatState } from '@/hooks/game/selectors';
import { useCharacterExperience } from '@/hooks/game/useCharacterExperience';
import { GameTooltip } from '@/components/ui/GameTooltip';

interface CharacterCardProps {
  character: Character; // Corrected type name
}


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

export const CharacterCard: React.FC<CharacterCardProps> = ({ character }) => {
  const [currentStats, setCurrentStats] = useState<Character['stats'] | undefined>(character?.stats); // Corrected type name
  
  // Get game state and actions
  const { worldSnapshot, allocatePoints, isAllocatingPoints } = useGameCombatState();
  
  // Get experience info using the new helper
  const experienceInfo = useCharacterExperience(character);
  
  // Update current stats when props change
  useEffect(() => {
    if (character?.stats) {
      setCurrentStats(character.stats);
    }
  }, [character?.stats]);
  
  // Listen for character stats updates
  useEffect(() => {
    const handleStatsChanged = (event: CustomEvent) => {
      console.log("[CharacterCard] Received characterStatsChanged event:", event.detail);
      
      // Debug log to help identify matching issues
      if (event.detail?.character?.id && character?.id) {
        console.log("[CharacterCard] Comparing IDs:", {
          "event.detail.character.id": event.detail.character.id,
          "character.id": character.id,
          "match": event.detail.character.id === character.id
        });
      }
      
      // Check if this event is for our character
      const isMatchingId = event.detail?.character?.id === character?.id;
      
      // Apply stats update if this is for our character
      if (event.detail?.stats && isMatchingId) {
        console.log("[CharacterCard] Updating character stats:", event.detail.stats);
        
        // Update stats state
        setCurrentStats(event.detail.stats);

        // Update health on the main character object (if the event provides it)
        // TODO: Need to decide how to handle direct character property updates (like health)
        // Perhaps the event should provide the full Character object?
        // For now, we'll just update the stats portion.

        // Recalculate max health based on the new stats
        const calculatedMaxHealth = calculateMaxHealth(event.detail.stats);
        console.log("[CharacterCard] Calculated maxHealth after update:", calculatedMaxHealth);

        // TODO: If health comes directly from event, update and clamp it here
        // if (event.detail?.health !== undefined) {
        //   const newHealth = Math.min(
        //     Number(event.detail.health),
        //     calculatedMaxHealth
        //   );
        //   // Update the main character object if possible, otherwise manage health separately?
        // }
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
  
  // Calculate max health using the utility function that matches the smart contract
  const maxHealth = calculateMaxHealth(currentStats);
  const healthPercentage = health ? (Number(health) / maxHealth) * 100 : 0;
  

  // TODO: Replace gameData usage with appropriate state/hook
  const unallocatedAttributePoints = character?.stats.unspentAttributePoints || 0;
  const equipableWeaponIDs: number[] = []; // Placeholder
  const equipableWeaponNames: string[] = []; // Placeholder
  const equipableArmorIDs: number[] = []; // Placeholder
  const equipableArmorNames: string[] = []; // Placeholder

  return (
    <Box borderWidth="1px" borderRadius="lg" p={4} boxShadow="md" bg="gray.800" color="white">
      <VStack spacing={3} align="stretch">
        {/* Character Name and Level */}
        <Flex justify="space-between" align="center">
          <Heading as="h3" size="md">
            {name || 'Unnamed Character'}
          </Heading>
          {level && (
            <Badge colorScheme="purple" fontSize="sm" p={1}>
              Level {level}
            </Badge>
          )}
        </Flex>
        
        <Divider />
        
        {/* Health Bar */}
        {health !== undefined && (
          <Box>
            <Flex justify="space-between" mb={1}>
              <Text fontSize="sm">Health</Text>
              <Text fontSize="sm">{Math.max(0, Number(health))} / {maxHealth}</Text>
            </Flex>
            <Progress 
              value={healthPercentage} 
              colorScheme="green" 
              size="sm" 
              borderRadius="md"
            />
          </Box>
        )}
        
        {/* Character Stats */}
        <Box>
          <Text fontWeight="bold" mb={2}>Stats</Text>
          <Flex wrap="wrap" justify="space-between">
            <Stat size="sm">
              <StatLabel fontSize="xs">STR</StatLabel>
              <StatNumber>{Number(currentStats?.strength)}</StatNumber>
            </Stat>
            <Stat size="sm">
              <StatLabel fontSize="xs">VIT</StatLabel>
              <StatNumber>{Number(currentStats?.vitality)}</StatNumber>
            </Stat>
            <Stat size="sm">
              <StatLabel fontSize="xs">DEX</StatLabel>
              <StatNumber>{Number(currentStats?.dexterity)}</StatNumber>
            </Stat>
            <Stat size="sm">
              <StatLabel fontSize="xs">QCK</StatLabel>
              <StatNumber>{Number(currentStats?.quickness)}</StatNumber>
            </Stat>
            <Stat size="sm">
              <StatLabel fontSize="xs">STD</StatLabel>
              <StatNumber>{Number(currentStats?.sturdiness)}</StatNumber>
            </Stat>
            <Stat size="sm">
              <StatLabel fontSize="xs">LCK</StatLabel>
              <StatNumber>{Number(currentStats?.luck)}</StatNumber>
            </Stat>
          </Flex>
        </Box>
        
        {/* Stat Point Allocation - only shown when unallocated points are available */}
        {unallocatedAttributePoints > 0 && ( // Using placeholder
          <Box mt={2}>
            <Divider mb={2} />
            <Flex justify="space-between" mb={2}>
              <Text fontWeight="bold">Allocate Stat Points</Text>
              <Badge colorScheme="green">{unallocatedAttributePoints} points</Badge>
            </Flex>
            <StatAllocationPanel
              character={character}
              unspentAttributePoints={unallocatedAttributePoints}
              allocatePoints={allocatePoints}
              isAllocatingPoints={isAllocatingPoints}
            />
          </Box>
        )}
        
        <Divider />
        
        {/* Equipment */}
        <EquipmentPanel characterId={character?.id} />
        
        <Divider />
        
        {/* Character Progress */}
        <Box>
          <Text fontWeight="bold" mb={2}>Progress</Text>
          <VStack align="stretch" spacing={2}>
            {/* Experience Bar */}
            <Box>
              <Flex justify="space-between" mb={1}>
                <Text fontSize="sm">Level {Number(level)}</Text>
                <Text fontSize="sm">
                  {experienceInfo?.levelProgress.currentExp || 0} / {experienceInfo?.levelProgress.requiredExp || 0}
                </Text>
              </Flex>
              <GameTooltip 
                customLabel={`${(experienceInfo?.levelProgress.percentage || 0).toFixed(1)}% progress in level ${Number(level)}`}
                variant="simple"
                placement="top"
                useWrapper={false}
              >
                <Progress 
                  value={experienceInfo?.levelProgress.percentage || 0} 
                  colorScheme="blue" 
                  size="sm" 
                  mb={2}
                  cursor="help"
                />
              </GameTooltip>
            </Box>
            <Flex justify="space-between">
              <Text fontSize="sm">Gold <Badge bg="gold" color="black" fontSize="xs" ml={1}>SHMONAD</Badge></Text>
              <Text fontSize="sm" fontWeight="medium">{formatGold(inventory?.balance)}</Text>
            </Flex>
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
};

// Helper component for displaying individual stats
const StatItem: React.FC<{ label: string; value: number | bigint }> = ({ label, value }) => (
  <Box width="30%" mb={2}>
    <Flex direction="column" align="center">
      <Badge colorScheme="blue" mb={1}>
        {label}
      </Badge>
      <Text fontSize="md" fontWeight="bold">
        {typeof value === 'bigint' ? value.toString() : value}
      </Text>
    </Flex>
  </Box>
);

// Helper component for stat allocation controls
const StatAllocator: React.FC<{ 
  name: string;
  abbr: string;
  currentValue: number;
  allocation: number;
  onIncrement: () => void;
  onDecrement: () => void;
}> = ({ name, abbr, currentValue, allocation, onIncrement, onDecrement }) => (
  <Flex justify="space-between" width="100%">
    <Text fontSize="sm">{name} ({abbr})</Text>
    <Flex align="center">
      <Text fontSize="sm" mr={2}>{currentValue}</Text>
      {allocation > 0 && (
        <Badge colorScheme="green" mr={2}>+{allocation}</Badge>
      )}
      <Button size="xs" onClick={onDecrement} isDisabled={allocation <= 0}>-</Button>
      <Button size="xs" ml={1} onClick={onIncrement}>+</Button>
    </Flex>
  </Flex>
);

// Component to manage stat allocation
const StatAllocationPanel: React.FC<{
  character: Character;
  unspentAttributePoints: number;
  allocatePoints: (strength: bigint, vitality: bigint, dexterity: bigint, quickness: bigint, sturdiness: bigint, luck: bigint) => Promise<any>;
  isAllocatingPoints: boolean;
}> = ({ character, unspentAttributePoints, allocatePoints, isAllocatingPoints }) => {
  const [allocation, setAllocation] = useState({
    strength: 0,
    vitality: 0,
    dexterity: 0,
    quickness: 0,
    sturdiness: 0,
    luck: 0
  });

  const handleAllocatePoints = async () => {
    if (character.id) {
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
    }
  };

  // Calculate points used
  const pointsUsed = allocation.strength + allocation.vitality + allocation.dexterity + allocation.quickness + allocation.sturdiness + allocation.luck;

  return (
    <VStack spacing={2}>
      <StatAllocator 
        name="Strength" 
        abbr="STR" 
        currentValue={Number(character.stats.strength)}
        allocation={allocation.strength}
        onIncrement={() => {
          if (pointsUsed < unspentAttributePoints) {
            setAllocation({...allocation, strength: allocation.strength + 1});
          }
        }}
        onDecrement={() => {
          if (allocation.strength > 0) {
            setAllocation({...allocation, strength: allocation.strength - 1});
          }
        }}
      />
      <StatAllocator 
        name="Vitality" 
        abbr="VIT" 
        currentValue={Number(character.stats.vitality)}
        allocation={allocation.vitality}
        onIncrement={() => {
          if (pointsUsed < unspentAttributePoints) {
            setAllocation({...allocation, vitality: allocation.vitality + 1});
          }
        }}
        onDecrement={() => {
          if (allocation.vitality > 0) {
            setAllocation({...allocation, vitality: allocation.vitality - 1});
          }
        }}
      />
      <StatAllocator 
        name="Dexterity" 
        abbr="DEX" 
        currentValue={Number(character.stats.dexterity)}
        allocation={allocation.dexterity}
        onIncrement={() => {
          if (pointsUsed < unspentAttributePoints) {
            setAllocation({...allocation, dexterity: allocation.dexterity + 1});
          }
        }}
        onDecrement={() => {
          if (allocation.dexterity > 0) {
            setAllocation({...allocation, dexterity: allocation.dexterity - 1});
          }
        }}
      />
      <StatAllocator 
        name="Quickness" 
        abbr="QCK" 
        currentValue={Number(character.stats.quickness)}
        allocation={allocation.quickness}
        onIncrement={() => {
          if (pointsUsed < unspentAttributePoints) {
            setAllocation({...allocation, quickness: allocation.quickness + 1});
          }
        }}
        onDecrement={() => {
          if (allocation.quickness > 0) {
            setAllocation({...allocation, quickness: allocation.quickness - 1});
          }
        }}
      />
      <StatAllocator 
        name="Sturdiness" 
        abbr="STD" 
        currentValue={Number(character.stats.sturdiness)}
        allocation={allocation.sturdiness}
        onIncrement={() => {
          if (pointsUsed < unspentAttributePoints) {
            setAllocation({...allocation, sturdiness: allocation.sturdiness + 1});
          }
        }}
        onDecrement={() => {
          if (allocation.sturdiness > 0) {
            setAllocation({...allocation, sturdiness: allocation.sturdiness - 1});
          }
        }}
      />
      <StatAllocator 
        name="Luck" 
        abbr="LCK" 
        currentValue={Number(character.stats.luck)}
        allocation={allocation.luck}
        onIncrement={() => {
          if (pointsUsed < unspentAttributePoints) {
            setAllocation({...allocation, luck: allocation.luck + 1});
          }
        }}
        onDecrement={() => {
          if (allocation.luck > 0) {
            setAllocation({...allocation, luck: allocation.luck - 1});
          }
        }}
      />
      
      <Flex justify="space-between" width="100%" mt={1}>
        <Text fontSize="sm">Points remaining:</Text>
        <Badge colorScheme={unspentAttributePoints - pointsUsed > 0 ? "green" : "yellow"}>
          {unspentAttributePoints - pointsUsed}
        </Badge>
      </Flex>
      
      <Button 
        colorScheme="blue" 
        size="sm" 
        width="100%" 
        onClick={handleAllocatePoints}
        isDisabled={pointsUsed === 0 || isAllocatingPoints}
        isLoading={isAllocatingPoints}
        mt={2}
      >
        Confirm Allocation
      </Button>
    </VStack>
  );
}; 