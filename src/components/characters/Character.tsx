'use client';

import React, { useState } from 'react';
import { Box, Heading, Text, Button, VStack, HStack, Input, FormControl, FormLabel, Grid, GridItem, IconButton, NumberInput, NumberInputField, Flex, Stat, StatLabel, StatNumber, StatHelpText, Image, Center } from '@chakra-ui/react';
import { useWallet } from '../../providers/WalletProvider';
import { useBattleNads } from '../../hooks/useBattleNads';
import { CharacterCard } from '../CharacterCard';
import { CharacterList } from '../CharacterList';
import { AddIcon, MinusIcon } from '@chakra-ui/icons';

// Constants from the smart contract
const STARTING_STAT_SUM = 32;
const MIN_STAT_VALUE = 3;
const STARTING_UNALLOCATED_POINTS = STARTING_STAT_SUM - (6 * MIN_STAT_VALUE); // 14

const CharacterDashboard = () => {
  const { address, embeddedWallet } = useWallet();
  const { createCharacter, getCharacter, getCharactersInArea, moveCharacter, attackTarget, loading, error } = useBattleNads();
  
  const [characterName, setCharacterName] = useState('');
  
  // Initialize all stats to MIN_STAT_VALUE
  const [strength, setStrength] = useState(MIN_STAT_VALUE);
  const [vitality, setVitality] = useState(MIN_STAT_VALUE);
  const [dexterity, setDexterity] = useState(MIN_STAT_VALUE);
  const [quickness, setQuickness] = useState(MIN_STAT_VALUE);
  const [sturdiness, setSturdiness] = useState(MIN_STAT_VALUE);
  const [luck, setLuck] = useState(MIN_STAT_VALUE);
  
  // Unallocated points counter
  const [unallocatedPoints, setUnallocatedPoints] = useState(STARTING_UNALLOCATED_POINTS);
  
  const [selectedCharacter, setSelectedCharacter] = useState<any>(null);
  const [areaCharacters, setAreaCharacters] = useState<any[]>([]);
  const [characterId, setCharacterId] = useState<string>('');

  // Function to increase a stat
  const increaseStat = (statSetter: React.Dispatch<React.SetStateAction<number>>, currentValue: number) => {
    if (unallocatedPoints > 0) {
      statSetter(currentValue + 1);
      setUnallocatedPoints(unallocatedPoints - 1);
    }
  };

  // Function to decrease a stat
  const decreaseStat = (statSetter: React.Dispatch<React.SetStateAction<number>>, currentValue: number) => {
    if (currentValue > MIN_STAT_VALUE) {
      statSetter(currentValue - 1);
      setUnallocatedPoints(unallocatedPoints + 1);
    }
  };

  // Handle character creation
  const handleCreateCharacter = async () => {
    if (!characterName) return;
    
    // Validate total points
    const totalPoints = strength + vitality + dexterity + quickness + sturdiness + luck;
    if (totalPoints !== STARTING_STAT_SUM) {
      alert(`Total stats must equal ${STARTING_STAT_SUM}. Currently: ${totalPoints}`);
      return;
    }
    
    try {
      await createCharacter(
        characterName,
        strength,
        vitality,
        dexterity,
        quickness,
        sturdiness,
        luck
      );
      // Would typically reload character list here
    } catch (err) {
      console.error("Error creating character:", err);
    }
  };

  // Load character data
  const handleLoadCharacter = async (id: string) => {
    try {
      const character = await getCharacter(id);
      setSelectedCharacter(character);
      
      // Load characters in the same area
      if (character) {
        const { depth, x, y } = character.stats;
        const areaChars = await getCharactersInArea(depth, x, y);
        setAreaCharacters(areaChars);
      }
    } catch (err) {
      console.error("Error loading character:", err);
    }
  };

  // Handle character movement
  const handleMove = async (direction: 'north' | 'south' | 'east' | 'west' | 'up' | 'down') => {
    if (!selectedCharacter) return;
    
    try {
      await moveCharacter(selectedCharacter.id, direction);
      // Reload character after movement
      await handleLoadCharacter(selectedCharacter.id);
    } catch (err) {
      console.error(`Error moving ${direction}:`, err);
    }
  };

  // Handle attack
  const handleAttack = async (targetIndex: number) => {
    if (!selectedCharacter) return;
    
    try {
      await attackTarget(selectedCharacter.id, targetIndex);
      // Reload character and area after attack
      await handleLoadCharacter(selectedCharacter.id);
    } catch (err) {
      console.error("Error attacking:", err);
    }
  };

  return (
    <Box padding="2rem" maxW="1200px" mx="auto">
      {/* Logo at the top */}
      <Center mb={6}>
        <Image 
          src="/BattleNadsLogo.png" 
          alt="Battle Nads Logo" 
          maxHeight="150px"
          objectFit="contain"
        />
      </Center>
      
      <Heading as="h1" mb={6} textAlign="center">Character Dashboard</Heading>
      

        <VStack spacing={8} align="stretch">
          <Box borderWidth="1px" borderRadius="lg" p={4}>
            <Heading as="h2" size="md" mb={4}>Welcome, {address?.slice(0, 6)}...{address?.slice(-4)}</Heading>
            <Text>You are connected with your wallet. Now you can play Battle-Nads!</Text>
          </Box>

          {/* Character Creation Form */}
          <Box borderWidth="1px" borderRadius="lg" p={4}>
            <Heading as="h2" size="md" mb={4}>Create Your Character</Heading>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Character Name</FormLabel>
                <Input 
                  value={characterName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCharacterName(e.target.value)}
                  placeholder="Enter character name"
                />
              </FormControl>
              
              {/* Points Counter */}
              <Stat textAlign="center" p={2} bg="blue.50" borderRadius="md">
                <StatLabel>Unallocated Points</StatLabel>
                <StatNumber>{unallocatedPoints}</StatNumber>
                <StatHelpText>All stats must sum to {STARTING_STAT_SUM}</StatHelpText>
              </Stat>
              
              <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                {/* Strength */}
                <FormControl>
                  <FormLabel>Strength</FormLabel>
                  <Flex>
                    <IconButton
                      aria-label="Decrease strength"
                      icon={<MinusIcon />}
                      onClick={() => decreaseStat(setStrength, strength)}
                      isDisabled={strength <= MIN_STAT_VALUE}
                      size="sm"
                      mr={2}
                    />
                    <NumberInput 
                      value={strength} 
                      isReadOnly 
                      min={MIN_STAT_VALUE} 
                      max={20}
                      flex={1}
                    >
                      <NumberInputField textAlign="center" />
                    </NumberInput>
                    <IconButton
                      aria-label="Increase strength"
                      icon={<AddIcon />}
                      onClick={() => increaseStat(setStrength, strength)}
                      isDisabled={unallocatedPoints <= 0}
                      size="sm"
                      ml={2}
                    />
                  </Flex>
                </FormControl>
                
                {/* Vitality */}
                <FormControl>
                  <FormLabel>Vitality</FormLabel>
                  <Flex>
                    <IconButton
                      aria-label="Decrease vitality"
                      icon={<MinusIcon />}
                      onClick={() => decreaseStat(setVitality, vitality)}
                      isDisabled={vitality <= MIN_STAT_VALUE}
                      size="sm"
                      mr={2}
                    />
                    <NumberInput 
                      value={vitality} 
                      isReadOnly 
                      min={MIN_STAT_VALUE} 
                      max={20}
                      flex={1}
                    >
                      <NumberInputField textAlign="center" />
                    </NumberInput>
                    <IconButton
                      aria-label="Increase vitality"
                      icon={<AddIcon />}
                      onClick={() => increaseStat(setVitality, vitality)}
                      isDisabled={unallocatedPoints <= 0}
                      size="sm"
                      ml={2}
                    />
                  </Flex>
                </FormControl>
                
                {/* More attributes follow... */}
              </Grid>
              
              <Button 
                colorScheme="blue" 
                width="full" 
                onClick={handleCreateCharacter}
                isDisabled={!characterName || unallocatedPoints !== 0}
              >
                Create Character
              </Button>
            </VStack>
          </Box>

          {/* Character List */}
          <Box borderWidth="1px" borderRadius="lg" p={4}>
            <Heading as="h2" size="md" mb={4}>Your Characters</Heading>
            <CharacterList onSelectCharacter={handleLoadCharacter} />
          </Box>

          {/* Selected Character Details */}
          {selectedCharacter && (
            <Box borderWidth="1px" borderRadius="lg" p={4}>
              <Heading as="h2" size="md" mb={4}>Selected Character</Heading>
              <CharacterCard character={selectedCharacter} />
              
              {/* Movement Controls */}
              <Box mt={4}>
                <Heading as="h3" size="sm" mb={2}>Move Character</Heading>
                <Grid templateColumns="repeat(3, 1fr)" gap={2}>
                  <GridItem colStart={2}>
                    <Button onClick={() => handleMove('north')} width="full">North</Button>
                  </GridItem>
                  <GridItem colStart={1} rowStart={2}>
                    <Button onClick={() => handleMove('west')} width="full">West</Button>
                  </GridItem>
                  <GridItem colStart={3} rowStart={2}>
                    <Button onClick={() => handleMove('east')} width="full">East</Button>
                  </GridItem>
                  <GridItem colStart={2} rowStart={3}>
                    <Button onClick={() => handleMove('south')} width="full">South</Button>
                  </GridItem>
                  <GridItem colStart={1} rowStart={4}>
                    <Button onClick={() => handleMove('down')} width="full">Down</Button>
                  </GridItem>
                  <GridItem colStart={3} rowStart={4}>
                    <Button onClick={() => handleMove('up')} width="full">Up</Button>
                  </GridItem>
                </Grid>
              </Box>
              
              {/* Nearby Characters */}
              <Box mt={4}>
                <Heading as="h3" size="sm" mb={2}>Characters in Area</Heading>
                {areaCharacters.length > 0 ? (
                  <VStack align="stretch" spacing={2}>
                    {areaCharacters.map((char, idx) => (
                      <HStack key={char.id} borderWidth="1px" p={2} borderRadius="md" justifyContent="space-between">
                        <Text>
                          {char.id.slice(0, 6)}... - Level {char.stats?.level || 1}
                          {char.stats?.isMonster ? ' (Monster)' : ''}
                        </Text>
                        <Button 
                          colorScheme="red" 
                          size="sm" 
                          onClick={() => handleAttack(char.stats.index)}
                          isDisabled={char.id === selectedCharacter.id}
                        >
                          Attack
                        </Button>
                      </HStack>
                    ))}
                  </VStack>
                ) : (
                  <Text>No other characters in this area.</Text>
                )}
              </Box>
            </Box>
          )}
        </VStack>
    </Box>
  );
};

export default CharacterDashboard; 