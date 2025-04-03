import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Spinner
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { useWallet } from '../../providers/WalletProvider';
import { useBattleNads } from '../../hooks/useBattleNads';
import { useGame } from '../../hooks/useGame';
import { usePrivy } from '@privy-io/react-auth';
import GameBoard from './GameBoard';
import { BattleNad, GameState, GameUIState } from '../../types/gameTypes';
import { convertCharacterData, createGameState, parseFrontendData } from '../../utils/gameDataConverters';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { 
  gameStateAtom, 
  playerCharacterSelector, 
  combatantsSelector, 
  noncombatantsSelector,
  areaInfoSelector,
  movementOptionsSelector,
  isInCombatSelector,
  loadingSelector,
  errorSelector
} from '../../state/gameState';

interface Combatant {
  id: string;
  stats: any;
  name: string;
  weapon?: any;
  armor?: any;
}

const Game: React.FC = () => {
  const router = useRouter();
  const { address, injectedWallet, embeddedWallet } = useWallet();
  const { 
    getPlayerCharacterID, 
    getCharacter,
    getAreaInfo, 
    getAreaCombatState,
    getMovementOptions,
    moveCharacter,
    getAttackOptions,
    attackTarget,
    getCharactersInArea,
    getFrontendData,
    getGameState,
    loading: hookLoading, 
    error: hookError,
    setSessionKeyToEmbeddedWallet,
    characterId: battleNadsCharacterId
  } = useBattleNads();
  
  // Use our new game initialization hook
  const {
    status,
    error: gameError,
    sessionKeyWarning,
    sessionKeyStatus,
    initializeGame,
    resetTransactionFlags,
    resetSessionKeyWarning,
    isProcessing,
    isTransactionSent,
    checkOwnerWallet,
    checkEmbeddedWallet,
    updateSessionKey
  } = useGame();
  
  // Recoil state
  const setGameState = useSetRecoilState(gameStateAtom);
  const character = useRecoilValue(playerCharacterSelector);
  const combatants = useRecoilValue(combatantsSelector);
  const noncombatants = useRecoilValue(noncombatantsSelector);
  const areaInfo = useRecoilValue(areaInfoSelector);
  const movementOptions = useRecoilValue(movementOptionsSelector);
  const isInCombat = useRecoilValue(isInCombatSelector);
  const loading = useRecoilValue(loadingSelector);
  const error = useRecoilValue(errorSelector);
  
  // Local component state (not blockchain related)
  const [characterId, setCharacterId] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState<boolean>(false);
  const [position, setPosition] = useState({ x: 0, y: 0, depth: 1 });
  const [selectedCombatant, setSelectedCombatant] = useState<BattleNad | null>(null);
  const [combatLog, setCombatLog] = useState<string[]>([]);
  const [isAttacking, setIsAttacking] = useState(false);
  const [loadingComplete, setLoadingComplete] = useState<boolean>(false);
  const [miniMap, setMiniMap] = useState<any[][]>([]);

  // Reference to track initial load state
  const isInitialLoadComplete = useRef(false);
  const hasLoadedData = useRef(false);
  const hasInitialized = useRef(false);
  
  const toast = useToast();

  // Use the Privy hooks for showing UI during transactions
  const privy = usePrivy();

  // Derive a unified UI state from all the state variables
  const gameUIState = useMemo<GameUIState>(() => {
    // Show loading during any loading operation or status check
    if (loading || hookLoading || status.startsWith('checking') || status === 'updating-session-key' || status === 'loading-game-data') {
      return 'loading';
    }
    
    // Show errors only for actual errors, not expected states
    if (error || gameError || hookError) {
      return 'error';
    }
    
    // Handle all the special states
    if (status === 'need-owner-wallet') {
      return 'need-wallet';
    }
    
    if (status === 'need-embedded-wallet') {
      return 'need-embedded-wallet';
    }
    
    if (status === 'need-character' || !character) {
      return 'need-character';
    }
    
    if (sessionKeyWarning) {
      return 'session-key-warning';
    }
    
    // If everything is ready, show the game
    if (status === 'ready' && character) {
      return 'ready';
    }
    
    // Fallback - if we somehow get here, show loading
    return 'loading';
  }, [loading, hookLoading, status, error, gameError, hookError, sessionKeyWarning, character]);
  
  // Helper function to get loading messages based on status
  const getLoadingMessage = (status: string): string => {
    const messages: Record<string, string> = {
      'checking-owner-wallet': 'Connecting to your wallet...',
      'checking-embedded-wallet': 'Verifying session wallet...',
      'checking-character': 'Loading character data...',
      'checking-session-key': 'Validating session key...',
      'loading-game-data': 'Loading game world...',
      'updating-session-key': 'Updating session key...',
    };
    
    return messages[status] || 'Initializing Battle Nads...';
  };

  // Helper function to add messages to combat log
  const addToCombatLog = (message: string) => {
    setCombatLog(prev => [message, ...prev].slice(0, 20));
  };

  // Load character data from chain using centralized state
  const loadCharacterData = async () => {
    // Track moving state locally for UI purposes
    if (!isMoving) {
      setGameState(current => ({ ...current, loading: true }));
    }
    
    try {
      console.log("==========================================");
      console.log("LOADING CHARACTER DATA STARTED");
      
      // First check if the game status is ready
      console.log("Current game status:", status);
      console.log("Wallet state:", { 
        address, 
        injectedWallet: injectedWallet?.address,
        embeddedWallet: embeddedWallet?.address
      });
      
      // Clear error state if status is ready
      if (status === 'ready' && error) {
        setGameState(current => ({ ...current, error: null }));
      }
      
      // Ensure wallet connection
      if (!injectedWallet?.address && !address) {
        console.log("No wallet detected - attempting to reconnect wallet...");
        const walletConnected = await checkOwnerWallet();
        console.log("Wallet reconnection result:", walletConnected);
        
        if (!walletConnected) {
          throw new Error("Need owner wallet: No wallet connected. Please connect wallet manually.");
        }
      }
      
      // Make sure embedded wallet is available for session key operations
      if (!embeddedWallet?.address) {
        console.log("No embedded wallet detected - attempting to reconnect...");
        const embeddedConnected = await checkEmbeddedWallet();
        console.log("Embedded wallet reconnection result:", embeddedConnected);
        
        if (!embeddedConnected) {
          throw new Error("Need embedded wallet: Session wallet not available. Please refresh the page.");
        }
      }
      
      // Check game status - allow for initialization in progress
      if (status !== 'ready' && !status.includes('loading-game-data')) {
        console.log("Game not ready (status:", status, ") - cannot load character data");
        throw new Error(`Game not initialized properly (status: ${status})`);
      }
      
      console.log("Game status is ready, proceeding to load character data");
      
      // Get the character ID
      console.log("Looking for character ID");
      const existingCharId = characterId || battleNadsCharacterId;
      
      if (!existingCharId) {
        // If no character ID in state, get it from the player's address
        const ownerAddress = injectedWallet?.address || address;
        console.log("No character ID in state, checking using address:", ownerAddress);
        
        if (ownerAddress) {
          const charId = await getPlayerCharacterID(ownerAddress);
          console.log("Character ID from contract:", charId);
          
          if (!charId) {
            throw new Error("No character found for this wallet");
          }
          
          setCharacterId(charId);
        } else {
          throw new Error("No wallet connected");
        }
      } else {
        console.log("Using existing character ID:", existingCharId);
        setCharacterId(existingCharId);
      }
      
      // Get character data using centralized state management
      const charToUse = characterId || existingCharId;
      console.log("Loading data for character ID:", charToUse);
      
      if (!charToUse) {
        throw new Error("No character ID available");
      }
      
      // Use the centralized getGameState function that updates Recoil atom
      await getGameState(charToUse);
      
      // Update position from the character data if available
      if (character) {
        setPosition(character.position);
      }
      
      // Add log entries based on the state
      if (areaInfo) {
        addToCombatLog(`Area has ${areaInfo.playerCount || 0} players and ${areaInfo.monsterCount || 0} monsters.`);
      }
      
      if (isInCombat) {
        addToCombatLog(`You are in combat with ${combatants.length} enemies.`);
      }
      
      console.log("Character data loaded successfully");
      isInitialLoadComplete.current = true;
      hasLoadedData.current = true;
      setLoadingComplete(true);
    } catch (err) {
      console.error("Error loading character data:", err);
      const errorMessage = (err as Error)?.message || "Unknown error loading character data";
      setGameState(current => ({ ...current, error: errorMessage }));
      toast({
        title: "Error",
        description: errorMessage,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      // Only update loading state if not during movement
      if (!isMoving) {
        setGameState(current => ({ ...current, loading: false }));
      }
    }
  };

  // Initialize the game on component mount
  useEffect(() => {
    // Only run once
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    
    console.log("Game component mounted - initializing game...");
    
    const initializeGameData = async () => {
      console.log("==========================================");
      console.log("INITIALIZATION FLOW STARTED");
      console.log("Current status:", status);
      console.log("Wallet state:", { 
        address, 
        injectedWallet: injectedWallet?.address,
        embeddedWallet: embeddedWallet?.address
      });
      
      try {
        // First ensure wallet connection is active
        if (!injectedWallet?.address && !address) {
          console.log("No wallet detected, attempting to reconnect...");
          const walletConnected = await checkOwnerWallet();
          console.log("Wallet reconnection result:", walletConnected);
          
          if (!walletConnected) {
            throw new Error("Failed to connect wallet. Please connect wallet manually.");
          }
        }
        
        // Then ensure embedded wallet is available
        if (!embeddedWallet?.address) {
          console.log("No embedded wallet detected, attempting to reconnect...");
          const embeddedConnected = await checkEmbeddedWallet();
          console.log("Embedded wallet reconnection result:", embeddedConnected);
          
          if (!embeddedConnected) {
            throw new Error("Failed to connect embedded wallet. Please refresh the page.");
          }
        }
        
        // Now initialize the game if needed
        if (status !== 'ready') {
          console.log("Game not ready, initializing...");
          const initResult = await initializeGame();
          console.log("Game initialization result:", initResult);
          
          if (!initResult.success) {
            throw new Error(`Game initialization failed: ${initResult.status}`);
          }
          
          // Wait for UI state to update - this is key to preventing race conditions
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          console.log("Game already initialized with status: ready");
        }
        
        // Wait for a moment to ensure state updates
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Let the status effect trigger the character data loading
        // This prevents race conditions where loadCharacterData is called
        // before the status has fully updated to 'ready'
        console.log("Initialization complete - status effect will load character data");
      } catch (err) {
        console.error("Error during initialization:", err);
        // Only set local error if we don't have a better status from useGame
        if (status === 'checking' || status === 'ready') {
          setGameState(current => ({ ...current, error: err instanceof Error ? err.message : String(err) }));
        } else {
          // If we have a more specific status like 'need-owner-wallet', don't set error
          console.log(`Not setting local error because status is: ${status}`);
        }
        setGameState(current => ({ ...current, loading: false }));
      }
    };
    
    initializeGameData();
  }, []);

  // Update effect to track status changes
  useEffect(() => {
    console.log("Game status changed to:", status);
    
    // When status becomes ready, check if we need to load character data
    if (status === 'ready') {
      // Clear any local error state when status transitions to ready
      if (error) {
        console.log("Status transitioned to ready, clearing local error state");
        setGameState(current => ({ ...current, error: null }));
      }
      
      // Use a slight delay to ensure all state changes have been applied
      if (!loadingComplete && !loading && !hasLoadedData.current) {
        console.log("Status is ready and no data loaded yet - loading character data");
        hasLoadedData.current = true;
        
        // Use a slight delay to ensure all state is updated
        setTimeout(() => {
          loadCharacterData();
        }, 500); // Increase delay to ensure initialization is fully complete
      }
    }
  }, [status, loadingComplete, loading]);

  // Handle movement with centralized function
  const handleMove = async (direction: 'north' | 'south' | 'east' | 'west' | 'up' | 'down') => {
    if (isAttacking || isMoving) return;
    
    try {
      setIsMoving(true);
      // Don't set loading to true here, let Privy handle the UI overlay
      
      if (!characterId) {
        throw new Error('No character ID available');
      }
      
      // Clear any selected combatant when moving
      setSelectedCombatant(null);
      
      // Check which direction we're moving and use the appropriate move function
      // Privy will automatically show its loading UI during this blockchain transaction
      await moveCharacter(characterId, direction);
      
      // Reload character data after movement
      await loadCharacterData();
      
      addToCombatLog(`Moved ${direction}`);
    } catch (err: any) {
      console.error('Error during movement:', err);
      setGameState(current => ({ ...current, error: err.message || `Error moving ${direction}` }));
      addToCombatLog(`Failed to move ${direction}: ${err.message}`);
    } finally {
      setIsMoving(false);
    }
  };
  
  // Handle attacks with centralized function
  const handleAttack = async (targetIndex: number) => {
    if (isAttacking || isMoving) return;
    
    try {
      setIsAttacking(true);
      // Don't set loading to true here, let Privy handle the UI overlay
      
      if (!characterId) {
        throw new Error('No character ID available');
      }
      
      // Execute the attack
      // Privy will automatically show its loading UI during this blockchain transaction
      await attackTarget(characterId, targetIndex);
      
      // Reload character data after attack
      await loadCharacterData();
      
      if (selectedCombatant) {
        addToCombatLog(`Attacked ${selectedCombatant.name}`);
      } else {
        addToCombatLog(`Attacked target`);
      }
    } catch (err: any) {
      console.error('Error during attack:', err);
      setGameState(current => ({ ...current, error: err.message || 'Error attacking target' }));
      addToCombatLog(`Attack failed: ${err.message}`);
    } finally {
      setIsAttacking(false);
    }
  };

  // Render minimap (5x5 grid centered on player)
  const renderMinimap = () => {
    const grid: React.ReactNode[] = [];
    const size = 5;
    const center = Math.floor(size / 2);
    
    for (let y = 0; y < size; y++) {
      const row: React.ReactNode[] = [];
      for (let x = 0; x < size; x++) {
        const mapX = position.x - center + x;
        const mapY = position.y - center + y;
        
        // Check if this is the player's position
        const isPlayer = x === center && y === center;
        
        // Check if position is valid (within game bounds)
        const isValid = mapX >= 0 && mapX <= 50 && mapY >= 0 && mapY <= 50;
        
        // Determine if monsters are at this position based on area info
        const hasMonsters = isValid && areaInfo && isAdjacentPosition(mapX, mapY) && 
                           Number(areaInfo.monsterCount) > 0;
        
        // Square style
        let bgColor = "gray.300";
        let textColor = "black";
        
        if (isPlayer) {
          bgColor = "blue.500";
          textColor = "white";
        } else if (hasMonsters) {
          bgColor = "red.400";
          textColor = "white";
        } else if (!isValid) {
          bgColor = "gray.700";
          textColor = "white";
        }
        
        row.push(
          <Box 
            key={`${x}-${y}`}
            w="100%" 
            h="100%" 
            bg={bgColor}
            color={textColor}
            border="1px solid"
            borderColor="gray.500"
          />
        );
      }
      grid.push(
        <HStack key={y} spacing={0}>
          {row}
        </HStack>
      );
    }
    
    return (
      <VStack spacing={0}>
        {grid}
      </VStack>
    );
  };

  // Check if a position is adjacent to the player (including diagonals)
  const isAdjacentPosition = (x: number, y: number) => {
    return Math.abs(x - position.x) <= 1 && Math.abs(y - position.y) <= 1;
  };

  // Handle updating the session key
  const handleUpdateSessionKey = async (characterIdParam?: string) => {
    try {
      // Use either the provided characterId or the one from state
      const charToUse = characterIdParam || characterId || battleNadsCharacterId;

      if (!charToUse) {
        console.error("No character ID available for session key update");
        toast({
          title: "Error",
          description: "Could not find your character ID. Please reload the page.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      console.log("Updating session key for character:", charToUse);
      
      // Use the updateSessionKey function from the useGame hook
      const result = await updateSessionKey(charToUse);
      
      if (result.success) {
        console.log("Session key updated successfully");
        toast({
          title: "Success",
          description: "Session key updated successfully",
          status: "success",
          duration: 5000,
          isClosable: true,
        });
        // After successful update, reload the game state
        setTimeout(() => {
          loadCharacterData();
        }, 500);
      } else {
        console.error("Session key update failed:", result.error);
        toast({
          title: "Error",
          description: `Failed to update session key: ${result.error}`,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error("Error updating session key:", error);
      toast({
        title: "Error",
        description: `Error updating session key: ${error instanceof Error ? error.message : String(error)}`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Debug function called in a useEffect
  const debugGameData = () => {
    if (character) {
      console.log("Game state:", character);
    }
  };
  
  // Call debug function when relevant data changes
  useEffect(() => {
    debugGameData();
  }, [character]);

  // Replace conditional rendering with a switch statement based on gameUIState
  switch (gameUIState) {
    case 'loading':
      return (
        <Center height="100vh" className="bg-gray-900" color="white">
          <VStack spacing={6}>
            <Heading as="h1" size="xl" color="white">Battle Nads</Heading>
            <Spinner size="xl" thickness="4px" speed="0.8s" color="blue.500" />
            <Text fontSize="xl" color="white">{getLoadingMessage(status)}</Text>
          </VStack>
        </Center>
      );
      
    case 'error':
      return (
        <Center height="100vh" className="bg-gray-900" color="white">
          <VStack spacing={6} maxWidth="600px" p={6}>
            <Heading as="h1" size="xl" color="white" mb={2}>Battle Nads</Heading>
            <Heading size="md" color="red.400">Error</Heading>
            <Alert status="error" variant="solid">
              <AlertIcon />
              <AlertDescription>{error || gameError || hookError || "An unknown error occurred"}</AlertDescription>
            </Alert>
            <Button 
              colorScheme="blue" 
              onClick={initializeGame}
            >
              Retry
            </Button>
          </VStack>
        </Center>
      );
      
    case 'need-wallet':
      return (
        <Center height="100vh" className="bg-gray-900" color="white">
          <VStack spacing={6} maxWidth="600px" p={6}>
            <Heading as="h1" size="xl" color="white" mb={2}>Battle Nads</Heading>
            <Heading size="md" color="blue.400">Wallet Required</Heading>
            <Text color="white" textAlign="center">
              Please connect your wallet to play Battle Nads.
            </Text>
            <Button 
              colorScheme="blue" 
              onClick={() => router.push('/')}
            >
              Return to Login
            </Button>
          </VStack>
        </Center>
      );
      
    case 'need-embedded-wallet':
      return (
        <Center height="100vh" className="bg-gray-900" color="white">
          <VStack spacing={6} maxWidth="600px" p={6}>
            <Heading as="h1" size="xl" color="white" mb={2}>Battle Nads</Heading>
            <Heading size="md" color="blue.400">Session Wallet Required</Heading>
            <Text color="white" textAlign="center">
              Your session wallet is not available. This is required for gas-free gameplay.
            </Text>
            <Button 
              colorScheme="blue" 
              onClick={() => router.push('/')}
            >
              Return to Login
            </Button>
          </VStack>
        </Center>
      );
      
    case 'need-character':
      return (
        <Center height="100vh" className="bg-gray-900" color="white">
          <VStack spacing={6} maxWidth="600px" p={6}>
            <Heading as="h1" size="xl" color="white" mb={2}>Battle Nads</Heading>
            <Heading size="md" color="blue.400">Character Required</Heading>
            <Text color="white" textAlign="center">
              You don't have a character yet. Create one to start playing!
              Characters are stored on the Monad blockchain and associated with your owner wallet address ({injectedWallet?.address?.slice(0, 6)}...{injectedWallet?.address?.slice(-4)}).
            </Text>
            <Button 
              colorScheme="blue" 
              size="lg"
              onClick={() => router.push('/create')}
              px={8}
              py={6}
              fontSize="lg"
            >
              Create Your Character
            </Button>
          </VStack>
        </Center>
      );
      
    case 'session-key-warning':
      return (
        <Center height="100vh" className="bg-gray-900" color="white">
          <VStack spacing={6} maxWidth="600px" p={6}>
            <Heading as="h1" size="xl" color="white" mb={2}>Battle Nads</Heading>
            <Heading size="md" color="yellow.400">Session Key Warning</Heading>
            <Alert status="warning">
              <AlertIcon />
              <AlertDescription>{sessionKeyWarning}</AlertDescription>
            </Alert>
            <Button 
              colorScheme="yellow" 
              onClick={() => handleUpdateSessionKey()}
            >
              Update Session Key
            </Button>
            <Button 
              variant="outline" 
              onClick={resetSessionKeyWarning}
            >
              Continue Anyway
            </Button>
          </VStack>
        </Center>
      );
      
    case 'ready':
      // Main game UI - only render when we have a character and initialization is complete
      return (
        <Container maxW="container.xl" p={4} className="game-container">
          {error && (
            <Alert status="error" mb={4}>
              <AlertIcon />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {sessionKeyWarning && (
            <Alert status="warning" mb={4}>
              <AlertIcon />
              <AlertTitle>Session Key Warning</AlertTitle>
              <AlertDescription>
                {sessionKeyWarning}
                <Button 
                  size="sm" 
                  ml={4} 
                  colorScheme="yellow" 
                  onClick={() => handleUpdateSessionKey()}
                >
                  Update Session Key
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          <Box>
            {/* Character Info and Combat Log Section */}
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} mb={6}>
              {/* Character Info */}
              <Box bg="gray.800" p={4} borderRadius="md">
                <Heading size="md" mb={4} color="white">Character Info</Heading>
                
                {character ? (
                  <>
                    <HStack mb={2}>
                      <Text color="white" fontWeight="bold">{character.name}</Text>
                      <Badge colorScheme="green">Level {character.stats.level || 1}</Badge>
                    </HStack>
                    
                    <Box mb={4}>
                      <Text color="gray.400" fontSize="sm">HP: {character.stats.health || 0}/{character.stats.maxHealth || 0}</Text>
                      <Progress 
                        value={(character.stats.health / character.stats.maxHealth) * 100} 
                        colorScheme="red" 
                        size="sm" 
                        mb={2} 
                      />
                      
                      <Text color="gray.400" fontSize="sm">Energy: {character.stats.experience || 0}</Text>
                      <Progress 
                        value={(character.stats.experience / (character.stats.level * 100)) * 100} 
                        colorScheme="blue" 
                        size="sm" 
                      />
                    </Box>
                    
                    <SimpleGrid columns={2} spacing={2} mb={4}>
                      <Box>
                        <Text color="gray.400" fontSize="xs">Strength</Text>
                        <Text color="white">{character.stats.strength || 0}</Text>
                      </Box>
                      <Box>
                        <Text color="gray.400" fontSize="xs">Vitality</Text>
                        <Text color="white">{character.stats.vitality || 0}</Text>
                      </Box>
                      <Box>
                        <Text color="gray.400" fontSize="xs">Dexterity</Text>
                        <Text color="white">{character.stats.dexterity || 0}</Text>
                      </Box>
                      <Box>
                        <Text color="gray.400" fontSize="xs">Quickness</Text>
                        <Text color="white">{character.stats.quickness || 0}</Text>
                      </Box>
                      <Box>
                        <Text color="gray.400" fontSize="xs">Sturdiness</Text>
                        <Text color="white">{character.stats.sturdiness || 0}</Text>
                      </Box>
                      <Box>
                        <Text color="gray.400" fontSize="xs">Luck</Text>
                        <Text color="white">{character.stats.luck || 0}</Text>
                      </Box>
                    </SimpleGrid>
                    
                    {/* Equipment Section */}
                    <Box mb={4}>
                      <Text color="gray.300" fontSize="sm" fontWeight="bold" mb={1}>Equipment</Text>
                      <HStack>
                        <Text color="gray.400" fontSize="xs">Weapon:</Text>
                        <Text color="white" fontSize="xs">{character.weapon?.name || 'None'}</Text>
                      </HStack>
                      <HStack>
                        <Text color="gray.400" fontSize="xs">Armor:</Text>
                        <Text color="white" fontSize="xs">{character.armor?.name || 'None'}</Text>
                      </HStack>
                    </Box>
                  </>
                ) : (
                  <Text color="gray.400">No character data available</Text>
                )}
              </Box>
              
              {/* Combat Log */}
              <Box bg="gray.800" p={4} borderRadius="md" maxH="300px" overflow="auto">
                <Heading size="md" mb={4} color="white">Combat Log</Heading>
                
                {combatLog.length > 0 ? (
                  <VStack align="stretch" spacing={1}>
                    {combatLog.map((log, index) => (
                      <Text key={index} color="gray.300" fontSize="sm">{log}</Text>
                    ))}
                  </VStack>
                ) : (
                  <Text color="gray.400">No combat actions yet</Text>
                )}
              </Box>
            </SimpleGrid>
            
            {/* Game Board Section */}
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
              {/* Game Board - Use our new GameBoard component with structured data */}
              <Box>
                {character && (
                  <GameBoard
                    character={character}
                    areaCharacters={[...combatants, ...noncombatants]}
                    miniMap={miniMap}
                    onMove={handleMove}
                    onAttack={(targetIndex: number) => handleAttack(targetIndex)}
                    isMoving={isMoving}
                    isAttacking={isAttacking}
                  />
                )}
              </Box>
              
              {/* Combatants in Area */}
              <Box bg="gray.800" p={4} borderRadius="md">
                <Heading size="md" mb={4} color="white">
                  {isInCombat ? 'Combat' : 'Area'} ({combatants.length + noncombatants.length} entities)
                </Heading>
                
                {combatants.length > 0 && (
                  <Box mb={4}>
                    <Text color="red.300" fontSize="sm" fontWeight="bold" mb={2}>
                      Combatants ({combatants.length})
                    </Text>
                    
                    <VStack align="stretch" spacing={2}>
                      {combatants.map((enemy, index) => (
                        <Box 
                          key={index} 
                          p={2} 
                          bg="gray.700" 
                          borderRadius="md"
                          cursor="pointer"
                          onClick={() => setSelectedCombatant(enemy)}
                          borderWidth={selectedCombatant?.id === enemy.id ? 2 : 0}
                          borderColor="yellow.400"
                        >
                          <HStack justify="space-between">
                            <Text color="white" fontSize="sm">{enemy.name || 'Unknown'}</Text>
                            <HStack>
                              <Text color="gray.400" fontSize="xs">
                                Lvl {enemy.stats.level || '?'}
                              </Text>
                              <Text color="red.300" fontSize="xs">
                                HP: {enemy.stats.health || '?'}/{enemy.stats.maxHealth || '?'}
                              </Text>
                            </HStack>
                          </HStack>
                        </Box>
                      ))}
                    </VStack>
                  </Box>
                )}
                
                {noncombatants.length > 0 && (
                  <Box>
                    <Text color="green.300" fontSize="sm" fontWeight="bold" mb={2}>
                      Non-Combatants ({noncombatants.length})
                    </Text>
                    
                    <VStack align="stretch" spacing={2}>
                      {noncombatants.map((entity, index) => (
                        <Box 
                          key={index} 
                          p={2} 
                          bg="gray.700" 
                          borderRadius="md"
                        >
                          <HStack justify="space-between">
                            <Text color="white" fontSize="sm">{entity.name || 'Unknown'}</Text>
                            <Text color="gray.400" fontSize="xs">
                              Lvl {entity.stats.level || '?'}
                            </Text>
                          </HStack>
                        </Box>
                      ))}
                    </VStack>
                  </Box>
                )}
                
                {combatants.length === 0 && noncombatants.length === 0 && (
                  <Text color="gray.400">No entities in this area</Text>
                )}
              </Box>
            </SimpleGrid>
          </Box>
        </Container>
      );
      
    default:
      return null;
  }
};

export default Game;
