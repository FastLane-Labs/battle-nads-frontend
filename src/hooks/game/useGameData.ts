import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { useWallet } from '../../providers/WalletProvider';
import { useSessionKey } from '../session/useSessionKey';
import { domain, contract, hooks } from '@/types';
import { mapSessionKeyData } from '../../mappers/contractToDomain';
import { contractToWorldSnapshot, mapCharacterLite } from '@/mappers';
import { createAreaID } from '@/utils/areaId';
import { useCachedDataFeed, CachedDataBlock, storeEventData, buildCharacterLookup } from './useCachedDataFeed';
import { useContractPolling } from './useContractPolling';
import { useOptimisticChat } from '../optimistic/useOptimisticChat';
import { useFogOfWar } from './useFogOfWar';
import { ENTRYPOINT_ADDRESS } from '@/config/env';

export interface UseGameDataOptions {
  /** Whether to include historical data processing (default: true) */
  includeHistory?: boolean;
  /** Whether to include session key management (default: true) */
  includeSessionKey?: boolean;
}

/**
 * Layer 2: Game data business logic
 * Combines contract data with transformations and business rules
 */
export const useGameData = (options: UseGameDataOptions = {}): hooks.UseGameDataReturn => {
  const {
    includeHistory = true,
    includeSessionKey = true,
  } = options;

  // Core dependencies
  const { injectedWallet } = useWallet();
  const owner = injectedWallet?.address || null;
  
  // Layer 1: Pure contract data
  const { 
    data: rawData, 
    isLoading: isPollingLoading, 
    error: pollingError, 
  } = useContractPolling(owner);

  // Character ID extraction
  const characterId = useMemo(() => rawData?.character?.id || null, [rawData]);
  
  // Historical data (conditional)
  const { 
    historicalBlocks, 
    isHistoryLoading,
    getAllCharactersForOwner,
    getDataSummaryForOwner
  } = useCachedDataFeed(
    includeHistory ? owner : null, 
    includeHistory ? characterId : null
  );

  // Optimistic chat system
  const { 
    optimisticChatMessages, 
    addOptimisticChatMessage: addOptimisticChat,
    isMessageOptimistic
  } = useOptimisticChat();
  
  // Runtime event state
  const [runtimeEvents, setRuntimeEvents] = useState<domain.EventMessage[]>([]);
  const [persistedEventKeys, setPersistedEventKeys] = useState<Set<string>>(new Set());

  // Previous state preservation
  const previousGameStateRef = useRef<domain.WorldSnapshot | null>(null);

  // Extract raw values
  const rawSessionKeyData = useMemo(() => rawData?.sessionKeyData, [rawData]);
  const rawEndBlock = useMemo(() => rawData?.endBlock, [rawData]);
  const balanceShortfall = useMemo(() => rawData?.balanceShortfall, [rawData]);

  // Session key management (conditional)
  const sessionKeyHook = useSessionKey(includeSessionKey ? characterId : null);
  const sessionKeyData = sessionKeyHook?.sessionKeyData || null;
  const sessionKeyState = sessionKeyHook?.sessionKeyState || null;


  // Runtime logs processing
  const processAndMergeRuntimeLogs = useCallback((uiSnapshot: contract.PollFrontendDataReturn) => {
    if (includeHistory && uiSnapshot.dataFeeds?.length) {
      const characterLookup = buildCharacterLookup(
        (uiSnapshot.combatants || []).map(c => mapCharacterLite(c)),
        (uiSnapshot.noncombatants || []).map(c => mapCharacterLite(c)),
        uiSnapshot.character
      );
      const freshSnapshot = contractToWorldSnapshot(uiSnapshot, owner, characterId || undefined, characterLookup);
      if (freshSnapshot?.eventLogs && freshSnapshot.eventLogs.length > 0) {
        
        setRuntimeEvents(prev => {
          const eventMap = new Map<string, domain.EventMessage>();
          
          prev.forEach(event => {
            const key = `${event.blocknumber}-${event.logIndex}`;
            if (!persistedEventKeys.has(key)) {
              eventMap.set(key, event);
            }
          });
          
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
    
    // Store new feed data
    if (includeHistory && owner && characterId && uiSnapshot.dataFeeds?.length) {
      const playerAreaId = uiSnapshot.character ? 
        createAreaID(
          Number(uiSnapshot.character.stats.depth),
          Number(uiSnapshot.character.stats.x),
          Number(uiSnapshot.character.stats.y)
        ) : BigInt(0);
      
      storeEventData(
        owner,
        characterId, 
        uiSnapshot.dataFeeds,
        (uiSnapshot.combatants || []).map(c => mapCharacterLite(c)),
        (uiSnapshot.noncombatants || []).map(c => mapCharacterLite(c)),
        uiSnapshot.endBlock,
        uiSnapshot.fetchTimestamp,
        playerAreaId,
        uiSnapshot.character,
        uiSnapshot.endBlock
      ).then(result => {
        if (result.storedEvents > 0) {
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
        console.error('[useGameData] Error storing event data:', error);
      });
    }
  }, [includeHistory, owner, characterId]);

  // Process runtime logs when raw data changes
  useEffect(() => {
    if (rawData) {
      processAndMergeRuntimeLogs(rawData);
    }
  }, [rawData]);

  // Historical chat messages
  const historicalChatMessages = useMemo<domain.ChatMessage[]>(() => {
    if (!includeHistory || !historicalBlocks || historicalBlocks.length === 0) return [];
    
    const messages: domain.ChatMessage[] = [];
    
    historicalBlocks.forEach((block: CachedDataBlock) => {
      block.chats?.forEach((chat) => {
        messages.push({
          sender: { 
            id: chat.senderId || 'unknown-id', 
            name: chat.senderName || 'Unknown', 
            index: -1
          }, 
          message: chat.content,
          blocknumber: block.blockNumber,
          timestamp: Number(chat.timestamp),
          logIndex: chat.logIndex,
          isOptimistic: false
        });
      });
    });
    return messages;
  }, [includeHistory, historicalBlocks]);

  const historicalEventMessages = useMemo<domain.EventMessage[]>(() => {
    if (!includeHistory || !historicalBlocks || historicalBlocks.length === 0) return [];
    
    const messages: domain.EventMessage[] = [];
    
    const currentAreaId = rawData?.character ? 
      createAreaID(
        Number(rawData.character.stats.depth),
        Number(rawData.character.stats.x),
        Number(rawData.character.stats.y)
      ) : BigInt(0);
    
    historicalBlocks.forEach((block: CachedDataBlock) => {
      block.events?.forEach((event) => {
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
          name: event.attackerName || getCharacterFallbackName(event.mainPlayerIndex, true),
          index: event.mainPlayerIndex
        } : undefined;
        
        const defender: domain.EventParticipant | undefined = event.otherPlayerIndex > 0 ? {
          id: `index_${event.otherPlayerIndex}`,
          name: event.defenderName || getCharacterFallbackName(event.otherPlayerIndex, false),
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

  // Combined chat messages
  const allChatMessages = useMemo(() => {
    const combined = [
      ...historicalChatMessages,
      ...optimisticChatMessages
    ];
    
    return combined.sort((a, b) => {
      const blockDiff = Number(a.blocknumber - b.blocknumber);
      if (blockDiff !== 0) return blockDiff;
      return a.logIndex - b.logIndex;
    });
  }, [historicalChatMessages, optimisticChatMessages]);

  // Core game state mapping
  const gameState = useMemo<domain.WorldSnapshot | null>(() => {
    if (!rawData) {
      return previousGameStateRef.current;
    }

    try {
      const characterLookup = buildCharacterLookup(
        (rawData.combatants || []).map(c => mapCharacterLite(c)),
        (rawData.noncombatants || []).map(c => mapCharacterLite(c)),
        rawData.character
      );
      
      const snapshotBase = contractToWorldSnapshot(rawData, owner, characterId?.toString(), characterLookup);
      
      if (!snapshotBase) {
        return previousGameStateRef.current;
      }

      if (!includeHistory) {
        if (snapshotBase) {
          previousGameStateRef.current = snapshotBase;
        }
        return snapshotBase;
      }

      // Combine historical and runtime data
      const combinedEventLogsMap = new Map<string, domain.EventMessage>();

      historicalEventMessages.forEach(log => {
        const key = `${log.blocknumber}-${log.logIndex}`;
        combinedEventLogsMap.set(key, log);
      });
      
      runtimeEvents.forEach(log => {
        const key = `${log.blocknumber}-${log.logIndex}`;
        if (!combinedEventLogsMap.has(key)) {
          combinedEventLogsMap.set(key, log);
        }
      });
      
      snapshotBase.eventLogs.forEach(log => {
        const key = `${log.blocknumber}-${log.logIndex}`;
        if (!combinedEventLogsMap.has(key)) {
          combinedEventLogsMap.set(key, log);
        }
      });

      const finalEventLogs = Array.from(combinedEventLogsMap.values())
                                  .sort((a, b) => a.timestamp === b.timestamp ? a.logIndex - b.logIndex : a.timestamp - b.timestamp);
                                  
      const combinedChatLogsMap = new Map<string, domain.ChatMessage>();

      historicalChatMessages.forEach(log => {
        const key = `${log.blocknumber}-${log.logIndex}`;
        combinedChatLogsMap.set(key, log);
      });
      
      snapshotBase.chatLogs.forEach(log => {
        const key = `${log.blocknumber}-${log.logIndex}`;
        combinedChatLogsMap.set(key, log);
      });
      
      optimisticChatMessages.forEach((optimistic) => {
        const hasConfirmedVersion = Array.from(combinedChatLogsMap.values()).some(confirmed => 
          !confirmed.isOptimistic && 
          confirmed.message === optimistic.message &&
          confirmed.sender.id === optimistic.sender.id
        );
        
        if (!hasConfirmedVersion) {
          const key = `optimistic-${optimistic.timestamp}-${optimistic.sender.index}`;
          combinedChatLogsMap.set(key, optimistic);
        }
      });

      const finalChatLogs = Array.from(combinedChatLogsMap.values())
                              .sort((a, b) => a.timestamp - b.timestamp);

      const finalSnapshot: domain.WorldSnapshot = {
        ...snapshotBase,
        combatants: snapshotBase.combatants,
        noncombatants: snapshotBase.noncombatants,
        eventLogs: finalEventLogs,
        chatLogs: finalChatLogs
      };

      previousGameStateRef.current = finalSnapshot;
      return finalSnapshot;
    } catch (error) {
      console.error('[useGameData] Error mapping contract data to domain:', error);
      return previousGameStateRef.current;
    }
  }, [rawData, includeHistory, historicalEventMessages, historicalChatMessages, optimisticChatMessages, runtimeEvents, owner, characterId]);

  // Unified world snapshot with session data
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

  // Optimistic chat management
  const addOptimisticChatMessage = useCallback((message: string) => {
    if (!rawData?.character || !gameState) return;

    if (isMessageOptimistic(message, rawData.character.id.toString())) {
      return;
    }

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

  // Character ID for fog-of-war (combining owner and character for uniqueness)
  const fogCharacterId = useMemo(() => {
    if (!owner || !characterId) return null;
    return `${owner}:${characterId}`;
  }, [owner, characterId]);

  // Current position for fog-of-war from processed gameState
  const currentPosition = useMemo(() => {
    return gameState?.character ? {
      x: gameState.character.position.x,
      y: gameState.character.position.y,
      depth: gameState.character.position.depth
    } : null;
  }, [gameState]);

  // Fog-of-war management  
  const fogOfWar = useFogOfWar(
    fogCharacterId, 
    currentPosition,
    gameState?.character?.movementOptions,
    ENTRYPOINT_ADDRESS.toLowerCase()
  );

  return {
    // Core data
    worldSnapshot,
    gameState,
    
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
    
    // Session key data (conditional)
    ...(includeSessionKey && {
      sessionKeyData: sessionKeyData,
      sessionKeyState: sessionKeyState,
      needsSessionKeyUpdate: sessionKeyHook?.needsUpdate || false,
    }),
    
    // Wallet info
    owner,
    
    // Chat and events
    addOptimisticChatMessage,
    chatLogs: allChatMessages,
    eventLogs: gameState?.eventLogs || [],
    
    // Other characters
    others: gameState?.combatants.filter(c => c.id !== characterId) || [],
    
    // Combat state
    isInCombat: Boolean(rawData?.character?.stats?.combatantBitMap),
    
    // Loading states
    isLoading: isPollingLoading || (includeHistory && isHistoryLoading),
    isPollingLoading,
    isHistoryLoading: includeHistory ? isHistoryLoading : false,
    isCacheLoading: includeHistory ? isHistoryLoading : false,
    
    // Error states
    error: pollingError,
    
    // Equipment data
    rawEquipableWeaponIDs: rawData?.equipableWeaponIDs,
    rawEquipableWeaponNames: rawData?.equipableWeaponNames,
    rawEquipableArmorIDs: rawData?.equipableArmorIDs,
    rawEquipableArmorNames: rawData?.equipableArmorNames,
    
    // Historical data functions (conditional)
    ...(includeHistory && {
      getAllCharactersForOwner,
      getDataSummaryForOwner,
      historicalBlocks,
    }),
    
    // Fog-of-war data
    fogOfWar: {
      revealedAreas: fogOfWar.revealedAreas,
      isRevealed: fogOfWar.isRevealed,
      isAreaRevealed: fogOfWar.isAreaRevealed,
      revealArea: fogOfWar.revealArea,
      revealPosition: fogOfWar.revealPosition,
      getFloorCells: fogOfWar.getFloorCells,
      getStairsUp: fogOfWar.getStairsUp,
      getStairsDown: fogOfWar.getStairsDown,
      getFloorExplorationBounds: fogOfWar.getFloorExplorationBounds,
      clearFog: fogOfWar.clearFog,
      stats: fogOfWar.stats,
      isLoading: fogOfWar.isLoading,
    },
  };
};