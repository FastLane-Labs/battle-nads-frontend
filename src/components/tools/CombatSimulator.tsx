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
  Button,
  Select,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { FaSword, FaShield, FaHeart, FaBolt, FaEye, FaDice } from 'react-icons/fa';

interface CombatCharacter {
  name: string;
  level: number;
  class: string;
  stats: {
    strength: number;
    vitality: number;
    dexterity: number;
    quickness: number;
    sturdiness: number;
    luck: number;
  };
  equipment: {
    weaponDamage: number;
    weaponAccuracy: number;
    armorFactor: number;
    armorFlexibility: number;
  };
  health: {
    current: number;
    max: number;
    regeneration: number;
  };
}

interface CombatResult {
  winner: 'attacker' | 'defender' | 'draw';
  turnsToVictory: number;
  finalHealths: {
    attacker: number;
    defender: number;
  };
  averageDamage: {
    attacker: number;
    defender: number;
  };
  hitRates: {
    attacker: number;
    defender: number;
  };
  criticalRates: {
    attacker: number;
    defender: number;
  };
}

const DEFAULT_CHARACTER: CombatCharacter = {
  name: 'Test Character',
  level: 10,
  class: 'Warrior',
  stats: {
    strength: 8,
    vitality: 6,
    dexterity: 6,
    quickness: 5,
    sturdiness: 6,
    luck: 4,
  },
  equipment: {
    weaponDamage: 20,
    weaponAccuracy: 15,
    armorFactor: 10,
    armorFlexibility: 5,
  },
  health: {
    current: 1500,
    max: 1500,
    regeneration: 30,
  },
};

const PRESET_BUILDS = [
  {
    name: 'Glass Cannon Warrior',
    character: {
      ...DEFAULT_CHARACTER,
      name: 'Glass Cannon',
      stats: { strength: 12, vitality: 4, dexterity: 8, quickness: 4, sturdiness: 3, luck: 4 },
      equipment: { weaponDamage: 25, weaponAccuracy: 12, armorFactor: 5, armorFlexibility: 8 },
    },
  },
  {
    name: 'Tank Warrior',
    character: {
      ...DEFAULT_CHARACTER,
      name: 'Tank',
      stats: { strength: 6, vitality: 10, dexterity: 5, quickness: 3, sturdiness: 10, luck: 3 },
      equipment: { weaponDamage: 15, weaponAccuracy: 10, armorFactor: 20, armorFlexibility: 2 },
    },
  },
  {
    name: 'Speed Rogue',
    character: {
      ...DEFAULT_CHARACTER,
      name: 'Speed Rogue',
      class: 'Rogue',
      stats: { strength: 4, vitality: 5, dexterity: 10, quickness: 10, sturdiness: 3, luck: 8 },
      equipment: { weaponDamage: 18, weaponAccuracy: 20, armorFactor: 3, armorFlexibility: 15 },
    },
  },
  {
    name: 'Balanced Monk',
    character: {
      ...DEFAULT_CHARACTER,
      name: 'Balanced Monk',
      class: 'Monk',
      stats: { strength: 6, vitality: 7, dexterity: 5, quickness: 6, sturdiness: 8, luck: 8 },
      equipment: { weaponDamage: 16, weaponAccuracy: 14, armorFactor: 12, armorFlexibility: 8 },
    },
  },
];

// Combat calculation constants (from the game mechanics)
const HIT_MOD = 100;
const EVADE_MOD = 100;
const BASE_ACCURACY = 50;
const BASE_FLEXIBILITY = 50;
const BASE_OFFENSE = 100;
const BASE_DEFENSE = 100;

export function CombatSimulator() {
  const [attacker, setAttacker] = useState<CombatCharacter>(PRESET_BUILDS[0].character);
  const [defender, setDefender] = useState<CombatCharacter>(PRESET_BUILDS[1].character);
  const [simulations, setSimulations] = useState(1000);
  const [isSimulating, setIsSimulating] = useState(false);
  const [results, setResults] = useState<CombatResult | null>(null);

  // Calculate combat stats for a character
  const calculateCombatStats = (character: CombatCharacter) => {
    const { stats, equipment } = character;

    // Hit chance calculation
    const toHit = ((HIT_MOD + stats.dexterity) * (equipment.weaponAccuracy + BASE_ACCURACY) + stats.luck + stats.quickness) / HIT_MOD;
    
    // Damage calculation
    const offense = (BASE_OFFENSE + stats.strength) * equipment.weaponDamage / BASE_OFFENSE + stats.dexterity;
    
    // Defense calculation
    const defense = (BASE_DEFENSE + stats.sturdiness) * equipment.armorFactor / BASE_DEFENSE + stats.dexterity;
    
    // Evasion calculation
    const toEvade = ((EVADE_MOD + stats.dexterity + stats.luck) * (equipment.armorFlexibility + BASE_FLEXIBILITY) + stats.quickness) / EVADE_MOD;
    
    // Turn speed (simplified)
    const turnCooldown = Math.max(3, 8 - Math.floor((stats.quickness + stats.luck) / 4));
    
    // Critical chance (approximation)
    const critChance = Math.min(25, stats.luck * 2 + 5);

    return {
      toHit,
      offense,
      defense,
      toEvade,
      turnCooldown,
      critChance,
      hitChance: Math.max(5, Math.min(95, toHit - toEvade)),
      averageDamage: Math.max(1, offense - defense),
    };
  };

  // Run combat simulation
  const simulateCombat = () => {
    setIsSimulating(true);
    
    setTimeout(() => {
      const attackerStats = calculateCombatStats(attacker);
      const defenderStats = calculateCombatStats(defender);
      
      let attackerWins = 0;
      let defenderWins = 0;
      let totalTurns = 0;
      let totalAttackerDamage = 0;
      let totalDefenderDamage = 0;
      let attackerHits = 0;
      let defenderHits = 0;
      let attackerCrits = 0;
      let defenderCrits = 0;
      let totalAttacks = 0;
      let totalDefends = 0;

      for (let sim = 0; sim < simulations; sim++) {
        let aHealth = attacker.health.max;
        let dHealth = defender.health.max;
        let turns = 0;
        let aNextTurn = 0;
        let dNextTurn = 0;

        while (aHealth > 0 && dHealth > 0 && turns < 1000) {
          turns++;

          // Determine who acts this turn
          if (aNextTurn <= dNextTurn) {
            // Attacker's turn
            totalAttacks++;
            const hitRoll = Math.random() * 100;
            if (hitRoll < attackerStats.hitChance) {
              // Hit!
              attackerHits++;
              let damage = attackerStats.averageDamage;
              
              // Critical hit check
              const critRoll = Math.random() * 100;
              if (critRoll < attackerStats.critChance) {
                damage *= 1.5;
                attackerCrits++;
              }
              
              // Apply damage variance
              damage *= (0.8 + Math.random() * 0.4);
              damage = Math.floor(damage);
              
              dHealth -= damage;
              totalAttackerDamage += damage;
            }
            aNextTurn += attackerStats.turnCooldown;
          } else {
            // Defender's turn
            totalDefends++;
            const hitRoll = Math.random() * 100;
            if (hitRoll < defenderStats.hitChance) {
              // Hit!
              defenderHits++;
              let damage = defenderStats.averageDamage;
              
              // Critical hit check
              const critRoll = Math.random() * 100;
              if (critRoll < defenderStats.critChance) {
                damage *= 1.5;
                defenderCrits++;
              }
              
              // Apply damage variance
              damage *= (0.8 + Math.random() * 0.4);
              damage = Math.floor(damage);
              
              aHealth -= damage;
              totalDefenderDamage += damage;
            }
            dNextTurn += defenderStats.turnCooldown;
          }

          // Apply regeneration (simplified)
          if (turns % 5 === 0) {
            aHealth = Math.min(attacker.health.max, aHealth + attacker.health.regeneration);
            dHealth = Math.min(defender.health.max, dHealth + defender.health.regeneration);
          }
        }

        totalTurns += turns;
        if (aHealth > 0) {
          attackerWins++;
        } else if (dHealth > 0) {
          defenderWins++;
        }
      }

      const result: CombatResult = {
        winner: attackerWins > defenderWins ? 'attacker' : defenderWins > attackerWins ? 'defender' : 'draw',
        turnsToVictory: Math.round(totalTurns / simulations),
        finalHealths: {
          attacker: attackerWins / simulations * 100,
          defender: defenderWins / simulations * 100,
        },
        averageDamage: {
          attacker: totalAttackerDamage / totalAttacks || 0,
          defender: totalDefenderDamage / totalDefends || 0,
        },
        hitRates: {
          attacker: (attackerHits / totalAttacks) * 100 || 0,
          defender: (defenderHits / totalDefends) * 100 || 0,
        },
        criticalRates: {
          attacker: (attackerCrits / attackerHits) * 100 || 0,
          defender: (defenderCrits / defenderHits) * 100 || 0,
        },
      };

      setResults(result);
      setIsSimulating(false);
    }, 100);
  };

  const attackerCombatStats = useMemo(() => calculateCombatStats(attacker), [attacker]);
  const defenderCombatStats = useMemo(() => calculateCombatStats(defender), [defender]);

  const loadPreset = (presetIndex: number, isAttacker: boolean) => {
    if (isAttacker) {
      setAttacker(PRESET_BUILDS[presetIndex].character);
    } else {
      setDefender(PRESET_BUILDS[presetIndex].character);
    }
  };

  return (
    <Box maxW="7xl" mx="auto" p={6} data-testid="combat-simulator">
      <VStack spacing={8} align="stretch">
        {/* Header */}
        <Box textAlign="center">
          <Heading size="lg" mb={2}>Combat Simulator</Heading>
          <Text color="gray.400">
            Test different character builds against each other to optimize your strategy
          </Text>
        </Box>

        {/* Character Setup */}
        <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={8}>
          {/* Attacker */}
          <Card bg="red.900" border="1px solid" borderColor="red.600">
            <CardHeader>
              <HStack justify="space-between">
                <Heading size="md" color="red.200">⚔️ Attacker</Heading>
                <Select
                  size="sm"
                  maxW="200px"
                  onChange={(e) => loadPreset(parseInt(e.target.value), true)}
                  placeholder="Load preset..."
                >
                  {PRESET_BUILDS.map((preset, index) => (
                    <option key={index} value={index}>{preset.name}</option>
                  ))}
                </Select>
              </HStack>
            </CardHeader>
            <CardBody>
              <CharacterDisplay character={attacker} combatStats={attackerCombatStats} />
            </CardBody>
          </Card>

          {/* Defender */}
          <Card bg="blue.900" border="1px solid" borderColor="blue.600">
            <CardHeader>
              <HStack justify="space-between">
                <Heading size="md" color="blue.200">🛡️ Defender</Heading>
                <Select
                  size="sm"
                  maxW="200px"
                  onChange={(e) => loadPreset(parseInt(e.target.value), false)}
                  placeholder="Load preset..."
                >
                  {PRESET_BUILDS.map((preset, index) => (
                    <option key={index} value={index}>{preset.name}</option>
                  ))}
                </Select>
              </HStack>
            </CardHeader>
            <CardBody>
              <CharacterDisplay character={defender} combatStats={defenderCombatStats} />
            </CardBody>
          </Card>
        </Grid>

        {/* Simulation Controls */}
        <Card bg="gray.800" border="1px solid" borderColor="gray.600">
          <CardHeader>
            <Heading size="md">Simulation Settings</Heading>
          </CardHeader>
          <CardBody>
            <HStack spacing={4} justify="center">
              <VStack spacing={2}>
                <Text fontSize="sm" color="gray.400">Simulations</Text>
                <Select
                  value={simulations}
                  onChange={(e) => setSimulations(parseInt(e.target.value))}
                  size="sm"
                  maxW="120px"
                >
                  <option value={100}>100</option>
                  <option value={500}>500</option>
                  <option value={1000}>1,000</option>
                  <option value={5000}>5,000</option>
                  <option value={10000}>10,000</option>
                </Select>
              </VStack>
              
              <Button
                colorScheme="orange"
                size="lg"
                onClick={simulateCombat}
                isLoading={isSimulating}
                loadingText="Simulating..."
                data-testid="simulate-combat"
              >
                Run Simulation
              </Button>
            </HStack>
          </CardBody>
        </Card>

        {/* Results */}
        {results && (
          <Card bg="gray.800" border="1px solid" borderColor="gray.600">
            <CardHeader>
              <Heading size="md">Simulation Results</Heading>
              <Text fontSize="sm" color="gray.400">
                Based on {simulations.toLocaleString()} simulations
              </Text>
            </CardHeader>
            <CardBody>
              <SimulationResults 
                results={results} 
                attacker={attacker} 
                defender={defender}
                attackerStats={attackerCombatStats}
                defenderStats={defenderCombatStats}
              />
            </CardBody>
          </Card>
        )}
      </VStack>
    </Box>
  );
}

// Character display component
interface CharacterDisplayProps {
  character: CombatCharacter;
  combatStats: any;
}

function CharacterDisplay({ character, combatStats }: CharacterDisplayProps) {
  return (
    <VStack spacing={4} align="stretch">
      <Box>
        <Text fontWeight="bold" fontSize="lg">{character.name}</Text>
        <Text fontSize="sm" color="gray.400">Level {character.level} {character.class}</Text>
      </Box>

      <Grid templateColumns="repeat(2, 1fr)" gap={2} fontSize="sm">
        <Stat>
          <StatLabel>Health</StatLabel>
          <StatNumber>{character.health.max}</StatNumber>
        </Stat>
        <Stat>
          <StatLabel>Regen</StatLabel>
          <StatNumber>{character.health.regeneration}</StatNumber>
        </Stat>
      </Grid>

      <Divider />

      <Box>
        <Text fontWeight="semibold" mb={2}>Combat Stats</Text>
        <Grid templateColumns="repeat(2, 1fr)" gap={2} fontSize="sm">
          <Stat>
            <StatLabel>Hit Chance</StatLabel>
            <StatNumber>{Math.round(combatStats.hitChance)}%</StatNumber>
          </Stat>
          <Stat>
            <StatLabel>Avg Damage</StatLabel>
            <StatNumber>{Math.round(combatStats.averageDamage)}</StatNumber>
          </Stat>
          <Stat>
            <StatLabel>Crit Chance</StatLabel>
            <StatNumber>{Math.round(combatStats.critChance)}%</StatNumber>
          </Stat>
          <Stat>
            <StatLabel>Turn Speed</StatLabel>
            <StatNumber>{combatStats.turnCooldown}b</StatNumber>
          </Stat>
        </Grid>
      </Box>
    </VStack>
  );
}

// Simulation results component
interface SimulationResultsProps {
  results: CombatResult;
  attacker: CombatCharacter;
  defender: CombatCharacter;
  attackerStats: any;
  defenderStats: any;
}

function SimulationResults({ 
  results, 
  attacker, 
  defender, 
  attackerStats, 
  defenderStats 
}: SimulationResultsProps) {
  const winnerColor = results.winner === 'attacker' ? 'red' : results.winner === 'defender' ? 'blue' : 'gray';

  return (
    <VStack spacing={6} align="stretch">
      {/* Winner */}
      <Alert status={results.winner === 'draw' ? 'warning' : 'success'} variant="subtle">
        <AlertIcon />
        <Text fontWeight="bold">
          {results.winner === 'draw' 
            ? 'Combat result: Draw'
            : `Winner: ${results.winner === 'attacker' ? attacker.name : defender.name}`
          }
        </Text>
      </Alert>

      {/* Win Rates */}
      <Box>
        <Text fontWeight="semibold" mb={3}>Win Rates</Text>
        <VStack spacing={3}>
          <Box w="full">
            <HStack justify="space-between" mb={1}>
              <Text fontSize="sm">{attacker.name}</Text>
              <Text fontSize="sm" fontWeight="bold" color="red.400">
                {results.finalHealths.attacker.toFixed(1)}%
              </Text>
            </HStack>
            <Progress value={results.finalHealths.attacker} colorScheme="red" size="sm" />
          </Box>
          
          <Box w="full">
            <HStack justify="space-between" mb={1}>
              <Text fontSize="sm">{defender.name}</Text>
              <Text fontSize="sm" fontWeight="bold" color="blue.400">
                {results.finalHealths.defender.toFixed(1)}%
              </Text>
            </HStack>
            <Progress value={results.finalHealths.defender} colorScheme="blue" size="sm" />
          </Box>
        </VStack>
      </Box>

      {/* Combat Statistics */}
      <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={6}>
        <Box>
          <Text fontWeight="semibold" mb={3} color="red.400">Attacker Performance</Text>
          <VStack spacing={2} align="start" fontSize="sm">
            <HStack justify="space-between" w="full">
              <Text>Average Damage:</Text>
              <Text fontWeight="bold">{results.averageDamage.attacker.toFixed(1)}</Text>
            </HStack>
            <HStack justify="space-between" w="full">
              <Text>Hit Rate:</Text>
              <Text fontWeight="bold">{results.hitRates.attacker.toFixed(1)}%</Text>
            </HStack>
            <HStack justify="space-between" w="full">
              <Text>Critical Rate:</Text>
              <Text fontWeight="bold">{results.criticalRates.attacker.toFixed(1)}%</Text>
            </HStack>
          </VStack>
        </Box>

        <Box>
          <Text fontWeight="semibold" mb={3} color="blue.400">Defender Performance</Text>
          <VStack spacing={2} align="start" fontSize="sm">
            <HStack justify="space-between" w="full">
              <Text>Average Damage:</Text>
              <Text fontWeight="bold">{results.averageDamage.defender.toFixed(1)}</Text>
            </HStack>
            <HStack justify="space-between" w="full">
              <Text>Hit Rate:</Text>
              <Text fontWeight="bold">{results.hitRates.defender.toFixed(1)}%</Text>
            </HStack>
            <HStack justify="space-between" w="full">
              <Text>Critical Rate:</Text>
              <Text fontWeight="bold">{results.criticalRates.defender.toFixed(1)}%</Text>
            </HStack>
          </VStack>
        </Box>
      </Grid>

      {/* Combat Duration */}
      <Box textAlign="center">
        <Text fontWeight="semibold" color="gray.400">Average Combat Duration</Text>
        <Text fontSize="2xl" fontWeight="bold" color="orange.400">
          {results.turnsToVictory} turns
        </Text>
        <Text fontSize="sm" color="gray.500">
          ~{Math.round(results.turnsToVictory * 2.5)} seconds at 500ms/block
        </Text>
      </Box>
    </VStack>
  );
}