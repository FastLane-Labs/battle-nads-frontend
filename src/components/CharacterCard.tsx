import React, { useMemo, useState, useEffect } from 'react';
import { Box, Heading, Text, Badge, Flex, Progress, VStack, Divider, Select, Button, Stat, StatLabel, StatNumber } from '@chakra-ui/react';
import { BattleNad } from '../types/gameTypes';
import { useGameData } from '../providers/GameDataProvider';
import { useContracts } from '../hooks/useContracts';
import { calculateMaxHealth } from '../utils/gameDataConverters';

// Character component for displaying BattleNad information
interface CharacterCardProps {
  character: BattleNad; // Properly typed with BattleNad interface
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
  // Use GameDataProvider for access to equipable items and gameData
  const { gameData } = useGameData();
  // Use contracts for equipment change functionality
  const { embeddedContract } = useContracts();

  // Add local state for character stats that can be updated by events
  const [currentStats, setCurrentStats] = useState<BattleNad['stats'] | undefined>(character?.stats);
  
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
      
      // Check if this event is for our character - either IDs match or we're using the player character
      const isPlayerCharacter = event.detail?.isPlayerCharacter || (character && !character.stats?.isMonster);
      const isMatchingId = event.detail?.character?.id === character?.id;
      
      // Apply stats update if this is for our character
      if (event.detail?.stats && (isMatchingId || isPlayerCharacter)) {
        console.log("[CharacterCard] Updating character stats:", event.detail.stats);
        
        // Process stats before setting them
        const processedStats = { ...event.detail.stats };
        
        // Calculate maxHealth using the smart contract formula
        const calculatedMaxHealth = calculateMaxHealth(processedStats);
        console.log("[CharacterCard] Calculated maxHealth:", calculatedMaxHealth);
        
        // Ensure health never exceeds max health
        if (processedStats.health && typeof processedStats.health !== 'undefined') {
          processedStats.health = Math.min(
            Number(processedStats.health),
            calculatedMaxHealth
          );
        }
        
        // Update stats
        setCurrentStats(processedStats);
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

  const { weapon, armor, name, inventory } = character;
  
  // Calculate max health using the utility function that matches the smart contract
  const maxHealth = calculateMaxHealth(currentStats);
  const healthPercentage = currentStats?.health ? (Number(currentStats.health) / maxHealth) * 100 : 0;
  
  // Calculate experience progress using the same formula as the smart contract
  const experienceProgress = useMemo(() => {
    const currentLevel = Number(currentStats?.level);
    const currentExperience = Number(currentStats?.experience);
    
    // Formula from Character.sol: (currentLevel * EXP_BASE) + (currentLevel * currentLevel * EXP_SCALE)
    const experienceNeededForNextLevel = (currentLevel * EXP_BASE) + (currentLevel * currentLevel * EXP_SCALE);
    
    // Calculate percentage of progress to next level
    return (currentExperience / experienceNeededForNextLevel) * 100;
  }, [currentStats?.level, currentStats?.experience]);

  return (
    <Box borderWidth="1px" borderRadius="lg" p={4} boxShadow="md" bg="gray.800" color="white">
      <VStack spacing={3} align="stretch">
        {/* Character Name and Level */}
        <Flex justify="space-between" align="center">
          <Heading as="h3" size="md">
            {name || 'Unnamed Character'}
          </Heading>
          {currentStats?.level && (
            <Badge colorScheme="purple" fontSize="sm" p={1}>
              Level {currentStats.level}
            </Badge>
          )}
        </Flex>
        
        <Divider />
        
        {/* Health Bar */}
        {currentStats?.health !== undefined && (
          <Box>
            <Flex justify="space-between" mb={1}>
              <Text fontSize="sm">Health</Text>
              <Text fontSize="sm">{Math.max(0, Number(currentStats.health))} / {maxHealth}</Text>
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
              <StatLabel fontSize="xs">STR</StatLabel>
              <StatNumber>{Number(currentStats?.sturdiness)}</StatNumber>
            </Stat>
            <Stat size="sm">
              <StatLabel fontSize="xs">LCK</StatLabel>
              <StatNumber>{Number(currentStats?.luck)}</StatNumber>
            </Stat>
          </Flex>
        </Box>
        
        {/* Stat Point Allocation - only shown when unallocated points are available */}
        {gameData?.unallocatedAttributePoints > 0 && (
          <Box mt={2}>
            <Divider mb={2} />
            <Flex justify="space-between" mb={2}>
              <Text fontWeight="bold">Allocate Stat Points</Text>
              <Badge colorScheme="green">{gameData.unallocatedAttributePoints} points</Badge>
            </Flex>
            <StatAllocationPanel 
              character={character}
              unallocatedPoints={gameData.unallocatedAttributePoints}
            />
          </Box>
        )}
        
        <Divider />
        
        {/* Equipment */}
        <Box>
          <Text fontWeight="bold" mb={2}>Equipment</Text>
          <VStack align="stretch" spacing={2}>
            {/* Weapon Selection */}
            <Flex justify="space-between" align="center">
              <Text fontSize="sm">Weapon:</Text>
              <Flex align="center">
                <Text fontSize="sm" fontWeight="medium" mr={2}>{weapon?.name}</Text>
                {gameData?.equipableWeaponIDs?.length > 0 && (
                  <Select 
                    size="xs" 
                    width="auto" 
                    onChange={(e) => {
                      if (embeddedContract && character.id) {
                        embeddedContract.equipWeapon(character.id, Number(e.target.value));
                      }
                    }}
                    placeholder="Change"
                  >
                    {gameData.equipableWeaponIDs.map((id: number, index: number) => (
                      <option key={id} value={id}>
                        {gameData.equipableWeaponNames[index]}
                      </option>
                    ))}
                  </Select>
                )}
              </Flex>
            </Flex>
            
            {/* Armor Selection */}
            <Flex justify="space-between" align="center">
              <Text fontSize="sm">Armor:</Text>
              <Flex align="center">
                <Text fontSize="sm" fontWeight="medium" mr={2}>{armor?.name}</Text>
                {gameData?.equipableArmorIDs?.length > 0 && (
                  <Select 
                    size="xs" 
                    width="auto"
                    onChange={(e) => {
                      if (embeddedContract && character.id) {
                        embeddedContract.equipArmor(character.id, Number(e.target.value));
                      }
                    }}
                    placeholder="Change"
                  >
                    {gameData.equipableArmorIDs.map((id: number, index: number) => (
                      <option key={id} value={id}>
                        {gameData.equipableArmorNames[index]}
                      </option>
                    ))}
                  </Select>
                )}
              </Flex>
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
                  {Number(currentStats?.experience)} / {(Number(currentStats?.level) * EXP_BASE) + (Number(currentStats?.level) * Number(currentStats?.level) * EXP_SCALE)}
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
const StatAllocationPanel: React.FC<{
  character: BattleNad;
  unallocatedPoints: number;
}> = ({ character, unallocatedPoints }) => {
  const { embeddedContract } = useContracts();
  const [allocation, setAllocation] = useState({
    strength: BigInt(0),
    vitality: BigInt(0),
    dexterity: BigInt(0),
    quickness: BigInt(0),
    sturdiness: BigInt(0),
    luck: BigInt(0)
  });

  const allocatePoints = () => {
    if (embeddedContract && character.id) {
      embeddedContract.allocatePoints(
        character.id,
        allocation.strength,
        allocation.vitality,
        allocation.dexterity,
        allocation.quickness,
        allocation.sturdiness,
        allocation.luck
      );
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
          if (pointsUsed < unallocatedPoints) {
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
          if (pointsUsed < unallocatedPoints) {
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
          if (pointsUsed < unallocatedPoints) {
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
          if (pointsUsed < unallocatedPoints) {
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
        abbr="STR" 
        currentValue={Number(character.stats.sturdiness)}
        allocation={Number(allocation.sturdiness)}
        onIncrement={() => {
          if (pointsUsed < unallocatedPoints) {
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
          if (pointsUsed < unallocatedPoints) {
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
        <Badge colorScheme={unallocatedPoints - pointsUsed > 0 ? "green" : "yellow"}>
          {unallocatedPoints - pointsUsed}
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