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
  const [character, setCharacter] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0, depth: 1 });
  const [combatants, setCombatants] = useState<Combatant[]>([]);
  const [noncombatants, setNoncombatants] = useState<Combatant[]>([]);
  const [selectedCombatant, setSelectedCombatant] = useState<Combatant | null>(null);
  const [combatLog, setCombatLog] = useState<string[]>([]);
  const [isInCombat, setIsInCombat] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [isAttacking, setIsAttacking] = useState(false);
  const [movementOptions, setMovementOptions] = useState<any | null>(null);
  const [loadingComplete, setLoadingComplete] = useState<boolean>(false);
  const [areaInfo, setAreaInfo] = useState<any>(null);
  const [equipmentInfo, setEquipmentInfo] = useState<any>(null);

  // Reference to track initial load state
  const isInitialLoadComplete = useRef(false);
  const hasLoadedData = useRef(false);
  const hasInitialized = useRef(false);
  
  const toast = useToast();

  // Helper function to add messages to combat log
  const addToCombatLog = (message: string) => {
    setCombatLog(prev => [message, ...prev].slice(0, 20));
  };

  // Load character data from chain
  const loadCharacterData = async () => {
    try {
      setLoading(true);
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
      
      // Handle frontend data based on its structure
      if (typeof frontendDataRaw === 'object') {
        // Access as an object with named properties
        if (frontendDataRaw.character) {
          // It's a structured object with named properties
          console.log("Setting character data from object structure");
          setCharacter(frontendDataRaw.character);
          setCombatants(frontendDataRaw.combatants || []);
          setNoncombatants(frontendDataRaw.noncombatants || []);
          
          // Set equipment
          if (frontendDataRaw.equipment) {
            setEquipmentInfo(frontendDataRaw.equipment);
          }
          
          // Set position based on character stats
          if (frontendDataRaw.character?.stats) {
            const pos = {
              x: Number(frontendDataRaw.character.stats.x || 0),
              y: Number(frontendDataRaw.character.stats.y || 0),
              depth: Number(frontendDataRaw.character.stats.depth || 1),
            };
            setPosition(pos);
          }
          
          // Process miniMap if available
          if (frontendDataRaw.miniMap && frontendDataRaw.miniMap[2] && frontendDataRaw.miniMap[2][2]) {
            const currentArea = frontendDataRaw.miniMap[2][2];
            setAreaInfo(currentArea);
            addToCombatLog(`Area has ${currentArea.playerCount || 0} players and ${currentArea.monsterCount || 0} monsters.`);
          }
          
          // Check if in combat
          const hasActiveCombatants = frontendDataRaw.combatants && frontendDataRaw.combatants.length > 0;
          setIsInCombat(hasActiveCombatants);
          
          if (hasActiveCombatants) {
            addToCombatLog(`You are in combat with ${frontendDataRaw.combatants.length} enemies!`);
          }
        } else if (Array.isArray(frontendDataRaw)) {
          // It's an array structure (tuple return from contract)
          console.log("Setting character data from array structure");
          
          // Typically index 0 is character data
          if (frontendDataRaw[0]) {
            setCharacter(frontendDataRaw[0]);
            
            // Set position based on character stats
            if (frontendDataRaw[0].stats) {
              const pos = {
                x: Number(frontendDataRaw[0].stats.x || 0),
                y: Number(frontendDataRaw[0].stats.y || 0),
                depth: Number(frontendDataRaw[0].stats.depth || 1),
              };
              setPosition(pos);
            }
          }
          
          // Index 1 is usually combatants, index 2 is noncombatants
          setCombatants(Array.isArray(frontendDataRaw[1]) ? frontendDataRaw[1] : []);
          setNoncombatants(Array.isArray(frontendDataRaw[2]) ? frontendDataRaw[2] : []);
          
          // Process miniMap if available at index 3
          if (frontendDataRaw[3] && frontendDataRaw[3][2] && frontendDataRaw[3][2][2]) {
            const currentArea = frontendDataRaw[3][2][2];
            setAreaInfo(currentArea);
            addToCombatLog(`Area has ${currentArea.playerCount || 0} players and ${currentArea.monsterCount || 0} monsters.`);
          }
          
          // Equipment info - depends on contract format
          const equipmentInfo = {
            weapons: {
              ids: frontendDataRaw[4] || [],
              names: frontendDataRaw[5] || [],
              currentId: 0
            },
            armor: {
              ids: frontendDataRaw[6] || [],
              names: frontendDataRaw[7] || [],
              currentId: 0
            }
          };
          setEquipmentInfo(equipmentInfo);
          
          // Check if in combat
          const hasActiveCombatants = Array.isArray(frontendDataRaw[1]) && frontendDataRaw[1].length > 0;
          setIsInCombat(hasActiveCombatants);
          
          if (hasActiveCombatants) {
            addToCombatLog(`You are in combat with ${frontendDataRaw[1].length} enemies!`);
          } else if (Array.isArray(frontendDataRaw[2]) && frontendDataRaw[2].length > 0) {
            // Filter monsters from noncombatants
            const monsters = frontendDataRaw[2].filter((c: any) => 
              c?.stats?.isMonster && c.id !== charToUse
            );
            
            if (monsters.length > 0) {
              addToCombatLog(`There are ${monsters.length} monsters in this area.`);
            } else {
              addToCombatLog("This area is safe... for now.");
            }
          }
        }
      }
      
      // Set movement options based on position
      setMovementOptions({
        canMoveNorth: position.y < 100,
        canMoveSouth: position.y > 1,
        canMoveEast: position.x < 100,
        canMoveWest: position.x > 1,
        canMoveUp: position.depth < 10,
        canMoveDown: position.depth > 1
      });
      
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

  // Handle player movement
  const handleMove = async (direction: 'north' | 'south' | 'east' | 'west' | 'up' | 'down') => {
    if (!characterId) {
      toast({
        title: "No character found",
        description: "Character ID not found",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    if (isInCombat) {
      toast({
        title: "Cannot move",
        description: "You can't move while in combat. Defeat all enemies first!",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    // Check if movement in this direction is allowed
    if (!isDirectionAllowed(direction)) {
      toast({
        title: "Cannot move " + direction,
        description: `Movement ${direction} is not possible from your current position.`,
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    // Don't allow movement if we're already moving or loading
    if (isMoving || loading) return;
    
    try {
      setIsMoving(true);
      addToCombatLog(`Attempting to move ${direction}...`);
      
      // Call the blockchain to move the character
      await moveCharacter(characterId, direction);
      
      addToCombatLog(`Successfully moved ${direction}!`);
      
      // Use getFrontendData to refresh all game state at once after movement
      const frontendData = await getFrontendData(characterId);
      if (frontendData) {
        // Update character
        setCharacter(frontendData.character);
        
        // Update position
        const newPos = {
          x: Number(frontendData.character.stats.x),
          y: Number(frontendData.character.stats.y),
          depth: Number(frontendData.character.stats.depth)
        };
        setPosition(newPos);
        
        // Update combatants and area info
        setCombatants(frontendData.combatants || []);
        setNoncombatants(frontendData.noncombatants || []);
        
        // Set area info from miniMap
        if (frontendData.miniMap && frontendData.miniMap[2] && frontendData.miniMap[2][2]) {
          setAreaInfo(frontendData.miniMap[2][2]);
        }
        
        // Update combat state
        const hasActiveCombatants = frontendData.combatants && frontendData.combatants.length > 0;
        setIsInCombat(hasActiveCombatants);
        
        // Construct movement options from miniMap
        const mapCenter = newPos;
        setMovementOptions({
          canMoveNorth: mapCenter.y < 100, // Placeholder logic, replace with actual map bounds
          canMoveSouth: mapCenter.y > 1,
          canMoveEast: mapCenter.x < 100,
          canMoveWest: mapCenter.x > 1,
          canMoveUp: mapCenter.depth < 10,
          canMoveDown: mapCenter.depth > 1
        });
      }
    } catch (err) {
      console.error(`Error moving ${direction}:`, err);
      // Don't set local error for movement errors - use toast instead
      toast({
        title: `Movement failed`,
        description: `Could not move ${direction}: ${err instanceof Error ? err.message : String(err)}`,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      
      addToCombatLog(`Failed to move ${direction}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsMoving(false);
    }
  };

  // Check if movement in a direction is allowed
  const isDirectionAllowed = (direction: string) => {
    switch (direction) {
      case 'north': return movementOptions?.canMoveNorth;
      case 'south': return movementOptions?.canMoveSouth;
      case 'east': return movementOptions?.canMoveEast;
      case 'west': return movementOptions?.canMoveWest;
      case 'up': return movementOptions?.canMoveUp;
      case 'down': return movementOptions?.canMoveDown;
      default: return false;
    }
  };

  // Handle attack action
  const handleAttack = async () => {
    if (!characterId) {
      toast({
        title: "No character found",
        description: "Character ID not found",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    if (!selectedCombatant) {
      toast({
        title: "No target",
        description: "You need to select a target to attack",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    if (isAttacking) return;
    
    try {
      setIsAttacking(true);
      addToCombatLog(`Attacking ${selectedCombatant.name || "enemy"}...`);
      
      // First get attack options to find the target index
      const attackOptions = await getAttackOptions(characterId);
      
      if (!attackOptions || !attackOptions.canAttack) {
        addToCombatLog("You cannot attack at this time.");
        return;
      }
      
      // Find the target index for the selected combatant
      const targetIndex = findTargetIndex(attackOptions.targets, selectedCombatant.id);
      
      if (targetIndex === -1) {
        addToCombatLog(`Cannot find target index for ${selectedCombatant.name || "enemy"}.`);
        return;
      }
      
      // Call the blockchain to attack
      await attackTarget(characterId, targetIndex);
      
      addToCombatLog(`Attack against ${selectedCombatant.name || "enemy"} was successful!`);
      
      // Refresh character and combat data
      const frontendData = await getFrontendData(characterId);
      if (frontendData) {
        // Update character
        setCharacter(frontendData.character);
        
        // Update combatants and area info
        setCombatants(frontendData.combatants || []);
        setNoncombatants(frontendData.noncombatants || []);
        
        // Update combat state
        const hasActiveCombatants = frontendData.combatants && frontendData.combatants.length > 0;
        setIsInCombat(hasActiveCombatants);
        
        if (hasActiveCombatants) {
          addToCombatLog(`Combat continues with ${frontendData.combatants.length} enemies.`);
        } else {
          addToCombatLog("Combat has ended! You can now move again.");
          setSelectedCombatant(null);
        }
      }
    } catch (err) {
      console.error("Error attacking:", err);
      addToCombatLog(`Error attacking: ${err instanceof Error ? err.message : String(err)}`);
      toast({
        title: "Attack Error",
        description: `Failed to attack: ${err instanceof Error ? err.message : String(err)}`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsAttacking(false);
    }
  };

  // Helper function to find target index from target IDs
  const findTargetIndex = (targets: string[], targetId: string) => {
    if (!targets || targets.length === 0) return -1;
    return targets.findIndex(id => id === targetId);
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

  // Show loading state during initialization
  if (loading || isMoving || isAttacking || status.startsWith('checking') || status === 'updating-session-key') {
    const messageMap: Record<string, string> = {
      'checking': 'Initializing game...',
      'checking-owner-wallet': 'Checking if owner wallet is connected...',
      'checking-embedded-wallet': 'Checking if session key is available...',
      'checking-character': 'Checking if character exists...',
      'checking-session-key': 'Verifying session key...',
      'updating-session-key': 'Updating session key...',
    };
    
    const loadingMessage = isMoving 
      ? "Moving..." 
      : isAttacking 
        ? "Attacking..." 
        : status.startsWith('checking') || status === 'updating-session-key'
          ? messageMap[status] || 'Loading Battle-Nads game data...'
          : 'Loading Battle-Nads game data...';
    
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
    <Box minH="100vh" className="bg-gray-900" py={6}>
      <Container maxW="1400px">
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} px={4}>
          {/* Left column: Character and Controls */}
          <VStack spacing={6} align="stretch">
            <Box p={6} borderRadius="lg" boxShadow="lg" bg="#2e354c" borderWidth={1} borderColor="gray.600">
              <Heading as="h2" size="lg" mb={4} display="flex" alignItems="center" justifyContent="space-between" color="white">
                <Box>{character.name}</Box>
                <Badge colorScheme="green" fontSize="md" py={1} px={3} borderRadius="md">Level {character.stats.level}</Badge>
              </Heading>
              
              <VStack spacing={4} align="stretch">
                <Box>
                  <Flex justify="space-between" mb={1}>
                    <Text fontWeight="bold" color="white">Health:</Text>
                    <Text color="white">{character.stats.health} / {(Number(character.stats.vitality) * 10)}</Text>
                  </Flex>
                  <Progress 
                    value={(Number(character.stats.health) / (Number(character.stats.vitality) * 10)) * 100} 
                    colorScheme="green" 
                    size="md"
                    borderRadius="md" 
                  />
                </Box>
                
                <SimpleGrid columns={2} spacing={4} mt={2}>
                  <Box>
                    <Text fontSize="sm" color="gray.300">Experience</Text>
                    <Text fontWeight="bold" fontSize="lg" color="white">{character.stats.experience}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="gray.300">Position</Text>
                    <Text fontWeight="bold" fontSize="lg" color="white">{`(${position.x}, ${position.y}) D:${position.depth}`}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="gray.300">Strength</Text>
                    <Text fontWeight="bold" fontSize="lg" color="white">{character.stats.strength}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="gray.300">Dexterity</Text>
                    <Text fontWeight="bold" fontSize="lg" color="white">{character.stats.dexterity}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="gray.300">Vitality</Text>
                    <Text fontWeight="bold" fontSize="lg" color="white">{character.stats.vitality}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="gray.300">Luck</Text>
                    <Text fontWeight="bold" fontSize="lg" color="white">{character.stats.luck}</Text>
                  </Box>
                </SimpleGrid>
                
                <Divider borderColor="gray.500" />
                
                <SimpleGrid columns={2} spacing={4}>
                  <Box bg="#1e3a5f" p={2} borderRadius="md">
                    <Text fontSize="sm" color="gray.300">Weapon</Text>
                    <Text fontWeight="bold" color="white">{character.weapon.name}</Text>
                  </Box>
                  <Box bg="#3c2f5a" p={2} borderRadius="md">
                    <Text fontSize="sm" color="gray.300">Armor</Text>
                    <Text fontWeight="bold" color="white">{character.armor.name}</Text>
                  </Box>
                </SimpleGrid>
              </VStack>
            </Box>
            
            {/* Movement Controls */}
            <Box p={6} borderRadius="lg" boxShadow="lg" bg="#2e354c" borderWidth={1} borderColor="gray.600">
              <Heading as="h3" size="md" mb={4} color="white">Movement</Heading>
              
              <VStack spacing={3}>
                <IconButton 
                  aria-label="Move North" 
                  icon={<ChevronUpIcon boxSize={8} />}
                  onClick={() => handleMove('north')}
                  isDisabled={isInCombat || !movementOptions?.canMoveNorth}
                  size="lg"
                  colorScheme={movementOptions?.canMoveNorth && !isInCombat ? "blue" : "gray"}
                  height="60px"
                />
                <HStack spacing={3}>
                  <IconButton 
                    aria-label="Move West" 
                    icon={<ChevronLeftIcon boxSize={8} />}
                    onClick={() => handleMove('west')}
                    isDisabled={isInCombat || !movementOptions?.canMoveWest}
                    size="lg"
                    colorScheme={movementOptions?.canMoveWest && !isInCombat ? "blue" : "gray"}
                    height="60px"
                    width="60px"
                  />
                  <Box
                    w="60px"
                    h="60px"
                    borderRadius="md"
                    bg="blue.600"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    border="3px solid"
                    borderColor="blue.300"
                  >
                    <Text fontWeight="bold" fontSize="2xl" color="white">@</Text>
                  </Box>
                  <IconButton 
                    aria-label="Move East" 
                    icon={<ChevronRightIcon boxSize={8} />}
                    onClick={() => handleMove('east')}
                    isDisabled={isInCombat || !movementOptions?.canMoveEast}
                    size="lg"
                    colorScheme={movementOptions?.canMoveEast && !isInCombat ? "blue" : "gray"}
                    height="60px"
                    width="60px"
                  />
                </HStack>
                <IconButton 
                  aria-label="Move South" 
                  icon={<ChevronDownIcon boxSize={8} />}
                  onClick={() => handleMove('south')}
                  isDisabled={isInCombat || !movementOptions?.canMoveSouth}
                  size="lg"
                  colorScheme={movementOptions?.canMoveSouth && !isInCombat ? "blue" : "gray"}
                  height="60px"
                />
              </VStack>
              
              {isInCombat && (
                <Alert status="warning" mt={4} borderRadius="md" color="black">
                  <AlertIcon />
                  <Text>You must defeat all enemies before moving</Text>
                </Alert>
              )}

              <HStack spacing={4} mt={5} justifyContent="center">
                <Button
                  leftIcon={<ChevronUpIcon />}
                  onClick={() => handleMove('up')}
                  isDisabled={isInCombat || !movementOptions?.canMoveUp}
                  colorScheme={movementOptions?.canMoveUp && !isInCombat ? "cyan" : "gray"}
                  size="md"
                  width="100px"
                >
                  Up
                </Button>
                <Button
                  leftIcon={<ChevronDownIcon />}
                  onClick={() => handleMove('down')}
                  isDisabled={isInCombat || !movementOptions?.canMoveDown}
                  colorScheme={movementOptions?.canMoveDown && !isInCombat ? "cyan" : "gray"}
                  size="md"
                  width="100px"
                >
                  Down
                </Button>
              </HStack>
            </Box>
            
            {/* Minimap */}
            <Box p={6} borderRadius="lg" boxShadow="lg" bg="#2e354c" borderWidth={1} borderColor="gray.600">
              <Heading as="h3" size="md" mb={4} color="white">Minimap</Heading>
              <Box height="180px">
                {renderMinimap()}
              </Box>
              <Flex justify="center" mt={3} fontSize="sm">
                <Badge colorScheme="blue" mx={1}>You</Badge>
                <Badge colorScheme="red" mx={1}>Monsters</Badge>
                <Badge colorScheme="gray" mx={1}>Out of bounds</Badge>
              </Flex>
            </Box>
          </VStack>
          
          {/* Right column: Combat and Logs */}
          <VStack spacing={6} align="stretch">
            {/* Combat section */}
            <Box p={6} borderRadius="lg" boxShadow="lg" bg="#2e354c" borderWidth={1} borderColor="gray.600">
              <Heading as="h3" size="md" mb={4} color="white">Combat</Heading>
              
              {combatants.length > 0 ? (
                <VStack spacing={4} align="stretch">
                  <Text fontWeight="bold" fontSize="lg" color="red.300">
                    {combatants.length} {combatants.length === 1 ? 'Enemy' : 'Enemies'} in this area:
                  </Text>
                  
                  {combatants.map(combatant => (
                    <Box 
                      key={combatant.id}
                      p={3}
                      borderWidth={2}
                      borderRadius="md"
                      borderColor={selectedCombatant?.id === combatant.id ? "red.500" : "gray.600"}
                      bg={selectedCombatant?.id === combatant.id ? "rgba(229, 62, 62, 0.2)" : "#1a1f2c"}
                      onClick={() => setSelectedCombatant(combatant)}
                      cursor="pointer"
                      _hover={{ bg: "rgba(229, 62, 62, 0.1)" }}
                      transition="all 0.2s"
                    >
                      <Flex justify="space-between" align="center" mb={1}>
                        <Text fontWeight="bold" fontSize="lg" color={selectedCombatant?.id === combatant.id ? "red.300" : "white"}>
                          {combatant.name || `Monster #${combatant.stats.index}`}
                        </Text>
                        <Badge colorScheme="purple">Level {combatant.stats.level}</Badge>
                      </Flex>
                      <Flex justify="space-between" fontSize="sm" mb={1}>
                        <Text color="white">Health: {combatant.stats.health}</Text>
                        <Text color="white">Strength: {combatant.stats.strength}</Text>
                      </Flex>
                      <Progress 
                        value={(Number(combatant.stats.health) / (100 + Number(combatant.stats.level) * 50)) * 100} 
                        colorScheme="red" 
                        size="sm" 
                        mt={1}
                        borderRadius="full"
                      />
                    </Box>
                  ))}
                  
                  <Button 
                    colorScheme="red" 
                    onClick={handleAttack}
                    isDisabled={!selectedCombatant || isAttacking}
                    mt={2}
                    size="lg"
                    height="60px"
                    leftIcon={<Box as="span" fontSize="2xl">⚔️</Box>}
                  >
                    Attack {selectedCombatant ? (selectedCombatant.name || "Selected Target") : ""}
                  </Button>
                </VStack>
              ) : (
                <Box bg="#1a1f2c" p={5} borderRadius="md" textAlign="center">
                  <Text fontSize="lg" color="white">No enemies in this area. You are safe to move.</Text>
                  <Text color="green.300" mt={2} fontSize="sm">Explore to find monsters and gain experience!</Text>
                </Box>
              )}
            </Box>
            
            {/* Combat Log */}
            <Box 
              p={6} 
              borderRadius="lg" 
              boxShadow="lg" 
              bg="#2e354c" 
              borderWidth={1} 
              borderColor="gray.600" 
              flex="1" 
              minH="350px"
              display="flex"
              flexDirection="column"
            >
              <Heading as="h3" size="md" mb={4} color="white">Combat Log</Heading>
              
              <Box 
                flex="1" 
                bg="#1a1f2c" 
                borderRadius="md" 
                p={3} 
                overflowY="auto" 
                css={{
                  '&::-webkit-scrollbar': {
                    width: '8px',
                  },
                  '&::-webkit-scrollbar-track': {
                    background: '#2D3748',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: '#4A5568',
                    borderRadius: '4px',
                  },
                }}
              >
                {combatLog.length > 0 ? (
                  <VStack spacing={0} align="stretch">
                    {combatLog.map((log, i) => (
                      <Text 
                        key={i} 
                        fontSize="md" 
                        p={2} 
                        borderBottom="1px solid" 
                        borderColor="gray.700"
                        color={
                          log.includes("Error") ? "red.300" :
                          log.includes("success") ? "green.300" :
                          log.includes("combat") ? "orange.300" :
                          log.includes("move") ? "blue.300" :
                          "white"
                        }
                      >
                        {log}
                      </Text>
                    ))}
                  </VStack>
                ) : (
                  <Center h="100%">
                    <Text fontSize="md" color="gray.400">No combat activity yet.</Text>
                  </Center>
                )}
              </Box>
            </Box>
          </VStack>
        </SimpleGrid>
      </Container>
    </Box>
  );
};

export default Game;
