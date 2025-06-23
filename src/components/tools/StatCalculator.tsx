'use client';

import React, { useState, useMemo } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Grid,
  GridItem,
  Progress,
  Badge,
  Divider,
  Tooltip,
  Icon,
  Card,
  CardBody,
  CardHeader,
} from '@chakra-ui/react';
import { FaInfoCircle, FaStar, FaShield, FaSword, FaHeart, FaEye, FaRunning, FaDice } from 'react-icons/fa';
import { StatIncrementControl } from '../ui/StatIncrementControl';

interface StatAllocation {
  strength: number;
  vitality: number;
  dexterity: number;
  quickness: number;
  sturdiness: number;
  luck: number;
}

interface CharacterClass {
  id: string;
  name: string;
  bonuses: Partial<StatAllocation>;
  penalties: Partial<StatAllocation>;
  healthModifier: number;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
}

const CHARACTER_CLASSES: CharacterClass[] = [
  {
    id: 'warrior',
    name: 'Warrior',
    bonuses: { strength: 3, vitality: 2 },
    penalties: { quickness: -1 },
    healthModifier: 30,
    description: 'Tank/DPS hybrid with high survivability',
    difficulty: 'Beginner',
  },
  {
    id: 'rogue',
    name: 'Rogue',
    bonuses: { dexterity: 3, quickness: 2, luck: 1 },
    penalties: { strength: -1 },
    healthModifier: -20,
    description: 'High damage assassin with speed and evasion',
    difficulty: 'Intermediate',
  },
  {
    id: 'monk',
    name: 'Monk',
    bonuses: { sturdiness: 2, luck: 2 },
    penalties: { dexterity: -1 },
    healthModifier: 20,
    description: 'Support and healing specialist',
    difficulty: 'Intermediate',
  },
  {
    id: 'sorcerer',
    name: 'Sorcerer',
    bonuses: {},
    penalties: { strength: -1, vitality: -1, sturdiness: -1 },
    healthModifier: -30,
    description: 'Magical burst damage specialist',
    difficulty: 'Advanced',
  },
  {
    id: 'bard',
    name: 'Bard',
    bonuses: {},
    penalties: { strength: -1, vitality: -1, dexterity: -1, quickness: -1, sturdiness: -1, luck: -1 },
    healthModifier: -40,
    description: 'Challenge mode with unique mechanics',
    difficulty: 'Expert',
  },
];

const STAT_INFO = {
  strength: {
    icon: FaSword,
    description: 'Primary damage scaling, affects weapon damage',
    color: '#F56565',
  },
  vitality: {
    icon: FaHeart,
    description: 'Health pool and regeneration rate',
    color: '#48BB78',
  },
  dexterity: {
    icon: FaEye,
    description: 'Hit chance and minor damage bonus',
    color: '#4299E1',
  },
  quickness: {
    icon: FaRunning,
    description: 'Turn speed and hit chance',
    color: '#9F7AEA',
  },
  sturdiness: {
    icon: FaShield,
    description: 'Health pool and damage resistance',
    color: '#38B2AC',
  },
  luck: {
    icon: FaDice,
    description: 'Critical hits, turn speed, and hit chance',
    color: '#F6AD55',
  },
};

const TOTAL_POINTS = 32;
const MIN_STAT_VALUE = 3;

export function StatCalculator() {
  const [selectedClass, setSelectedClass] = useState<CharacterClass>(CHARACTER_CLASSES[0]);
  const [baseStats, setBaseStats] = useState<StatAllocation>({
    strength: 6,
    vitality: 6,
    dexterity: 5,
    quickness: 5,
    sturdiness: 5,
    luck: 5,
  });

  const totalAllocated = useMemo(() => {
    return Object.values(baseStats).reduce((sum, value) => sum + value, 0);
  }, [baseStats]);

  const remainingPoints = TOTAL_POINTS - totalAllocated;

  const finalStats = useMemo(() => {
    const result = { ...baseStats };
    
    // Apply class bonuses and penalties
    Object.entries(selectedClass.bonuses).forEach(([stat, bonus]) => {
      result[stat as keyof StatAllocation] += bonus || 0;
    });
    
    Object.entries(selectedClass.penalties).forEach(([stat, penalty]) => {
      result[stat as keyof StatAllocation] += penalty || 0;
    });

    return result;
  }, [baseStats, selectedClass]);

  const healthCalculation = useMemo(() => {
    const baseHealth = 1000;
    const levelMultiplier = 50; // Assuming level 1
    const vitalityHealth = finalStats.vitality * 100;
    const sturdinessHealth = finalStats.sturdiness * 20;
    const classModifier = selectedClass.healthModifier;
    
    return {
      base: baseHealth + levelMultiplier,
      vitality: vitalityHealth,
      sturdiness: sturdinessHealth,
      classModifier: classModifier,
      total: baseHealth + levelMultiplier + vitalityHealth + sturdinessHealth + classModifier,
    };
  }, [finalStats, selectedClass]);

  const handleStatChange = (stat: keyof StatAllocation, value: number) => {
    setBaseStats(prev => ({
      ...prev,
      [stat]: Math.max(MIN_STAT_VALUE, value),
    }));
  };

  const canIncrease = (stat: keyof StatAllocation) => {
    return remainingPoints > 0;
  };

  const canDecrease = (stat: keyof StatAllocation) => {
    return baseStats[stat] > MIN_STAT_VALUE;
  };

  const getStatColor = (stat: keyof StatAllocation): string => {
    const value = finalStats[stat];
    if (value >= 10) return 'green.400';
    if (value >= 7) return 'orange.400';
    if (value >= 5) return 'yellow.400';
    return 'red.400';
  };

  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty) {
      case 'Beginner': return 'green';
      case 'Intermediate': return 'yellow';
      case 'Advanced': return 'orange';
      case 'Expert': return 'red';
      default: return 'gray';
    }
  };

  return (
    <Box maxW="6xl" mx="auto" p={6} data-testid="stat-calculator">
      <VStack spacing={8} align="stretch">
        {/* Header */}
        <Box textAlign="center">
          <Heading size="lg" mb={2}>Character Build Calculator</Heading>
          <Text color="gray.400">
            Plan your character build and see the impact of different stat allocations
          </Text>
        </Box>

        <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={8}>
          {/* Class Selection */}
          <GridItem>
            <Card bg="gray.800" border="1px solid" borderColor="gray.600">
              <CardHeader>
                <Heading size="md">Character Class</Heading>
              </CardHeader>
              <CardBody>
                <VStack spacing={3}>
                  {CHARACTER_CLASSES.map((charClass) => (
                    <Box
                      key={charClass.id}
                      p={4}
                      borderRadius="md"
                      border="2px solid"
                      borderColor={selectedClass.id === charClass.id ? 'orange.400' : 'gray.600'}
                      bg={selectedClass.id === charClass.id ? 'orange.900' : 'gray.700'}
                      cursor="pointer"
                      onClick={() => setSelectedClass(charClass)}
                      w="full"
                      transition="all 0.2s"
                      _hover={{
                        borderColor: 'orange.300',
                        bg: selectedClass.id === charClass.id ? 'orange.800' : 'gray.600',
                      }}
                    >
                      <HStack justify="space-between" mb={2}>
                        <Text fontWeight="bold" fontSize="lg">{charClass.name}</Text>
                        <Badge colorScheme={getDifficultyColor(charClass.difficulty)}>
                          {charClass.difficulty}
                        </Badge>
                      </HStack>
                      <Text fontSize="sm" color="gray.300" mb={3}>
                        {charClass.description}
                      </Text>
                      
                      {/* Class modifiers */}
                      <VStack spacing={1} align="start">
                        {Object.entries(charClass.bonuses).map(([stat, bonus]) => (
                          <Text key={stat} fontSize="xs" color="green.400">
                            +{bonus} {stat}
                          </Text>
                        ))}
                        {Object.entries(charClass.penalties).map(([stat, penalty]) => (
                          <Text key={stat} fontSize="xs" color="red.400">
                            {penalty} {stat}
                          </Text>
                        ))}
                        {charClass.healthModifier !== 0 && (
                          <Text 
                            fontSize="xs" 
                            color={charClass.healthModifier > 0 ? 'green.400' : 'red.400'}
                          >
                            {charClass.healthModifier > 0 ? '+' : ''}{charClass.healthModifier} health per level
                          </Text>
                        )}
                      </VStack>
                    </Box>
                  ))}
                </VStack>
              </CardBody>
            </Card>
          </GridItem>

          {/* Stat Allocation */}
          <GridItem>
            <Card bg="gray.800" border="1px solid" borderColor="gray.600">
              <CardHeader>
                <HStack justify="space-between" align="center">
                  <Heading size="md">Stat Allocation</Heading>
                  <VStack spacing={0}>
                    <Text fontSize="sm" color="gray.400">Remaining Points</Text>
                    <Text 
                      fontSize="2xl" 
                      fontWeight="bold" 
                      color={remainingPoints === 0 ? 'green.400' : remainingPoints < 0 ? 'red.400' : 'orange.400'}
                    >
                      {remainingPoints}
                    </Text>
                  </VStack>
                </HStack>
                <Progress 
                  value={(totalAllocated / TOTAL_POINTS) * 100} 
                  colorScheme={remainingPoints === 0 ? 'green' : 'orange'}
                  size="sm"
                  mt={2}
                />
              </CardHeader>
              <CardBody>
                <VStack spacing={4}>
                  {Object.entries(STAT_INFO).map(([stat, info]) => {
                    const statKey = stat as keyof StatAllocation;
                    const baseValue = baseStats[statKey];
                    const finalValue = finalStats[statKey];
                    const modifier = finalValue - baseValue;
                    
                    return (
                      <Box key={stat} w="full">
                        <HStack justify="space-between" mb={2}>
                          <HStack spacing={2}>
                            <Icon as={info.icon} color={info.color} />
                            <Text fontWeight="semibold" textTransform="capitalize">
                              {stat}
                            </Text>
                            <Tooltip label={info.description} placement="top">
                              <Icon as={FaInfoCircle} color="gray.400" boxSize={3} />
                            </Tooltip>
                          </HStack>
                          
                          <HStack spacing={2}>
                            <StatIncrementControl
                              value={baseValue}
                              onIncrement={() => handleStatChange(statKey, baseValue + 1)}
                              onDecrement={() => handleStatChange(statKey, baseValue - 1)}
                              canIncrement={canIncrease(statKey)}
                              canDecrement={canDecrease(statKey)}
                              size="sm"
                            />
                          </HStack>
                        </HStack>
                        
                        <HStack justify="space-between" align="center">
                          <Text fontSize="sm" color="gray.400">
                            Base: {baseValue}
                            {modifier !== 0 && (
                              <Text as="span" color={modifier > 0 ? 'green.400' : 'red.400'} ml={2}>
                                {modifier > 0 ? '+' : ''}{modifier}
                              </Text>
                            )}
                          </Text>
                          <Text 
                            fontSize="lg" 
                            fontWeight="bold" 
                            color={getStatColor(statKey)}
                          >
                            {finalValue}
                          </Text>
                        </HStack>
                      </Box>
                    );
                  })}
                </VStack>
              </CardBody>
            </Card>
          </GridItem>
        </Grid>

        {/* Calculated Stats */}
        <Card bg="gray.800" border="1px solid" borderColor="gray.600">
          <CardHeader>
            <Heading size="md">Calculated Stats</Heading>
          </CardHeader>
          <CardBody>
            <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={6}>
              {/* Health Calculation */}
              <Box>
                <Heading size="sm" mb={3} color="red.400">❤️ Health</Heading>
                <VStack spacing={2} align="start" fontSize="sm">
                  <HStack justify="space-between" w="full">
                    <Text color="gray.400">Base + Level:</Text>
                    <Text>{healthCalculation.base}</Text>
                  </HStack>
                  <HStack justify="space-between" w="full">
                    <Text color="gray.400">Vitality Bonus:</Text>
                    <Text color="green.400">+{healthCalculation.vitality}</Text>
                  </HStack>
                  <HStack justify="space-between" w="full">
                    <Text color="gray.400">Sturdiness Bonus:</Text>
                    <Text color="green.400">+{healthCalculation.sturdiness}</Text>
                  </HStack>
                  {healthCalculation.classModifier !== 0 && (
                    <HStack justify="space-between" w="full">
                      <Text color="gray.400">Class Modifier:</Text>
                      <Text color={healthCalculation.classModifier > 0 ? 'green.400' : 'red.400'}>
                        {healthCalculation.classModifier > 0 ? '+' : ''}{healthCalculation.classModifier}
                      </Text>
                    </HStack>
                  )}
                  <Divider />
                  <HStack justify="space-between" w="full">
                    <Text fontWeight="bold">Total Health:</Text>
                    <Text fontWeight="bold" fontSize="lg" color="red.400">
                      {healthCalculation.total}
                    </Text>
                  </HStack>
                </VStack>
              </Box>

              {/* Regeneration */}
              <Box>
                <Heading size="sm" mb={3} color="green.400">💚 Regeneration</Heading>
                <VStack spacing={2} align="start" fontSize="sm">
                  <HStack justify="space-between" w="full">
                    <Text color="gray.400">Base Regen:</Text>
                    <Text>{finalStats.vitality * 5} HP/turn</Text>
                  </HStack>
                  {selectedClass.id === 'monk' && (
                    <HStack justify="space-between" w="full">
                      <Text color="gray.400">Monk Bonus:</Text>
                      <Text color="green.400">Enhanced</Text>
                    </HStack>
                  )}
                </VStack>
              </Box>

              {/* Combat Stats Preview */}
              <Box>
                <Heading size="sm" mb={3} color="orange.400">⚔️ Combat Preview</Heading>
                <VStack spacing={2} align="start" fontSize="sm">
                  <HStack justify="space-between" w="full">
                    <Text color="gray.400">Damage Scaling:</Text>
                    <Text>{finalStats.strength}x weapon</Text>
                  </HStack>
                  <HStack justify="space-between" w="full">
                    <Text color="gray.400">Hit Chance:</Text>
                    <Text>{finalStats.dexterity}x accuracy</Text>
                  </HStack>
                  <HStack justify="space-between" w="full">
                    <Text color="gray.400">Defense:</Text>
                    <Text>{finalStats.sturdiness}x armor</Text>
                  </HStack>
                  <HStack justify="space-between" w="full">
                    <Text color="gray.400">Turn Speed:</Text>
                    <Text>~{Math.max(3, 8 - Math.floor(finalStats.quickness / 4))} blocks</Text>
                  </HStack>
                </VStack>
              </Box>
            </Grid>
          </CardBody>
        </Card>

        {/* Build Analysis */}
        <Card bg="gray.800" border="1px solid" borderColor="gray.600">
          <CardHeader>
            <Heading size="md">Build Analysis</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="start">
              <BuildAnalysis stats={finalStats} characterClass={selectedClass} />
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
}

// Build analysis component
interface BuildAnalysisProps {
  stats: StatAllocation;
  characterClass: CharacterClass;
}

function BuildAnalysis({ stats, characterClass }: BuildAnalysisProps) {
  const analysis = useMemo(() => {
    const recommendations = [];
    const warnings = [];
    const strengths = [];

    // Analyze stat distribution
    const highStats = Object.entries(stats).filter(([_, value]) => value >= 10);
    const lowStats = Object.entries(stats).filter(([_, value]) => value <= 4);

    // Build type detection
    if (stats.strength >= 9) {
      strengths.push('High damage output potential');
    }
    if (stats.vitality + stats.sturdiness >= 15) {
      strengths.push('Excellent survivability');
    }
    if (stats.dexterity >= 8) {
      strengths.push('High accuracy and consistent hits');
    }
    if (stats.quickness >= 8) {
      strengths.push('Fast turn speed for frequent actions');
    }

    // Warnings
    if (stats.vitality <= 4) {
      warnings.push('Very low health - vulnerable to burst damage');
    }
    if (stats.sturdiness <= 4) {
      warnings.push('Low defense - high damage taken');
    }
    if (stats.dexterity <= 4) {
      warnings.push('Poor accuracy - may miss frequently');
    }

    // Class-specific analysis
    if (characterClass.id === 'warrior') {
      if (stats.strength < 8) {
        recommendations.push('Consider more Strength for better damage scaling');
      }
      if (stats.vitality < 6) {
        recommendations.push('Warriors benefit from high Vitality for survivability');
      }
    } else if (characterClass.id === 'rogue') {
      if (stats.dexterity < 8) {
        recommendations.push('Rogues need high Dexterity for hit chance');
      }
      if (stats.luck < 6) {
        recommendations.push('Luck is crucial for Rogue critical hits');
      }
    } else if (characterClass.id === 'sorcerer') {
      if (stats.vitality < 5) {
        recommendations.push('Sorcerers need some Vitality to survive their penalties');
      }
      if (stats.luck < 7) {
        recommendations.push('Luck helps Sorcerers with critical Fireballs');
      }
    }

    return { recommendations, warnings, strengths };
  }, [stats, characterClass]);

  return (
    <VStack spacing={4} align="start" w="full">
      {analysis.strengths.length > 0 && (
        <Box>
          <Text fontWeight="semibold" color="green.400" mb={2}>✅ Build Strengths:</Text>
          <VStack spacing={1} align="start">
            {analysis.strengths.map((strength, index) => (
              <Text key={index} fontSize="sm" color="gray.300">• {strength}</Text>
            ))}
          </VStack>
        </Box>
      )}

      {analysis.warnings.length > 0 && (
        <Box>
          <Text fontWeight="semibold" color="red.400" mb={2}>⚠️ Potential Issues:</Text>
          <VStack spacing={1} align="start">
            {analysis.warnings.map((warning, index) => (
              <Text key={index} fontSize="sm" color="gray.300">• {warning}</Text>
            ))}
          </VStack>
        </Box>
      )}

      {analysis.recommendations.length > 0 && (
        <Box>
          <Text fontWeight="semibold" color="orange.400" mb={2}>💡 Recommendations:</Text>
          <VStack spacing={1} align="start">
            {analysis.recommendations.map((rec, index) => (
              <Text key={index} fontSize="sm" color="gray.300">• {rec}</Text>
            ))}
          </VStack>
        </Box>
      )}
    </VStack>
  );
}