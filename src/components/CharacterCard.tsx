import React, { useMemo, useState } from 'react';
import { Box, Heading, Text, Badge, Flex, Progress, VStack, Divider, Select, Button } from '@chakra-ui/react';
import { BattleNad } from '../types/gameTypes';
import { useGameData } from '../providers/GameDataProvider';
import { useContracts } from '../hooks/useContracts';

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

  if (!character) return null;

  const { stats, weapon, armor, name, inventory } = character;
  const healthPercentage = (Number(stats.health) / Number(stats.maxHealth)) * 100;
  
  // Calculate experience progress using the same formula as the smart contract
  const experienceProgress = useMemo(() => {
    const currentLevel = Number(stats.level);
    const currentExperience = Number(stats.experience);
    
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
                <Text fontSize="sm" fontWeight="medium" mr={2}>{weapon.name}</Text>
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
                <Text fontSize="sm" fontWeight="medium" mr={2}>{armor.name}</Text>
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
                  {Number(stats.experience)} / {(Number(stats.level) * EXP_BASE) + (Number(stats.level) * Number(stats.level) * EXP_SCALE)}
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