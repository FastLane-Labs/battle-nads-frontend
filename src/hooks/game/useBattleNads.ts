import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { ui, domain, contract } from '../../types';
import { useUiSnapshot } from './useUiSnapshot';
import { worldSnapshotToGameState, contractToWorldSnapshot, mapCharacterLite } from '../../mappers';

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

  /* ---------- Optimistic Chat State ---------- */
  const [optimisticChatMessages, setOptimisticChatMessages] = useState<domain.ChatMessage[]>([]);

  /* ---------- preserve previous data ---------- */
  const previousGameStateRef = useRef<domain.WorldSnapshot | null>(null);

  // Extract session key data and end block before mapping to UI state
  const sessionKeyData = useMemo(() => rawData?.sessionKeyData, [rawData]);
  const endBlock = useMemo(() => rawData?.endBlock, [rawData]);
  const balanceShortfall = useMemo(() => rawData?.balanceShortfall, [rawData]);

  // Map the raw data to a GameState using the mapper utility
  const worldSnapshot = useMemo<domain.WorldSnapshot | null>(() => {
    if (!rawData) {
      return previousGameStateRef.current;
    }
         
    let snapshotWithProcessedLogs: Omit<domain.WorldSnapshot, 'eventLogs' | 'chatLogs'> | null = null;
    try {
      snapshotWithProcessedLogs = contractToWorldSnapshot(rawData, owner);
    } catch (e) {
      console.error('Error mapping contract data to world snapshot:', e);
      return previousGameStateRef.current;
    }

    if (!snapshotWithProcessedLogs) {
      return previousGameStateRef.current;
    }
    
    // Combine event logs (assuming event processing happens here or is passed through)
    const combinedEventLogs: domain.EventMessage[] = [];
    
    // Find the character ID from the current data if available
    const currentCharacterId = snapshotWithProcessedLogs?.character?.id || null;
    
    // Combine confirmed and optimistic chat messages
    const finalChatLogs = [
      ...optimisticChatMessages.filter(optMsg => {
          const isRelevantCharacter = currentCharacterId ? optMsg.sender.id === currentCharacterId : true;
          return isRelevantCharacter;
      })
    ].sort((a, b) => a.timestamp - b.timestamp);

    // Construct the final WorldSnapshot
    const finalSnapshot: domain.WorldSnapshot = {
       ...snapshotWithProcessedLogs,
       eventLogs: combinedEventLogs,
       chatLogs: finalChatLogs
    };

    // store for next render cycle
    previousGameStateRef.current = finalSnapshot;
    return finalSnapshot;
  }, [rawData, owner, optimisticChatMessages]);

  // --- Re-introduce Effect to remove matched optimistic messages --- 
  useEffect(() => {
    const confirmedLogs = worldSnapshot?.chatLogs?.filter((log: domain.ChatMessage) => !log.isOptimistic) || [];
    
    if (confirmedLogs.length > 0 && optimisticChatMessages.length > 0) {
      setOptimisticChatMessages(prevOptimistic => 
        prevOptimistic.filter(optMsg => 
          !confirmedLogs.some((confLog: domain.ChatMessage) => confLog.message === optMsg.message && confLog.sender.id === optMsg.sender.id)
        )
      );
    }
  }, [worldSnapshot]);
  // --- End Effect --- 

  // Function to add an optimistic message
  const addOptimisticChatMessage = useCallback((message: string) => {
    const currentSnapshot = worldSnapshot;
    if (!currentSnapshot?.character?.id) {
        console.warn("Cannot add optimistic chat message: No character ID available.");
        return;
    }
    
    const optimisticMsg: domain.ChatMessage = {
        sender: { id: currentSnapshot.character.id, name: currentSnapshot.character.name, index: 0 },
        blocknumber: BigInt(currentSnapshot.lastBlock),
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

  }, [worldSnapshot]);

  return {
    gameState: worldSnapshot,
    addOptimisticChatMessage,
    rawSessionKeyData: sessionKeyData, 
    rawEndBlock: endBlock,
    rawBalanceShortfall: balanceShortfall,
    isLoading: isSnapshotLoading,
    isSnapshotLoading,
    error: snapshotError,
    // Expose raw equipable item data needed by useEquipment
    rawEquipableWeaponIDs: rawData?.equipableWeaponIDs,
    rawEquipableWeaponNames: rawData?.equipableWeaponNames,
    rawEquipableArmorIDs: rawData?.equipableArmorIDs,
    rawEquipableArmorNames: rawData?.equipableArmorNames,
  };
}; 