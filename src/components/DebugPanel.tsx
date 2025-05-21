import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Code, 
  Heading, 
  Text, 
  VStack, 
  HStack,
  Badge,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Input,
  useToast
} from '@chakra-ui/react';
import { useBattleNads } from '../hooks/game/useBattleNads';
import { useWallet } from '../providers/WalletProvider';
import { useBattleNadsClient } from '../hooks/contracts/useBattleNadsClient';
import { CharacterLite } from '@/types/domain';

interface DebugPanelProps {
  isVisible?: boolean;
}

type CharacterArray = any[];

const DebugPanel: React.FC<DebugPanelProps> = ({ isVisible = true }) => {
  // Declare state before using it in hooks
  const [ownerAddress, setOwnerAddress] = useState<string>(''); 
  const [logs, setLogs] = useState<Array<{message: string, timestamp: Date}>>([]);
  const [startBlock, setStartBlock] = useState<number>(0);
  const [fetchedCharacterId, setFetchedCharacterId] = useState<string | null>(null);
  const [buyInAmount, setBuyInAmount] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState(false);

  const { 
    gameState, // Use gameState for combatants etc.
    isLoading, 
    error,
  } = useBattleNads(ownerAddress || null); // Pass ownerAddress

  const { client } = useBattleNadsClient();
  const { injectedWallet, embeddedWallet } = useWallet();
  
  const toast = useToast();
  
  // Add a logging function that shows timestamps
  const addLog = (message: string) => {
    setLogs(prev => [{message, timestamp: new Date()}, ...prev].slice(0, 50));
  };
  
  // Initialize owner address from wallet
  useEffect(() => {
    if (injectedWallet?.address) {
      setOwnerAddress(injectedWallet.address);
      addLog(`Owner wallet address set to ${injectedWallet.address}`);
    }
  }, [injectedWallet?.address]);
  
  // Update character ID from hook when it changes
  useEffect(() => {
    if (gameState?.characterID) {
      setFetchedCharacterId(gameState.characterID);
      addLog(`Character ID from hook updated to ${gameState.characterID}`);
    }
  }, [gameState?.characterID]);
  
  // Fetch character ID directly from chain
  const fetchCharacterId = async () => {
    try {
      addLog(`Fetching character ID for address ${ownerAddress}`);
      
      if (!ownerAddress || !client) {
        addLog('ERROR: No owner address or client provided');
        return;
      }
      
      const id = await client.getPlayerCharacterID(ownerAddress);
      
      if (id) {
        setFetchedCharacterId(id);
        addLog(`Character ID from chain: ${id}`);
      } else {
        addLog('No character ID found for this address');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      addLog(`Error fetching character ID: ${errorMsg}`);
    }
  };
  
  // Fetch full frontend data
  const fetchFullFrontendData = async () => {
    try {
      addLog(`Fetching UI snapshot for address ${ownerAddress}`);
      
      if (!ownerAddress || !client) {
        addLog('ERROR: No owner address or client provided');
        return;
      }
      
      const result = await client.getUiSnapshot(ownerAddress, BigInt(startBlock));
      
      if (result) {
        // Access properties directly on result
        addLog(`Data fetched successfully. Character ID: ${result.characterID || 'null'}`);
        
        if (result.characterID) {
          setFetchedCharacterId(result.characterID);
        }
        
        // Pretty print some key parts of the result
        addLog(`Session key: ${result.sessionKeyData?.key || 'null'}`);
        addLog(`Data feeds count: ${result.dataFeeds ? result.dataFeeds.length : 0}`);
      } else {
        addLog('No data returned from UI snapshot');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      addLog(`Error fetching UI snapshot: ${errorMsg}`);
    }
  };
  
  // Get estimated buy-in amount
  const fetchBuyInAmount = async () => {
    try {
      addLog('Fetching estimated buy-in amount...');
      if (!client) {
        addLog('ERROR: No client provided');
        return;
      }
      const amount = await client.estimateBuyInAmountInMON();
      setBuyInAmount(amount.toString());
      addLog(`Buy-in amount: ${amount.toString()}`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      addLog(`Error fetching buy-in amount: ${errorMsg}`);
    }
  };
  
  // Copy character ID to clipboard
  const copyCharacterId = () => {
    if (fetchedCharacterId) {
      navigator.clipboard.writeText(fetchedCharacterId);
      toast({
        title: "Copied to clipboard",
        status: "success",
        duration: 2000,
      });
    }
  };
  
  // Add a section for monster health details
  const renderMonsterHealthDebug = () => {
    if (!gameState?.combatants || gameState.combatants.length === 0) {
      return <Text>No monsters present</Text>;
    }

    return (
      <VStack align="start" spacing={2}>
        <Text fontWeight="bold">Monster Health Details:</Text>
        {gameState.combatants.map((combatant: CharacterLite, index: number) => {
          const calculatedMaxHealth = combatant.maxHealth;
          const actualHealth = Number(combatant.health || 0);
          
          return (
            <Box key={index} p={2} bg="gray.700" borderRadius="md" w="100%">
              <Text fontSize="sm">Monster: {combatant.name || `ID: ${combatant.id.slice(0, 8)}...`}</Text>
              <Text fontSize="xs">Current Health: {actualHealth}</Text>
              <Text fontSize="xs">Calculated Max Health: {calculatedMaxHealth}</Text>
              <Text fontSize="xs">Health Ratio: {(actualHealth / calculatedMaxHealth).toFixed(2)}</Text>
            </Box>
          );
        })}
      </VStack>
    );
  };

   // Add this new function to handle the getBattleNad call
   const handleGetBattleNad = async () => {
    if (!fetchedCharacterId || !client) {
      addLog('ERROR: No character ID or client available');
      return;
    }
    
    try {
      addLog(`Fetching full character data for ID: ${fetchedCharacterId}`);
      const character = await client.getBattleNad(fetchedCharacterId);
      
      // Add type assertion here
      const characterArray = character as unknown as CharacterArray;
      
      // Log the raw data
      console.log('[DebugPanel] Character data (raw):', character);
      
      // Create a labeled object from the array data
      const labeledData = {
        id: characterArray[0],
        stats: {
          class: Number(characterArray[1]?.[0] || 0),
          buffs: Number(characterArray[1]?.[1] || 0),
          debuffs: Number(characterArray[1]?.[2] || 0),
          level: Number(characterArray[1]?.[3] || 0),
          unspentAttributePoints: Number(characterArray[1]?.[4] || 0),
          experience: Number(characterArray[1]?.[5] || 0),
          strength: Number(characterArray[1]?.[6] || 0),
          vitality: Number(characterArray[1]?.[7] || 0),
          dexterity: Number(characterArray[1]?.[8] || 0),
          quickness: Number(characterArray[1]?.[9] || 0),
          sturdiness: Number(characterArray[1]?.[10] || 0),
          luck: Number(characterArray[1]?.[11] || 0),
          depth: Number(characterArray[1]?.[12] || 0),
          x: Number(characterArray[1]?.[13] || 0),
          y: Number(characterArray[1]?.[14] || 0),
          index: Number(characterArray[1]?.[15] || 0),
          weaponID: Number(characterArray[1]?.[16] || 0),
          armorID: Number(characterArray[1]?.[17] || 0),
          health: Number(characterArray[1]?.[18] || 0),
          sumOfCombatantLevels: Number(characterArray[1]?.[19] || 0),
          combatants: Number(characterArray[1]?.[20] || 0),
          nextTargetIndex: Number(characterArray[1]?.[21] || 0),
          combatantBitMap: characterArray[1]?.[22] || 0
        },
        maxHealth: Number(characterArray[2] || 0),
        weapon: {
          name: characterArray[3]?.[0] || '',
          baseDamage: Number(characterArray[3]?.[1] || 0),
          bonusDamage: Number(characterArray[3]?.[2] || 0),
          accuracy: Number(characterArray[3]?.[3] || 0),
          speed: Number(characterArray[3]?.[4] || 0)
        },
        armor: {
          name: characterArray[4]?.[0] || '',
          armorFactor: Number(characterArray[4]?.[1] || 0),
          armorQuality: Number(characterArray[4]?.[2] || 0),
          flexibility: Number(characterArray[4]?.[3] || 0),
          weight: Number(characterArray[4]?.[4] || 0)
        },
        inventory: {
          weaponBitmap: Number(characterArray[5]?.[0] || 0),
          armorBitmap: Number(characterArray[5]?.[1] || 0),
          balance: characterArray[5]?.[2] || 0
        },
        tracker: {
          updateStats: Boolean(characterArray[6]?.[0] || false),
          updateInventory: Boolean(characterArray[6]?.[1] || false),
          updateActiveTask: Boolean(characterArray[6]?.[2] || false),
          updateActiveAbility: Boolean(characterArray[6]?.[3] || false),
          updateOwner: Boolean(characterArray[6]?.[4] || false),
          classStatsAdded: Boolean(characterArray[6]?.[5] || false),
          died: Boolean(characterArray[6]?.[6] || false)
        },
        activeTask: characterArray[7],
        activeAbility: {
          ability: Number(characterArray[8]?.[0] || 0),
          stage: Number(characterArray[8]?.[1] || 0),
          targetIndex: Number(characterArray[8]?.[2] || 0),
          taskAddress: characterArray[8]?.[3] || '',
          targetBlock: Number(characterArray[8]?.[4] || 0)
        },
        owner: characterArray[9],
        name: characterArray[10]
      };
      
      // Convert to JSON string with proper formatting
      const jsonString = JSON.stringify(labeledData, null, 2);
      
      console.log('[DebugPanel] Character data (labeled):', labeledData);
      console.log('[DebugPanel] Character data (JSON):', jsonString);
      
      addLog('Character data logged to console');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      addLog(`Error fetching character data: ${errorMsg}`);
      console.error('[DebugPanel] Error:', err);
    }
  };
  
  // Add this new function to handle the getBattleNadLite call
  const handleGetBattleNadLite = async () => {
    if (!fetchedCharacterId || !client) {
      addLog('ERROR: No character ID or client available');
      return;
    }
    
    try {
      addLog(`Fetching lite character data for ID: ${fetchedCharacterId}`);
      const character = await client.getBattleNadLite(fetchedCharacterId);
      
      // Add type assertion here
      const characterArray = character as unknown as CharacterArray;
      
      // Log the raw data
      console.log('[DebugPanel] Character Lite data (raw):', character);
      
      // Create a labeled object from the array data based on the shared structure
      const labeledData = {
        characterLite: {
          id: characterArray[0],
          class: Number(characterArray[1] || 0),
          health: Number(characterArray[2] || 0),
          maxHealth: Number(characterArray[3] || 0),
          buffs: Number(characterArray[4] || 0),
          debuffs: Number(characterArray[5] || 0),
          level: Number(characterArray[6] || 0),
          index: Number(characterArray[7] || 0),
          combatantBitMap: characterArray[8] || 0,
          ability: Number(characterArray[9] || 0),
          abilityStage: Number(characterArray[10] || 0),
          abilityTargetBlock: Number(characterArray[11] || 0),
          name: characterArray[12] || '',
          weaponName: characterArray[13] || '',
          armorName: characterArray[14] || '',
          isDead: Boolean(characterArray[15] || false)
        }
      };
      
      // Convert to JSON string with proper formatting
      const jsonString = JSON.stringify(labeledData, null, 2);
      
      console.log('[DebugPanel] Character Lite data (labeled):', labeledData);
      console.log('[DebugPanel] Character Lite data (JSON):', jsonString);
      
      addLog('Character Lite data logged to console');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      addLog(`Error fetching character lite data: ${errorMsg}`);
      console.error('[DebugPanel] Error:', err);
    }
  };
  
  
  if (!isVisible) return null;
  
  return (
    <Box 
      border="1px solid" 
      borderColor="gray.700" 
      borderRadius="md" 
      p={4} 
      bg="gray.900" 
      color="white"
      maxHeight="90vh"
      overflowY="auto"
    >
      <VStack spacing={4} align="stretch">
        <Heading size="md">Battle Nads Debug Panel</Heading>
        
        <Box p={2} bg="gray.800" borderRadius="md">
          <Heading size="sm" mb={2}>Wallet Information</Heading>
          <Text>Owner Wallet: {injectedWallet?.address || 'Not connected'}</Text>
          <Text>Session Wallet: {embeddedWallet?.address || 'Not connected'}</Text>
        </Box>
        
        <Box p={2} bg="gray.800" borderRadius="md">
          <Heading size="sm" mb={2}>Character ID</Heading>
          <HStack>
            <Text>Current: {fetchedCharacterId || 'Not found'}</Text>
            {fetchedCharacterId && (
              <Button size="xs" onClick={copyCharacterId}>
                Copy
              </Button>
            )}
          </HStack>
          
          <HStack mt={2}>
            <Input 
              placeholder="Owner address" 
              value={ownerAddress} 
              onChange={(e) => setOwnerAddress(e.target.value)} 
            />
            <Button onClick={fetchCharacterId} isLoading={isLoading}>
              Fetch ID
            </Button>
          </HStack>
        </Box>
        
        <Box p={2} bg="gray.800" borderRadius="md">
          <Heading size="sm" mb={2}>Frontend Data</Heading>
          <HStack>
            <Input 
              placeholder="Address" 
              value={ownerAddress} 
              onChange={(e) => setOwnerAddress(e.target.value)} 
            />
            <Input 
              placeholder="Start block" 
              type="number" 
              value={startBlock} 
              onChange={(e) => setStartBlock(parseInt(e.target.value) || 0)}
              w="150px"
            />
            <Button onClick={fetchFullFrontendData} isLoading={isLoading}>
              Fetch Data
            </Button>
          </HStack>
        </Box>
        
        <Box p={2} bg="gray.800" borderRadius="md">
          <Heading size="sm" mb={2}>Buy-In Amount</Heading>
          <HStack>
            <Text>Amount: {buyInAmount || 'Not fetched'}</Text>
            <Button onClick={fetchBuyInAmount} isLoading={isLoading} size="sm">
              Fetch Amount
            </Button>
          </HStack>
        </Box>
        
        <Accordion allowMultiple defaultIndex={[0]}>
          <AccordionItem>
            <h2>
              <AccordionButton>
                <Box flex="1" textAlign="left">Debug Logs</Box>
                <AccordionIcon />
              </AccordionButton>
            </h2>
            <AccordionPanel maxHeight="300px" overflowY="auto">
              <VStack spacing={1} align="stretch">
                {logs.map((log, index) => (
                  <Box key={index} fontSize="xs">
                    <Badge colorScheme="purple" mr={1}>
                      {log.timestamp.toLocaleTimeString()} 
                    </Badge>
                    {log.message}
                  </Box>
                ))}
                {logs.length === 0 && <Text>No logs yet</Text>}
              </VStack>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
        
        {renderMonsterHealthDebug()}

        <Box p={2} bg="gray.800" borderRadius="md">
          <Heading size="sm" mb={2}>Character Data</Heading>
          <VStack spacing={2}>
            <Button 
              onClick={handleGetBattleNad} 
              isDisabled={!fetchedCharacterId || !client}
              colorScheme="purple"
              size="sm"
              width="100%"
            >
              Get Full Character Data
            </Button>
            <Button 
              onClick={handleGetBattleNadLite} 
              isDisabled={!fetchedCharacterId || !client}
              colorScheme="blue"
              size="sm"
              width="100%"
            >
              Get Lite Character Data
            </Button>
          </VStack>
          <Text fontSize="xs" mt={1}>
            Results will be logged to the console
          </Text>
        </Box>
        
        {error && (
          <Box p={2} bg="red.900" borderRadius="md">
            <Heading size="sm">Error</Heading>
            <Text>{error ? error.message : 'No error'}</Text>
          </Box>
        )}
      </VStack>
    </Box>
  );
};

export default DebugPanel; 