import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { ui, domain, contract } from '../../types';
import { useUiSnapshot } from './useUiSnapshot';
import { worldSnapshotToGameState, contractToWorldSnapshot } from '../../mappers';
import { safeStringify } from '../../utils/bigintSerializer';

/**
 * Hook for managing game state and data
 * Uses React-Query for polling and state management
 */
export const useBattleNads = (owner: string | null) => {
  /* ---------- snapshot polling ---------- */
  const { 
    data: rawData, 
    isLoading, 
    error, 
    refetch 
  } = useUiSnapshot(owner);

  /* ---------- Optimistic Chat State ---------- */
  const [optimisticChatMessages, setOptimisticChatMessages] = useState<domain.ChatMessage[]>([]);

  /* ---------- preserve previous data ---------- */
  const previousGameStateRef = useRef<ui.GameState | null>(null);

  // Extract session key data and end block before mapping to UI state
  const sessionKeyData = useMemo(() => rawData?.sessionKeyData, [rawData]);
  const endBlock = useMemo(() => rawData?.endBlock, [rawData]);
  const balanceShortfall = useMemo(() => rawData?.balanceShortfall, [rawData]);

  // Map the raw data to a GameState using the mapper utility
  const { gameState, mappedDomainSnapshot } = useMemo(
    () => {
      if (!rawData) {
        // return last good state during refetch to avoid "flash of empty"
        return { gameState: previousGameStateRef.current, mappedDomainSnapshot: null };
      }
           
      let currentGameState: ui.GameState | null = null;
      let domainSnapshot: Omit<domain.WorldSnapshot, 'movementOptions'> | null = null;
      try {
        // First convert contract data to domain model
        domainSnapshot = contractToWorldSnapshot(rawData, owner, rawData.characterID);
        
        if (!domainSnapshot) {
          return { gameState: previousGameStateRef.current, mappedDomainSnapshot: null };
        }
        
        const confirmedChatLogs = domainSnapshot.chatLogs || [];
        const confirmedEventLogs = domainSnapshot.eventLogs || []; 

        // --- Coalesce Sequential Hits --- 
        const coalescedEventLogs: domain.EventMessage[] = [];
        if (confirmedEventLogs.length > 0) {
          // Start with the first log
          let lastPushedLog = { ...confirmedEventLogs[0], count: 1 }; 
          
          for (let i = 1; i < confirmedEventLogs.length; i++) {
            const currentLog = confirmedEventLogs[i];
            
            // Check if current log is a candidate for coalescing with the last pushed log
            const canCoalesce = 
              lastPushedLog.type === domain.LogType.Combat &&
              currentLog.type === domain.LogType.Combat &&
              lastPushedLog.attacker?.id === currentLog.attacker?.id &&
              lastPushedLog.defender?.id === currentLog.defender?.id &&
              lastPushedLog.details.hit === currentLog.details.hit &&
              lastPushedLog.details.critical === currentLog.details.critical &&
              lastPushedLog.details.damageDone === currentLog.details.damageDone &&
              lastPushedLog.details.healthHealed === currentLog.details.healthHealed &&
              !lastPushedLog.details.targetDied && // Don't coalesce death events
              !lastPushedLog.details.experience && // Don't coalesce XP gains
              !lastPushedLog.details.lootedWeaponID && // Don't coalesce loot
              !lastPushedLog.details.lootedArmorID; // Don't coalesce loot

            if (canCoalesce) {
              // Increment count on the last pushed log
              lastPushedLog.count = (lastPushedLog.count || 1) + 1;
            } else {
              // Push the previous log (with its final count)
              coalescedEventLogs.push(lastPushedLog);
              // Start tracking the new log
              lastPushedLog = { ...currentLog, count: 1 };
            }
          }
          // Push the very last log entry
          coalescedEventLogs.push(lastPushedLog);
        } else {
           // If only one log, push it directly (handled by loop logic, but safe)
        }
        // --- End Coalescing --- 

        // --- Prepare final chat logs for this render (Optimistic + Confirmed) --- 
        const finalChatLogs = [...optimisticChatMessages, ...confirmedChatLogs].sort(
          (a, b) => a.timestamp === b.timestamp ? a.logIndex - b.logIndex : a.timestamp - b.timestamp
        );
        // --- End Combine Chat Logs ---
        
        // Update the logs in the snapshot 
        const snapshotWithProcessedLogs: typeof domainSnapshot = {
          ...domainSnapshot,
          chatLogs: finalChatLogs, 
          eventLogs: coalescedEventLogs 
        };

        // Then convert domain model to UI model
        currentGameState = worldSnapshotToGameState(snapshotWithProcessedLogs);
        
        console.log(`[useBattleNads useMemo] Final chat logs for render (Count: ${finalChatLogs.length}):`, JSON.stringify(finalChatLogs.map(m => ({ idx: m.logIndex, msg: m.message, opt: m.isOptimistic || false }))));

        // store for next render cycle
        previousGameStateRef.current = currentGameState;
        
      } catch (err) {
        console.error("[useBattleNads] Error processing game state:", err);
        console.log("[useBattleNads] Problematic data:", safeStringify(rawData));
        currentGameState = previousGameStateRef.current; // Return previous state on error
      }
      
      return { gameState: currentGameState, mappedDomainSnapshot: domainSnapshot };
    },
    [rawData, owner, optimisticChatMessages]
  );

  // --- Re-introduce Effect to remove matched optimistic messages --- 
  useEffect(() => {
    // Get confirmed logs from the latest mapped snapshot result
    const confirmedLogs = mappedDomainSnapshot?.chatLogs?.filter(log => !log.isOptimistic) || [];
    
    // Only proceed if we have confirmed logs to check against
    if (confirmedLogs.length > 0) {
      console.log(`[Optimistic Cleanup Effect] Checking against ${confirmedLogs.length} confirmed logs.`);
      
      setOptimisticChatMessages(prevOptimistic => {
        if (prevOptimistic.length === 0) {
           return prevOptimistic; // No optimistic messages to remove
        }
        console.log(`[Optimistic Cleanup Effect] Current optimistic count: ${prevOptimistic.length}`);

        const confirmedKeys = new Set(
          confirmedLogs.map(log => `${log.sender.id}:${log.message}`)
        );
        console.log(`[Optimistic Cleanup Effect] Confirmed keys:`, confirmedKeys);

        const remainingOptimistic = prevOptimistic.filter(optMsg => {
          const key = `${optMsg.sender.id}:${optMsg.message}`;
          const matchFound = confirmedKeys.has(key);
          console.log(`[Optimistic Cleanup Effect] Checking opt key: ${key}. Match found: ${matchFound}`);
          // If a match is found, remove it from confirmedKeys to handle duplicates correctly
          if (matchFound) {
             confirmedKeys.delete(key);
          }
          return !matchFound; // Keep if no match found
        });

        // Only update state if the array content actually changes
        if (remainingOptimistic.length !== prevOptimistic.length) {
            console.log(`[Optimistic Cleanup Effect] Setting new optimistic state (Count: ${remainingOptimistic.length}):`, JSON.stringify(remainingOptimistic.map(m => ({ idx: m.logIndex, msg: m.message }))));
            return remainingOptimistic;
        }
        return prevOptimistic; // No changes needed
      });
    }
  // Depend on the mappedDomainSnapshot which contains the latest confirmed logs
  }, [mappedDomainSnapshot]); 
  // --- End Effect --- 

  // Function to add an optimistic message
  const addOptimisticChatMessage = useCallback((message: string) => {
    // Requires gameState to have character info to correctly populate sender
    // If called before gameState is ready, it might fail or use default sender
    const currentPlayer = gameState?.character;
    if (!currentPlayer) {
      console.warn("[useBattleNads] Cannot add optimistic message: current player data not available.");
      return;
    }

    const optimisticMsg: domain.ChatMessage = {
      logIndex: -(Date.now()), // Temporary unique negative index
      timestamp: (gameState?.lastBlock ?? (Date.now() / 1000)) + 0.5, // Use last known block or fallback to current time + 0.5
      sender: { 
        id: currentPlayer.id, 
        name: currentPlayer.name, 
        index: currentPlayer.index 
      },
      message: message,
      isOptimistic: true,
    };

    // Prevent adding duplicate optimistic messages rapidly
    setOptimisticChatMessages(prev => {
        const alreadyExists = prev.some(
            (msg) => msg.isOptimistic && 
                     msg.sender.id === optimisticMsg.sender.id && 
                     msg.message === optimisticMsg.message
        );
        if (alreadyExists) {
            console.log("[Optimistic Add] Skipping duplicate optimistic message:", message);
            return prev; // Return previous state if duplicate
        }
        return [...prev, optimisticMsg];
    });

  }, [gameState]); // Dependency on gameState to access current player info

  return {
    gameState,
    addOptimisticChatMessage, // Expose the function
    // Expose raw data needed by other hooks
    rawSessionKeyData: sessionKeyData, 
    rawEndBlock: endBlock,
    rawBalanceShortfall: balanceShortfall,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch
  };
}; 