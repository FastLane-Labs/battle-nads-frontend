import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { useWallet } from '../../providers/WalletProvider';
import { useBattleNadsClient } from '../contracts/useBattleNadsClient';
import { useSessionKey } from '../session/useSessionKey';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { domain, contract } from '@/types';
import { useToast } from '@chakra-ui/react';
import { MAX_SESSION_KEY_VALIDITY_BLOCKS } from '../../config/env';
import { TransactionResponse } from 'ethers';
import { mapSessionKeyData } from '../../mappers/contractToDomain';
import { contractToWorldSnapshot, mapCharacterLite, processChatFeedsToDomain } from '@/mappers';
import { createAreaID } from '@/utils/areaId';
import { useCachedDataFeed, CachedDataBlock, storeFeedData } from './useCachedDataFeed';
import { useUiSnapshot } from './useUiSnapshot';
import { useGameMutation } from './useGameMutation';

export interface UseGameStateOptions {
  /** Whether to include action mutations and wallet integration (default: true) */
  includeActions?: boolean;
  /** Whether to include historical data processing (default: true) */
  includeHistory?: boolean;
  /** Whether to include session key management (default: true) */
  includeSessionKey?: boolean;
  /** Read-only mode for debug panels (default: false) */
  readOnly?: boolean;
}

/**
 * Consolidated game state hook that combines functionality from useBattleNads and useGame
 * Provides configurable options for different use cases
 */
export const useGameState = (options: UseGameStateOptions = {}): any => {
  const {
    includeActions = true,
    includeHistory = true,
    includeSessionKey = true,
    readOnly = false
  } = options;

  // Wallet and client setup
  const { 
    injectedWallet, 
    embeddedWallet, 
    connectMetamask, 
    isInitialized: isWalletInitialized
  } = useWallet();
  const { client } = useBattleNadsClient();
  const queryClient = useQueryClient();
  const toast = useToast();
  
  // Owner address from wallet
  const owner = injectedWallet?.address || null;

  /* ---------- Core snapshot polling (from useBattleNads) ---------- */
  const { 
    data: rawData, 
    isLoading: isSnapshotLoading, 
    error: snapshotError, 
  } = useUiSnapshot(owner);

  // Character ID extraction for cache management
  const characterId = useMemo(() => rawData?.character?.id || null, [rawData]);
  
  // Historical data (optional) - conditionally disable by passing null
  const { 
    historicalBlocks, 
    isHistoryLoading: isCacheHistoryLoading,
    getAllCharactersForOwner,
    getDataSummaryForOwner 
  } = useCachedDataFeed(
    includeHistory ? owner : null, 
    includeHistory ? characterId : null
  );

  // Chat and event state management
  const [optimisticChatMessages, setOptimisticChatMessages] = useState<domain.ChatMessage[]>([]);
  const [runtimeConfirmedLogs, setRuntimeConfirmedLogs] = useState<domain.ChatMessage[]>([]);

  /* ---------- Previous state preservation ---------- */
  const previousGameStateRef = useRef<domain.WorldSnapshot | null>(null);

  // Extract session key data and end block before mapping to UI state
  const rawSessionKeyData = useMemo(() => rawData?.sessionKeyData, [rawData]);
  const rawEndBlock = useMemo(() => rawData?.endBlock, [rawData]);
  const balanceShortfall = useMemo(() => rawData?.balanceShortfall, [rawData]);

  // Character lookup map
  const characterLookup = useMemo<Map<number, domain.CharacterLite>>(() => {
    const map = new Map<number, domain.CharacterLite>();
    if (rawData) {
      // Add current combatants from fresh contract data
      (rawData.combatants || []).forEach(c => {
        const mapped = mapCharacterLite(c);
        map.set(Number(c.index), mapped);
      });
      
      // Add current noncombatants from fresh contract data
      (rawData.noncombatants || []).forEach(c => {
        const mapped = mapCharacterLite(c);
        map.set(Number(c.index), mapped);
      });
    }
    return map;
  }, [rawData]);

  /* ---------- Session key management (optional) ---------- */
  const sessionKeyHook = useSessionKey(includeSessionKey ? characterId : null);
  const sessionKeyData = sessionKeyHook?.sessionKeyData || null;
  const sessionKeyState = sessionKeyHook?.sessionKeyState || null;


  /* ---------- Runtime logs processing ---------- */
  const processAndMergeRuntimeLogs = useCallback((uiSnapshot: contract.PollFrontendDataReturn) => {
    // Process fresh chat logs using the same pattern as useBattleNads
    const newlyConfirmedChatLogs = processChatFeedsToDomain(
      uiSnapshot.dataFeeds,
      characterLookup,
      BigInt(uiSnapshot.endBlock || 0),
      uiSnapshot.fetchTimestamp
    );

    // Add newly confirmed chat logs
    setRuntimeConfirmedLogs(prev => {
      const existingKeys = new Set(prev.map(log => `conf-${log.blocknumber}-${log.logIndex}`));
      const newLogs = newlyConfirmedChatLogs.filter(log => 
        !existingKeys.has(`conf-${log.blocknumber}-${log.logIndex}`)
      );
      return [...prev, ...newLogs];
    });

    // Remove optimistic messages that match newly confirmed messages
    if (newlyConfirmedChatLogs.length > 0) {
      setOptimisticChatMessages(prev => {
        return prev.filter(optimistic => {
          // Keep optimistic message if no confirmed message matches it
          return !newlyConfirmedChatLogs.some(confirmed => 
            confirmed.message === optimistic.message && 
            confirmed.sender.id === optimistic.sender.id
          );
        });
      });
    }


    // NOTE: Event processing is now handled entirely by contractToWorldSnapshot
    // This eliminates duplicate processing and the "Unknown performed action" issue

    // Store the feed data in cache if includeHistory is enabled (let the original useBattleNads flow handle this)
    if (includeHistory && owner && characterId && uiSnapshot.dataFeeds?.length) {
      // Calculate current player's areaId
      const playerAreaId = uiSnapshot.character ? 
        createAreaID(
          Number(uiSnapshot.character.stats.depth),
          Number(uiSnapshot.character.stats.x),
          Number(uiSnapshot.character.stats.y)
        ) : BigInt(0);
      
      // Use the original storeFeedData function with correct parameters
      storeFeedData(
        owner,
        characterId, 
        uiSnapshot.dataFeeds,
        (uiSnapshot.combatants || []).map(c => mapCharacterLite(c)),
        (uiSnapshot.noncombatants || []).map(c => mapCharacterLite(c)),
        uiSnapshot.endBlock,
        uiSnapshot.fetchTimestamp,
        playerAreaId,
        uiSnapshot.character // Pass main player character for name lookup
      );
    }
  }, [characterLookup, includeHistory, owner, characterId]);

  // Process runtime logs when raw data changes
  useEffect(() => {
    if (rawData) {
      processAndMergeRuntimeLogs(rawData);
    }
  }, [rawData]);

  /* ---------- Historical chat processing ---------- */
  const historicalChatMessages = useMemo<domain.ChatMessage[]>(() => {
    if (!includeHistory || !historicalBlocks || historicalBlocks.length === 0) return [];
    
    const messages: domain.ChatMessage[] = [];
    
    historicalBlocks.forEach((block: CachedDataBlock) => {
      block.chats?.forEach((chat, index) => {
        messages.push({
          sender: { 
            id: chat.senderId || 'unknown-id', 
            name: chat.senderName || 'Unknown', 
            index: -1
          }, 
          message: chat.content,
          blocknumber: BigInt(chat.timestamp),
          timestamp: Number(chat.timestamp),
          logIndex: index,
          isOptimistic: false
        });
      });
    });
    return messages;
  }, [includeHistory, historicalBlocks]);

  const historicalEventMessages = useMemo<domain.EventMessage[]>(() => {
    if (!includeHistory || !historicalBlocks || historicalBlocks.length === 0) return [];
    
    const messages: domain.EventMessage[] = [];
    const currentPlayerIndex = rawData?.character ? Number(rawData.character.stats.index) : null;
    
    // Calculate current player's area ID for filtering
    const currentAreaId = rawData?.character ? 
      createAreaID(
        Number(rawData.character.stats.depth),
        Number(rawData.character.stats.x),
        Number(rawData.character.stats.y)
      ) : BigInt(0);
    
    historicalBlocks.forEach((block: CachedDataBlock) => {
      block.events?.forEach((event) => {
        // Create event participant info from stored data with player substitution
        const attacker: domain.EventParticipant | undefined = event.mainPlayerIndex > 0 ? {
          id: `index_${event.mainPlayerIndex}`,
          name: currentPlayerIndex === event.mainPlayerIndex ? "You" : (event.attackerName || `Index ${event.mainPlayerIndex}`),
          index: event.mainPlayerIndex
        } : undefined;
        
        const defender: domain.EventParticipant | undefined = event.otherPlayerIndex > 0 ? {
          id: `index_${event.otherPlayerIndex}`,
          name: currentPlayerIndex === event.otherPlayerIndex ? "You" : (event.defenderName || `Index ${event.otherPlayerIndex}`),
          index: event.otherPlayerIndex
        } : undefined;
        
        messages.push({
          logIndex: event.index,
          blocknumber: BigInt(block.blockNumber),
          timestamp: block.timestamp,
          type: event.logType as domain.LogType,
          attacker: attacker,
          defender: defender,
          areaId: currentAreaId,
          isPlayerInitiated: false,
          details: {
            hit: event.hit,
            critical: event.critical,
            damageDone: event.damageDone,
            healthHealed: event.healthHealed,
            targetDied: event.targetDied,
            lootedWeaponID: event.lootedWeaponID,
            lootedArmorID: event.lootedArmorID,
            experience: event.experience,
            value: BigInt(event.value || '0')
          },
          displayMessage: ''
        });
      });
    });
    return messages;
  }, [includeHistory, historicalBlocks, rawData]);

  /* ---------- Combined chat/event logs ---------- */
  const allChatMessages = useMemo(() => {
    const combined = [
      ...historicalChatMessages,
      ...runtimeConfirmedLogs,
      ...optimisticChatMessages
    ];
    
    // Sort by block number, then by log index
    return combined.sort((a, b) => {
      const blockDiff = Number(a.blocknumber - b.blocknumber);
      if (blockDiff !== 0) return blockDiff;
      return a.logIndex - b.logIndex;
    });
  }, [historicalChatMessages, runtimeConfirmedLogs, optimisticChatMessages]);


  /* ---------- Core game state mapping ---------- */
  const gameState = useMemo<domain.WorldSnapshot | null>(() => {
    if (!rawData) {
      return previousGameStateRef.current;
    }

    try {
      // Get base snapshot from contract data (includes fresh logs)
      const snapshotBase = contractToWorldSnapshot(rawData, owner, characterId?.toString());
      
      if (!snapshotBase) {
        return previousGameStateRef.current;
      }

      // If history is not enabled, return the base snapshot
      if (!includeHistory) {
        if (snapshotBase) {
          previousGameStateRef.current = snapshotBase;
        }
        return snapshotBase;
      }

      // Combine historical and fresh event data
      const combinedEventLogsMap = new Map<string, domain.EventMessage>();

      // 1. Add fresh logs from current snapshot first (lower priority)
      snapshotBase.eventLogs.forEach(log => {
        const key = `${log.blocknumber}-${log.logIndex}`;
        combinedEventLogsMap.set(key, log);
      });
      // 2. Add historical event logs (higher priority, will override fresh events)
      // Historical events have already been processed with complete character information
      historicalEventMessages.forEach(log => {
        const key = `${log.blocknumber}-${log.logIndex}`;
        combinedEventLogsMap.set(key, log);
      });

      const finalEventLogs = Array.from(combinedEventLogsMap.values())
                                  .sort((a, b) => a.timestamp === b.timestamp ? a.logIndex - b.logIndex : a.timestamp - b.timestamp);
      
      // --- Combine Historical + Runtime Chat Logs --- 
      const combinedChatLogsMap = new Map<string, domain.ChatMessage>();
      const validRuntimeChatLogs = runtimeConfirmedLogs.filter(chat => chat.blocknumber !== undefined && chat.logIndex !== undefined);

      // 1. Add historical chat logs (use consistent key format)
      historicalChatMessages.forEach(log => {
        const key = `${log.blocknumber}-${log.logIndex}`;
        combinedChatLogsMap.set(key, log);
      });
      // 2. Add runtime confirmed chat logs (will override historical if same key)
      validRuntimeChatLogs.forEach(log => {
        const key = `${log.blocknumber}-${log.logIndex}`; 
        combinedChatLogsMap.set(key, log);
      });
      // 3. Add fresh chat logs from current snapshot (will override others if same key)
      snapshotBase.chatLogs.forEach(log => {
        const key = `${log.blocknumber}-${log.logIndex}`;
        combinedChatLogsMap.set(key, log);
      });
      // 4. Add optimistic chat messages (these have unique keys since they're not from blockchain yet)
      optimisticChatMessages.forEach((log, index) => {
        const key = `optimistic-${log.timestamp}-${index}`;
        combinedChatLogsMap.set(key, log);
      });

      const finalChatLogs = Array.from(combinedChatLogsMap.values())
                              .sort((a, b) => a.timestamp - b.timestamp);

      // Create final snapshot with combined data
      const finalSnapshot: domain.WorldSnapshot = {
        ...snapshotBase,
        // Use ONLY fresh contract combatants/noncombatants (no historical contamination)
        combatants: snapshotBase.combatants,
        noncombatants: snapshotBase.noncombatants,
        // Use combined logs (historical + fresh)
        eventLogs: finalEventLogs,
        chatLogs: finalChatLogs
      };

      previousGameStateRef.current = finalSnapshot;
      return finalSnapshot;
    } catch (error) {
      console.error('[useGameState] Error mapping contract data to domain:', error);
      return previousGameStateRef.current;
    }
  }, [rawData, includeHistory, historicalEventMessages, historicalChatMessages, runtimeConfirmedLogs, optimisticChatMessages, owner, characterId]);

  /* ---------- Unified world snapshot with session data ---------- */
  const worldSnapshot = useMemo<domain.WorldSnapshot | null>(() => {
    if (!gameState) return null;

    if (!includeSessionKey || !sessionKeyData) {
      return gameState;
    }

    return {
      ...gameState,
      sessionKeyData: mapSessionKeyData(sessionKeyData, owner)
    };
  }, [gameState, sessionKeyData, includeSessionKey]);

  /* ---------- Optimistic chat management ---------- */
  const addOptimisticChatMessage = useCallback((message: string) => {
    if (!rawData?.character) return;

    const optimisticMessage: domain.ChatMessage = {
      sender: {
        id: rawData.character.id.toString(),
        name: rawData.character.name,
        index: Number(rawData.character.stats.index)
      },
      message,
      blocknumber: rawData.endBlock,
      timestamp: Date.now(),
      logIndex: 9999,
      isOptimistic: true
    };

    setOptimisticChatMessages(prev => [...prev, optimisticMessage]);

    // Remove optimistic message after 30 seconds
    setTimeout(() => {
      setOptimisticChatMessages(prev => 
        prev.filter(msg => msg !== optimisticMessage)
      );
    }, 30000);
  }, [rawData]);

  /* ---------- Loading states ---------- */
  const isLoading = isSnapshotLoading || (includeHistory && isCacheHistoryLoading);

  /* ---------- Game actions (optional) ---------- */
  let gameActions = {};
  
  if (includeActions && !readOnly) {
    // Move character mutation
    const moveCharacterMutation = useGameMutation(
      async (variables: { direction: domain.Direction }) => {
        if (!client || !characterId) {
          throw new Error('Client or character ID missing');
        }
        return client.moveCharacter(characterId, variables.direction);
      },
      {
        successMessage: 'Character moved successfully',
        errorMessage: 'Failed to move character',
        mutationKey: ['moveCharacter', characterId || 'unknown', owner || 'unknown'],
        characterId,
      }
    );

    // Attack mutation
    const attackMutation = useGameMutation(
      async (variables: { targetCharacterIndex: number }) => {
        if (!client || !characterId) {
          throw new Error('Client or character ID missing');
        }
        return client.attack(characterId, variables.targetCharacterIndex);
      },
      {
        successMessage: 'Attack successful',
        errorMessage: 'Attack failed',
        mutationKey: ['attack', characterId || 'unknown', owner || 'unknown'],
        characterId,
      }
    );

    // Allocate points mutation
    const allocatePointsMutation = useGameMutation(
      async (variables: { strength: number; vitality: number; dexterity: number; quickness: number; sturdiness: number; luck: number }) => {
        if (!client || !characterId) {
          throw new Error('Client or character ID missing');
        }
        return client.allocatePoints(
          characterId, 
          BigInt(variables.strength), 
          BigInt(variables.vitality), 
          BigInt(variables.dexterity), 
          BigInt(variables.quickness), 
          BigInt(variables.sturdiness), 
          BigInt(variables.luck)
        );
      },
      {
        successMessage: 'Points allocated successfully',
        errorMessage: 'Failed to allocate points',
        mutationKey: ['allocatePoints', characterId || 'unknown', owner || 'unknown'],
        characterId,
      }
    );

    // Send chat mutation
    const sendChatMutation = useGameMutation(
      async (variables: { message: string }) => {
        if (!client || !characterId) {
          throw new Error('Client or character ID missing');
        }
        return client.chat(characterId, variables.message);
      },
      {
        successMessage: 'Message sent',
        errorMessage: 'Failed to send message',
        showSuccessToast: false, // Don't show toast for chat
        mutationKey: ['sendChat', characterId || 'unknown', owner || 'unknown'],
        characterId,
        onSuccess: (_, variables) => {
          addOptimisticChatMessage(variables.message);
        }
      }
    );

    // Session key update mutation (only if session key management is enabled)
    const updateSessionKeyMutation = includeSessionKey ? useMutation({
      mutationFn: async () => {
        if (!client || !characterId || !embeddedWallet?.address || !rawData?.endBlock) {
          throw new Error('Client, character ID, embedded wallet, or current block missing');
        }

        // Calculate expiration block and value following the original pattern
        const expirationBlock = rawData.endBlock + BigInt(MAX_SESSION_KEY_VALIDITY_BLOCKS);
        const estimatedBuyIn = await client.estimateBuyInAmountInMON();
        const valueToSend = estimatedBuyIn * BigInt(2);

        return client.updateSessionKey(
          embeddedWallet.address,
          expirationBlock,
          valueToSend
        );
      },
      onSuccess: async (result: TransactionResponse) => {
        const loadingToastId = 'session-key-wait-toast';
        toast?.({
          id: loadingToastId,
          title: 'Session Key Update Sent',
          description: `Tx: ${result.hash.slice(0, 6)}...${result.hash.slice(-4)}. Waiting for confirmation...`,
          status: 'loading',
          duration: null,
          isClosable: true,
        });
        
        try {
          await result.wait(1);
          toast?.close(loadingToastId);
          toast?.({
            title: 'Session Key Updated!',
            status: 'success',
            duration: 4000,
          });
          queryClient.invalidateQueries({ queryKey: ['sessionKey', injectedWallet?.address, characterId] });
        } catch (waitError: any) {
          console.error('[useGameState] Error waiting for session key update confirmation:', waitError);
          toast?.close(loadingToastId);
          toast?.({
            title: 'Session Key Update Failed',
            description: `Failed to confirm transaction ${result.hash}: ${waitError.message}`,
            status: 'error',
            duration: 7000,
          });
        }
      },
      onError: (err: Error) => {
        console.error('[useGameState] Error sending session key update transaction:', err);
        toast?.({
          title: 'Session Key Update Error',
          description: err.message || 'Failed to send update transaction.',
          status: 'error',
          duration: 5000,
        });
      }
    }) : null;

    gameActions = {
      // Action functions
      moveCharacter: (direction: domain.Direction) => 
        moveCharacterMutation.mutate({ direction }),
      attack: (targetCharacterIndex: number) => 
        attackMutation.mutate({ targetCharacterIndex }),
      allocatePoints: (strength: number, vitality: number, dexterity: number, quickness: number, sturdiness: number, luck: number) => 
        allocatePointsMutation.mutate({ strength, vitality, dexterity, quickness, sturdiness, luck }),
      sendChatMessage: (message: string) => 
        sendChatMutation.mutate({ message }),
      updateSessionKey: updateSessionKeyMutation ? () => updateSessionKeyMutation.mutate() : undefined,

      // Action states
      isMoving: moveCharacterMutation.isPending,
      isAttacking: attackMutation.isPending,
      isAllocatingPoints: allocatePointsMutation.isPending,
      isSendingChat: sendChatMutation.isPending,
      isUpdatingSessionKey: updateSessionKeyMutation?.isPending || false,

      // Action errors
      moveError: moveCharacterMutation.error,
      attackError: attackMutation.error,
      allocatePointsError: allocatePointsMutation.error,
      chatError: sendChatMutation.error,
      sessionKeyError: updateSessionKeyMutation?.error || null,
    };
  }

  /* ---------- Return interface ---------- */
  return {
    // Core game state (always available)
    gameState: readOnly ? gameState : worldSnapshot,
    worldSnapshot: readOnly ? gameState : worldSnapshot,
    
    // Raw contract data
    rawSessionKeyData,
    rawEndBlock,
    balanceShortfall,
    
    // Character info
    character: gameState?.character || null,
    characterId,
    position: gameState?.character ? {
      x: gameState.character.position.x,
      y: gameState.character.position.y,
      depth: gameState.character.position.depth
    } : null,
    
    // Session key data (if enabled)
    ...(includeSessionKey && {
      sessionKeyData: sessionKeyData,
      sessionKeyState: sessionKeyState,
      needsSessionKeyUpdate: sessionKeyHook?.needsUpdate || false,
    }),
    
    // Wallet info
    owner,
    hasWallet: Boolean(injectedWallet),
    connectWallet: connectMetamask,
    isInitialized: isWalletInitialized,
    isWalletInitialized,
    
    // Chat and events
    addOptimisticChatMessage,
    chatLogs: allChatMessages,
    eventLogs: gameState?.eventLogs || [],
    
    // Other characters in area
    others: gameState?.combatants.filter(c => c.id !== characterId) || [],
    
    // Combat state
    isInCombat: Boolean(rawData?.character?.stats.combatantBitMap),
    
    // Loading states
    isLoading,
    isSnapshotLoading,
    isCacheLoading: includeHistory ? isCacheHistoryLoading : false,
    
    // Error states
    error: snapshotError,
    
    // Equipment data from raw snapshot
    rawEquipableWeaponIDs: rawData?.equipableWeaponIDs,
    rawEquipableWeaponNames: rawData?.equipableWeaponNames,
    rawEquipableArmorIDs: rawData?.equipableArmorIDs,
    rawEquipableArmorNames: rawData?.equipableArmorNames,
    
    // Historical data functions (if enabled)
    ...(includeHistory && {
      getAllCharactersForOwner,
      getDataSummaryForOwner,
      historicalBlocks,
    }),
    
    // Actions (if enabled)
    ...gameActions,
  };
};


