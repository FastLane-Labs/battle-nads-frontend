'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Box, 
  Heading, 
  Center, 
  VStack, 
  HStack,
  Text, 
  Badge,
  Divider,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Button,
  SimpleGrid,
  Progress,
  IconButton,
  useToast,
  Image,
  Flex,
  Container,
  Code,
  Link,
  Spinner,
  Switch,
  useColorMode,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Grid,
  GridItem
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { useGame } from '../../hooks/game/useGame';
import EventFeed from './EventFeed';
import ChatInterface from './ChatInterface';
import DataFeed from './DataFeed';
import { domain, ui, contract } from '../../types';
import { calculateMaxHealth, extractPositionFromCharacter } from '../../utils/gameDataConverters';
import WalletBalances from '../WalletBalances';
import DebugPanel from '../DebugPanel';
import { CharacterCard } from '../../components/CharacterCard';
import MovementControls from './MovementControls';
// Define type aliases in the module scope
type BattleNad = domain.Character;
type BattleNadLite = domain.CharacterLite;
type GameState = ui.GameState;

const Game: React.FC = () => {
  const router = useRouter();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const {
    isLoading,
    error,
    gameState,
    character,
    characterId,
    hasWallet,
    owner,
    sessionKeyState,
    needsSessionKeyUpdate,
    updateSessionKey,
    isUpdatingSessionKey,
    position,
    movementOptions,
    others,
    chatLogs,
    eventLogs,
    moveCharacter,
    isMoving,
    attack,
    isAttacking,
    sendChatMessage,
    isSendingChat,
    refetch,
  } = useGame();

  const combatants: BattleNadLite[] = useMemo(() => gameState?.combatants || [], [gameState]);

  const [combatLog, setCombatLog] = useState<string[]>([]);
  const [showDebugPanel, setShowDebugPanel] = useState<boolean>(false);
  const StableWalletBalances = useMemo(() => <WalletBalances />, []);

  const addToCombatLog = useCallback((message: string) => {
    console.log("[Combat Log]:", message);
  }, []);

  const directionMap: { [key: string]: domain.Direction } = {
    north: domain.Direction.North,
    south: domain.Direction.South,
    east: domain.Direction.East,
    west: domain.Direction.West,
    up: domain.Direction.Up,
    down: domain.Direction.Down,
  };

  const handleMovement = useCallback(async (directionString: 'north' | 'south' | 'east' | 'west' | 'up' | 'down') => {
    if (!isMoving) {
      const directionEnum = directionMap[directionString];
      if (directionEnum === undefined) {
        console.error(`Invalid direction string: ${directionString}`);
        return;
      }
      addToCombatLog(`Attempting move: ${directionString}`);
      try {
        await moveCharacter(directionEnum);
        toast({ title: `Moved ${directionString}`, status: "success", duration: 1500 });
      } catch (err: any) {
        toast({ title: "Movement Failed", description: err.message, status: "error", duration: 3000 });
        addToCombatLog(`Failed move ${directionString}: ${err.message}`);
      }
    }
  }, [moveCharacter, isMoving, addToCombatLog, toast, directionMap]);
  
  const handleAttack = useCallback(async (targetIndex: number) => {
    if (!isAttacking) {
      addToCombatLog(`Attempting attack on index: ${targetIndex}`);
      try {
        await attack(targetIndex);
        toast({ title: `Attacked target ${targetIndex}`, status: "success", duration: 1500 });
      } catch (err: any) {
        toast({ title: "Attack Failed", description: err.message, status: "error", duration: 3000 });
        addToCombatLog(`Failed attack on ${targetIndex}: ${err.message}`);
      }
    }
  }, [attack, isAttacking, addToCombatLog, toast]);

  const handleSendChatMessage = useCallback(async (message: string) => {
    if (!isSendingChat && message.trim()) {
      try {
        await sendChatMessage(message);
      } catch (err: any) {
         toast({ title: "Send Failed", description: err.message, status: "error", duration: 3000 });
      }
    }
  }, [sendChatMessage, isSendingChat, toast]);

  const handleUpdateSessionKey = useCallback(async () => {
    if (!isUpdatingSessionKey) {
      try {
        await updateSessionKey();
        toast({ title: "Session Key Update Started", status: "info", duration: 2000 });
      } catch (err: any) {
        toast({ title: "Update Failed", description: err.message, status: "error", duration: 3000 });
      }
    }
  }, [updateSessionKey, isUpdatingSessionKey, toast]);

  if (isLoading && !character) {
    return (
      <Center height="100vh" className="bg-gray-900" color="white">
        <VStack spacing={6}>
          <Heading as="h1" size="xl" color="white">Battle Nads</Heading>
          <Spinner size="xl" thickness="4px" speed="0.8s" color="blue.500" />
          <Text fontSize="xl" color="white">Loading Game Data...</Text>
        </VStack>
      </Center>
    );
  }

  if (error) {
    return (
      <Center height="100vh" className="bg-gray-900" color="white">
        <VStack spacing={6} maxWidth="600px" p={6}>
          <Heading as="h1" size="xl" color="white" mb={2}>Battle Nads</Heading>
          <Heading size="md" color="red.400">Error Loading Game</Heading>
          <Alert status="error" variant="solid">
            <AlertIcon />
            <AlertDescription>{error || "An unknown error occurred"}</AlertDescription>
          </Alert>
          <Button colorScheme="blue" onClick={() => refetch?.()}>Retry</Button>
          <Button variant="outline" onClick={() => router.push('/')}>Go to Login</Button>
        </VStack>
      </Center>
    );
  }

  if (!hasWallet) {
     return (
      <Center height="100vh" className="bg-gray-900" color="white">
        <VStack spacing={6} maxWidth="600px" p={6}>
           <Heading as="h1" size="xl" color="white" mb={2}>Battle Nads</Heading>
           <Heading size="md" color="blue.400">Wallet Disconnected</Heading>
          <Text color="white" textAlign="center">Your wallet seems to be disconnected.</Text>
          <Button colorScheme="blue" onClick={() => router.push('/')}>Return to Login</Button>
        </VStack>
      </Center>
    );
  }

  if (!isLoading && !characterId) {
     return (
      <Center height="100vh" className="bg-gray-900" color="white">
        <VStack spacing={6} maxWidth="600px" p={6}>
           <Image src="/BattleNadsLogo.png" alt="Battle Nads Logo" width="300px" maxWidth="80%" objectFit="contain" mb={4}/>
           <Heading size="md" color="blue.400">Character Not Found</Heading>
           <Text color="white" textAlign="center">We couldn't find a character associated with your wallet ({owner?.slice(0, 6)}...).</Text>
           <Button colorScheme="blue" size="lg" onClick={() => router.push('/create')}>Create Character</Button>
           <Button variant="outline" onClick={() => router.push('/')}>Change Wallet</Button>
        </VStack>
      </Center>
    );
  }
  
  if (needsSessionKeyUpdate) {
      return (
        <Center height="100vh" className="bg-gray-900" color="white">
          <VStack spacing={6} maxWidth="600px" p={6}>
             <Image src="/BattleNadsLogo.png" alt="Battle Nads Logo" width="300px" maxWidth="80%" objectFit="contain" mb={4}/>
            <Heading size="md" color="yellow.400">Session Key Update Required</Heading>
            <Alert status="warning">
              <AlertIcon />
              <AlertDescription>
                 Your session key needs to be updated ({sessionKeyState}) to perform actions.
              </AlertDescription>
            </Alert>
            <Button 
              colorScheme="yellow" 
              onClick={handleUpdateSessionKey}
              isLoading={isUpdatingSessionKey}
              loadingText="Updating..."
            >
              Update Session Key
            </Button>
          </VStack>
        </Center>
      );
  }

  if (character) {
      return (
        <Box height="calc(100vh - 60px)" position="relative">
          <Box position="fixed" right="20px" bottom="20px" zIndex={1000}>
            <IconButton
              aria-label="Debug Tools"
              icon={<Text fontSize="xs">DEBUG</Text>}
              onClick={onOpen}
              colorScheme="purple"
              size="sm"
            />
          </Box>
          
          <Modal isOpen={isOpen} onClose={onClose} size="xl">
            <ModalOverlay />
            <ModalContent bg="gray.900" color="white" maxWidth="90vw">
              <ModalHeader>Debug Panel</ModalHeader>
              <ModalCloseButton />
              <ModalBody><DebugPanel /></ModalBody>
              <ModalFooter><Button colorScheme="gray" mr={3} onClick={onClose}>Close</Button></ModalFooter>
            </ModalContent>
          </Modal>

          <Flex height="100%" flexDirection="column">
            <Flex flexGrow={1} overflow="hidden">
              <Box flexBasis={{ base: '100%', lg: '70%' }} height="100%" width="100%" position="relative" p={4} overflowY="auto">
                 <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                  <Box bg="gray.800" p={3} borderRadius="md">
                    <Heading size="sm" mb={3} color="whiteAlpha.900">Character</Heading>
                    <CharacterCard character={character} />
                  </Box>
                  
                  <Box bg="gray.800" p={3} borderRadius="md">
                    <Heading size="sm" mb={3} color="whiteAlpha.900">Movement</Heading>
                    <Box mb={3} bg="gray.700" p={2} borderRadius="sm">
                      <Text fontWeight="bold" fontSize="xs" mb={1}>Location</Text>
                      <Text fontSize="sm">({position?.x ?? '-'}, {position?.y ?? '-'}) Depth: {position?.depth ?? '-'}</Text>
                    </Box>
                    <MovementControls
                      onMove={handleMovement}
                      isDisabled={isMoving || isAttacking}
                      initialPosition={position}
                    />
                  </Box>
                  
                  <Box bg="gray.800" p={3} borderRadius="md">
                     <Heading size="sm" mb={3} color="whiteAlpha.900">Combat Targets</Heading>
                    {combatants.length > 0 ? (
                      <VStack align="stretch" spacing={2} maxHeight="300px" overflowY="auto">
                        {combatants.map((enemy: BattleNadLite, index: number) => {
                          const name = enemy.name || 'Unknown';
                          const level = enemy.level || 1;
                          const health = enemy.health || 0;
                          const maxHealth = enemy.maxHealth || 1;
                          return (
                            <Box key={enemy.id || index} p={2} bg="gray.700" borderRadius="md">
                              <Text fontSize="sm" fontWeight="bold">{name}</Text>
                              <Text fontSize="xs">Level: {level}</Text>
                              <Text fontSize="xs">HP: {health} / {maxHealth}</Text>
                              <Progress value={(health / maxHealth) * 100} size="xs" colorScheme="red" mt={1} />
                              <Button 
                                size="xs" 
                                colorScheme="red" 
                                mt={2} 
                                onClick={() => handleAttack(index)}
                                isDisabled={isAttacking || isMoving}
                              >
                                Attack
                              </Button>
                            </Box>
                          );
                        })}
                      </VStack>
                    ) : (
                      <Alert status="info" variant="subtle" size="sm">
                        <AlertIcon boxSize="14px" />
                        No combatants nearby.
                      </Alert>
                    )}
                  </Box>
                </SimpleGrid>
              </Box>

              <Box flexBasis={{ base: '100%', lg: '30%' }} bg="gray.900" height="100%" overflowY="hidden" borderLeft="1px" borderColor="gray.700">
                 <DataFeed
                  key={characterId || 'no-char'}
                  characterId={characterId || ''}
                  sendChatMessage={handleSendChatMessage}
                />
              </Box>
            </Flex>

            <Box borderTop="1px" borderColor="gray.700">
              {StableWalletBalances}
            </Box>
          </Flex>
        </Box>
      );
  }

  return (
      <Center height="100vh" className="bg-gray-900" color="white">
        <VStack spacing={6}>
          <Heading as="h1" size="xl" color="white">Battle Nads</Heading>
          <Spinner size="xl" thickness="4px" speed="0.8s" color="blue.500" />
          <Text fontSize="xl" color="white">Preparing game...</Text>
          <Button onClick={() => window.location.reload()} variant="outline">Refresh</Button>
        </VStack>
      </Center>
    );
};

export default Game;
