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
  TabPanel
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { useWallet } from '../../providers/WalletProvider';
import { useBattleNads, LogType, ChatMessage, useGameActions } from '../../hooks/useBattleNads';
import { useGame } from '../../hooks/useGame';
import { usePrivy } from '@privy-io/react-auth';
import { GameBoard } from './GameBoard';
import EventFeed from './EventFeed';
import ChatInterface from './ChatInterface';
import DataFeed from './DataFeed';
import { BattleNad, BattleNadLite, GameState, GameUIState } from '../../types/gameTypes';
import { convertCharacterData, createGameState, parseFrontendData, calculateMaxHealth, extractPositionFromCharacter } from '../../utils/gameDataConverters';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import WalletBalances from '../WalletBalances';
import DebugPanel from '../DebugPanel';
import { ChevronUpIcon, ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon } from '@chakra-ui/icons';
import { CharacterCard } from '../../components/CharacterCard';
import { useContracts } from '../../hooks/contracts/useContracts';
import MovementControls from './MovementControls';

const Game: React.FC = () => {
  const router = useRouter();
  const { address, injectedWallet, embeddedWallet } = useWallet();
  const { 
    characterId: battleNadsCharacterId,
    moveCharacter,
    getPlayerCharacterID,
    loading: contractLoading,
    error: contractError,
    highestSeenBlock,
    sendChatMessage,
    changeAttackTarget,
    changeEquippedWeapon,
    changeEquippedArmor,
    assignNewPoints
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
    hasAllRequiredWallets,
    getStoredEmbeddedWalletAddress
  } = useGame();

  // Get game actions for updating session key
  const { updateSessionKey } = useGameActions();
  
  // Local component state (not blockchain related)
  const [characterId, setCharacterId] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState<boolean>(false);
  const [position, setPosition] = useState({ x: 0, y: 0, depth: 1 });
  const [selectedCombatant, setSelectedCombatant] = useState<BattleNadLite | null>(null);
  const [combatLog, setCombatLog] = useState<string[]>([]);
  const [isAttacking, setIsAttacking] = useState(false);
  const [loadingComplete, setLoadingComplete] = useState<boolean>(false);

  // Reference to track initial load state
  const isInitialLoadComplete = useRef(false);
  const hasLoadedData = useRef(false);
  const hasInitialized = useRef(false);
  
  const toast = useToast();

  // Ref to track status change debounce timer
  const statusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Add state for debug panel
  const [showDebugPanel, setShowDebugPanel] = useState<boolean>(false);
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Create stable WalletBalances component
  const StableWalletBalances = useMemo(() => <WalletBalances />, []);

  // Add useContracts hook to get embeddedContract
  const { readContract, injectedContract, embeddedContract } = useContracts();

  // Derive a unified UI state from all the state variables
  const gameUIState = useMemo<GameUIState>(() => {
    // Show loading during any loading operation or status check
    if (loading || status.startsWith('checking') || status === 'updating-session-key' || status === 'loading-game-data') {
      return 'loading';
    }
    
    // Show errors only for actual errors, not expected states
    if (error || gameError) {
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
  }, [loading, status, error, gameError, sessionKeyWarning, character]);
  
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

  /**
   * Load character data, load game state and initialize
   * @param characterId
   * @returns
   */
  const loadCharacterData = async (characterId: string) => {
    

    try {
      // Dispatch an event requesting the GameDataProvider to refresh data
      const requestEvent = new CustomEvent('requestGameDataRefresh', {
        detail: { characterId }
      });
      window.dispatchEvent(requestEvent);
      console.log('[Game] Dispatched requestGameDataRefresh event for character:', characterId);
      
      
      // The actual data will be received through the gameState context from GameDataProvider
    } catch (error) {
      console.error('[Game] Error dispatching refresh event:', error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error refreshing game data";

    }
  };

  // Initialize the game on component mount
  useEffect(() => {
    // More robust initialization check
    if (hasInitialized.current) {
      console.log("Game already initialized, skipping initialization");
      return;
    }
    
    // Set initialized immediately to prevent duplicate initialization
    hasInitialized.current = true;
    
    console.log("Game component mounted - initializing game...");
    
    const initializeGameData = async () => {
      console.log("==========================================");
      console.log("INITIALIZATION FLOW STARTED");
      console.log("Current status:", status);
      console.log("Current character ID state:", { characterId, characterID: character ? character.id : undefined });
      console.log("Wallet state:", { 
        address, 
        injectedWallet: injectedWallet?.address,
        embeddedWallet: embeddedWallet?.address,
        storedEmbeddedWallet: getStoredEmbeddedWalletAddress()
      });
      
      try {
        // If we already have a character ID, make sure it's properly set in state
        if (character && character.id && !characterId) {
          console.log("Found character ID from hook but not in local state, setting it:", character.id);
          setCharacterId(character.id);
        }
        
        // Wait a moment for wallet states to stabilize
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Check if we have both required wallet types
        const hasWallets = hasAllRequiredWallets();
        console.log("Has all required wallets:", hasWallets);
        
        if (!hasWallets) {
          console.log("Waiting for all wallet types to be available...");
          // Wait longer to let both wallet types load
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Check again after waiting
          const hasWalletsAfterWait = hasAllRequiredWallets();
          console.log("Has all required wallets after wait:", hasWalletsAfterWait);
          
          if (!hasWalletsAfterWait) {
            console.log("Still missing wallet types, attempting reconnection...");
          }
        }
        
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
        const storedEmbeddedWalletAddress = getStoredEmbeddedWalletAddress();
        if (!embeddedWallet?.address && !storedEmbeddedWalletAddress) {
          console.log("No embedded wallet detected, attempting to reconnect...");
          
          // Retry the embedded wallet check up to 3 times with delays
          let embeddedConnected = false;
          for (let attempt = 1; attempt <= 3; attempt++) {
            console.log(`Attempt ${attempt}/3 to connect embedded wallet...`);
            embeddedConnected = await checkEmbeddedWallet();
            console.log(`Attempt ${attempt} result:`, embeddedConnected);
            
            if (embeddedConnected) break;
            
            // Wait between attempts
            if (attempt < 3) {
              console.log("Waiting before next attempt...");
              await new Promise(resolve => setTimeout(resolve, 800));
            }
          }
          
          if (!embeddedConnected) {
            throw new Error("Failed to connect embedded wallet after multiple attempts. Please refresh the page.");
          }
        } else if (!embeddedWallet?.address && storedEmbeddedWalletAddress) {
          console.log("Using stored embedded wallet address:", storedEmbeddedWalletAddress);
        }
        
        // Now initialize the game if needed
        if (status !== 'ready') {
          console.log("Game not ready, initializing...");
          const initResult = await initializeGame();
          console.log("Game initialization result:", initResult);
          
          if (!initResult.success) {
            // Don't throw an error if status is 'checking' - this is normal during initialization
            if (initResult.status !== 'checking') {
              throw new Error(`Game initialization failed: ${initResult.status}`);
            } else {
              console.log("Game is still in checking state, continuing initialization process");
            }
          }
          
          // Wait for UI state to update - this is key to preventing race conditions
          await new Promise(resolve => setTimeout(resolve, 800));
        } else {
          console.log("Game already initialized with status: ready");
        }
        
        // Wait for a moment to ensure state updates
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Let the status effect trigger the character data loading
        // This prevents race conditions where loadCharacterData is called
        // before the status has fully updated to 'ready'
        console.log("Initialization complete - status effect will load character data");
      } catch (err) {
        console.error("Error during initialization:", err);
        // Only set local error if we don't have a better status from useGame
        if (status === 'ready') {
          setGameState(current => ({ ...current, error: err instanceof Error ? err.message : String(err) }));
        } else {
          // If we have a more specific status like 'need-owner-wallet' or 'checking', don't set error
          console.log(`Not setting local error because status is: ${status}`);
        }
        setGameState(current => ({ ...current, loading: false }));
      }
    };
    
    initializeGameData();
  }, []);

  // Update effect to track status changes with debounce
  useEffect(() => {
    console.log("Game status changed to:", status);
    console.log("Current sessionKeyWarning state:", sessionKeyWarning);
    console.log("Current gameUIState:", gameUIState);
    
    // Clear any previous timeout
    if (statusTimeoutRef.current) {
      clearTimeout(statusTimeoutRef.current);
    }
    
    // When status becomes ready, check if we need to load character data
    if (status === 'ready') {
      // Clear any local error state when status transitions to ready
      if (error) {
        console.log("Status transitioned to ready, clearing local error state");
        setGameState(current => ({ ...current, error: null }));
      }
      
      // Check if we have a character ID available
      const availableCharId = characterId || (character ? character.id : undefined);
      
      // Stricter check to prevent multiple loads 
      // Only load if: 
      // 1. Not already loading
      // 2. We haven't loaded data yet
      // 3. We have a character ID
      if (!loadingComplete && !loading && !hasLoadedData.current && availableCharId) {
        // Immediately set the flag to prevent duplicate loads during state updates
        hasLoadedData.current = true;
        
        console.log("Status is ready, character ID available, and no data loaded yet - loading character data", {
          characterId: availableCharId,
          loadingComplete, 
          hasLoadedDataRef: hasLoadedData.current
        });
        
        // Use a slight delay with debounce to ensure all state is updated
        statusTimeoutRef.current = setTimeout(() => {
          loadCharacterData(availableCharId);
          statusTimeoutRef.current = null;
        }, 500); // Increase delay to ensure initialization is fully complete
      } else {
        const reason = loading ? "already loading" :
                      loadingComplete ? "loading already complete" :
                      hasLoadedData.current ? "data already loaded (ref)" :
                      !availableCharId ? "no character ID" : "unknown";
                      
        console.log(`Not loading character data: ${reason}`);
      }
    }
    
    // Clean up on unmount
    return () => {
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
    };
  }, [status, loadingComplete, loading, characterId, error]);

  // Update the handleMovement function to skip loading state
  const handleMovement = async (direction: 'north' | 'south' | 'east' | 'west' | 'up' | 'down') => {
    try {
      console.log(`[Game] Initiating movement in direction: ${direction}`);
      setIsMoving(true);
      
      if (!character) {
        setGameState(current => ({ ...current, error: "No character data available" }));
        return;
      }
      
      // Store pre-movement position for logging
      const startPosition = extractPositionFromCharacter(character);
      console.log(`[Game] Starting position before ${direction} movement: (${startPosition.x}, ${startPosition.y}, ${startPosition.depth})`);
      
      // Check which direction we're moving and use the appropriate move function
      // Privy will automatically show its loading UI during this blockchain transaction
      try {
        await moveCharacter(character.id, direction);
      } catch (err) {
        console.error(err);
        toast({
          title: "Failed to move character",
          description: String(err),
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
      
      console.log(`[Game] Movement transaction complete for direction: ${direction}, reloading character data...`);
      
      // Create and dispatch a manual movement event
      const movementEvent = {
        logType: LogType.LeftArea, // Use the appropriate LogType for movement
        source: "player",
        message: `You moved ${direction}`,
        characterName: character.name || "You",
        characterID: character.id,
        timestamp: Date.now(),
        x: startPosition.x,
        y: startPosition.y,
        depth: startPosition.depth
      };

      // Dispatch the movement event
      window.dispatchEvent(new CustomEvent('manualCombatEvent', {
        detail: { event: movementEvent }
      }));

      const updatedPosition = startPosition;
      if (direction === 'north') {
        updatedPosition.y += 1;
      } else if (direction === 'south') {
        updatedPosition.y -= 1;
      } else if (direction === 'east') {
        updatedPosition.x += 1;
      } else if (direction === 'west') {
        updatedPosition.x -= 1;
      } else if (direction === 'up') {
        updatedPosition.depth += 1;
      } else if (direction === 'down') {
        updatedPosition.depth -= 1;
      }
      addToCombatLog(`Moved ${direction} to (${updatedPosition.x}, ${updatedPosition.y}, Depth: ${updatedPosition.depth})`);
    } catch (err: any) {
      console.error('Error during movement:', err);
      addToCombatLog(`Failed to move ${direction}: ${err.message}`);
    } finally {
      setIsMoving(false);
    }
  };
  
  // Update the handleAttack function to skip loading state
  const handleAttack = async (targetIndex: number) => {
    try {
      setIsAttacking(true);
      
      if (!character) {
        setGameState(current => ({ ...current, error: "No character data available" }));
        return;
      }
      
      // Log the attack attempt
      console.log(`[handleAttack] Attempting to attack target with index ${targetIndex}`);
      addToCombatLog(`Attempting to attack target ${targetIndex}`);
      
      // Call the attack function on the contract
      console.log(`[handleAttack] Sending attack transaction to blockchain`);

      try {
        await changeAttackTarget(character.id, targetIndex);
      } catch (err) {
        console.error(err);
        toast({
          title: "Failed to change attack target",
          description: String(err),
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
      
      // Create and dispatch a manual combat event
      const attackEvent = {
        logType: LogType.InstigatedCombat,
        source: "player",
        message: `You attacked target ${targetIndex}`,
        characterName: character.name || "You",
        characterID: character.id,
        timestamp: Date.now()
      };

      // Dispatch the event
      window.dispatchEvent(new CustomEvent('manualCombatEvent', {
        detail: { event: attackEvent }
      }));

      // Add success message to combat log
      addToCombatLog(`Successfully attacked target ${targetIndex}`);
    } catch (err) {
      console.error(err);
      toast({
        title: "Failed to attack target",
        description: String(err),
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Render minimap (5x5 grid centered on player)
  const renderMinimap = () => {
    const grid: React.ReactNode[] = [];
    const size = 5;
    const center = Math.floor(size / 2);
    
    // Add null check to prevent errors if position is undefined
    const defaultPosition = { x: 0, y: 0, depth: 1 };
    const safePosition = (character && character.position) ? character.position : defaultPosition;
    
    for (let y = 0; y < size; y++) {
      const row: React.ReactNode[] = [];
      for (let x = 0; x < size; x++) {
        const mapX = safePosition.x - center + x;
        const mapY = safePosition.y - center + y;
        
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
    // Add null check here too
    if (!character || !character.position) return false;
    
    return Math.abs(x - character.position.x) <= 1 && Math.abs(y - character.position.y) <= 1;
  };

  // Handle updating the session key
  const handleUpdateSessionKey = async (key?: string) => {
    try {
      // Use embeddedWallet as default sessionKey if none provided
      const sessionKey = key || embeddedWallet?.address;
      
      if (!sessionKey) {
        toast({
          title: "Session key update failed",
          description: "No embedded wallet available to use as session key",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        return;
      }
      
      // Set loading state
      setGameState(prev => ({ ...prev, loading: true }));
      
      // Call the actual session key update function
      const result = await updateSessionKey(sessionKey);
      
      if (result.success) {
        toast({
          title: "Session key updated",
          description: "Your session key has been successfully updated",
          status: "success",
          duration: 5000,
          isClosable: true,
        });
        
        // Reset the session key warning
        resetSessionKeyWarning();
        
        // Reload character data to reflect changes
        await loadCharacterData(character?.id || characterId || '');
      } else {
        toast({
          title: "Session key update failed",
          description: result.error || "Unknown error",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (err) {
      console.error(err);
      toast({
        title: "Failed to update session key",
        description: err instanceof Error ? err.message : String(err),
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setGameState(prev => ({ ...prev, loading: false }));
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

  // Add listener for sessionKeyUpdateNeeded events from GameDataProvider
  useEffect(() => {
    const handleSessionKeyUpdateNeeded = (event: CustomEvent) => {
      console.log("[Game] Received sessionKeyUpdateNeeded event:", event.detail);
      
      // If sessionKeyWarning isn't already set, we need to manually trigger the UI update
      if (!sessionKeyWarning) {
        console.log("[Game] No session key warning set yet, forcing warning state");
        
        // Get the reason for the warning from the event
        const reason = event.detail.reason || 'unknown';
        
        // Set a relevant warning message based on the reason
        let warningMessage = "Your session key needs to be updated. Game actions may fail.";
        
        if (reason === 'expired') {
          const currentBlock = event.detail.currentBlock || highestSeenBlock;
          const expirationBlock = event.detail.expirationBlock || "unknown";
          warningMessage = `Your session key has expired at block ${expirationBlock} (current block: ${currentBlock}). Game actions will fail until you update your session key.`;
        } else if (reason === 'mismatch') {
          warningMessage = "Your session key doesn't match your current wallet. Game actions may fail.";
        }
        
        // Call resetSessionKeyWarning to clear any existing warning
        resetSessionKeyWarning();
        
        // Use setTimeout to avoid state updates during render
        setTimeout(() => {
          // Manually set the session key warning through the useGame hook
          const tempEvent = new CustomEvent('forceSessionKeyWarning', {
            detail: { 
              warning: warningMessage
            }
          });
          window.dispatchEvent(tempEvent);
        }, 100);
      }
    };

    // Add event listener
    window.addEventListener('sessionKeyUpdateNeeded', handleSessionKeyUpdateNeeded as EventListener);
    
    // Clean up
    return () => {
      window.removeEventListener('sessionKeyUpdateNeeded', handleSessionKeyUpdateNeeded as EventListener);
    };
  }, [sessionKeyWarning, resetSessionKeyWarning, highestSeenBlock]);

  // Function to handle sending chat messages
  const handleSendChatMessage = (message: string) => {
    if (!message.trim()) return;
    
    try {
      // Send the message to the blockchain
      sendChatMessage(message)
        .then(() => {
          console.log('Chat message sent successfully to blockchain:', message);
        })
        .catch((error) => {
          console.error('Error sending chat message:', error);
          toast({
            title: 'Error',
            description: `Failed to send message: ${error.message}`,
            status: 'error',
            duration: 3000,
            isClosable: true,
          });
        });
    } catch (err) {
      console.error('Error preparing chat message:', err);
      toast({
        title: 'Error',
        description: `Could not send message: ${err instanceof Error ? err.message : String(err)}`,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };
  
  // Load data feeds
  useEffect(() => {
    if (status === "connected" && character && injectedWallet?.address) {
      const ownerAddress = injectedWallet.address.toString();
      console.log('[Game] Wallet connected, retrieving data with owner address:', ownerAddress);
      console.log('[Game] Character state:', { id: character.id, name: character.name });
      
      // We no longer need to make initial getFullFrontendData call or set up polling
      // as the GameDataProvider handles this centrally
    }
  }, [status, character, injectedWallet?.address]);

  // Code to handle equipment changes
  const handleEquipWeapon = async (weaponId: number) => {
    if (!character) {
      toast({
        title: "Error",
        description: "Character not loaded",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    try {
      await changeEquippedWeapon(character.id, weaponId);
    } catch (err) {
      console.error(err);
      toast({
        title: "Failed to equip weapon",
        description: String(err),
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleEquipArmor = async (armorId: number) => {
    if (!character) {
      toast({
        title: "Error",
        description: "Character not loaded",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    try {
      await changeEquippedArmor(character.id, armorId);
    } catch (err) {
      console.error(err);
      toast({
        title: "Failed to equip armor",
        description: String(err),
        status: "error",
        duration: 3000,
      });
    }
  };

  // Add event listeners for the specific game data update events
  useEffect(() => {
    // Handler for character position changes
    const handlePositionChanged = (event: CustomEvent) => {
      console.log("[Game] Received characterPositionChanged event:", event.detail);
      if (event.detail && event.detail.position) {
        // Log position update clearly
        console.log(`[Game] Position update: (${position.x}, ${position.y}, ${position.depth}) -> (${event.detail.position.x}, ${event.detail.position.y}, ${event.detail.position.depth})`);
        
        setPosition(event.detail.position);
        
        // If we have a character, also update position in character state
        if (character) {
          setGameState(current => {
            // Only update if character exists
            if (!current.character) return current;
            
            // Update both the character's position object and the stats for consistency
            const updatedChar = {
              ...current.character,
              position: event.detail.position,
              stats: {
                ...current.character.stats,
                x: event.detail.position.x,
                y: event.detail.position.y,
                depth: event.detail.position.depth
              }
            };
            
            console.log(`[Game] Updated character in game state with new position: (${event.detail.position.x}, ${event.detail.position.y}, ${event.detail.position.depth})`);
            
            return {
              ...current,
              character: updatedChar
            };
          });
        }
        
        // Add to combat log if relevant
        addToCombatLog(`Position updated to (${event.detail.position.x}, ${event.detail.position.y}, Depth: ${event.detail.position.depth})`);
      }
    };
    
    // Handler for character stats changes
    const handleStatsChanged = (event: CustomEvent) => {
      console.log("[Game] Received characterStatsChanged event:", event.detail);
      if (event.detail && event.detail.stats) {
        setGameState(current => {
          // Only update if character exists
          if (!current.character) return current;
          
          return {
            ...current,
            character: {
              ...current.character,
              stats: event.detail.stats
            }
          };
        });
        
        // Add to combat log if health changed
        if (character && character.stats && event.detail.stats.health !== character.stats.health) {
          addToCombatLog(`Health changed to ${event.detail.stats.health}/${event.detail.stats.maxHealth}`);
        }
      }
    };
    
    // Handler for combatants changes
    const handleCombatantsChanged = (event: CustomEvent) => {
      console.log("[Game] Received combatantsChanged event:", event.detail);
      if (event.detail && event.detail.combatants) {
        // Filter out any invalid combatants that don't have proper data
        const validCombatants = event.detail.combatants.filter((c: any) => c && c.id);
        
        if (validCombatants.length > 0) {
          console.log("[Game] Valid combatants received:", validCombatants.length);
          
          // Update state with the combatants
          setGameState(current => ({
            ...current,
            combatants: validCombatants
          }));
          
          // Log changes in combatants
          const newCount = validCombatants.length;
          const oldCount = event.detail.previousCombatants?.length || 0;
          
          if (newCount > oldCount) {
            addToCombatLog(`New enemies appeared! Now facing ${newCount} opponents.`);
          } else if (newCount < oldCount) {
            addToCombatLog(`Some enemies are gone. ${newCount} opponents remain.`);
          } else {
            // Same number but different combatants or health changes
            addToCombatLog(`Combat situation has changed.`);
          }
        } else {
          console.log("[Game] Received combatants update with no valid combatants");
        }
      }
    };
    
    // Handler for area info changes
    const handleAreaChanged = (event: CustomEvent) => {
      console.log("[Game] Received areaInfoChanged event:", event.detail);
      if (event.detail && event.detail.miniMap) {
        setMiniMap(event.detail.miniMap);
      }
    };

    // Add event listeners
    window.addEventListener('characterPositionChanged', handlePositionChanged as EventListener);
    window.addEventListener('characterStatsChanged', handleStatsChanged as EventListener);
    window.addEventListener('combatantsChanged', handleCombatantsChanged as EventListener);
    window.addEventListener('areaInfoChanged', handleAreaChanged as EventListener);
    
    // Clean up
    return () => {
      window.removeEventListener('characterPositionChanged', handlePositionChanged as EventListener);
      window.removeEventListener('characterStatsChanged', handleStatsChanged as EventListener);
      window.removeEventListener('combatantsChanged', handleCombatantsChanged as EventListener);
      window.removeEventListener('areaInfoChanged', handleAreaChanged as EventListener);
    };
  }, [character, addToCombatLog]);

  // Replace conditional rendering with a switch statement based on gameUIState
  let renderContent;
  switch (gameUIState) {
    case 'loading':
      renderContent = (
        <Center height="100vh" className="bg-gray-900" color="white">
          <VStack spacing={6}>
            <Heading as="h1" size="xl" color="white">Battle Nads</Heading>
            <Spinner size="xl" thickness="4px" speed="0.8s" color="blue.500" />
            <Text fontSize="xl" color="white">{getLoadingMessage(status)}</Text>
          </VStack>
        </Center>
      );
      break;
      
    case 'error':
      renderContent = (
        <Center height="100vh" className="bg-gray-900" color="white">
          <VStack spacing={6} maxWidth="600px" p={6}>
            <Heading as="h1" size="xl" color="white" mb={2}>Battle Nads</Heading>
            <Heading size="md" color="red.400">Error</Heading>
            <Alert status="error" variant="solid">
              <AlertIcon />
              <AlertDescription>{error || gameError || "An unknown error occurred"}</AlertDescription>
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
      break;
      
    case 'need-wallet':
      renderContent = (
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
      break;
      
    case 'need-embedded-wallet':
      renderContent = (
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
      break;
      
    case 'need-character':
      renderContent = (
        <Center height="100vh" className="bg-gray-900" color="white">
          <VStack spacing={6} maxWidth="600px" p={6}>
            <Image 
              src="/BattleNadsLogo.png" 
              alt="Battle Nads Logo"
              width="300px"
              maxWidth="80%"
              objectFit="contain"
              mb={4}
            />
            <Heading size="md" color="blue.400">Character Required</Heading>
            <Text color="white" textAlign="center">
              You don't have a character yet. Create one to start playing!
              Characters are stored on the Monad blockchain and associated with your owner wallet address ({injectedWallet && injectedWallet.address ? injectedWallet.address.slice(0, 6) : ''}...{injectedWallet && injectedWallet.address ? injectedWallet.address.slice(-4) : ''}).
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
      break;
      
    case 'session-key-warning':
      // Check if we should show session key warning (skip if character ID is zero/null)
      const isZeroCharacterId = !character || !character.id || character.id === "0x0000000000000000000000000000000000000000000000000000000000000000";

      if (sessionKeyWarning && !isZeroCharacterId) {
        renderContent = (
          <Center height="100vh" className="bg-gray-900" color="white">
            <VStack spacing={6} maxWidth="600px" p={6}>
              <Image 
                src="/BattleNadsLogo.png" 
                alt="Battle Nads Logo"
                width="300px"
                maxWidth="80%"
                objectFit="contain"
                mb={4}
              />
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
      } else {
        // If we're skipping the session key warning, we should proceed to character creation/selection
        renderContent = (
          <Center height="100vh" className="bg-gray-900" color="white">
            <VStack spacing={6}>
              <Image 
                src="/BattleNadsLogo.png" 
                alt="Battle Nads Logo"
                width="300px"
                maxWidth="80%"
                objectFit="contain"
                mb={4}
              />
              <Text fontSize="xl" color="white">Preparing game environment...</Text>
              <Button onClick={initializeGame} colorScheme="blue">Continue</Button>
            </VStack>
          </Center>
        );
      }
      break;
      
    case 'ready':
      // Main game UI - only render when we have a character and initialization is complete
      if (!character) {
        renderContent = (
          <Center height="100vh" className="bg-gray-900" color="white">
            <VStack spacing={6}>
              <Image 
                src="/BattleNadsLogo.png" 
                alt="Battle Nads Logo"
                width="300px"
                maxWidth="80%"
                objectFit="contain"
                mb={4}
              />
              <Text fontSize="xl" color="white">Character data not available</Text>
              <Button onClick={() => loadCharacterData((character as any)?.id || characterId || '')} colorScheme="blue">Retry Loading</Button>
            </VStack>
          </Center>
        );
      } else {
        renderContent = (
          <Box height="calc(100vh - 60px)" position="relative">
            {/* Add a fixed button to toggle debug panel */}
            <Box position="fixed" right="20px" bottom="20px" zIndex={1000}>
              <IconButton
                aria-label="Debug Tools"
                icon={<Text fontSize="xs">DEBUG</Text>}
                onClick={onOpen}
                colorScheme="purple"
                size="sm"
              />
            </Box>
            
            {/* Debug Panel Modal */}
            <Modal isOpen={isOpen} onClose={onClose} size="xl">
              <ModalOverlay />
              <ModalContent bg="gray.900" color="white" maxWidth="90vw">
                <ModalHeader>Debug Panel</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                  <DebugPanel />
                </ModalBody>
                <ModalFooter>
                  <Button colorScheme="gray" mr={3} onClick={onClose}>
                    Close
                  </Button>
                </ModalFooter>
              </ModalContent>
            </Modal>

            <Flex height="100%" flexDirection="column">
              <Flex flexGrow={1} overflow="hidden">
                <Box flexBasis="70%" height="100%" width="100%" position="relative">
                  {/* Simple placeholder that has debugging info instead of the GameBoard */}
                  <Box p={4} bg="gray.800" height="100%" overflow="auto">
                    <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={4}>
                      {/* Character Section */}
                      <Box bg="gray.700" p={4} borderRadius="md">
                        <Heading size="md" mb={4}>Character</Heading>
                        {/* Character Card shows stats, health, equipment */}
                        <CharacterCard character={character} />
                      </Box>
                      
                      {/* Movement Section */}
                      <Box bg="gray.700" p={4} borderRadius="md">
                        <Heading size="md" mb={4}>Movement</Heading>
                        
                        {/* Location Information */}
                        <Box mb={4} bg="gray.800" p={2} borderRadius="md">
                          <Text fontWeight="bold" mb={1}>Location</Text>
                          <Text fontSize="sm">
                            Depth: {position.depth}, Position: ({position.x}, {position.y})
                          </Text>
                        </Box>
                        
                        {/* Replace the manual movement buttons with MovementControls component */}
                        <MovementControls
                          onMove={handleMovement}
                          isDisabled={isMoving || isAttacking}
                          initialPosition={position}
                        />
                      </Box>
                      
                      {/* Combat Section */}
                      <Box bg="gray.700" p={4} borderRadius="md">
                        <Heading size="md" mb={4}>Combat</Heading>
                        {combatants.length > 0 ? (
                          <VStack align="stretch" spacing={2}>
                            {combatants.map((enemy, index) => {
                              // Safely extract properties from either BattleNad or BattleNadLite
                              const name = enemy.name || 'Unknown';
                              const level = 'level' in enemy ? enemy.level : ('stats' in enemy ? enemy.stats?.level : 1);
                              const health = 'health' in enemy ? enemy.health : ('stats' in enemy ? enemy.stats?.health : 0);
                              const maxHealth = 'maxHealth' in enemy ? enemy.maxHealth : 
                                ('stats' in enemy && enemy.stats?.maxHealth) ? enemy.stats.maxHealth : 
                                ('stats' in enemy) ? calculateMaxHealth(enemy.stats) : 100;
                              
                              return (
                                <Box 
                                  key={index} 
                                  p={3} 
                                  bg="gray.600" 
                                  borderRadius="md"
                                >
                                  <HStack justify="space-between" align="flex-start">
                                    <VStack align="stretch" spacing={2} flex="1">
                                      <Flex justify="space-between" align="center">
                                        <Text fontWeight="bold" fontSize="sm">{name}</Text>
                                        <Badge colorScheme="purple" fontSize="xs" p={1}>
                                          Level {level || 1}
                                        </Badge>
                                      </Flex>
                                      <Box>
                                        <Flex justify="space-between" mb={1}>
                                          <Text fontSize="xs">Health</Text>
                                          <Text fontSize="xs">
                                            {Number(health || 0)} / {Number(maxHealth || 1)}
                                          </Text>
                                        </Flex>
                                        <Progress 
                                          value={(Number(health || 0) / Number(maxHealth || 1)) * 100} 
                                          colorScheme="green" 
                                          size="xs" 
                                        />
                                      </Box>
                                    </VStack>
                                    <Button
                                      colorScheme="red"
                                      onClick={() => handleAttack(index)}
                                      isLoading={isAttacking}
                                      size="sm"
                                    >
                                      Attack
                                    </Button>
                                  </HStack>
                                </Box>
                              );
                            })}
                          </VStack>
                        ) : (
                          <Alert status="info" variant="subtle">
                            <AlertIcon />
                            No combatants in this area
                          </Alert>
                        )}
                      </Box>
                    </SimpleGrid>
                  </Box>
                </Box>
                <Box flexBasis="30%" bg="gray.900" height="100%" overflowY="auto">
                  <DataFeed
                    key="singleton-data-feed"
                    characterId={character?.id || characterId || ''}
                    sendChatMessage={handleSendChatMessage}
                  />
                </Box>
              </Flex>
              <Box>
                {StableWalletBalances}
              </Box>
            </Flex>
          </Box>
        );
      }
      break;
      
    default:
      renderContent = (
        <Center height="100vh" className="bg-gray-900" color="white">
          <VStack spacing={6}>
            <Image 
              src="/BattleNadsLogo.png" 
              alt="Battle Nads Logo"
              width="300px"
              maxWidth="80%"
              objectFit="contain"
              mb={4}
            />
            <Spinner size="xl" thickness="4px" speed="0.8s" color="blue.500" />
            <Text fontSize="xl" color="white">Loading game...</Text>
          </VStack>
        </Center>
      );
      break;
  }

  // Add debugging for zero position values
  React.useEffect(() => {
    if (character && character.position?.x === 0 && character.position?.y === 0) {
      console.log("[DEBUG] Zero position detected:", {
        position: character.position,
        characterId: character.id,
        characterStats: character.stats,
        hasStatsXY: character.stats?.x !== undefined && character.stats?.y !== undefined,
        statsX: character.stats?.x,
        statsY: character.stats?.y,
        statsDepth: character.stats?.depth
      });
    }
  }, [character]);

  // Add debug logging for position changes
  useEffect(() => {
    console.log("[Game] Position state changed:", position);
  }, [position]);

  return (
    <>
      {/* Always render DataFeed in hidden container to keep it alive */}
      <div style={{ display: 'none', position: 'absolute', zIndex: -1 }}>
        <DataFeed
          key="persistent-data-feed"
          characterId={character?.id || characterId || ''}
          sendChatMessage={handleSendChatMessage}
        />
      </div>
      
      {/* Render main content based on state */}
      {renderContent}
    </>
  );
};

export default Game;
