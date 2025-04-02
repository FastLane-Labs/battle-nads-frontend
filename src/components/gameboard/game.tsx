import React, { useState, useEffect, useRef } from 'react';
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
import { ChevronUpIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { useWallet } from '../../providers/WalletProvider';
import { useBattleNads } from '../../hooks/useBattleNads';
import { useGame } from '../../hooks/useGame';
import { usePrivy } from '@privy-io/react-auth';
import GameBoard from './GameBoard'; // Import the new GameBoard component
import { BattleNad, GameState } from '../../types/gameTypes';
import { convertCharacterData, createGameState, parseFrontendData } from '../../utils/gameDataConverters';

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
    loading: hookLoading, 
    error: hookError,
    setSessionKeyToEmbeddedWallet,
    characterId: battleNadsCharacterId  // Get characterId from hook
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
    checkEmbeddedWallet
  } = useGame();
  
  const [characterId, setCharacterId] = useState<string | null>(null);
  const [character, setCharacter] = useState<BattleNad | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isMoving, setIsMoving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0, depth: 1 });
  const [combatants, setCombatants] = useState<BattleNad[]>([]);
  const [noncombatants, setNoncombatants] = useState<BattleNad[]>([]);
  const [selectedCombatant, setSelectedCombatant] = useState<BattleNad | null>(null);
  const [combatLog, setCombatLog] = useState<string[]>([]);
  const [isInCombat, setIsInCombat] = useState(false);
  const [isAttacking, setIsAttacking] = useState(false);
  const [movementOptions, setMovementOptions] = useState<any | null>(null);
  const [loadingComplete, setLoadingComplete] = useState<boolean>(false);
  const [areaInfo, setAreaInfo] = useState<any>(null);
  const [equipmentInfo, setEquipmentInfo] = useState<any>(null);
  const [miniMap, setMiniMap] = useState<any[][]>([]);

  // Reference to track initial load state
  const isInitialLoadComplete = useRef(false);
  const hasLoadedData = useRef(false);
  const hasInitialized = useRef(false);
  
  const toast = useToast();

  // Use the Privy hooks for showing UI during transactions
  const privy = usePrivy();

  // Helper function to add messages to combat log
  const addToCombatLog = (message: string) => {
    setCombatLog(prev => [message, ...prev].slice(0, 20));
  };

  // Load character data from chain
  const loadCharacterData = async () => {
    // Only show the full loading screen if not during a movement action
    if (!isMoving) {
      setLoading(true);
    }
    
    try {
      console.log("==========================================");
      console.log("LOADING CHARACTER DATA STARTED");
      
      // First check if the game status is ready (meaning initialization completed)
      console.log("Current game status:", status);
      console.log("Wallet state:", { 
        address, 
        injectedWallet: injectedWallet?.address,
        embeddedWallet: embeddedWallet?.address
      });
      
      // IMPORTANT: Clear local error state if status is ready
      // This prevents showing error screen if status transitions to ready
      if (status === 'ready' && error) {
        console.log("Status is ready, clearing local error state");
        setError(null);
      }
      
      // IMPORTANT: Try to ensure wallet connection even if status is ready
      // Sometimes wallet can disconnect but status remains ready
      if (!injectedWallet?.address && !address) {
        console.log("No wallet detected but status is ready - attempting to reconnect wallet...");
        const walletConnected = await checkOwnerWallet();
        console.log("Wallet reconnection result:", walletConnected);
        
        if (!walletConnected) {
          throw new Error("Need owner wallet: No wallet connected. Please connect wallet manually.");
        }
      }
      
      // Make sure embedded wallet is available for session key operations
      if (!embeddedWallet?.address) {
        console.log("No embedded wallet detected but status is ready - attempting to reconnect...");
        const embeddedConnected = await checkEmbeddedWallet();
        console.log("Embedded wallet reconnection result:", embeddedConnected);
        
        if (!embeddedConnected) {
          throw new Error("Need embedded wallet: Session wallet not available. Please refresh the page.");
        }
      }
      
      // Now check actual game status
      if (status !== 'ready') {
        console.log("Game not ready (status:", status, ") - cannot load character data");
        throw new Error(`Game not initialized properly (status: ${status})`);
      }
      
      console.log("Game status is ready, proceeding to load character data");
      
      // Now get the character ID - either from state or from useBattleNads
      console.log("Looking for character ID");
      const existingCharId = characterId || battleNadsCharacterId;
      
      if (!existingCharId) {
        // If no character ID in state, try to get it from the player's address
        const ownerAddress = injectedWallet?.address || address;
        console.log("No character ID in state, checking for character ID using address:", ownerAddress);
        
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
      
      // Now load the actual character data using getFrontendData
      const charToUse = characterId || existingCharId;
      console.log("Loading data for character ID:", charToUse);
      
      if (!charToUse) {
        throw new Error("No character ID available");
      }
      
      // Use getFrontendData to get all game data in one call
      console.log("Calling getFrontendData...");
      const frontendDataRaw = await getFrontendData(charToUse);
      console.log("getFrontendData response received:", !!frontendDataRaw);
      
      if (!frontendDataRaw) {
        throw new Error("Failed to load game data");
      }
      
      console.log("Frontend data loaded successfully");
      console.log("Frontend data type:", typeof frontendDataRaw);
      console.log("Frontend data structure:", Object.keys(frontendDataRaw));
      
      // Parse the raw data into a consistent format
      const parsedData = parseFrontendData(frontendDataRaw);
      
      // Convert to our structured game state
      const gameState = createGameState(parsedData);
      setGameState(gameState);
      
      // Update individual state values for backward compatibility
      if (gameState.character) {
        setCharacter(gameState.character);
        
        // Update position from the character data
        setPosition(gameState.character.position);
      }
      
      setCombatants(gameState.combatants);
      setNoncombatants(gameState.noncombatants);
      setIsInCombat(gameState.isInCombat);
      setAreaInfo(gameState.areaInfo);
      setEquipmentInfo(gameState.equipmentInfo);
      setMovementOptions(gameState.movementOptions);
      
      // Store miniMap data from frontend data if available
      if (parsedData.miniMap) {
        setMiniMap(parsedData.miniMap);
      }
      
      // Add log entries based on the state
      if (gameState.areaInfo) {
        addToCombatLog(`Area has ${gameState.areaInfo.playerCount || 0} players and ${gameState.areaInfo.monsterCount || 0} monsters.`);
      }
      
      if (gameState.isInCombat) {
        addToCombatLog(`You are in combat with ${gameState.combatants.length} enemies!`);
      }
      
      setLoadingComplete(true);
      console.log("Character loading complete!");
    } catch (err) {
      console.error("Error loading character data:", err);
      // Only set local error if the game's status isn't ready
      // This prevents getting stuck in error state if the game is actually ready
      if (status !== 'ready') {
        setError(`Error loading character data: ${err instanceof Error ? err.message : String(err)}`);
      } else {
        console.log("Not setting local error because status is ready");
        // Show a toast instead of setting error state
        toast({
          title: "Error loading data",
          description: `${err instanceof Error ? err.message : String(err)}`,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    } finally {
      console.log("LOADING CHARACTER DATA COMPLETED OR FAILED");
      console.log("==========================================");
      setLoading(false);
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
        } else {
          console.log("Game already initialized with status: ready");
        }
        
        // Wait for a moment to ensure state updates
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Load character data
        console.log("Loading character data...");
        await loadCharacterData();
        console.log("Character data loaded successfully");
      } catch (err) {
        console.error("Error during initialization:", err);
        // Only set local error if we don't have a better status from useGame
        if (status === 'checking' || status === 'ready') {
          setError(`Error during initialization: ${err instanceof Error ? err.message : String(err)}`);
        } else {
          // If we have a more specific status like 'need-owner-wallet', don't set error
          console.log(`Not setting local error because status is: ${status}`);
        }
        setLoading(false);
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
        setError(null);
      }
      
      if (!loadingComplete && !loading && !hasLoadedData.current) {
        console.log("Status is ready and no data loaded yet - loading character data");
        hasLoadedData.current = true;
        
        // Use a slight delay to ensure all state is updated
        setTimeout(() => {
          loadCharacterData();
        }, 200);
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
      setError(err.message || `Error moving ${direction}`);
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
      setError(err.message || 'Error attacking target');
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
                           Number(areaInfo.area?.monsterCount) > 0;
        
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

  // Add a handler for updating session key
  const handleUpdateSessionKey = async (passedCharacterId?: string) => {
    // Use passed character ID if provided, otherwise use the one from state
    const currentCharacterId = passedCharacterId || characterId || battleNadsCharacterId;
    
    console.log("=== HANDLE UPDATE SESSION KEY FUNCTION STARTED ===");
    console.log("Character ID:", currentCharacterId);
    console.log("Session key status:", sessionKeyStatus);
    
    // Log wallet information
    console.log("Wallet information:");
    console.log("- injectedWallet:", {
      address: injectedWallet?.address,
      type: injectedWallet?.walletClientType,
      hasSigner: !!injectedWallet?.signer
    });
    console.log("- embeddedWallet:", {
      address: embeddedWallet?.address,
      type: embeddedWallet?.walletClientType,
      hasSigner: !!embeddedWallet?.signer
    });
    console.log("- address from context:", address);
    
    if (!sessionKeyStatus || !currentCharacterId) {
      console.error("Missing required data:", { 
        hasSessionKeyStatus: !!sessionKeyStatus, 
        hasCharacterId: !!currentCharacterId,
        stateCharacterId: characterId,
        hookCharacterId: battleNadsCharacterId
      });
      return;
    }
    
    try {
      setLoading(true);
      console.log("Starting session key update process for character:", currentCharacterId);
      console.log("Session key status object:", {
        isSessionKeyMismatch: sessionKeyStatus.isSessionKeyMismatch,
        embeddedWalletAddress: sessionKeyStatus.embeddedWalletAddress,
        hasCurrentSessionKeyFn: !!sessionKeyStatus.currentSessionKey,
        hasUpdateSessionKeyFn: !!sessionKeyStatus.updateSessionKey,
        updateSessionKeyType: typeof sessionKeyStatus.updateSessionKey
      });
      
      toast({
        title: "Updating Session Key",
        description: "Please approve the transaction in your wallet...",
        status: "info",
        duration: 5000,
        isClosable: true,
      });
      
      // First get the current session key
      try {
        console.log("Calling currentSessionKey with characterId:", currentCharacterId);
        const currentKey = await sessionKeyStatus.currentSessionKey(currentCharacterId);
        console.log("Current session key before update:", currentKey);
        console.log("Embedded wallet address:", sessionKeyStatus.embeddedWalletAddress);
        console.log("Do they match?", currentKey?.toLowerCase() === sessionKeyStatus.embeddedWalletAddress?.toLowerCase());
      } catch (err) {
        console.warn("Error getting current session key:", err);
      }
      
      // Try direct call to setSessionKeyToEmbeddedWallet as a fallback if available
      if (setSessionKeyToEmbeddedWallet) {
        console.log("Trying direct call to setSessionKeyToEmbeddedWallet function");
        try {
          const directResult = await setSessionKeyToEmbeddedWallet(currentCharacterId);
          console.log("Direct setSessionKeyToEmbeddedWallet result:", directResult);
          
          if (directResult && directResult.success) {
            toast({
              title: "Success",
              description: directResult.transactionHash 
                ? `Session key updated successfully! Tx: ${directResult.transactionHash.slice(0, 10)}...` 
                : "Session key updated successfully!",
              status: "success",
              duration: 5000,
              isClosable: true,
            });
            
            // Explicitly reset the session key warning state
            resetSessionKeyWarning();
            
            // Reset the game initialization to refresh session key status
            console.log("Reinitializing game after session key update");
            await initializeGame();
            
            setTimeout(() => {
              console.log("Reloading character data after direct session key update");
              loadCharacterData();
            }, 1000);
            
            return; // Skip the regular flow if direct call succeeded
          }
        } catch (directErr) {
          console.error("Error in direct setSessionKeyToEmbeddedWallet call:", directErr);
        }
      }
      
      // Call updateSessionKey with characterId - this will update to the embedded wallet address
      console.log("About to call updateSessionKey with characterId:", currentCharacterId);
      console.log("updateSessionKey function:", sessionKeyStatus.updateSessionKey);
      console.log("updateSessionKey function stringified:", String(sessionKeyStatus.updateSessionKey));
      
      try {
        const result = await sessionKeyStatus.updateSessionKey(currentCharacterId);
        console.log("Result from updateSessionKey:", result);
        
        if (result && result.success) {
          toast({
            title: "Success",
            description: result.transactionHash 
              ? `Session key updated successfully! Tx: ${result.transactionHash.slice(0, 10)}...` 
              : "Session key updated successfully!",
            status: "success",
            duration: 5000,
            isClosable: true,
          });
          
          // Verify the update by getting the session key again
          try {
            const updatedKey = await sessionKeyStatus.currentSessionKey(currentCharacterId);
            console.log("Session key after update:", updatedKey);
            console.log("Should match wallet address:", sessionKeyStatus.embeddedWalletAddress);
            console.log("Do they match now?", updatedKey?.toLowerCase() === sessionKeyStatus.embeddedWalletAddress?.toLowerCase());
          } catch (err) {
            console.warn("Error verifying updated session key:", err);
          }
          
          // Explicitly reset the session key warning state
          resetSessionKeyWarning();
          
          // Reset the game initialization to refresh session key status
          console.log("Reinitializing game after session key update");
          await initializeGame();
          
          // Wait a moment before reloading
          setTimeout(() => {
            console.log("Reloading character data after session key update");
            // Reload character data after session key update
            loadCharacterData();
          }, 1000);
        } else {
          const errorMessage = result?.error || (result?.alreadySet ? "Session key already matches" : "Unknown error");
          console.error("Failed to update session key:", errorMessage);
          console.error("Full result object:", result);
          
          toast({
            title: result?.alreadySet ? "Info" : "Error",
            description: result?.alreadySet 
              ? "Session key already matches your wallet" 
              : `Failed to update session key: ${errorMessage}`,
            status: result?.alreadySet ? "info" : "error",
            duration: 5000,
            isClosable: true,
          });
        }
      } catch (updateErr) {
        console.error("Exception during updateSessionKey call:", updateErr);
        throw updateErr;
      }
    } catch (err) {
      console.error("Error updating session key:", err);
      // Log the full error
      console.error("Full error object:", err);
      console.error("Error stack:", err instanceof Error ? err.stack : 'No stack trace');
      
      toast({
        title: "Error",
        description: `Failed to update session key: ${err instanceof Error ? err.message : String(err)}`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      console.log("=== HANDLE UPDATE SESSION KEY FUNCTION FINISHED ===");
      setLoading(false);
    }
  };

  // Debug function called in a useEffect
  const debugGameData = () => {
    if (gameState && gameState.character) {
      console.log("Game state:", gameState);
    }
  };
  
  // Call debug function when relevant data changes
  useEffect(() => {
    debugGameData();
  }, [gameState]);

  // Show loading state during initialization but NOT during movement/attacks
  if ((loading && !isMoving) || (status.startsWith('checking') || status === 'updating-session-key')) {
    // Map of status messages for different loading states
    const messageMap: Record<string, string> = {
      'checking': 'Initializing game...',
      'checking-owner-wallet': 'Checking if owner wallet is connected...',
      'checking-embedded-wallet': 'Checking if session key is available...',
      'checking-character': 'Checking if character exists...',
      'checking-session-key': 'Verifying session key...',
      'updating-session-key': 'Updating session key...',
    };
    
    // Generate the loading message based on current state
    let loadingMessage = 'Loading Battle-Nads game data...';
    
    if (status.startsWith('checking') || status === 'updating-session-key') {
      loadingMessage = messageMap[status] || 'Loading Battle-Nads game data...';
    }
    
    return (
      <Center height="100vh" className="bg-gray-900" color="white">
        <VStack spacing={6}>
          <Heading as="h1" size="xl" color="white" mb={2}>Battle Nads</Heading>
          <Spinner size="xl" thickness="4px" speed="0.8s" color="blue.500" />
          <Text fontSize="xl" color="white">{loadingMessage}</Text>
        </VStack>
      </Center>
    );
  }

  // Show session key warning if needed, after the game is loaded
  if (sessionKeyWarning && sessionKeyStatus?.isSessionKeyMismatch && !loading) {
    // Use character ID from either state or useBattleNads hook
    const currentCharacterId = characterId || battleNadsCharacterId;
    
    return (
      <Center height="100vh" className="bg-gray-900" color="white">
        <VStack spacing={6} maxWidth="600px" p={6}>
          <Heading as="h1" size="xl" color="white" mb={2}>Battle Nads</Heading>
          <Heading size="md" color="yellow.400">Session Key Warning</Heading>
          <Alert status="warning" borderRadius="md" color="black">
            <AlertIcon />
            <Box>
              <AlertTitle>Session Key Mismatch</AlertTitle>
              <AlertDescription>{sessionKeyWarning}</AlertDescription>
            </Box>
          </Alert>
          <Text color="white">
            Your session key needs to be updated to match your current wallet. 
            This is required for game actions to work properly.
          </Text>
          <Text fontSize="sm" color="gray.400">
            Current wallet address: {sessionKeyStatus?.embeddedWalletAddress ? 
              `${sessionKeyStatus.embeddedWalletAddress.slice(0, 6)}...${sessionKeyStatus.embeddedWalletAddress.slice(-4)}` : 'Unknown'}
          </Text>
          <HStack spacing={4}>
            <Button 
              colorScheme="yellow" 
              onClick={() => {
                console.log("UPDATE SESSION KEY BUTTON CLICKED");
                console.log("Character ID from state:", characterId);
                console.log("Character ID from useBattleNads:", battleNadsCharacterId);
                console.log("Using character ID:", currentCharacterId);
                console.log("Session key status available:", !!sessionKeyStatus);
                
                // Pass the current character ID directly to avoid the early return
                if (currentCharacterId) {
                  setCharacterId(currentCharacterId); // Update state if needed
                  handleUpdateSessionKey(currentCharacterId);
                } else {
                  toast({
                    title: "Error",
                    description: "Could not find your character ID. Please reload the page.",
                    status: "error",
                    duration: 5000,
                    isClosable: true,
                  });
                }
              }} 
              isLoading={loading}
              loadingText="Updating..."
            >
              Update Session Key
            </Button>
            <Button colorScheme="blue" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </HStack>
        </VStack>
      </Center>
    );
  }

  // Show error state
  if (error || gameError || hookError) {
    return (
      <Center height="100vh" className="bg-gray-900" color="white">
        <VStack spacing={6} maxWidth="600px" p={6}>
          <Heading as="h1" size="xl" color="white" mb={2}>Battle Nads</Heading>
          <Heading color="red.400">Error</Heading>
          <Alert status="error" borderRadius="md" color="black">
            <AlertIcon />
            <Box>
              <AlertTitle>Connection Error</AlertTitle>
              <AlertDescription>{error || gameError || hookError}</AlertDescription>
            </Box>
          </Alert>
          <Text color="white">
            There was an error connecting to the Battle Nads contract on Monad Testnet.
            Please check your network connection and try again.
          </Text>
          <Box bg="gray.800" p={4} borderRadius="md" width="100%" mb={4}>
            <Text color="white" fontWeight="bold" mb={2}>Debug Information:</Text>
            <Text fontSize="sm" color="gray.300">Initialization Status: {status}</Text>
            <Text fontSize="sm" color="gray.300">
              Wallet Connected: {injectedWallet?.address ? `Yes (${injectedWallet.address.slice(0, 6)}...${injectedWallet.address.slice(-4)})` : 'No'}
            </Text>
            <Text fontSize="sm" color="gray.300">
              Embedded Wallet: {embeddedWallet?.address ? `Yes (${embeddedWallet.address.slice(0, 6)}...${embeddedWallet.address.slice(-4)})` : 'No'}
            </Text>
            <Text fontSize="sm" color="gray.300">Character ID: {characterId || battleNadsCharacterId || 'Not Found'}</Text>
            <Text fontSize="sm" color="gray.300">Session Key Warning: {sessionKeyWarning || 'None'}</Text>
          </Box>
          <HStack spacing={4}>
            <Button colorScheme="blue" onClick={() => window.location.reload()}>
              Retry
            </Button>
            <Button colorScheme="green" onClick={() => {
              console.log("Manual initialization attempt");
              initializeGame().then(result => {
                console.log("Manual initializeGame result:", result);
                if (result.success) {
                  loadCharacterData().catch(err => {
                    console.error("Error in manual loadCharacterData:", err);
                  });
                }
              }).catch(err => {
                console.error("Error in manual initializeGame:", err);
              });
            }}>
              Manual Init
            </Button>
          </HStack>
        </VStack>
      </Center>
    );
  }

  // Show error state
  if (status === "error") {
    return (
      <Center height="100vh" className="bg-gray-900" color="white">
        <VStack spacing={6} maxWidth="600px" p={6}>
          <Heading as="h1" size="xl" color="white" mb={2}>Battle Nads</Heading>
          <Heading color="red.400">Error</Heading>
          <Alert status="error" borderRadius="md" color="black">
            <AlertIcon />
            <Box>
              <AlertTitle>Connection Error</AlertTitle>
              <AlertDescription>{gameError || hookError}</AlertDescription>
            </Box>
          </Alert>
          <Text color="white">
            There was an error connecting to the Battle Nads contract on Monad Testnet.
            Please check your network connection and try again.
          </Text>
          <Box bg="gray.800" p={4} borderRadius="md" width="100%" mb={4}>
            <Text color="white" fontWeight="bold" mb={2}>Debug Information:</Text>
            <Text fontSize="sm" color="gray.300">Initialization Status: {status}</Text>
            <Text fontSize="sm" color="gray.300">
              Wallet Connected: {injectedWallet?.address ? `Yes (${injectedWallet.address.slice(0, 6)}...${injectedWallet.address.slice(-4)})` : 'No'}
            </Text>
            <Text fontSize="sm" color="gray.300">
              Embedded Wallet: {embeddedWallet?.address ? `Yes (${embeddedWallet.address.slice(0, 6)}...${embeddedWallet.address.slice(-4)})` : 'No'}
            </Text>
            <Text fontSize="sm" color="gray.300">Character ID: {characterId || battleNadsCharacterId || 'Not Found'}</Text>
            <Text fontSize="sm" color="gray.300">Session Key Warning: {sessionKeyWarning || 'None'}</Text>
          </Box>
          <HStack spacing={4}>
            <Button colorScheme="blue" onClick={() => window.location.reload()}>
              Retry
            </Button>
            <Button colorScheme="green" onClick={() => {
              console.log("Manual initialization attempt");
              // Clear local error before attempting initialization
              setError(null);
              initializeGame().then(result => {
                console.log("Manual initializeGame result:", result);
                if (result.success) {
                  loadCharacterData().catch(err => {
                    console.error("Error in manual loadCharacterData:", err);
                  });
                }
              }).catch(err => {
                console.error("Error in manual initializeGame:", err);
              });
            }}>
              Manual Init
            </Button>
          </HStack>
        </VStack>
      </Center>
    );
  }

  // Show "no character" state if needed
  if (status === 'need-character' || !character) {
    return (
      <Center height="100vh" className="bg-gray-900" color="white">
        <VStack spacing={6}>
          <Heading as="h1" size="xl" color="white" mb={2}>Battle Nads</Heading>
          <Heading>No Character Found</Heading>
          <Text fontSize="lg" color="white" maxW="600px" textAlign="center" mb={4}>
            You don't have a character yet. To play Battle Nads, you need to create a character first.
          </Text>
          <Text fontSize="md" color="gray.300" maxW="600px" textAlign="center" mb={4}>
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
  }

  // Show a fallback if we have initialization but no character data yet
  if (!character && characterId && status === 'ready' && !loading) {
    console.log("Data inconsistency detected: Initialization complete but character data missing");
    
    return (
      <Center height="100vh" className="bg-gray-900" color="white">
        <VStack spacing={6} maxWidth="600px" p={6}>
          <Heading as="h1" size="xl" color="white" mb={2}>Battle Nads</Heading>
          <Heading size="md" color="orange.400">Loading Game Data</Heading>
          <Text color="white">
            Character ID found but data still loading. Manually loading game data...
          </Text>
          <Spinner size="xl" thickness="4px" speed="0.8s" color="blue.500" />
          <Button 
            colorScheme="blue" 
            onClick={async () => {
              console.log("Manual data load triggered");
              setLoading(true);
              
              try {
                // Try direct frontend data load
                const frontendData = await getFrontendData(characterId);
                
                if (frontendData && frontendData.character) {
                  console.log("Frontend data loaded through manual action");
                  setCharacter(frontendData.character);
                  setCombatants(frontendData.combatants || []);
                  setNoncombatants(frontendData.noncombatants || []);
                  setEquipmentInfo(frontendData.equipment);
                  
                  // Initialize position
                  setPosition({
                    x: Number(frontendData.character.stats.x),
                    y: Number(frontendData.character.stats.y),
                    depth: Number(frontendData.character.stats.depth)
                  });
                  
                  if (frontendData.miniMap?.[2]?.[2]) {
                    setAreaInfo(frontendData.miniMap[2][2]);
                  }
                  
                  setLoadingComplete(true);
                } else {
                  throw new Error("Manual data load failed - no data returned");
                }
              } catch (err) {
                console.error("Error in manual data load:", err);
                setError(`Error loading game data: ${err instanceof Error ? err.message : String(err)}`);
              } finally {
                setLoading(false);
              }
            }}
          >
            Force Load Data
          </Button>
        </VStack>
      </Center>
    );
  }

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
      
      {status !== 'ready' ? (
        <VStack spacing={4} align="center" justify="center" minH="50vh">
          <Heading>Setting Up</Heading>
          <Spinner size="xl" />
          <Text>{status === 'initializing' ? 'Initializing game...' : 'Please wait...'}</Text>
          {gameError && (
            <Alert status="error">
              <AlertIcon />
              <AlertDescription>{gameError}</AlertDescription>
            </Alert>
          )}
          <Button 
            colorScheme="blue" 
            onClick={initializeGame}
            isLoading={status === 'initializing'}
            loadingText="Initializing"
          >
            Initialize Game
          </Button>
        </VStack>
      ) : loading && !loadingComplete ? (
        <VStack spacing={4} align="center" justify="center" minH="50vh">
          <Heading>Loading Game</Heading>
          <Spinner size="xl" />
          <Text>Please wait...</Text>
        </VStack>
      ) : (
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
      )}
    </Container>
  );
};

export default Game;
