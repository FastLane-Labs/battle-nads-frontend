'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Box, Heading, Text, Button, VStack, HStack, Grid, GridItem, Flex, Image, Center, useToast } from '@chakra-ui/react';
import { useWallet } from '../../providers/WalletProvider';
import { useGame } from '../../hooks/game/useGame';
import { CharacterCard } from '../CharacterCard';
import { CharacterList } from '../CharacterList';
import { domain, BattleNadLite } from '../../types';

const CharacterDashboard = () => {
  const { address } = useWallet();
  const toast = useToast();

  const { 
    character,
    characterId,
    isLoading,
    error,
    gameState,
    moveCharacter,
    isMoving,
    attack,
    isAttacking,
    others,
  } = useGame();
  
  const combatants = useMemo(() => gameState?.combatants || [], [gameState]);
  const nearbyCharacters = useMemo(() => [...combatants, ...(others || [])], [combatants, others]);

  const directionMap: { [key: string]: domain.Direction } = {
    north: domain.Direction.North,
    south: domain.Direction.South,
    east: domain.Direction.East,
    west: domain.Direction.West,
    up: domain.Direction.Up,
    down: domain.Direction.Down,
  };

  const handleMove = useCallback(async (directionString: 'north' | 'south' | 'east' | 'west' | 'up' | 'down') => {
    if (!characterId || isMoving) return;

    const directionEnum = directionMap[directionString];
    if (directionEnum === undefined) return;

    addToCombatLog(`Attempting move: ${directionString}`);
    try {
      await moveCharacter(directionEnum);
      toast({ title: `Moved ${directionString}`, status: "success", duration: 1500 });
    } catch (err: any) {
      toast({ title: "Movement Failed", description: err.message, status: "error", duration: 3000 });
      addToCombatLog(`Failed move ${directionString}: ${err.message}`);
    }
  }, [characterId, moveCharacter, isMoving, toast, directionMap]);

  const handleAttack = useCallback(async (targetIndex: number) => {
    if (!characterId || isAttacking) return;

    const target = combatants?.[targetIndex];
    if (!target) {
        toast({ title: "Attack Failed", description: "Invalid target selected.", status: "error", duration: 3000 });
        return;
    }
    
    const contractTargetIndex = target.index; 
    if (contractTargetIndex === undefined || contractTargetIndex === null) {
       toast({ title: "Attack Failed", description: "Target index is missing.", status: "error", duration: 3000 });
       return;
    }

    addToCombatLog(`Attempting attack on target index: ${contractTargetIndex}`);
    try {
      await attack(contractTargetIndex);
      toast({ title: `Attacked target ${contractTargetIndex}`, status: "success", duration: 1500 });
    } catch (err: any) {
      toast({ title: "Attack Failed", description: err.message, status: "error", duration: 3000 });
      addToCombatLog(`Failed attack on ${contractTargetIndex}: ${err.message}`);
    }
  }, [characterId, attack, isAttacking, combatants, toast]);

  const addToCombatLog = (msg: string) => console.log("[Dashboard Log]:", msg);

  return (
    <Box padding="2rem" maxW="1200px" mx="auto">
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
          {isLoading && <Text>Loading character data...</Text>}
          {error && <Text color="red.400">Error loading data: {error}</Text>}
          {!isLoading && !error && !characterId && <Text>No character found for this wallet. <a href="/create">Create one?</a></Text>}
          {!isLoading && !error && characterId && <Text>Character ID: {characterId.slice(0,10)}...</Text>}
        </Box>

        <Box borderWidth="1px" borderRadius="lg" p={4}>
          <Heading as="h2" size="md" mb={4}>Your Characters</Heading>
          <CharacterList onSelectCharacter={(id) => console.log("Character selected:", id)} />
        </Box>

        {character && (
          <Box borderWidth="1px" borderRadius="lg" p={4}>
            <Heading as="h2" size="md" mb={4}>Active Character</Heading>
            <CharacterCard character={character} />
            
            <Box mt={4}>
              <Heading as="h3" size="sm" mb={2}>Move Character</Heading>
              <Grid templateColumns="repeat(3, 1fr)" gap={2} maxW="200px" mx="auto">
                <GridItem colStart={2}><Button onClick={() => handleMove('north')} w="full" isDisabled={isMoving}>N</Button></GridItem>
                <GridItem colStart={1} rowStart={2}><Button onClick={() => handleMove('west')} w="full" isDisabled={isMoving}>W</Button></GridItem>
                <GridItem colStart={3} rowStart={2}><Button onClick={() => handleMove('east')} w="full" isDisabled={isMoving}>E</Button></GridItem>
                <GridItem colStart={2} rowStart={3}><Button onClick={() => handleMove('south')} w="full" isDisabled={isMoving}>S</Button></GridItem>
                <GridItem colStart={1} rowStart={4}><Button onClick={() => handleMove('down')} w="full" isDisabled={isMoving}>Down</Button></GridItem>
                <GridItem colStart={3} rowStart={4}><Button onClick={() => handleMove('up')} w="full" isDisabled={isMoving}>Up</Button></GridItem>
              </Grid>
            </Box>
            
            <Box mt={4}>
              <Heading as="h3" size="sm" mb={2}>Characters in Area</Heading>
              {nearbyCharacters.length > 0 ? (
                <VStack align="stretch" spacing={2}>
                  {nearbyCharacters
                    .filter((c: BattleNadLite) => c.id !== characterId)
                    .map((char: BattleNadLite, idx: number) => (
                      <HStack key={char.id} borderWidth="1px" p={2} borderRadius="md" justifyContent="space-between">
                        <Text fontSize="sm">
                          {char.name || `ID: ${char.id.slice(0, 6)}...`} - Lvl {char.stats?.level || 1}
                          {combatants?.some((c: BattleNadLite) => c.id === char.id) ? ' (In Combat)' : ''}
                        </Text>
                        <Button 
                          colorScheme="red" 
                          size="xs" 
                          onClick={() => {
                              const combatantIndex = combatants?.findIndex((c: BattleNadLite) => c.id === char.id);
                              if (combatantIndex !== undefined && combatantIndex !== -1) {
                                  handleAttack(combatantIndex);
                              } else {
                                  toast({title: "Cannot attack", description: "Target is not in combat.", status: "warning"});
                              }
                          }}
                          isDisabled={!combatants?.some((c: BattleNadLite) => c.id === char.id) || isAttacking || isMoving}
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