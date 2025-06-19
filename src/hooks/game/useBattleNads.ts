import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { domain } from '@/types';
import { useUiSnapshot } from './useUiSnapshot';
import { contractToWorldSnapshot, mapCharacterLite, processChatFeedsToDomain, mapCharacterToCharacterLite } from '@/mappers';
import { useCachedDataFeed, SerializedChatLog, CachedDataBlock, SerializedEventLog, storeFeedData } from './useCachedDataFeed';
import { AVG_BLOCK_TIME_MS } from '@/config/gas';

/**
 * Hook for managing game state and data
 * Uses React-Query for polling and state management
 */
export const useBattleNads = (owner: string | null) => {
  /* ---------- snapshot polling ---------- */
  const { 
    data: rawData, 
    isLoading: isSnapshotLoading, 
    error: snapshotError, 
  } = useUiSnapshot(owner);

  const { historicalBlocks, isHistoryLoading: isCacheHistoryLoading } = useCachedDataFeed(owner);

  const [optimisticChatMessages, setOptimisticChatMessages] = useState<domain.ChatMessage[]>([]);
  const [runtimeConfirmedLogs, setRuntimeConfirmedLogs] = useState<domain.ChatMessage[]>([]);
  const [runtimeEventLogs, setRuntimeEventLogs] = useState<domain.EventMessage[]>([]);

  /* ---------- preserve previous data ---------- */
  const previousGameStateRef = useRef<domain.WorldSnapshot | null>(null);

  // Extract session key data and end block before mapping to UI state
  const sessionKeyData = useMemo(() => rawData?.sessionKeyData, [rawData]);
  const endBlock = useMemo(() => rawData?.endBlock, [rawData]);
  const balanceShortfall = useMemo(() => rawData?.balanceShortfall, [rawData]);

  const characterLookup = useMemo<Map<number, domain.CharacterLite>>(() => {
    const map = new Map<number, domain.CharacterLite>();
    if (rawData) {
      // Only use FRESH contract data for current character lookup
      // This ensures we only have characters that currently exist in the game world
      
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
      
      // Add player character from fresh contract data
      if (rawData.character) {
        const playerCharData = rawData.character;
        const playerLite = {
          id: playerCharData.id,
          index: Number(playerCharData.stats.index),
          name: playerCharData.name,
        } as domain.CharacterLite;
        map.set(Number(playerCharData.stats.index), playerLite);
      }
    }
    return map;
  }, [rawData]);

  // --- Effect to process newly fetched data & update runtime states --- 
  useEffect(() => {
    if (!rawData || !rawData.dataFeeds || !owner) {
      return; 
    }

    const newlyConfirmedChatLogs = processChatFeedsToDomain(
      rawData.dataFeeds,
      characterLookup, 
      BigInt(rawData.endBlock || 0),
      rawData.fetchTimestamp
    );
 
    const newlyConfirmedEventLogs: domain.EventMessage[] = [];
    (rawData.dataFeeds || []).forEach((feed, feedIndex) => {
        // Validate feed structure
        const blockNumberBigInt = feed.blockNumber ? BigInt(feed.blockNumber) : undefined;
        if (blockNumberBigInt === undefined) {
            return; // Skip this feed
        }

        (feed.logs || []).forEach((log, logIndexInFeed) => {
            // Validate log structure (check index and logType from log, blockNumber from feed)
            if (log.index === undefined || feed.blockNumber === undefined || log.logType === undefined) {
                return; // Skip this log
            }
            // Check for BigInt conversion issues (logIndex is sometimes BigInt, sometimes number?)
            const logIndexNum = typeof log.index === 'bigint' ? Number(log.index) : log.index;

            const attackerInfo = characterLookup.get(Number(log.mainPlayerIndex));
            const defenderInfo = characterLookup.get(Number(log.otherPlayerIndex));
            const estimatedTimestamp = estimateBlockTimestamp(
                BigInt(rawData.endBlock || 0),
                rawData.fetchTimestamp,
                blockNumberBigInt // Use validated BigInt
            );
            const isPlayerInitiated = !!attackerInfo && attackerInfo.id === owner; 
            
            // Construct the valid event
            const event: domain.EventMessage = {
                logIndex: logIndexNum,
                blocknumber: blockNumberBigInt,
                timestamp: estimatedTimestamp,
                type: log.logType as domain.LogType,
                attacker: attackerInfo ? { id: attackerInfo.id, name: attackerInfo.name, index: Number(log.mainPlayerIndex) } : undefined,
                defender: defenderInfo ? { id: defenderInfo.id, name: defenderInfo.name, index: Number(log.otherPlayerIndex) } : undefined,
                areaId: attackerInfo?.areaId || defenderInfo?.areaId || 0n, // Use attacker's area, fallback to defender's area, default to 0n
                isPlayerInitiated: isPlayerInitiated,
                details: {
                    hit: log.hit,
                    critical: log.critical,
                    damageDone: log.damageDone,
                    healthHealed: log.healthHealed,
                    targetDied: log.targetDied,
                    lootedWeaponID: log.lootedWeaponID,
                    lootedArmorID: log.lootedArmorID,
                    experience: log.experience,
                    value: BigInt(log.value || 0)
                },
                displayMessage: ''
            };
            newlyConfirmedEventLogs.push(event);
        });
    });

    // --- Update Optimistic Chat --- 
    if (newlyConfirmedChatLogs.length > 0 && optimisticChatMessages.length > 0) {
      const messagesToRemove = optimisticChatMessages.filter(optMsg =>
        newlyConfirmedChatLogs.some(confLog => confLog.message === optMsg.message && confLog.sender.id === optMsg.sender.id)
      );
      if (messagesToRemove.length > 0) {
        setOptimisticChatMessages(prevOptimistic =>
          prevOptimistic.filter(optMsg =>
            !newlyConfirmedChatLogs.some(confLog => confLog.message === optMsg.message && confLog.sender.id === optMsg.sender.id)
          )
        );
      }
    }

    // --- Update Runtime Confirmed CHAT Logs --- 
    if (newlyConfirmedChatLogs.length > 0) {
      // Create a set of keys from historical blocks for quick lookup
      const historicalLogKeys = new Set(
          historicalBlocks.flatMap(block => 
              (block.events || []) // Check events array as chat logs might be stored there historically?
                  .filter(event => event.logType === domain.LogType.Chat || Number(event.logType) === 4) // Consider both potential chat types
                  .map(event => `conf-${block.blockNumber}-${event.index}`) // Use blockNumber and event index
          )
      );

      setRuntimeConfirmedLogs(prevConfirmed => {
        const chatMap = new Map(prevConfirmed.map(log => [`conf-${log.blocknumber}-${log.logIndex}`, log]));
        newlyConfirmedChatLogs.forEach(log => {
          const key = `conf-${log.blocknumber}-${log.logIndex}`;
          // Only add to runtime state if it wasn't loaded from history
          if (!historicalLogKeys.has(key)) { 
            chatMap.set(key, log);
          }
        });
        return Array.from(chatMap.values());
      });
    }

    // --- Update Runtime EVENT Logs --- 
    // Filter invalid events before setting state
    const validNewlyConfirmedEventLogs = newlyConfirmedEventLogs.filter(
        event => event.blocknumber !== undefined && event.logIndex !== undefined && event.type !== undefined
    );

    if (validNewlyConfirmedEventLogs.length > 0) {
       // Create a set of keys from historical blocks for quick lookup
      const historicalEventLogKeys = new Set(
          historicalBlocks.flatMap(block => 
              (block.events || []).map(event => `conf-${block.blockNumber}-${event.index}`) 
          )
      );

      setRuntimeEventLogs(prevRuntimeEvents => {
          const eventMap = new Map(prevRuntimeEvents.map(log => [`conf-${log.blocknumber}-${log.logIndex}`, log]));
          // Add only the valid new events if they weren't in history
          validNewlyConfirmedEventLogs.forEach(log => {
              const key = `conf-${log.blocknumber}-${log.logIndex}`;
              if (!historicalEventLogKeys.has(key)) {
                eventMap.set(key, log);
              }
          });
          const newState = Array.from(eventMap.values());
          return newState;
      });
    }

    // --- Asynchronous Storage (Original Logic) --- 
    const combatantsContextForStorage = rawData.combatants?.map(mapCharacterLite);
    const nonCombatantsContextForStorage = rawData.noncombatants?.map(mapCharacterLite);
     if (rawData.character) {
        const playerCharLite = mapCharacterToCharacterLite(rawData.character);
        if (playerCharLite && nonCombatantsContextForStorage && !nonCombatantsContextForStorage.some(c => c.index === playerCharLite.index) &&
            (!combatantsContextForStorage || !combatantsContextForStorage.some(c => c.index === playerCharLite.index))) {
                nonCombatantsContextForStorage.push(playerCharLite);
            }
     }
    // Pass raw feeds and context to storeFeedData (CORRECT 6 arguments)
    if (rawData.dataFeeds.length > 0 && owner) { 
        storeFeedData(
            owner, 
            rawData.dataFeeds, // Pass raw feeds
            combatantsContextForStorage, 
            nonCombatantsContextForStorage,
            BigInt(rawData.endBlock || 0),
            rawData.fetchTimestamp 
        ).catch((err: Error) => console.error("[useBattleNads] Failed to store new feeds in background:", err.message));
    }

  }, [rawData, owner, optimisticChatMessages, characterLookup]);


  // --- Memoize the final WorldSnapshot --- 
  const worldSnapshot = useMemo<domain.WorldSnapshot | null>(() => {
    if (!rawData) {
      return previousGameStateRef.current; 
    }
           
    let snapshotBase: domain.WorldSnapshot | null = null;
    try {
      snapshotBase = contractToWorldSnapshot(rawData, owner); 
    } catch (e) {
      // console.error('DEBUG: Error in contractToWorldSnapshot:', e);
      return previousGameStateRef.current;
    }
    if (!snapshotBase) {
      return previousGameStateRef.current;
    }
     
    // --- SEPARATE: Build Chat/Event Logs from Historical + Fresh Data ---
    const historicalChatLogs: domain.ChatMessage[] = historicalBlocks.flatMap((block: CachedDataBlock) => 
      block.chats.map((chat: SerializedChatLog): domain.ChatMessage => ({
        logIndex: chat.logIndex,
        blocknumber: block.blockNumber, 
        timestamp: block.timestamp,
        sender: { id: chat.senderId, name: chat.senderName, index: -1 },
        message: chat.content, 
        isOptimistic: false
      }))
    ).filter(chat => chat.blocknumber !== undefined && chat.logIndex !== undefined);
    
    const historicalEventLogs: domain.EventMessage[] = historicalBlocks.flatMap((block: CachedDataBlock) => 
      block.events.map((event: SerializedEventLog): domain.EventMessage => { 
          // For historical events, use stored names (these are just for display in logs)
          const attacker: domain.EventParticipant | undefined = event.mainPlayerIndex > 0 ? { 
              id: `index_${event.mainPlayerIndex}`, // Use generic ID for historical
              name: event.attackerName || `Index ${event.mainPlayerIndex}`, 
              index: event.mainPlayerIndex 
          } : undefined;
          const defender: domain.EventParticipant | undefined = event.otherPlayerIndex > 0 ? { 
              id: `index_${event.otherPlayerIndex}`, // Use generic ID for historical
              name: event.defenderName || `Index ${event.otherPlayerIndex}`, 
              index: event.otherPlayerIndex 
          } : undefined;
          
          // For historical events, we can't reliably determine if player initiated
          const isPlayerInitiated = false; // Conservative: assume not player-initiated for historical
          
          return {
              logIndex: event.index,
              blocknumber: block.blockNumber, 
              timestamp: block.timestamp, 
              type: event.logType as domain.LogType,
              attacker: attacker, 
              defender: defender, 
              areaId: BigInt(event.areaId), // Convert stored string back to bigint
              isPlayerInitiated: isPlayerInitiated,
              details: { hit: event.hit, critical: event.critical, damageDone: event.damageDone,
                         healthHealed: event.healthHealed, targetDied: event.targetDied, 
                         lootedWeaponID: event.lootedWeaponID, lootedArmorID: event.lootedArmorID,
                         experience: event.experience, value: BigInt(event.value || 0) },
              displayMessage: '' 
          };
      })
    ).filter(event => event.blocknumber !== undefined && event.logIndex !== undefined); 
 
    // --- Combine Historical + Runtime Event Logs --- 
    const combinedEventLogsMap = new Map<string, domain.EventMessage>();
    const validRuntimeEventLogs = runtimeEventLogs.filter(event => event.blocknumber !== undefined && event.logIndex !== undefined);
    
    // 1. Add historical logs
    historicalEventLogs.forEach(log => {
        const key = `hist-${log.blocknumber}-${log.logIndex}`;
        combinedEventLogsMap.set(key, log);
    });
    // 2. Add runtime logs (from fresh contract data)
    validRuntimeEventLogs.forEach(log => {
        const key = `live-${log.blocknumber}-${log.logIndex}`;
        combinedEventLogsMap.set(key, log);
    });
    // 3. Add fresh logs from current snapshot (these have current participant mapping)
    snapshotBase.eventLogs.forEach(log => {
        const key = `snap-${log.blocknumber}-${log.logIndex}`;
        combinedEventLogsMap.set(key, log);
    });

    const finalEventLogs = Array.from(combinedEventLogsMap.values())
                                  .sort((a, b) => a.timestamp === b.timestamp ? a.logIndex - b.logIndex : a.timestamp - b.timestamp);
    
    // --- Combine Historical + Runtime Chat Logs --- 
    const combinedChatLogsMap = new Map<string, domain.ChatMessage>();
    const validRuntimeChatLogs = runtimeConfirmedLogs.filter(chat => chat.blocknumber !== undefined && chat.logIndex !== undefined);

    // 1. Add historical chat logs
    historicalChatLogs.forEach(log => {
        const key = `hist-${log.blocknumber}-${log.logIndex}`;
        combinedChatLogsMap.set(key, log);
    });
    // 2. Add runtime confirmed chat logs 
    validRuntimeChatLogs.forEach(log => {
        const key = `live-${log.blocknumber}-${log.logIndex}`; 
        combinedChatLogsMap.set(key, log);
    });
    // 3. Add fresh chat logs from current snapshot
    snapshotBase.chatLogs.forEach(log => {
        const key = `snap-${log.blocknumber}-${log.logIndex}`;
        combinedChatLogsMap.set(key, log);
    });
    // 4. Add optimistic chat messages
    optimisticChatMessages.forEach(log => {
        const key = `opt-${log.timestamp}-${log.sender.id}-${log.message.slice(0,10)}`;
        combinedChatLogsMap.set(key, log);
    });

    const finalChatLogs = Array.from(combinedChatLogsMap.values())
                              .sort((a, b) => a.timestamp - b.timestamp);

    // --- SEPARATE: Use ONLY Fresh Contract Data for Combatants --- 
    const finalSnapshot: domain.WorldSnapshot = {
       ...snapshotBase,
       // Use ONLY fresh contract combatants/noncombatants (no historical contamination)
       combatants: snapshotBase.combatants, // These come from fresh contract data only
       noncombatants: snapshotBase.noncombatants, // These come from fresh contract data only
       // Use combined logs (historical + fresh)
       eventLogs: finalEventLogs, 
       chatLogs: finalChatLogs
    };

    previousGameStateRef.current = finalSnapshot;
    return finalSnapshot;

  }, [rawData, owner, optimisticChatMessages, historicalBlocks, runtimeConfirmedLogs, runtimeEventLogs, characterLookup]);

  // Function to add an optimistic message
  const addOptimisticChatMessage = useCallback((message: string) => {
    const currentSnapshot = worldSnapshot;
    const characterInfo = currentSnapshot?.character 
        ? { id: currentSnapshot.character.id, name: currentSnapshot.character.name, index: currentSnapshot.character.index } 
        : (rawData?.character ? {
            id: rawData.character.id,
            name: rawData.character.name,
            index: Number(rawData.character.stats.index)
          } : null);

    if (!characterInfo?.id) {
        return;
    }
    
    const optimisticMsg: domain.ChatMessage = {
        sender: { id: characterInfo.id, name: characterInfo.name, index: characterInfo.index }, 
        blocknumber: BigInt(rawData?.endBlock ?? currentSnapshot?.lastBlock ?? 0),
        message: message,
        timestamp: Date.now(),
        logIndex: -1,
        isOptimistic: true
    };

    setOptimisticChatMessages(prev => {
        const alreadyExists = prev.some(
            msg => msg.isOptimistic && 
                   msg.sender.id === optimisticMsg.sender.id && 
                   msg.message === optimisticMsg.message
        );
        if (alreadyExists) {
            return prev; 
        }
        return [...prev, optimisticMsg];
    });

  }, [worldSnapshot, rawData]);

  return {
    gameState: worldSnapshot,
    addOptimisticChatMessage,
    rawSessionKeyData: sessionKeyData, 
    rawEndBlock: endBlock,
    rawBalanceShortfall: balanceShortfall,
    isLoading: isSnapshotLoading || isCacheHistoryLoading, 
    isSnapshotLoading,
    isHistoryLoading: isCacheHistoryLoading,
    error: snapshotError,
    rawEquipableWeaponIDs: rawData?.equipableWeaponIDs,
    rawEquipableWeaponNames: rawData?.equipableWeaponNames,
    rawEquipableArmorIDs: rawData?.equipableArmorIDs,
    rawEquipableArmorNames: rawData?.equipableArmorNames,
  };
}; 

// Helper function for timestamp estimation
function estimateBlockTimestamp(referenceBlockNumber: bigint, referenceTimestamp: number, lookupBlockNumber: bigint): number {
    const blockDifference = Number(referenceBlockNumber - lookupBlockNumber);
    const timeDifference = blockDifference * AVG_BLOCK_TIME_MS;
    return referenceTimestamp - timeDifference;
} 