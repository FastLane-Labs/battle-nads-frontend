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
import { contractToWorldSnapshot, mapCharacterLite } from '@/mappers';
import { createAreaID } from '@/utils/areaId';
import { useCachedDataFeed, CachedDataBlock, storeEventData, buildCharacterLookup, storeChatMessagesDirectly } from './useCachedDataFeed';
import { useUiSnapshot } from './useUiSnapshot';
import { useGameMutation, useGameTransactionMutation } from './useGameMutation';
import { useOptimisticChat } from '../optimistic/useOptimisticChat';

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

  // Use centralized optimistic chat system
  const { 
    optimisticChatMessages, 
    addOptimisticChatMessage: addOptimisticChat,
    isMessageOptimistic 
  } = useOptimisticChat();
  
  // Runtime event state - keeps new events until they're persisted to localStorage
  const [runtimeEvents, setRuntimeEvents] = useState<domain.EventMessage[]>([]);
  const [persistedEventKeys, setPersistedEventKeys] = useState<Set<string>>(new Set());

  /* ---------- Previous state preservation ---------- */
  const previousGameStateRef = useRef<domain.WorldSnapshot | null>(null);
  const previousEndBlockRef = useRef<number | null>(null);

  // Extract session key data and end block before mapping to UI state
  const rawSessionKeyData = useMemo(() => rawData?.sessionKeyData, [rawData]);
  const rawEndBlock = useMemo(() => rawData?.endBlock, [rawData]);
  const balanceShortfall = useMemo(() => rawData?.balanceShortfall, [rawData]);

  /* ---------- Session key management (optional) ---------- */
  const sessionKeyHook = useSessionKey(includeSessionKey ? characterId : null);
  const sessionKeyData = sessionKeyHook?.sessionKeyData || null;
  const sessionKeyState = sessionKeyHook?.sessionKeyState || null;

  /* ---------- Runtime logs processing ---------- */
  const processAndMergeRuntimeLogs = useCallback((uiSnapshot: contract.PollFrontendDataReturn) => {
    // NOTE: Chat processing is now handled entirely by contractToWorldSnapshot
    // This eliminates duplicate processing and character lookup issues
    
    // Update previous endBlock for continuity tracking
    if (uiSnapshot.dataFeeds?.length > 0) {
      const endBlock = Number(uiSnapshot.endBlock || 0);
      previousEndBlockRef.current = endBlock;
    }
    
    // Extract fresh runtime events and store them separately to prevent disappearing
    if (includeHistory && uiSnapshot.dataFeeds?.length) {
      // Build character lookup for consistent name resolution
      const characterLookup = buildCharacterLookup(
        (uiSnapshot.combatants || []).map(c => mapCharacterLite(c)),
        (uiSnapshot.noncombatants || []).map(c => mapCharacterLite(c)),
        uiSnapshot.character
      );
      const freshSnapshot = contractToWorldSnapshot(uiSnapshot, owner, characterId || undefined, characterLookup);
      if (freshSnapshot?.eventLogs && freshSnapshot.eventLogs.length > 0) {
        
        // Add fresh events to runtime state with deduplication
        setRuntimeEvents(prev => {
          const eventMap = new Map<string, domain.EventMessage>();
          
          // Add existing runtime events (not yet persisted)
          prev.forEach(event => {
            const key = `${event.blocknumber}-${event.logIndex}`;
            if (!persistedEventKeys.has(key)) {
              eventMap.set(key, event);
            }
          });
          
          // Add fresh events
          freshSnapshot.eventLogs.forEach(event => {
            const key = `${event.blocknumber}-${event.logIndex}`;
            if (!persistedEventKeys.has(key)) {
              eventMap.set(key, event);
            }
          });
          
          return Array.from(eventMap.values())
            .sort((a, b) => a.timestamp === b.timestamp ? a.logIndex - b.logIndex : a.timestamp - b.timestamp);
        });
      }
    }
    
    // Store new feed data using event-level deduplication
    if (includeHistory && owner && characterId && uiSnapshot.dataFeeds?.length) {
      
      // Calculate current player's areaId
      const playerAreaId = uiSnapshot.character ? 
        createAreaID(
          Number(uiSnapshot.character.stats.depth),
          Number(uiSnapshot.character.stats.x),
          Number(uiSnapshot.character.stats.y)
        ) : BigInt(0);
      
      // Store individual events with full context for name resolution
      storeEventData(
        owner,
        characterId, 
        uiSnapshot.dataFeeds,
        (uiSnapshot.combatants || []).map(c => mapCharacterLite(c)),
        (uiSnapshot.noncombatants || []).map(c => mapCharacterLite(c)),
        uiSnapshot.endBlock,
        uiSnapshot.fetchTimestamp,
        playerAreaId,
        uiSnapshot.character, // Pass main player character for name lookup
        uiSnapshot.endBlock // Pass endBlock for absolute block calculation
      ).then(result => {
        // Mark events as persisted when storage succeeds
        if (result.storedEvents > 0) {
          
          // Update persisted keys to allow runtime events to be cleaned up
          const characterLookup = buildCharacterLookup(
            (uiSnapshot.combatants || []).map(c => mapCharacterLite(c)),
            (uiSnapshot.noncombatants || []).map(c => mapCharacterLite(c)),
            uiSnapshot.character
          );
          const freshSnapshot = contractToWorldSnapshot(uiSnapshot, owner, characterId || undefined, characterLookup);
          if (freshSnapshot?.eventLogs) {
            setPersistedEventKeys(prev => {
              const newKeys = new Set(prev);
              freshSnapshot.eventLogs.forEach(event => {
                const key = `${event.blocknumber}-${event.logIndex}`;
                newKeys.add(key);
              });
              return newKeys;
            });
          }
        }
      }).catch(error => {
        console.error('[useGameState] Error storing event data:', error);
      });
    }
  }, [includeHistory, owner, characterId]);

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
        // Determine if this event involves the current player by checking indices
        const attackerIsCurrentPlayer = currentPlayerIndex === event.mainPlayerIndex;
        const defenderIsCurrentPlayer = currentPlayerIndex === event.otherPlayerIndex;
        
        // Helper function to get proper fallback name (matching storage logic)
        const getCharacterFallbackName = (playerIndex: number, isAttacker: boolean): string => {
          if (playerIndex <= 0) return 'Unknown';
          if (playerIndex <= 64) {
            return isAttacker ? `Player ${playerIndex}` : `Character ${playerIndex}`;
          } else {
            return isAttacker ? `Creature ${playerIndex}` : `Enemy ${playerIndex}`;
          }
        };
          
        const attacker: domain.EventParticipant | undefined = event.mainPlayerIndex > 0 ? {
          id: `index_${event.mainPlayerIndex}`,
          name: attackerIsCurrentPlayer ? "You" : (event.attackerName || getCharacterFallbackName(event.mainPlayerIndex, true)),
          index: event.mainPlayerIndex
        } : undefined;
        
        const defender: domain.EventParticipant | undefined = event.otherPlayerIndex > 0 ? {
          id: `index_${event.otherPlayerIndex}`,
          name: defenderIsCurrentPlayer ? "You" : (event.defenderName || getCharacterFallbackName(event.otherPlayerIndex, false)),
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
      ...optimisticChatMessages
    ];
    
    // Sort by block number, then by log index
    return combined.sort((a, b) => {
      const blockDiff = Number(a.blocknumber - b.blocknumber);
      if (blockDiff !== 0) return blockDiff;
      return a.logIndex - b.logIndex;
    });
  }, [historicalChatMessages, optimisticChatMessages]);

  /* ---------- Core game state mapping ---------- */
  const gameState = useMemo<domain.WorldSnapshot | null>(() => {
    if (!rawData) {
      return previousGameStateRef.current;
    }

    try {
      // Build character lookup for consistent name resolution
      const characterLookup = buildCharacterLookup(
        (rawData.combatants || []).map(c => mapCharacterLite(c)),
        (rawData.noncombatants || []).map(c => mapCharacterLite(c)),
        rawData.character
      );
      
      // Get base snapshot from contract data (includes fresh logs)
      const snapshotBase = contractToWorldSnapshot(rawData, owner, characterId?.toString(), characterLookup);
      
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

      // Use historical events as the primary source (fully resolved names)
      // and supplement with runtime events and fresh events not yet in cache
      const combinedEventLogsMap = new Map<string, domain.EventMessage>();

      // 1. Add historical event logs first (highest priority - fully resolved)
      historicalEventMessages.forEach(log => {
        const key = `${log.blocknumber}-${log.logIndex}`;
        combinedEventLogsMap.set(key, log);
      });
      
      // 2. Add runtime events that haven't been persisted yet (prevents disappearing)
      runtimeEvents.forEach(log => {
        const key = `${log.blocknumber}-${log.logIndex}`;
        if (!combinedEventLogsMap.has(key)) {
          combinedEventLogsMap.set(key, log);
        }
      });
      
      // 3. Add fresh logs from current snapshot only if not already included (final fallback)
      snapshotBase.eventLogs.forEach(log => {
        const key = `${log.blocknumber}-${log.logIndex}`;
        if (!combinedEventLogsMap.has(key)) {
          combinedEventLogsMap.set(key, log);
        }
      });

      const finalEventLogs = Array.from(combinedEventLogsMap.values())
                                  .sort((a, b) => a.timestamp === b.timestamp ? a.logIndex - b.logIndex : a.timestamp - b.timestamp);
                                  
      
      // --- Combine Historical + Runtime Chat Logs --- 
      const combinedChatLogsMap = new Map<string, domain.ChatMessage>();

      // 1. Add historical chat logs (use consistent key format)
      historicalChatMessages.forEach(log => {
        const key = `${log.blocknumber}-${log.logIndex}`;
        combinedChatLogsMap.set(key, log);
      });
      
      // 2. Add fresh chat logs from current snapshot (will override others if same key)
      snapshotBase.chatLogs.forEach(log => {
        const key = `${log.blocknumber}-${log.logIndex}`;
        combinedChatLogsMap.set(key, log);
      });
      
      
      // 3. Add optimistic chat messages (but skip if we have a confirmed version)
      optimisticChatMessages.forEach((optimistic) => {
        const hasConfirmedVersion = Array.from(combinedChatLogsMap.values()).some(confirmed => {
          // Must be from the same player
          const isSamePlayer = confirmed.sender.index === optimistic.sender.index ||
                              confirmed.sender.id === optimistic.sender.id;
          
          if (!isSamePlayer) return false;
          
          // Must have the same message content
          const sameContent = confirmed.message === optimistic.message;
          if (!sameContent) return false;
          
          // Must be within reasonable time window (30 seconds)
          const timeDiff = Math.abs(confirmed.timestamp - optimistic.timestamp);
          const withinTimeWindow = timeDiff <= 30000;
          
          
          return sameContent && isSamePlayer && withinTimeWindow;
        });
        
        // Only add optimistic if no confirmed version exists
        if (!hasConfirmedVersion) {
          const key = `optimistic-${optimistic.timestamp}-${optimistic.sender.index}`;
          combinedChatLogsMap.set(key, optimistic);
        }
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
  }, [rawData, includeHistory, historicalEventMessages, historicalChatMessages, optimisticChatMessages, runtimeEvents, owner, characterId]);

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
    if (!rawData?.character || !gameState) return;

    // Check if this message already exists in the game state (confirmed)
    const messageAlreadyExists = gameState.chatLogs.some(chat => {
      // Must be from the same player
      const isSamePlayer = chat.sender.id === rawData.character.id.toString() ||
                          chat.sender.index === Number(rawData.character.stats.index);
      
      if (!isSamePlayer) return false;
      
      // Must have the same message content
      const sameContent = chat.message === message;
      if (!sameContent) return false;
      
      // Must be recent (within 30 seconds) to match deduplication window
      const isRecent = Date.now() - chat.timestamp <= 30000;
      
      return sameContent && isSamePlayer && isRecent;
    });

    if (messageAlreadyExists) {
      return;
    }

    // Check if already optimistic (deduplication handled by the centralized system)
    if (isMessageOptimistic(message, rawData.character.id.toString())) {
      return;
    }

    // Use centralized optimistic chat system
    addOptimisticChat(
      message,
      {
        id: rawData.character.id.toString(),
        name: rawData.character.name,
        index: Number(rawData.character.stats.index)
      },
      rawData.endBlock
    );
  }, [rawData, gameState, addOptimisticChat, isMessageOptimistic]);

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

    // Send chat mutation - wait for transaction confirmation before re-enabling chat
    const sendChatMutation = useGameTransactionMutation(
      async (variables: { message: string }) => {
        if (!client || !characterId) {
          throw new Error('Client or character ID missing');
        }
        return client.chat(characterId, variables.message);
      },
      {
        successMessage: 'Message confirmed',
        errorMessage: 'Failed to send message',
        showSuccessToast: false, // Don't show success toast for chat
        showTransactionFlow: false, // Don't show transaction flow toast for chat
        mutationKey: ['sendChat', characterId || 'unknown', owner || 'unknown'],
        characterId,
        onSuccess: (_, variables) => {
          // Add optimistic message only after transaction is confirmed
          // This prevents duplicate messages if the transaction fails
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
    isInCombat: Boolean(rawData?.character?.stats?.combatantBitMap),
    
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


