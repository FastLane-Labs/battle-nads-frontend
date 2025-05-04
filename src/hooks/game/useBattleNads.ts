import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { ui, domain, contract } from '../../types';
import { useUiSnapshot } from './useUiSnapshot';
import { worldSnapshotToGameState, contractToWorldSnapshot, mapCharacterLite, processChatFeedsToDomain, mapStatusEffects } from '../../mappers';
import { useCachedDataFeed, SerializedChatLog, CachedDataBlock } from './useCachedDataFeed';

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

  /* ---------- Hook for historical cached feed data ---------- */
  const { historicalBlocks, isHistoryLoading: isCacheHistoryLoading } = useCachedDataFeed(owner);

  /* ---------- Optimistic Chat State ---------- */
  const [optimisticChatMessages, setOptimisticChatMessages] = useState<domain.ChatMessage[]>([]);
  /* ---------- State for Confirmed Logs found during runtime ---------- */
  const [runtimeConfirmedLogs, setRuntimeConfirmedLogs] = useState<domain.ChatMessage[]>([]);

  /* ---------- preserve previous data ---------- */
  const previousGameStateRef = useRef<domain.WorldSnapshot | null>(null);

  // Extract session key data and end block before mapping to UI state
  const sessionKeyData = useMemo(() => rawData?.sessionKeyData, [rawData]);
  const endBlock = useMemo(() => rawData?.endBlock, [rawData]);
  const balanceShortfall = useMemo(() => rawData?.balanceShortfall, [rawData]);

  // --- Effect to remove matched optimistic messages based on NEW rawData --- 
  useEffect(() => {
    
    if (!rawData || !rawData.dataFeeds || rawData.dataFeeds.length === 0 || optimisticChatMessages.length === 0) {
      return;
    }

    // Process ONLY the newly arrived dataFeeds to find recently confirmed messages
    const combatantsMap = new Map((rawData.combatants || []).map(c => [Number(c.index), mapCharacterLite(c)]));
    const nonCombatantsMap = new Map((rawData.noncombatants || []).map(c => [Number(c.index), mapCharacterLite(c)]));
    const characterLookup = new Map<number, domain.CharacterLite>([...combatantsMap, ...nonCombatantsMap]);
    if (rawData.character) {
        // Use mapCharacterLite for the player character before adding to lookup
        // const charLite = mapCharacterLite(rawData.character);
        // Manually create CharacterLite for the lookup map
        const playerCharLite: domain.CharacterLite = {
            id: rawData.character.id,
            index: Number(rawData.character.stats.index),
            name: rawData.character.name,
            // Add other necessary fields from contract.Character to satisfy domain.CharacterLite
            class: rawData.character.stats.class as domain.CharacterClass,
            level: Number(rawData.character.stats.level),
            health: Number(rawData.character.stats.health),
            maxHealth: Number(rawData.character.maxHealth),
            buffs: mapStatusEffects(Number(rawData.character.stats.buffs)),
            debuffs: mapStatusEffects(Number(rawData.character.stats.debuffs)),
            ability: { 
                ability: rawData.character.activeAbility.ability as domain.Ability,
                stage: Number(rawData.character.activeAbility.stage),
                targetIndex: Number(rawData.character.activeAbility.targetIndex),
                taskAddress: rawData.character.activeAbility.taskAddress,
                targetBlock: Number(rawData.character.activeAbility.targetBlock)
             },
            weaponName: rawData.character.weapon.name,
            armorName: rawData.character.armor.name,
            isDead: rawData.character.tracker?.died || false
        };
        characterLookup.set(playerCharLite.index, playerCharLite); 
    }

    const newlyConfirmedLogs = processChatFeedsToDomain(
      rawData.dataFeeds, 
      characterLookup, 
      rawData.fetchTimestamp
    );
    
    if (newlyConfirmedLogs.length > 0) {
      
      const messagesToRemove = optimisticChatMessages.filter(optMsg => 
        newlyConfirmedLogs.some((confLog: domain.ChatMessage) => {
          const isMatch = confLog.message === optMsg.message && confLog.sender.id === optMsg.sender.id;
          return isMatch;
        })
      );
      
      if (messagesToRemove.length > 0) {
        setOptimisticChatMessages(prevOptimistic => {
          const nextOptimistic = prevOptimistic.filter(optMsg => 
            !newlyConfirmedLogs.some((confLog: domain.ChatMessage) => confLog.message === optMsg.message && confLog.sender.id === optMsg.sender.id)
          );
          return nextOptimistic;
        });
      }

      // Also add these newly confirmed logs to our runtime state, ensuring deduplication
      if (newlyConfirmedLogs.length > 0) {
        setRuntimeConfirmedLogs(prevConfirmed => {
          // Use a map for efficient deduplication based on the confirmed key
          const newMap = new Map(prevConfirmed.map(log => [`conf-${log.blocknumber}-${log.logIndex}`, log]));
          newlyConfirmedLogs.forEach(log => {
            newMap.set(`conf-${log.blocknumber}-${log.logIndex}`, log);
          });
          const updatedList = Array.from(newMap.values());
          return updatedList;
        });
      }
    }
  }, [rawData, optimisticChatMessages]); 
  // --- End Effect --- 

  // Map the raw data and cached data to a combined WorldSnapshot
  const worldSnapshot = useMemo<domain.WorldSnapshot | null>(() => {
    if (!rawData) {
      return previousGameStateRef.current; 
    }
         
    let snapshotBase: Omit<domain.WorldSnapshot, 'eventLogs' | 'chatLogs'> | null = null;
    try {
      snapshotBase = contractToWorldSnapshot(rawData, owner);
    } catch (e) {
      console.error('Error mapping contract data to world snapshot base:', e);
      return previousGameStateRef.current;
    }

    if (!snapshotBase) {
      return previousGameStateRef.current;
    }
    
    // Map historical blocks from Dexie cache
    const historicalChatLogs: domain.ChatMessage[] = historicalBlocks.flatMap((block: CachedDataBlock) => 
      block.chats.map((chat: SerializedChatLog) => ({
          logIndex: -1, 
          blocknumber: block.blockNumber,
          timestamp: block.timestamp, 
          sender: { id: chat.senderId, name: chat.senderName, index: -1 }, 
          message: chat.content,
          isOptimistic: false
      }))
    );

    // Process newly fetched feeds from rawData for confirmed messages from this fetch
    // Build the lookup map needed for processing
    const currentCombatantsMap = new Map((rawData.combatants || []).map(c => [Number(c.index), mapCharacterLite(c)]));
    const currentNonCombatantsMap = new Map((rawData.noncombatants || []).map(c => [Number(c.index), mapCharacterLite(c)]));
    const currentCharacterLookup = new Map<number, domain.CharacterLite>([...currentCombatantsMap, ...currentNonCombatantsMap]);
    if (rawData.character) {
        const playerCharLite: domain.CharacterLite = {
            id: rawData.character.id,
            index: Number(rawData.character.stats.index),
            name: rawData.character.name,
            class: rawData.character.stats.class as domain.CharacterClass,
            level: Number(rawData.character.stats.level),
            health: Number(rawData.character.stats.health),
            maxHealth: Number(rawData.character.maxHealth),
            buffs: mapStatusEffects(Number(rawData.character.stats.buffs)),
            debuffs: mapStatusEffects(Number(rawData.character.stats.debuffs)),
            ability: { 
                ability: rawData.character.activeAbility.ability as domain.Ability,
                stage: Number(rawData.character.activeAbility.stage),
                targetIndex: Number(rawData.character.activeAbility.targetIndex),
                taskAddress: rawData.character.activeAbility.taskAddress,
                targetBlock: Number(rawData.character.activeAbility.targetBlock)
             },
            weaponName: rawData.character.weapon.name,
            armorName: rawData.character.armor.name,
            isDead: rawData.character.tracker?.died || false
        };
        currentCharacterLookup.set(playerCharLite.index, playerCharLite); 
    }
    const newlyConfirmedLogs = rawData.dataFeeds 
      ? processChatFeedsToDomain(rawData.dataFeeds, currentCharacterLookup, rawData.fetchTimestamp)
      : [];
    
    // TODO: Process historical event logs similarly if needed from historicalBlocks
    const combinedEventLogs: domain.EventMessage[] = []; // Placeholder for now

    // Combine ALL logs: historical (cache), runtime confirmed (state), and optimistic
    const combinedLogsMap = new Map<string, domain.ChatMessage>();

    // Add historical logs first
    historicalChatLogs.forEach(log => {
        // Use a unique key for confirmed messages from history
        const key = `conf-${log.blocknumber}-${log.logIndex}`;
        if (!combinedLogsMap.has(key)) { 
            combinedLogsMap.set(key, log);
        }
    });

    // Add runtime confirmed logs, potentially overwriting historical if same key
    runtimeConfirmedLogs.forEach(log => {
        const key = `conf-${log.blocknumber}-${log.logIndex}`;
        combinedLogsMap.set(key, log); // Overwrite if exists
    });

    // Add newly confirmed logs from the *current* fetch (ensures latest data, overwrites runtime state version if somehow different)
    // This might be redundant if runtimeConfirmedLogs is updated correctly, but ensures freshness from rawData
    newlyConfirmedLogs.forEach(log => {
        const key = `conf-${log.blocknumber}-${log.logIndex}`;
        combinedLogsMap.set(key, log); 
    });

    // Add optimistic logs (use a different key pattern)
    optimisticChatMessages.forEach(log => {
        const key = `opt-${log.timestamp}-${log.sender.id}-${log.message.slice(0,10)}`;
        combinedLogsMap.set(key, log);
    });

    // Convert map values back to array and sort
    const finalChatLogs = Array.from(combinedLogsMap.values())
                             .sort((a, b) => a.timestamp - b.timestamp);

    // Construct the final WorldSnapshot
    const finalSnapshot: domain.WorldSnapshot = {
       ...snapshotBase,
       eventLogs: combinedEventLogs,
       chatLogs: finalChatLogs
    };

    previousGameStateRef.current = finalSnapshot;
    return finalSnapshot;
  }, [rawData, owner, optimisticChatMessages, historicalBlocks, runtimeConfirmedLogs]);

  // Function to add an optimistic message
  const addOptimisticChatMessage = useCallback((message: string) => {
    const currentSnapshot = worldSnapshot;
    // Manually create CharacterLite from rawData if needed
    const characterInfo = currentSnapshot?.character 
        ? { id: currentSnapshot.character.id, name: currentSnapshot.character.name, index: currentSnapshot.character.index } 
        : (rawData?.character ? {
            id: rawData.character.id,
            name: rawData.character.name,
            index: Number(rawData.character.stats.index)
            // Add other minimal fields if needed by sender type, but likely just id/name/index
          } : null);

    if (!characterInfo?.id) {
        console.warn("Cannot add optimistic chat message: No character ID available.");
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
        // Prevent adding duplicates: Check only sender and content for optimistic messages.
        const alreadyExists = prev.some(
            msg => msg.isOptimistic && 
                   msg.sender.id === optimisticMsg.sender.id && 
                   msg.message === optimisticMsg.message
                   // && msg.timestamp === optimisticMsg.timestamp // Remove fragile timestamp check
        );
        if (alreadyExists) {
            console.log("[OptimisticAdd] Skipping duplicate optimistic message add based on sender and content.")
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