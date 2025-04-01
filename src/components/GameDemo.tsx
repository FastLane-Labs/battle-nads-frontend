import React, { useEffect, useState, ReactNode, useRef } from 'react';
import { 
  Box, 
  Heading, 
  Center, 
  VStack, 
  HStack,
  Text, 
  Grid, 
  GridItem,
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
import { useWallet } from '../providers/WalletProvider';
import { useBattleNads } from '../hooks/useBattleNads';
import { ChevronUpIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
interface Combatant {
  id: string;
  stats: any;
  name: string;
  weapon?: any;
  armor?: any;
}

const GameDemo: React.FC = () => {
  const { address, injectedWallet } = useWallet();
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
    error: hookError 
  } = useBattleNads();
  
  const [characterId, setCharacterId] = useState<string | null>(null);
  const [character, setCharacter] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
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
  const [privyError, setPrivyError] = useState<boolean>(false);
  const [cspError, setCspError] = useState<boolean>(false);
  
  // Create a ref at the top level of the component to track initial load state
  const isInitialLoadComplete = useRef(false);
  
  const toast = useToast();

  // Monitor for CSP errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const errorMsg = event.message || '';
      if (
        errorMsg.includes('Content Security Policy') ||
        errorMsg.includes('CSP') ||
        errorMsg.includes('Refused to connect')
      ) {
        console.warn("CSP error detected:", errorMsg);
        setCspError(true);
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // Handle Privy authentication errors
  useEffect(() => {
    const checkPrivyStatus = setTimeout(() => {
      if (!address && !loading) {
        console.warn("Privy authentication may have failed to load properly");
        setPrivyError(true);
      }
    }, 8000); // Wait 8 seconds to see if authentication completes

    return () => clearTimeout(checkPrivyStatus);
  }, [address, loading]);

  // Initial load of character data
  useEffect(() => {
    // Skip if we've already completed initial load or hooks are still loading
    if (isInitialLoadComplete.current || hookLoading) {
      console.log("Skipping character load - already loaded or hooks loading");
      return;
    }
    
    // First, check localStorage for existing character ID
    const storedCharacterId = localStorage.getItem('battleNadsCharacterId');
    if (storedCharacterId) {
      console.log("Found character ID in localStorage, using it directly:", storedCharacterId);
      loadCharacterData(storedCharacterId);
      isInitialLoadComplete.current = true;
      return;
    }

    // Only continue with owner wallet check if no character in localStorage
    const hasOwnerWallet = injectedWallet?.address ? true : false;
    
    if (!hasOwnerWallet) {
      console.log("No owner wallet connected and no character in localStorage. Please connect your wallet.");
      setLoadingComplete(true);
      isInitialLoadComplete.current = true;
      return;
    }

    let retryCount = 0;
    const maxRetries = 3;
    let retryTimer: NodeJS.Timeout;

    const fetchCharacter = async (retry = 0) => {
      try {
        setLoading(true);
        console.log(`Attempt ${retry + 1} to fetch character data using owner address: ${injectedWallet?.address}`);
        
        // Get character ID using ONLY the owner wallet address
        const characterId = await getPlayerCharacterID();
        
        if (characterId) {
          console.log("Character ID found:", characterId);
          loadCharacterData(characterId);
          isInitialLoadComplete.current = true;
        } else {
          // No character found
          console.log("No character found for owner address, showing creation button");
          setLoadingComplete(true);
          isInitialLoadComplete.current = true;
        }
      } catch (err) {
        console.error(`Error fetching character (attempt ${retry + 1}):`, err);
        setError(`Error fetching character: ${err instanceof Error ? err.message : String(err)}`);
        
        // Retry after a short delay if we're still within retry limits
        if (retry < maxRetries) {
          console.log(`Will retry after error in 1.5 seconds (attempt ${retry + 1} of ${maxRetries})`);
          retryTimer = setTimeout(() => fetchCharacter(retry + 1), 1500);
        } else {
          setLoadingComplete(true);
          isInitialLoadComplete.current = true;
        }
      } finally {
        setLoading(false);
      }
    };

    // Execute fetchCharacter for owner wallet check
    fetchCharacter(retryCount);
    
    // Clean up any pending retries when component unmounts or dependencies change
    return () => {
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, []);
  
  // Modify the loadCharacterData function to prevent reloading the same data
  const loadCharacterData = async (characterIdParam: string) => {
    // Skip if we're already loading or if the character ID is the same and we've already loaded it
    if (loading || (characterId === characterIdParam && loadingComplete)) {
      console.log("Skipping loadCharacterData - already loading or data already loaded");
      return;
    }
    
    try {
      setLoading(true);
      console.log("Loading character data for ID:", characterIdParam);
      
      // Only update characterId state if it's actually different to prevent re-renders
      if (characterId !== characterIdParam) {
        setCharacterId(characterIdParam);
        // Store in localStorage for persistence
        localStorage.setItem('battleNadsCharacterId', characterIdParam);
      }
      
      // Use getFrontendData to get all game data in one call
      const frontendData = await getFrontendData(characterIdParam);
      if (frontendData) {
        console.log("Frontend data loaded successfully:", frontendData);
        
        // Set character data
        setCharacter(frontendData.character);
        
        // Set combatants and noncombatants
        setCombatants(frontendData.combatants || []);
        setNoncombatants(frontendData.noncombatants || []);
        
        // Set equipment info
        setEquipmentInfo(frontendData.equipment);
        
        // Initialize position from character data
        const pos = {
          x: Number(frontendData.character.stats.x),
          y: Number(frontendData.character.stats.y),
          depth: Number(frontendData.character.stats.depth)
        };
        setPosition(pos);
        
        // Set area info from miniMap
        if (frontendData.miniMap && frontendData.miniMap[2] && frontendData.miniMap[2][2]) {
          // Center of miniMap is the current area
          setAreaInfo(frontendData.miniMap[2][2]);
          
          // Add to combat log
          const currentArea = frontendData.miniMap[2][2];
          addToCombatLog(`Area has ${currentArea.monsterCount} monsters and ${currentArea.playerCount} players.`);
        }
        
        // Determine if we're in combat
        const hasActiveCombatants = frontendData.combatants && frontendData.combatants.length > 0;
        setIsInCombat(hasActiveCombatants);
        
        if (hasActiveCombatants) {
          addToCombatLog(`You are in combat with ${frontendData.combatants.length} enemies!`);
        } else if (frontendData.noncombatants.length > 0) {
          // Filter monsters from noncombatants if needed
          const monsters = frontendData.noncombatants.filter((c: any) => 
            c.stats.isMonster && c.id !== characterIdParam
          );
          
          if (monsters.length > 0) {
            addToCombatLog(`There are ${monsters.length} monsters in this area.`);
          } else {
            addToCombatLog("This area is safe... for now.");
          }
        }
        
        // Set movement options based on data returned
        // This is derived from the unallocatedAttributePoints field in getFrontendData
        // Construct movement options from miniMap if needed
        const mapCenter = position;
        setMovementOptions({
          canMoveNorth: mapCenter.y < 100, // Placeholder logic, replace with actual map bounds
          canMoveSouth: mapCenter.y > 1,
          canMoveEast: mapCenter.x < 100,
          canMoveWest: mapCenter.x > 1,
          canMoveUp: mapCenter.depth < 10,
          canMoveDown: mapCenter.depth > 1
        });
        
        console.log("Character fully loaded and ready to play!");
        
        // Set loading complete to prevent unnecessary reloads
        setLoadingComplete(true);
      } else {
        console.error("Failed to load frontend data for ID:", characterIdParam);
        // If we can't load character data, clear localStorage as it might be invalid
        localStorage.removeItem('battleNadsCharacterId');
        setError("Failed to load character data. Please try creating a new character.");
        setLoadingComplete(true);
      }
    } catch (err) {
      console.error("Error loading character data:", err);
      setError(`Error loading character data: ${err instanceof Error ? err.message : String(err)}`);
      setLoadingComplete(true);
    } finally {
      setLoading(false);
    }
  };

  // Load area data function - now using getFrontendData
  const loadAreaData = async (characterIdParam: string, depth: number, x: number, y: number) => {
    // Skip if already loading
    if (loading) return;
    
    try {
      setLoading(true);
      addToCombatLog(`Loading area data for position (${x}, ${y}, depth: ${depth})...`);
      
      // Use getFrontendData to get all necessary data in one call
      const frontendData = await getFrontendData(characterIdParam);
      
      if (frontendData) {
        // Set area info from miniMap
        if (frontendData.miniMap && frontendData.miniMap[2] && frontendData.miniMap[2][2]) {
          // Center of miniMap is the current area
          setAreaInfo(frontendData.miniMap[2][2]);
          const currentArea = frontendData.miniMap[2][2];
          addToCombatLog(`Area has ${currentArea.monsterCount} monsters and ${currentArea.playerCount} players.`);
        }
        
        // Handle combatants
        const hasActiveCombatants = frontendData.combatants && frontendData.combatants.length > 0;
        setIsInCombat(hasActiveCombatants);
        
        if (hasActiveCombatants) {
          addToCombatLog(`You are in combat with ${frontendData.combatants.length} enemies!`);
          setCombatants(frontendData.combatants || []);
        } else {
          // If not in combat, set noncombatants
          setNoncombatants(frontendData.noncombatants || []);
          
          // Filter out monsters from noncombatants
          const monsters = frontendData.noncombatants.filter((c: any) => 
            c.stats.isMonster && c.id !== characterIdParam
          );
          
          setCombatants(monsters);
          
          if (monsters.length > 0) {
            addToCombatLog(`There are ${monsters.length} monsters in this area.`);
          } else {
            addToCombatLog("This area is safe... for now.");
          }
        }
      } else {
        // Fallback to original method if getFrontendData fails
        // Get info about this area
        const areaInfo = await getAreaInfo(depth, x, y);
        setAreaInfo(areaInfo);
        
        if (areaInfo) {
          addToCombatLog(`Area has ${areaInfo.monsterCount} monsters and ${areaInfo.playerCount} players.`);
        }
        
        // Get combat state to see if we're already in combat
        const combatState = await getAreaCombatState(characterIdParam);
        
        if (combatState) {
          setIsInCombat(combatState.inCombat);
          
          if (combatState.inCombat) {
            addToCombatLog(`You are in combat with ${combatState.combatantCount} enemies!`);
            setCombatants(combatState.enemies || []);
          } else {
            // If not in combat, get all characters in this area
            const characters = await getCharactersInArea(depth, x, y);
            
            // Filter out our own character and any non-monsters
            const monsters = characters.filter((c: any) => 
              c.stats.isMonster && c.id !== characterIdParam
            );
            
            setCombatants(monsters);
            
            if (monsters.length > 0) {
              addToCombatLog(`There are ${monsters.length} monsters in this area.`);
            } else {
              addToCombatLog("This area is safe... for now.");
            }
          }
        }
      }
    } catch (err) {
      console.error("Error loading area data:", err);
      addToCombatLog(`Error loading area data: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const addToCombatLog = (message: string) => {
    setCombatLog(prev => [message, ...prev].slice(0, 20));
  };

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
      // Flag to prevent reloading character data while moving
      setLoadingComplete(false);
      
      addToCombatLog(`Attempting to move ${direction}...`);
      
      // Call the blockchain to move the character
      await moveCharacter(characterId, direction);
      
      // No need to check receipt, just proceed
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
        
        // Re-enable the loading complete flag
        setLoadingComplete(true);
      } else {
        // Fallback to original implementation
        // Refresh character data to get new position
        const characterData = await getCharacter(characterId);
        if (characterData) {
          setCharacter(characterData);
          // Update position from character data
          const newPos = {
            x: Number(characterData.stats.x),
            y: Number(characterData.stats.y),
            depth: Number(characterData.stats.depth)
          };
          setPosition(newPos);
          
          // Load data for the new area
          await loadAreaData(characterId, newPos.depth, newPos.x, newPos.y);
          
          // Update movement options
          const options = await getMovementOptions(characterId);
          if (options) {
            setMovementOptions(options);
          }
        }
        
        // Re-enable the loading complete flag
        setLoadingComplete(true);
      }
    } catch (err) {
      console.error(`Error moving ${direction}:`, err);
      addToCombatLog(`Error moving ${direction}: ${err instanceof Error ? err.message : String(err)}`);
      toast({
        title: "Movement Error",
        description: `Failed to move ${direction}: ${err instanceof Error ? err.message : String(err)}`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      
      // Make sure to reset the loading complete flag even on error
      setLoadingComplete(true);
    } finally {
      setIsMoving(false);
    }
  };

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
      
      // No need to check receipt, just proceed
      addToCombatLog(`Attack against ${selectedCombatant.name || "enemy"} was successful!`);
      
      // Refresh character and combat data
      const characterData = await getCharacter(characterId);
      if (characterData) {
        setCharacter(characterData);
      }
      
      // Get updated combat state
      const combatState = await getAreaCombatState(characterId);
      
      if (combatState) {
        setIsInCombat(combatState.inCombat);
        
        if (combatState.inCombat) {
          addToCombatLog(`Combat continues with ${combatState.combatantCount} enemies.`);
          setCombatants(combatState.enemies || []);
        } else {
          addToCombatLog("Combat has ended! You can now move again.");
          setCombatants([]);
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

  // Handle Content Security Policy error
  if (cspError) {
    return (
      <Center height="100vh" bg="#242938" color="white">
        <VStack spacing={6} maxWidth="600px" p={6}>
          <Heading as="h2" size="lg" color="red.400" mb={2}>Content Security Policy Error</Heading>
          
          <Alert status="error" borderRadius="md" color="black">
            <AlertIcon />
            <Box>
              <AlertTitle>WalletConnect Communication Blocked</AlertTitle>
              <AlertDescription>
                Your browser is blocking connections to WalletConnect services due to Content Security Policy restrictions.
              </AlertDescription>
            </Box>
          </Alert>
          
          <Box bg="#1a1f2c" p={5} borderRadius="md" w="100%">
            <Text color="white" fontWeight="bold" mb={2}>How to fix this issue:</Text>
            <VStack align="start" spacing={3} color="white">
              <Text>1. The server needs to be configured to allow connections to WalletConnect domains.</Text>
              <Text>2. Until then, you can try these options to connect:</Text>
              <Box pl={4}>
                <VStack align="start" spacing={2}>
                  <Text>• Use email login instead of wallet connection</Text>
                  <Text>• Try a different browser</Text>
                  <Text>• Disable any content blocking extensions</Text>
                </VStack>
              </Box>
              <Divider borderColor="gray.600" />
              <Text fontWeight="bold">For Developers:</Text>
              <Code p={3} borderRadius="md" fontSize="sm" bg="#333" color="white" width="100%">
                Add WalletConnect domains to your CSP:<br/>
                https://*.walletconnect.com<br/>
                https://*.walletconnect.org
              </Code>
            </VStack>
          </Box>
          
          <HStack spacing={4} width="100%">
            <Button colorScheme="blue" onClick={() => window.location.reload()} size="lg" width="50%">
              Refresh Page
            </Button>
            <Button 
              colorScheme="green" 
              onClick={() => window.location.href = '/login'} 
              size="lg" 
              width="50%"
            >
              Back to Login
            </Button>
          </HStack>
        </VStack>
      </Center>
    );
  }

  // Handle Privy authentication error
  if (privyError) {
    return (
      <Center height="100vh" bg="#242938" color="white">
        <VStack spacing={6} maxWidth="600px" p={6}>
          <Heading as="h2" size="lg" color="red.400" mb={2}>Authentication Error</Heading>
          
          <Alert status="error" borderRadius="md" color="black">
            <AlertIcon />
            <Box>
              <AlertTitle>Privy Authentication Failed</AlertTitle>
              <AlertDescription>
                The authentication service failed to load properly. This may be due to network issues or browser security settings.
              </AlertDescription>
            </Box>
          </Alert>
          
          <Box bg="#1a1f2c" p={5} borderRadius="md" w="100%">
            <Text color="white" fontWeight="bold" mb={2}>Please try these solutions:</Text>
            <VStack align="start" spacing={2} color="white">
              <Text>• Disable ad blockers or security extensions</Text>
              <Text>• Allow third-party cookies in your browser</Text>
              <Text>• Try a different browser</Text>
              <Text>• Check your internet connection</Text>
            </VStack>
          </Box>
          
          <Button colorScheme="blue" onClick={() => window.location.reload()} size="lg" width="100%">
            Refresh Page
          </Button>
        </VStack>
      </Center>
    );
  }

  if (loading || hookLoading || isMoving || isAttacking) {
    return (
      <Center height="100vh" bg="#242938" color="white">
        <VStack spacing={6}>
          <Heading as="h1" size="xl" color="white" mb={2}>Battle Nads</Heading>
          <Spinner size="xl" thickness="4px" speed="0.8s" color="blue.500" />
          <Text fontSize="xl" color="white">
            {loading || hookLoading ? "Loading data from the Monad Testnet..." : 
             isMoving ? "Moving..." : 
             "Attacking..."}
          </Text>
        </VStack>
      </Center>
    );
  }

  if (error || hookError) {
    return (
      <Center height="100vh" bg="#242938" color="white">
        <VStack spacing={6} maxWidth="600px" p={6}>
          <Heading as="h1" size="xl" color="white" mb={2}>Battle Nads</Heading>
          <Heading color="red.400">Error</Heading>
          <Alert status="error" borderRadius="md" color="black">
            <AlertIcon />
            <Box>
              <AlertTitle>Connection Error</AlertTitle>
              <AlertDescription>{error || hookError}</AlertDescription>
            </Box>
          </Alert>
          <Text color="white">
            There was an error connecting to the Battle Nads contract on Monad Testnet.
            Please check your network connection and try again.
          </Text>
          <Button colorScheme="blue" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </VStack>
      </Center>
    );
  }

  if (!character && !loading && !hookLoading) {
    return (
      <Center height="100vh" bg="#242938" color="white">
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
            onClick={() => window.location.href = '/character/create'}
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

  return (
    <Box minH="100vh" bg="#242938" py={6}>
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

export default GameDemo; 