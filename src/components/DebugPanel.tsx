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
import { useQueryClient } from '@tanstack/react-query';
import { useBattleNads } from '../hooks/game/useBattleNads';
import { useWallet } from '../providers/WalletProvider';
import { useBattleNadsClient } from '../hooks/contracts/useBattleNadsClient';
import { CharacterLite } from '@/types/domain';
import { invalidateSnapshot } from '../hooks/utils';
import { db } from '../lib/db';

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
  
  const queryClient = useQueryClient();
  
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
  
  // Add a button to clear all cached data
  const clearCache = async () => {
    try {
      addLog('🧹 Starting comprehensive cache clearing...');
      
      // Step 1: Clear IndexedDB data (this is likely where stale enemy data lives)
      addLog('Clearing IndexedDB (historical data)...');
      if (ownerAddress) {
        const deletedCount = await db.dataBlocks
          .where('owner')
          .equals(ownerAddress)
          .delete();
        addLog(`Deleted ${deletedCount} historical data blocks from IndexedDB`);
      } else {
        // Clear all IndexedDB data if no specific owner
        await db.dataBlocks.clear();
        addLog('Cleared all IndexedDB data (no owner address)');
      }
      
      // Step 2: Clear React Query cache for this owner
      addLog('Clearing React Query cache...');
      await invalidateSnapshot(queryClient, ownerAddress);
      
      // Step 3: Clear ALL React Query cache as a final fallback
      addLog('Clearing all React Query cache...');
      await queryClient.clear();
      
      addLog('✅ All cached data cleared successfully!');
      addLog('🔄 Please refresh the page to see fresh data');
      
      toast({
        title: '🗑️ Cache Completely Cleared!',
        description: 'All cached data (React Query + IndexedDB) has been cleared. Refresh the page to see fresh enemy data.',
        status: 'success',
        duration: 8000,
        isClosable: true,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      addLog(`❌ Error clearing cache: ${errorMsg}`);
      console.error('[DebugPanel] Error:', err);
      
      toast({
        title: 'Cache Clear Failed',
        description: `Error: ${errorMsg}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  // Add a function to log all enemy data to console
  const logAllEnemies = () => {
    addLog('🐉 Logging all enemy data to console...');
    
    if (!gameState) {
      console.log('[Enemy Debug] No game state available');
      addLog('No game state available');
      return;
    }
    
    console.group('🐉 ENEMY DEBUG DATA');
    
    // Log raw combatants
    console.log('📋 Raw Combatants from gameState:', gameState.combatants);
    
    // Log filtered combatants (dead removed)
    const liveCombatants = gameState.combatants?.filter(combatant => !combatant.isDead) || [];
    console.log('✅ Live Combatants (isDead=false):', liveCombatants);
    
    // Log dead combatants
    const deadCombatants = gameState.combatants?.filter(combatant => combatant.isDead) || [];
    console.log('💀 Dead Combatants (isDead=true):', deadCombatants);
    
    // Log detailed breakdown
    console.log('📊 Detailed Breakdown:');
    gameState.combatants?.forEach((combatant, index) => {
      console.log(`  Enemy ${index + 1}:`, {
        name: combatant.name,
        id: combatant.id,
        index: combatant.index,
        health: combatant.health,
        maxHealth: combatant.maxHealth,
        isDead: combatant.isDead,
        class: combatant.class,
        level: combatant.level
      });
    });
    
    // Log non-combatants too
    if (gameState.noncombatants && gameState.noncombatants.length > 0) {
      console.log('👥 Non-Combatants:', gameState.noncombatants);
    }
    
    console.groupEnd();
    
    addLog(`Found ${gameState.combatants?.length || 0} total combatants`);
    addLog(`Found ${liveCombatants.length} live combatants`);
    addLog(`Found ${deadCombatants.length} dead combatants`);
    addLog('All enemy data logged to console (check browser dev tools)');
  };
  
  // Add a function to trace the complete data flow pipeline
  const traceDataFlow = async () => {
    addLog('🔍 Tracing complete data flow pipeline...');
    
    if (!ownerAddress || !client) {
      addLog('❌ Missing owner address or client');
      return;
    }
    
    console.group('🔍 DATA FLOW TRACE');
    
    try {
      // Step 1: Get fresh raw data directly from contract
      addLog('Step 1: Fetching fresh raw data from contract...');
      const rawArrayData = await client.getUiSnapshot(ownerAddress, BigInt(0));
      
      console.log('🏗️ RAW CONTRACT DATA (array format):', rawArrayData);
      
      // Parse the raw array data like useUiSnapshot does
      const dataAsAny = rawArrayData as any;
      const rawMappedData = {
        characterID: dataAsAny[0],
        sessionKeyData: dataAsAny[1], 
        character: dataAsAny[2],
        combatants: dataAsAny[3],
        noncombatants: dataAsAny[4],
        equipableWeaponIDs: dataAsAny[5],
        equipableWeaponNames: dataAsAny[6],
        equipableArmorIDs: dataAsAny[7],
        equipableArmorNames: dataAsAny[8],
        dataFeeds: dataAsAny[9] || [],
        balanceShortfall: dataAsAny[10],
        unallocatedAttributePoints: dataAsAny[11],
        endBlock: dataAsAny[12],
      };
      
      console.log('📋 RAW MAPPED DATA:', rawMappedData);
      console.log('🎯 RAW COMBATANTS:', rawMappedData.combatants);
      console.log('👥 RAW NON-COMBATANTS:', rawMappedData.noncombatants);
      
      addLog(`Raw data shows ${rawMappedData.combatants?.length || 0} combatants`);
      addLog(`Raw data shows ${rawMappedData.noncombatants?.length || 0} non-combatants`);
      
      // Step 2: Check what's in React Query cache
      addLog('Step 2: Checking React Query cache...');
      const cachedData = queryClient.getQueryData(['uiSnapshot', ownerAddress]);
      console.log('💾 CACHED DATA from React Query:', cachedData);
      
      // Step 3: Check IndexedDB historical data
      addLog('Step 3: Checking IndexedDB historical data...');
      const historicalBlocks = await db.dataBlocks
        .where('owner').equals(ownerAddress)
        .toArray();
      console.log('🗄️ INDEXEDDB HISTORICAL BLOCKS:', historicalBlocks);
      
      // Step 4: Check what useBattleNads is actually returning
      addLog('Step 4: Checking useBattleNads output...');
      console.log('🎮 CURRENT GAME STATE:', gameState);
      console.log('🐉 GAME STATE COMBATANTS:', gameState?.combatants);
      console.log('👥 GAME STATE NON-COMBATANTS:', gameState?.noncombatants);
      
      if (gameState?.combatants && gameState.combatants.length > 0) {
        const contractCount = rawMappedData.combatants?.length || 0;
        const uiCount = gameState.combatants.length;
        if (contractCount !== uiCount) {
          console.log('⚠️ MISMATCH DETECTED!');
          console.log(`Contract shows ${contractCount} combatants`);
          console.log(`But gameState shows ${uiCount} combatants`);
          addLog(`🚨 MISMATCH: Contract has ${contractCount}, UI shows ${uiCount}`);
        } else {
          addLog('✅ Data flow looks consistent');
        }
      } else {
        addLog('✅ Data flow looks consistent');
      }
      
      console.groupEnd();
      
    } catch (err) {
      console.error('❌ Error in data flow trace:', err);
      addLog(`❌ Error tracing data flow: ${err instanceof Error ? err.message : String(err)}`);
      console.groupEnd();
    }
  };
  
  // Add a function to investigate contract issues with specific characters
  const investigateContractIssue = async () => {
    try {
      addLog('🔍 Investigating contract state vs expected state...');
      
      if (!client || !ownerAddress) {
        addLog('❌ Missing client or owner address');
        return;
      }
      
      // Get current contract state
      addLog('📋 Fetching current contract state...');
      const rawData = await client.getUiSnapshot(ownerAddress, BigInt(0));
      const dataAsAny = rawData as any;
      
      console.group('🔍 CONTRACT INVESTIGATION');
      console.log('📋 Raw contract response:', rawData);
      console.log('🔢 Block info:', {
        startBlock: 0,
        endBlock: dataAsAny[12]?.toString(),
        timestamp: new Date().toISOString()
      });
      
      // Analyze combatants for issues
      const combatants = dataAsAny[3] || [];
      console.log(`📊 Combatants analysis (${combatants.length} total):`);
      
      combatants.forEach((combatant: any, index: number) => {
        const health = Number(combatant.health || 0);
        const maxHealth = Number(combatant.maxHealth || 0);
        const isDead = Boolean(combatant.isDead);
        
        console.log(`🔍 Combatant ${index}:`, {
          name: combatant.name,
          id: combatant.id,
          health: health,
          maxHealth: maxHealth,
          isDead: isDead,
          healthPercentage: maxHealth > 0 ? (health / maxHealth * 100).toFixed(1) + '%' : '0%',
          index: combatant.index,
          shouldBeAlive: health > 0,
          contractSaysAlive: !isDead
        });
        
        // Check for inconsistencies
        if (health <= 0 && !isDead) {
          console.error(`🚨 INCONSISTENCY: ${combatant.name} has no health but isDead=false`);
          addLog(`🚨 Found contract bug: ${combatant.name} has ${health} health but isDead=false`);
        }
        if (health > 0 && isDead) {
          console.error(`🚨 INCONSISTENCY: ${combatant.name} has health but isDead=true`);
          addLog(`🚨 Found contract bug: ${combatant.name} has ${health} health but isDead=true`);
        }
        
        // Check for any problematic characters (generic check)
        if (health > 0 && !isDead) {
          console.log(`✅ ALIVE COMBATANT: ${combatant.name} (${health}/${maxHealth} HP)`);
        } else if (health <= 0 || isDead) {
          console.warn(`⚠️ DEAD/DYING COMBATANT: ${combatant.name} (${health}/${maxHealth} HP, isDead: ${isDead})`);
        }
      });
      
      // Check non-combatants too
      const noncombatants = dataAsAny[4] || [];
      console.log(`📊 Non-combatants analysis (${noncombatants.length} total):`);
      
      if (noncombatants.length > 0) {
        console.log('👥 NON-COMBATANTS:', noncombatants);
      }
      
      console.groupEnd();
      
      addLog('✅ Contract investigation complete - check console for detailed analysis');
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      addLog(`❌ Contract investigation failed: ${errorMsg}`);
      console.error('[DebugPanel] Contract investigation error:', err);
    }
  };
  
  // Add simplified startBlock comparison for debugging the stale monster issue
  const testDifferentStartBlocks = async () => {
    try {
      addLog('🔬 Testing different startBlock approaches...');
      
      if (!ownerAddress || !client) {
        addLog('❌ Missing owner address or client');
        return;
      }
      
      const currentBlock = await client.getLatestBlockNumber();
      
      // Test user's script approach (current - 1)
      const userResult = await client.getUiSnapshot(ownerAddress, currentBlock - 1n);
      const userCombatants = (userResult as any)[3];
      
      // Test startBlock 0 approach  
      const zeroResult = await client.getUiSnapshot(ownerAddress, BigInt(0));
      const zeroCombatants = (zeroResult as any)[3];
      
      console.log(`🔬 STARTBLOCK TEST RESULTS:`);
      console.log(`Current block: ${currentBlock}`);
      console.log(`User approach (current-1): ${userCombatants?.length || 0} combatants`);
      console.log(`StartBlock 0 approach: ${zeroCombatants?.length || 0} combatants`);
      console.log(`Frontend cache: ${gameState?.combatants?.length || 0} combatants`);
      
      if (userCombatants?.length === 0 && gameState?.combatants && gameState.combatants.length > 0) {
        addLog('🚨 STALE DATA CONFIRMED: User approach shows empty, frontend shows monsters');
      } else if (userCombatants?.length === gameState?.combatants?.length) {
        addLog('✅ Data matches between user approach and frontend');
      }
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      addLog(`❌ StartBlock test failed: ${errorMsg}`);
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
        
        {/* Wallet & Connection Info */}
        <Box p={2} bg="gray.800" borderRadius="md">
          <Heading size="sm" mb={2}>Wallet Information</Heading>
          <Text>Owner Wallet: {injectedWallet?.address || 'Not connected'}</Text>
          <Text>Session Wallet: {embeddedWallet?.address || 'Not connected'}</Text>
        </Box>
        
        {/* Character Management */}
        <Box p={2} bg="gray.800" borderRadius="md">
          <Heading size="sm" mb={2}>Character Management</Heading>
          
          {/* Character ID Section */}
          <VStack spacing={2} align="stretch">
            <HStack>
              <Text fontSize="sm">Current ID: {fetchedCharacterId || 'Not found'}</Text>
              {fetchedCharacterId && (
                <Button size="xs" onClick={copyCharacterId}>
                  Copy
                </Button>
              )}
            </HStack>
            
            <HStack>
              <Input 
                placeholder="Owner address" 
                value={ownerAddress} 
                onChange={(e) => setOwnerAddress(e.target.value)}
                size="sm"
              />
              <Button onClick={fetchCharacterId} isLoading={isLoading} size="sm">
                Fetch ID
              </Button>
            </HStack>
            
            {/* Character Data Buttons */}
            <HStack spacing={2}>
              <Button 
                onClick={handleGetBattleNad} 
                isDisabled={!fetchedCharacterId || !client}
                colorScheme="purple"
                size="sm"
                flex="1"
              >
                Get Full Data
              </Button>
              <Button 
                onClick={handleGetBattleNadLite} 
                isDisabled={!fetchedCharacterId || !client}
                colorScheme="blue"
                size="sm"
                flex="1"
              >
                Get Lite Data
              </Button>
            </HStack>
            <Text fontSize="xs" color="gray.400">
              Character data will be logged to console
            </Text>
          </VStack>
        </Box>
        
        {/* Contract Data Management */}
        <Box p={2} bg="gray.800" borderRadius="md">
          <Heading size="sm" mb={2}>Contract Data</Heading>
          
          <VStack spacing={2} align="stretch">
            {/* Frontend Data Fetch */}
            <HStack>
              <Input 
                placeholder="Address" 
                value={ownerAddress} 
                onChange={(e) => setOwnerAddress(e.target.value)}
                size="sm"
              />
              <Input 
                placeholder="Start block" 
                type="number" 
                value={startBlock} 
                onChange={(e) => setStartBlock(parseInt(e.target.value) || 0)}
                w="120px"
                size="sm"
              />
              <Button onClick={fetchFullFrontendData} isLoading={isLoading} size="sm">
                Fetch
              </Button>
            </HStack>
            
            {/* Buy-In Amount */}
            <HStack>
              <Text fontSize="sm">Buy-in: {buyInAmount || 'Not fetched'}</Text>
              <Button onClick={fetchBuyInAmount} isLoading={isLoading} size="xs">
                Fetch Amount
              </Button>
            </HStack>
          </VStack>
        </Box>
        
        {/* Game State Analysis */}
        <Box p={2} bg="gray.800" borderRadius="md">
          <Heading size="sm" mb={2}>Game State Analysis</Heading>
          
          <VStack spacing={2} align="stretch">
            <Button 
              onClick={logAllEnemies} 
              isDisabled={!gameState}
              colorScheme="green"
              size="sm"
              width="100%"
            >
              🐉 Log Enemy Data
            </Button>
            
            <Button 
              onClick={traceDataFlow} 
              isDisabled={!gameState}
              colorScheme="teal"
              size="sm"
              width="100%"
            >
              🔍 Trace Data Flow
            </Button>
            
            <Button 
              onClick={investigateContractIssue} 
              isDisabled={!gameState}
              colorScheme="orange"
              size="sm"
              width="100%"
            >
              🔍 Investigate Contract
            </Button>
            
            <Button 
              onClick={testDifferentStartBlocks} 
              isDisabled={!gameState}
              colorScheme="purple"
              size="sm"
              width="100%"
            >
              🔬 Test StartBlock Approaches
            </Button>
            
            {renderMonsterHealthDebug()}
          </VStack>
        </Box>
        
        {/* Cache & Performance */}
        <Box p={2} bg="gray.800" borderRadius="md">
          <Heading size="sm" mb={2}>Cache & Performance</Heading>
          
          <VStack spacing={2} align="stretch">
            <Button 
              onClick={clearCache} 
              isLoading={isLoading} 
              size="sm" 
              width="100%" 
              colorScheme="red"
              variant="outline"
            >
              🗑️ Clear All Cache
            </Button>
            <Text fontSize="xs" color="gray.400">
              Clears React Query cache + IndexedDB storage to fix stale data issues
            </Text>
          </VStack>
        </Box>
        
        {/* Debug Logs */}
        <Accordion allowMultiple defaultIndex={[]}>
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
                {logs.length === 0 && <Text fontSize="xs">No logs yet</Text>}
              </VStack>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
        
        {/* Error Display */}
        {error && (
          <Box p={2} bg="red.900" borderRadius="md">
            <Heading size="sm">Error</Heading>
            <Text fontSize="sm">{error ? error.message : 'No error'}</Text>
          </Box>
        )}
      </VStack>
    </Box>
  );
};

export default DebugPanel; 