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
  useToast,
  Select,
  Divider
} from '@chakra-ui/react';
import { useQueryClient } from '@tanstack/react-query';
import { useSimplifiedGameState } from '../hooks/game/useSimplifiedGameState';
import { useWallet } from '../providers/WalletProvider';
import { useBattleNadsClient } from '../hooks/contracts/useBattleNadsClient';
import { invalidateSnapshot } from '../hooks/utils';
import { db } from '../lib/db';
import { useStorageCleanup } from '../hooks/useStorageCleanup';
import { ENTRYPOINT_ADDRESS } from '../config/env';
import { domain } from '../types';

interface DebugPanelProps {
  isVisible?: boolean;
}

type CharacterArray = any[];

const DebugPanel: React.FC<DebugPanelProps> = ({ isVisible = true }) => {
  // State management
  const [ownerAddress, setOwnerAddress] = useState<string>(''); 
  const [logs, setLogs] = useState<Array<{message: string, timestamp: Date}>>([]);
  const [startBlock, setStartBlock] = useState<number>(0);
  const [blockRange, setBlockRange] = useState<number>(1000);
  const [fetchedCharacterId, setFetchedCharacterId] = useState<string | null>(null);

  // Hooks
  const { gameState, isLoading, error } = useSimplifiedGameState({ readOnly: true });
  const { client } = useBattleNadsClient();
  const { injectedWallet, embeddedWallet } = useWallet();
  const toast = useToast();
  const queryClient = useQueryClient();
  
  // Storage cleanup functionality
  const {
    isClearing: isStorageClearing,
    clearContractData,
    forceReset: forceStorageReset,
    checkAndHandleContractChange
  } = useStorageCleanup();
  
  // Logging utility
  const addLog = (message: string) => {
    setLogs(prev => [{message, timestamp: new Date()}, ...prev].slice(0, 50));
  };
  
  // Initialize owner address from wallet
  useEffect(() => {
    if (injectedWallet?.address) {
      setOwnerAddress(injectedWallet.address);
      addLog(`Connected wallet: ${injectedWallet.address}`);
    }
  }, [injectedWallet?.address]);
  
  // Update character ID from hook when it changes
  useEffect(() => {
    if (gameState?.characterID) {
      setFetchedCharacterId(gameState.characterID);
      addLog(`Character ID updated: ${gameState.characterID}`);
    }
  }, [gameState?.characterID]);
  
  // === EVENT INVESTIGATION FUNCTIONS ===
  
  /**
   * Traces the complete event data flow to identify missing events
   * This function investigates the entire data pipeline from contract to UI
   */
  const investigateEventDataFlow = async () => {
    addLog('🔍 Starting comprehensive event investigation...');
      
      if (!ownerAddress || !client) {
      addLog('❌ Missing owner address or client');
        return;
      }
      
    console.group('🔍 EVENT DATA FLOW INVESTIGATION');
    
    try {
      // Step 1: Get current block and contract state
      addLog('Step 1: Fetching current blockchain state...');
      const currentBlock = await client.getLatestBlockNumber();
      const calculatedStartBlock = currentBlock - BigInt(blockRange);
      
      console.log('📊 Blockchain State:', {
        currentBlock: currentBlock.toString(),
        startBlock: calculatedStartBlock.toString(),
        blockRange
      });
      
      // Step 2: Fetch raw contract data with different block ranges
      addLog('Step 2: Fetching contract data with multiple approaches...');
      
      // Approach A: Recent blocks (current - blockRange)
      const recentData = await client.getUiSnapshot(ownerAddress, calculatedStartBlock);
      const recentEvents = (recentData as any)[9] || []; // dataFeeds
      
      // Approach B: All blocks (startBlock 0)
      const allData = await client.getUiSnapshot(ownerAddress, BigInt(0));
      const allEvents = (allData as any)[9] || []; // dataFeeds
      
      console.log('📋 Raw Event Data Comparison:', {
        recentApproach: {
          startBlock: calculatedStartBlock.toString(),
          feedCount: recentEvents.length,
          totalLogs: recentEvents.reduce((sum: number, feed: any) => sum + (feed.logs?.length || 0), 0)
        },
        allBlocksApproach: {
          startBlock: '0',
          feedCount: allEvents.length,
          totalLogs: allEvents.reduce((sum: number, feed: any) => sum + (feed.logs?.length || 0), 0)
        }
      });
      
      addLog(`Recent approach: ${recentEvents.length} feeds, ${recentEvents.reduce((sum: number, feed: any) => sum + (feed.logs?.length || 0), 0)} logs`);
      addLog(`All blocks approach: ${allEvents.length} feeds, ${allEvents.reduce((sum: number, feed: any) => sum + (feed.logs?.length || 0), 0)} logs`);
      
      // Detailed logging for raw contract events
      console.log('🔍 Detailed Raw Contract Event Logs (Recent Approach):');
      recentEvents.forEach((feed: any, feedIndex: number) => {
        (feed.logs || []).forEach((log: any, logIndex: number) => {
          console.log(`  Feed ${feedIndex}, Log ${logIndex}: Type=${log.logType}, Val=${log.value?.toString()}, MainIdx=${log.mainPlayerIndex}, OtherIdx=${log.otherPlayerIndex}, Hit=${log.hit}, Died=${log.targetDied}`);
        });
      });

      console.log('🔍 Detailed Raw Contract Event Logs (All Blocks Approach):');
      allEvents.forEach((feed: any, feedIndex: number) => {
        (feed.logs || []).forEach((log: any, logIndex: number) => {
          console.log(`  Feed ${feedIndex}, Log ${logIndex}: Type=${log.logType}, Val=${log.value?.toString()}, MainIdx=${log.mainPlayerIndex}, OtherIdx=${log.otherPlayerIndex}, Hit=${log.hit}, Died=${log.targetDied}`);
        });
      });
      
      // Step 3: Check cached data in IndexedDB
      addLog('Step 3: Checking cached historical data...');
      const cachedBlocks = await db.dataBlocks
        .where('owner').equals(ownerAddress)
        .and(block => block.contract === ENTRYPOINT_ADDRESS.toLowerCase())
        .toArray();
      
             const cachedEventCount = cachedBlocks.reduce((sum, block) => sum + (block.events?.length || 0), 0);
       console.log('🗄️ IndexedDB Cache:', {
         blocksStored: cachedBlocks.length,
         totalCachedEvents: cachedEventCount,
         latestCachedBlock: cachedBlocks.length > 0 ? Math.max(...cachedBlocks.map(b => Number(b.block))) : 'None'
       });
      
      addLog(`IndexedDB: ${cachedBlocks.length} blocks, ${cachedEventCount} cached events`);
      
      // Step 4: Check what the game state shows
      addLog('Step 4: Analyzing processed game state...');
      const uiEventCount = gameState?.eventLogs?.length || 0;
      const uiChatCount = gameState?.chatLogs?.length || 0;
      
      console.log('🎮 Processed Game State:', {
        eventLogs: uiEventCount,
        chatLogs: uiChatCount,
        combatants: gameState?.combatants?.length || 0,
        lastEventTimestamp: gameState?.eventLogs?.[0]?.timestamp || 'None'
      });
      
      addLog(`Game state: ${uiEventCount} events, ${uiChatCount} chats displayed`);
      
      // Step 5: Identify potential issues
      addLog('Step 5: Identifying potential data loss points...');
      const totalContractEvents = Math.max(
        recentEvents.reduce((sum: number, feed: any) => sum + (feed.logs?.length || 0), 0),
        allEvents.reduce((sum: number, feed: any) => sum + (feed.logs?.length || 0), 0)
      );
      
      if (totalContractEvents > uiEventCount + cachedEventCount) {
        const missingEvents = totalContractEvents - (uiEventCount + cachedEventCount);
        console.warn('🚨 POTENTIAL DATA LOSS DETECTED!');
        console.warn(`Contract has ${totalContractEvents} events, but UI+Cache only shows ${uiEventCount + cachedEventCount}`);
        addLog(`🚨 MISSING EVENTS: ${missingEvents} events may be lost in processing`);
      } else {
        addLog('✅ Event counts appear consistent');
      }
      
      // Step 6: Check for specific event filtering issues
      addLog('Step 6: Checking event filtering...');
      if (gameState?.eventLogs && gameState.eventLogs.length > 0) {
        const eventTypes = gameState.eventLogs.reduce((acc: any, event: any) => {
          acc[event.type] = (acc[event.type] || 0) + 1;
          return acc;
        }, {});
        
        console.log('📊 Event Type Distribution:', eventTypes);
        addLog(`Event types: ${Object.entries(eventTypes).map(([type, count]) => `${type}:${count}`).join(', ')}`);
      }
      
      console.groupEnd();
      addLog('✅ Event investigation complete - check console for details');
      
    } catch (err) {
      console.error('❌ Error in event investigation:', err);
      addLog(`❌ Investigation failed: ${err instanceof Error ? err.message : String(err)}`);
      console.groupEnd();
    }
  };

  /**
   * Investigates potential contract-level issues with event generation
   */
  const investigateContractState = async () => {
    addLog('🔍 Investigating contract event generation...');
    
    if (!client || !ownerAddress) {
      addLog('❌ Missing client or owner address');
      return;
    }
    
    try {
      console.group('🔍 CONTRACT STATE INVESTIGATION');
      
      // Get current game state
      const rawData = await client.getUiSnapshot(ownerAddress, BigInt(0));
      const dataAsAny = rawData as any;
      
      console.log('📋 Raw Contract Response:', {
        characterID: dataAsAny[0],
        sessionKey: dataAsAny[1]?.key || 'none',
        character: dataAsAny[2] ? 'present' : 'missing',
        combatants: dataAsAny[3]?.length || 0,
        noncombatants: dataAsAny[4]?.length || 0,
        dataFeeds: dataAsAny[9]?.length || 0,
        balanceShortfall: dataAsAny[10]?.toString() || 'null',
        endBlock: dataAsAny[11]?.toString()
      });
      
      // Specifically log balance shortfall details
      const balanceShortfall = dataAsAny[10];
      console.log('💰 Balance Shortfall Details:', {
        rawValue: balanceShortfall,
        type: typeof balanceShortfall,
        isBigInt: typeof balanceShortfall === 'bigint',
        isZero: balanceShortfall === BigInt(0),
        isNull: balanceShortfall === null,
        isUndefined: balanceShortfall === undefined,
        formatted: balanceShortfall ? balanceShortfall.toString() : 'null/undefined'
      });
      
      // Also log session key data for committed balance analysis
      const sessionKeyData = dataAsAny[1];
      console.log('🔑 Session Key Data:', {
        key: sessionKeyData?.key || 'none',
        balance: sessionKeyData?.balance?.toString() || 'none',
        targetBalance: sessionKeyData?.targetBalance?.toString() || 'none',
        ownerCommittedAmount: sessionKeyData?.ownerCommittedAmount?.toString() || 'none',
        expiration: sessionKeyData?.expiration?.toString() || 'none'
      });
      
      // Log to debug panel
      addLog(`💰 Balance Shortfall: ${balanceShortfall ? balanceShortfall.toString() : 'null/undefined'}`);
      addLog(`🔑 Committed Balance: ${sessionKeyData?.ownerCommittedAmount?.toString() || 'none'}`);
      
      // Analyze data feeds for potential issues
      const dataFeeds = dataAsAny[9] || [];
      if (dataFeeds.length === 0) {
        console.warn('⚠️ NO DATA FEEDS RETURNED - This indicates no events in requested range');
        addLog('⚠️ No data feeds returned from contract');
      } else {
        console.log('📊 Data Feed Analysis:');
        dataFeeds.forEach((feed: any, index: number) => {
          console.log(`  Feed ${index}:`, {
            blockNumber: feed.blockNumber?.toString(),
            logCount: feed.logs?.length || 0,
            chatCount: feed.chatLogs?.length || 0,
            firstLogType: feed.logs?.[0]?.logType,
            lastLogType: feed.logs?.[feed.logs?.length - 1]?.logType
          });
        });
        
        addLog(`Found ${dataFeeds.length} data feeds with events`);
      }
      
      // Check character state for potential issues
      const character = dataAsAny[2];
      if (character) {
        console.log('👤 Character State:', {
          position: `(${character.stats?.x}, ${character.stats?.y}, depth: ${character.stats?.depth})`,
          health: `${character.stats?.health}/${character.maxHealth || 'unknown'}`,
          inCombat: character.stats?.combatants > 0,
          combatantCount: character.stats?.combatants
        });
        
        if (character.stats?.combatants === 0) {
          addLog('ℹ️ Character not in combat - may affect event generation');
        }
      }
      
      console.groupEnd();
      addLog('✅ Contract state investigation complete');
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      addLog(`❌ Contract investigation failed: ${errorMsg}`);
      console.error('[Contract Investigation Error]:', err);
    }
  };

  /**
   * Tests event filtering with different area approaches
   */
  const testEventFiltering = async () => {
    addLog('🧪 Testing event filtering with area-based logic...');
    
    if (!gameState?.eventLogs) {
      addLog('❌ No event logs available for testing');
      return;
    }
    
    console.group('🧪 EVENT FILTERING TEST');
    
    try {
      const allEvents = gameState.eventLogs;
      console.log(`📊 Total events in game state: ${allEvents.length}`);
      
      // Group events by area ID
      const eventsByArea = allEvents.reduce((acc: any, event: any) => {
        const areaKey = event.areaId?.toString() || 'undefined';
        acc[areaKey] = (acc[areaKey] || 0) + 1;
        return acc;
      }, {});
      
      console.log('📍 Events by Area ID:', eventsByArea);
      
      // Check for events with missing area IDs
      const eventsWithoutArea = allEvents.filter((event: any) => !event.areaId);
      if (eventsWithoutArea.length > 0) {
        console.warn(`⚠️ ${eventsWithoutArea.length} events missing area ID`);
        addLog(`⚠️ Found ${eventsWithoutArea.length} events without area ID`);
      }
      
             // Test current area filtering (if character has position)
       if (gameState?.character?.areaId) {
         const currentAreaEvents = allEvents.filter((event: any) => event.areaId === gameState.character?.areaId);
         console.log(`🎯 Events in current area (${gameState.character.areaId}): ${currentAreaEvents.length}`);
         addLog(`Current area has ${currentAreaEvents.length} events`);
       }
      
      console.groupEnd();
      addLog('✅ Event filtering test complete');
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      addLog(`❌ Event filtering test failed: ${errorMsg}`);
      console.error('[Event Filtering Test Error]:', err);
    }
  };
  
  // === CHARACTER DATA FUNCTIONS ===
  
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
        activeTask: {
          hasTaskError: Boolean(characterArray[7]?.[0] || false),
          pending: Boolean(characterArray[7]?.[1] || false),
          taskDelay: Number(characterArray[7]?.[2] || 0),
          executorDelay: Number(characterArray[7]?.[3] || 0),
          taskAddress: characterArray[7]?.[4] || '0x0000000000000000000000000000000000000000',
          targetBlock: Number(characterArray[7]?.[5] || 0)
        },
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

  // Add this new function to handle getting raw combatants and non-combatants from contract
  const handleGetCombatants = async () => {
    if (!ownerAddress || !client) {
      addLog('ERROR: No owner address or client available');
      return;
    }
    
    try {
      addLog('Fetching raw combatants and non-combatants from contract...');
      const rawData = await client.getUiSnapshot(ownerAddress, BigInt(0));
      const dataAsAny = rawData as any;
      
      // Raw combatants are at index 3, non-combatants at index 4
      const rawCombatants = dataAsAny[3] || [];
      const rawNoncombatants = dataAsAny[4] || [];
      
      console.log('[DebugPanel] Raw Combatants (contract data):', rawCombatants);
      console.log('[DebugPanel] Raw Non-combatants (contract data):', rawNoncombatants);
      
      // Parse and label the combatants data
      const labeledCombatants = rawCombatants.map((combatant: any, index: number) => ({
        arrayIndex: index,
        id: combatant[0] || '',
        class: Number(combatant[1] || 0),
        health: Number(combatant[2] || 0),
        maxHealth: Number(combatant[3] || 0),
        buffs: Number(combatant[4] || 0),
        debuffs: Number(combatant[5] || 0),
        level: Number(combatant[6] || 0),
        index: Number(combatant[7] || 0),
        combatantBitMap: combatant[8] || 0,
        ability: Number(combatant[9] || 0),
        abilityStage: Number(combatant[10] || 0),
        abilityTargetBlock: Number(combatant[11] || 0),
        name: combatant[12] || '',
        weaponName: combatant[13] || '',
        armorName: combatant[14] || '',
        isDead: Boolean(combatant[15] || false)
      }));
      
      // Parse and label the non-combatants data
      const labeledNoncombatants = rawNoncombatants.map((noncombatant: any, index: number) => ({
        arrayIndex: index,
        id: noncombatant[0] || '',
        class: Number(noncombatant[1] || 0),
        health: Number(noncombatant[2] || 0),
        maxHealth: Number(noncombatant[3] || 0),
        buffs: Number(noncombatant[4] || 0),
        debuffs: Number(noncombatant[5] || 0),
        level: Number(noncombatant[6] || 0),
        index: Number(noncombatant[7] || 0),
        combatantBitMap: noncombatant[8] || 0,
        ability: Number(noncombatant[9] || 0),
        abilityStage: Number(noncombatant[10] || 0),
        abilityTargetBlock: Number(noncombatant[11] || 0),
        name: noncombatant[12] || '',
        weaponName: noncombatant[13] || '',
        armorName: noncombatant[14] || '',
        isDead: Boolean(noncombatant[15] || false)
      }));
      
      console.log('[DebugPanel] Labeled Combatants:', labeledCombatants);
      console.log('[DebugPanel] Labeled Non-combatants:', labeledNoncombatants);
      
      // Log summary
      console.log('[DebugPanel] Combatants Summary:', {
        totalCombatants: rawCombatants.length,
        totalNoncombatants: rawNoncombatants.length,
        combatantNames: labeledCombatants.map((c: any) => c.name),
        noncombatantNames: labeledNoncombatants.map((c: any) => c.name)
      });
      
      addLog(`Raw contract data: ${rawCombatants.length} combatants, ${rawNoncombatants.length} non-combatants logged to console`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      addLog(`Error fetching combatants data: ${errorMsg}`);
      console.error('[DebugPanel] Error:', err);
    }
  };

  // Add this new function to handle getting processed combatants from game state
  const handleGetGameStateCombatants = async () => {
    if (!gameState) {
      addLog('ERROR: No game state available');
      return;
    }
    
    try {
      addLog('Logging processed combatants and non-combatants from game state...');
      
      const combatants = gameState.combatants || [];
      const noncombatants = gameState.noncombatants || [];
      
      console.log('[DebugPanel] Game State Combatants (processed):', combatants);
      console.log('[DebugPanel] Game State Non-combatants (processed):', noncombatants);
      
      // Log summary with more details
      console.log('[DebugPanel] Game State Summary:', {
        totalCombatants: combatants.length,
        totalNoncombatants: noncombatants.length,
                 combatantDetails: combatants.map((c: domain.CharacterLite) => ({
           name: c.name,
           id: c.id,
           level: c.level,
           health: `${c.health}/${c.maxHealth}`,
           class: c.class,
           isDead: c.isDead,
           areaId: c.areaId?.toString()
         })),
         noncombatantDetails: noncombatants.map((c: domain.CharacterLite) => ({
           name: c.name,
           id: c.id,
           level: c.level,
           health: `${c.health}/${c.maxHealth}`,
           class: c.class,
           isDead: c.isDead,
           areaId: c.areaId?.toString()
         }))
      });
      
      addLog(`Game state data: ${combatants.length} combatants, ${noncombatants.length} non-combatants logged to console`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      addLog(`Error logging game state combatants: ${errorMsg}`);
      console.error('[DebugPanel] Error:', err);
    }
  };

  // === CACHE MANAGEMENT FUNCTIONS ===
  
  const clearAllCache = async () => {
    try {
      addLog('🧹 Clearing all cached data...');
      
      // Clear IndexedDB
      if (ownerAddress) {
        const deletedCount = await db.dataBlocks
          .where('owner').equals(ownerAddress)
          .and(block => block.contract === ENTRYPOINT_ADDRESS.toLowerCase())
          .delete();
        addLog(`Cleared ${deletedCount} IndexedDB blocks for current contract`);
      }
      
      // Clear React Query cache
      await invalidateSnapshot(queryClient, ownerAddress, embeddedWallet?.address);
      await queryClient.clear();
      
      addLog('✅ All cache cleared - refresh page to see fresh data');
      
      toast({
        title: '🗑️ Cache Cleared',
        description: 'All cached data cleared. Refresh to see fresh events.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      addLog(`❌ Cache clear failed: ${errorMsg}`);
    }
  };

  // === STORAGE MANAGEMENT FUNCTIONS ===
  
  const handleContractChangeCheck = async () => {
    try {
      addLog('🔍 Checking for contract changes...');
      const changeDetected = await checkAndHandleContractChange();
      
      if (changeDetected) {
        addLog('✅ Contract change detected and handled');
        toast({
          title: '🔄 Contract Change Handled',
          description: 'Contract change detected. Old data was cleared.',
          status: 'info',
          duration: 5000,
          isClosable: true,
        });
      } else {
        addLog('ℹ️ No contract change detected');
        toast({
          title: '✅ Contract Current',
          description: 'No contract change detected.',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      addLog(`❌ Contract check failed: ${errorMsg}`);
    }
  };

  const handleClearContractData = async () => {
    try {
      addLog('🧽 Clearing previous contract data...');
      await clearContractData();
      addLog('✅ Previous contract data cleared');
      
      toast({
        title: '🧽 Previous Data Cleared',
        description: 'Data from previous contract deployments has been cleared.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      addLog(`❌ Contract data clear failed: ${errorMsg}`);
    }
  };

  const handleForceStorageReset = async () => {
    try {
      addLog('💥 Force resetting ALL storage...');
      await forceStorageReset();
      addLog('✅ All storage reset - please refresh page');
      
      toast({
        title: '💥 Storage Reset',
        description: 'ALL storage data cleared. Refresh the page.',
        status: 'warning',
        duration: 8000,
        isClosable: true,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      addLog(`❌ Storage reset failed: ${errorMsg}`);
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
        <Heading size="md">Event Investigation Panel</Heading>
        
        {/* Connection Info */}
        <Box p={2} bg="gray.800" borderRadius="md">
          <Text fontSize="sm"><strong>Owner:</strong> {injectedWallet?.address?.slice(0, 8)}...{injectedWallet?.address?.slice(-6) || 'Not connected'}</Text>
          <Text fontSize="sm"><strong>Character:</strong> {fetchedCharacterId?.slice(0, 8)}...{fetchedCharacterId?.slice(-6) || 'Not found'}</Text>
          <Text fontSize="sm"><strong>Contract:</strong> {ENTRYPOINT_ADDRESS.slice(0, 8)}...{ENTRYPOINT_ADDRESS.slice(-6)}</Text>
        </Box>
        
        {/* Investigation Parameters */}
        <Box p={2} bg="gray.800" borderRadius="md">
          <Heading size="sm" mb={2}>Investigation Parameters</Heading>
          <VStack spacing={2} align="stretch">
            <HStack>
              <Text fontSize="sm" minW="80px">Address:</Text>
              <Input 
                placeholder="Owner address" 
                value={ownerAddress} 
                onChange={(e) => setOwnerAddress(e.target.value)}
                size="sm"
              />
            </HStack>
            <HStack>
              <Text fontSize="sm" minW="80px">Block Range:</Text>
              <Select 
                value={blockRange} 
                onChange={(e) => setBlockRange(Number(e.target.value))}
                size="sm"
              >
                <option value={100}>Last 100 blocks</option>
                <option value={500}>Last 500 blocks</option>
                <option value={1000}>Last 1000 blocks</option>
                <option value={5000}>Last 5000 blocks</option>
              </Select>
            </HStack>
          </VStack>
        </Box>
        
        {/* Character Data Tools */}
        <Box p={2} bg="gray.800" borderRadius="md">
          <Heading size="sm" mb={2}>Character Data</Heading>
          <Text fontSize="xs" color="gray.400" mb={2}>
            Fetch and log raw character data from smart contract
          </Text>
          
          <VStack spacing={2} align="stretch">
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
            
            {/* Combatants Data Buttons */}
            <HStack spacing={2}>
              <Button 
                onClick={handleGetCombatants} 
                isDisabled={!ownerAddress || !client}
                colorScheme="green"
                size="sm"
                flex="1"
              >
                Raw Combatants
              </Button>
              <Button 
                onClick={handleGetGameStateCombatants} 
                isDisabled={!gameState}
                colorScheme="teal"
                size="sm"
                flex="1"
              >
                Game State Data
              </Button>
            </HStack>
            
            <Text fontSize="xs" color="gray.400">
              All data will be logged to console with detailed breakdowns
            </Text>
          </VStack>
        </Box>
        
        {/* Event Investigation Tools */}
        <Box p={2} bg="gray.800" borderRadius="md">
          <Heading size="sm" mb={2}>Event Investigation</Heading>
          <Text fontSize="xs" color="gray.400" mb={2}>
            Tools to investigate missing or filtered events in the data pipeline
          </Text>
          
          <VStack spacing={2} align="stretch">
            <Button 
              onClick={investigateEventDataFlow} 
              isDisabled={!ownerAddress || !client}
              colorScheme="blue"
              size="sm"
              width="100%"
            >
              🔍 Investigate Event Data Flow
            </Button>
            <Text fontSize="xs" color="gray.400">
              Traces events from contract → cache → UI to find data loss points
            </Text>
            
            <Button 
              onClick={investigateContractState} 
              isDisabled={!ownerAddress || !client}
              colorScheme="orange"
              size="sm"
              width="100%"
            >
              🔧 Check Contract Event Generation
            </Button>
            <Text fontSize="xs" color="gray.400">
              Analyzes contract state to identify why events might not be generated
            </Text>
            
            <Button 
              onClick={testEventFiltering} 
              isDisabled={!gameState?.eventLogs}
              colorScheme="purple"
              size="sm"
              width="100%"
            >
              🧪 Test Event Filtering
            </Button>
            <Text fontSize="xs" color="gray.400">
              Tests area-based and type-based event filtering logic
            </Text>
          </VStack>
        </Box>
        
        {/* Quick Diagnostics */}
        <Box p={2} bg="gray.800" borderRadius="md">
          <Heading size="sm" mb={2}>Quick Diagnostics</Heading>
          {gameState && (
            <VStack align="start" spacing={1}>
              <Text fontSize="sm">📊 Events: {gameState.eventLogs?.length || 0}</Text>
              <Text fontSize="sm">💬 Chats: {gameState.chatLogs?.length || 0}</Text>
              <Text fontSize="sm">⚔️ Combatants: {gameState.combatants?.length || 0}</Text>
              <Text fontSize="sm">👥 Non-combatants: {gameState.noncombatants?.length || 0}</Text>
              {gameState.character?.areaId && (
                <Text fontSize="sm">📍 Area: {gameState.character.areaId.toString()}</Text>
              )}
            </VStack>
          )}
          {!gameState && (
            <Text fontSize="sm" color="gray.400">No game state available</Text>
          )}
        </Box>
        
        {/* Cache Management */}
        <Box p={2} bg="gray.800" borderRadius="md">
          <Heading size="sm" mb={2}>Cache Management</Heading>
          <Text fontSize="xs" color="gray.400" mb={2}>
            Clear cached data when events appear stale or incorrect
          </Text>
          
            <Button 
            onClick={clearAllCache} 
              isLoading={isLoading} 
              size="sm" 
              width="100%" 
              colorScheme="red"
              variant="outline"
            >
              🗑️ Clear All Cache
            </Button>
        </Box>

        {/* Storage Management */}
        <Box p={2} bg="gray.800" borderRadius="md">
          <Heading size="sm" mb={2}>Storage Management</Heading>
          <Text fontSize="xs" color="gray.400" mb={2}>
            Manage contract-specific storage and handle deployment changes
          </Text>
          
          <VStack spacing={2} align="stretch">
            <Button 
              onClick={handleContractChangeCheck} 
              isLoading={isStorageClearing} 
              size="sm" 
              width="100%" 
              colorScheme="blue"
              variant="outline"
            >
              🔍 Check Contract Change
            </Button>
            <Text fontSize="xs" color="gray.400">
              Detects if contract was redeployed and clears old data
            </Text>
            
            <Divider />
            
            <Button 
              onClick={handleClearContractData} 
              isLoading={isStorageClearing} 
              size="sm" 
              width="100%" 
              colorScheme="orange"
              variant="outline"
            >
              🧽 Clear Previous Contract Data
            </Button>
            <Text fontSize="xs" color="gray.400">
              Removes data from previous contract deployments only
            </Text>
            
            <Button 
              onClick={handleForceStorageReset} 
              isLoading={isStorageClearing} 
              size="sm" 
              width="100%" 
              colorScheme="red"
              variant="solid"
            >
              💥 Force Reset All Storage
            </Button>
            <Text fontSize="xs" color="gray.400">
              Nuclear option: clears ALL storage data and localStorage
            </Text>
          </VStack>
        </Box>
        
        {/* Debug Logs */}
        <Accordion allowMultiple defaultIndex={[]}>
          <AccordionItem>
            <h2>
              <AccordionButton>
                <Box flex="1" textAlign="left">
                  Investigation Logs ({logs.length})
                </Box>
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
            <Text fontSize="sm">{error.message}</Text>
          </Box>
        )}
      </VStack>
    </Box>
  );
};

export default DebugPanel; 