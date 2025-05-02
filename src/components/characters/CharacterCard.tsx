import React, { useMemo, useState, useEffect } from 'react';
import { Box, Heading, Text, Badge, Flex, Progress, VStack, Divider, Select, Button, Stat, StatLabel, StatNumber } from '@chakra-ui/react';
import { Character } from '@/types/domain/character';
import { calculateMaxHealth } from '../../utils/gameDataConverters';
import { EquipmentPanel } from '@/components/game/equipment/EquipmentPanel';

interface CharacterCardProps {
  character: Character; // Corrected type name
}

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

export const CharacterCard: React.FC<CharacterCardProps> = ({ character }) => {
  const [currentStats, setCurrentStats] = useState<Character['stats'] | undefined>(character?.stats); // Corrected type name
  
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
  
  // Calculate experience progress using the same formula as the smart contract
  const experienceProgress = useMemo(() => {
    const currentLevel = Number(level);
    const currentExperience = Number(currentStats?.experience);
    
    // Formula from Character.sol: (currentLevel * EXP_BASE) + (currentLevel * currentLevel * EXP_SCALE)
    const experienceNeededForNextLevel = (currentLevel * EXP_BASE) + (currentLevel * currentLevel * EXP_SCALE);
    
    // Calculate percentage of progress to next level
    return (currentExperience / experienceNeededForNextLevel) * 100;
  }, [level, currentStats?.experience]);

  // TODO: Replace gameData usage with appropriate state/hook
  const unallocatedAttributePoints = 0; // Placeholder
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
            {/* Temporarily commenting out StatAllocationPanel until assignNewPoints is located */}
            {/* <StatAllocationPanel 
              character={character}
              unspentAttributePoints={unallocatedAttributePoints}
            /> */}
          </Box>
        )}
        
        <Divider />
        
        {/* Equipment - Replace with dedicated component */}
        <EquipmentPanel characterId={character?.id} />
        
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
// TODO: Re-implement this once the correct hook for 'assignNewPoints' is found
/* 
const StatAllocationPanel: React.FC<{
  character: Character;
  unspentAttributePoints: number;
}> = ({ character, unspentAttributePoints }) => {
  // TODO: Need to find where assignNewPoints comes from
  // const { assignNewPoints } = useBattleNads(); // This hook doesn't provide assignNewPoints
  
  const [allocation, setAllocation] = useState({
    strength: BigInt(0),
    vitality: BigInt(0),
    dexterity: BigInt(0),
    quickness: BigInt(0),
    sturdiness: BigInt(0),
    luck: BigInt(0)
  });

  const allocatePoints = () => {
    if (character.id) {
      // TODO: Call the correct assignNewPoints function here
      console.warn("assignNewPoints not implemented yet.");
      // assignNewPoints(
      //   character.id,
      //   allocation.strength,
      //   allocation.vitality,
      //   allocation.dexterity,
      //   allocation.quickness,
      //   allocation.sturdiness,
      //   allocation.luck
      // );
    }
    // Reset allocation
    setAllocation({
      strength: BigInt(0),
      vitality: BigInt(0),
      dexterity: BigInt(0),
      quickness: BigInt(0),
      sturdiness: BigInt(0),
      luck: BigInt(0)
    });
  };

  // Calculate points used
  const pointsUsed = Number(allocation.strength) + Number(allocation.vitality) + Number(allocation.dexterity) + Number(allocation.quickness) + Number(allocation.sturdiness) + Number(allocation.luck);

  return (
    <VStack spacing={2}>
      <StatAllocator 
        name="Strength" 
        abbr="STR" 
        currentValue={Number(character.stats.strength)}
        allocation={Number(allocation.strength)}
        onIncrement={() => {
          if (pointsUsed < unspentAttributePoints) {
            setAllocation({...allocation, strength: allocation.strength + BigInt(1)});
          }
        }}
        onDecrement={() => {
          if (allocation.strength > BigInt(0)) {
            setAllocation({...allocation, strength: allocation.strength - BigInt(1)});
          }
        }}
      />
      <StatAllocator 
        name="Vitality" 
        abbr="VIT" 
        currentValue={Number(character.stats.vitality)}
        allocation={Number(allocation.vitality)}
        onIncrement={() => {
          if (pointsUsed < unspentAttributePoints) {
            setAllocation({...allocation, vitality: allocation.vitality + BigInt(1)});
          }
        }}
        onDecrement={() => {
          if (allocation.vitality > BigInt(0)) {
            setAllocation({...allocation, vitality: allocation.vitality - BigInt(1)});
          }
        }}
      />
      <StatAllocator 
        name="Dexterity" 
        abbr="DEX" 
        currentValue={Number(character.stats.dexterity)}
        allocation={Number(allocation.dexterity)}
        onIncrement={() => {
          if (pointsUsed < unspentAttributePoints) {
            setAllocation({...allocation, dexterity: allocation.dexterity + BigInt(1)});
          }
        }}
        onDecrement={() => {
          if (allocation.dexterity > BigInt(0)) {
            setAllocation({...allocation, dexterity: allocation.dexterity - BigInt(1)});
          }
        }}
      />
      <StatAllocator 
        name="Quickness" 
        abbr="QCK" 
        currentValue={Number(character.stats.quickness)}
        allocation={Number(allocation.quickness)}
        onIncrement={() => {
          if (pointsUsed < unspentAttributePoints) {
            setAllocation({...allocation, quickness: allocation.quickness + BigInt(1)});
          }
        }}
        onDecrement={() => {
          if (allocation.quickness > BigInt(0)) {
            setAllocation({...allocation, quickness: allocation.quickness - BigInt(1)});
          }
        }}
      />
      <StatAllocator 
        name="Sturdiness" 
        abbr="STD" // Corrected abbreviation
        currentValue={Number(character.stats.sturdiness)}
        allocation={Number(allocation.sturdiness)}
        onIncrement={() => {
          if (pointsUsed < unspentAttributePoints) {
            setAllocation({...allocation, sturdiness: allocation.sturdiness + BigInt(1)});
          }
        }}
        onDecrement={() => {
          if (allocation.sturdiness > BigInt(0)) {
            setAllocation({...allocation, sturdiness: allocation.sturdiness - BigInt(1)});
          }
        }}
      />
      <StatAllocator 
        name="Luck" 
        abbr="LCK" 
        currentValue={Number(character.stats.luck)}
        allocation={Number(allocation.luck)}
        onIncrement={() => {
          if (pointsUsed < unspentAttributePoints) {
            setAllocation({...allocation, luck: allocation.luck + BigInt(1)});
          }
        }}
        onDecrement={() => {
          if (allocation.luck > BigInt(0)) {
            setAllocation({...allocation, luck: allocation.luck - BigInt(1)});
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
        onClick={allocatePoints}
        isDisabled={pointsUsed === 0}
        mt={2}
      >
        Confirm Allocation
      </Button>
    </VStack>
  );
}; 
*/ 