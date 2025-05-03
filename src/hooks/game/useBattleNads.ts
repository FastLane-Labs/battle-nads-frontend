import { useMemo, useRef, useState, useCallback } from 'react';
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
        
        // Safe log to help with debugging BigInt issues
        // console.log(`[useBattleNads] Processing snapshot with sessionKey: ${safeStringify(domainSnapshot.sessionKeyData)}`);
        
        // --- Optimistic Chat Merging --- 
        const confirmedChatLogs = domainSnapshot.chatLogs || [];
        let remainingOptimistic: domain.ChatMessage[] = [];

        // Simple matching: check if sender/message match between optimistic and confirmed
        // A more robust solution might involve temporary IDs or content hashing
        setOptimisticChatMessages(prevOptimistic => {
          remainingOptimistic = prevOptimistic.filter(optimisticMsg => {
            const match = confirmedChatLogs.find(confirmedLog => 
              confirmedLog.sender.id === optimisticMsg.sender.id && 
              confirmedLog.message === optimisticMsg.message
              // Add timestamp proximity check if needed
            );
            return !match; // Keep optimistic message if no match found
          });
          return remainingOptimistic;
        });

        // Combine remaining optimistic messages with confirmed logs
        const finalChatLogs = [...remainingOptimistic, ...confirmedChatLogs].sort(
          (a, b) => a.timestamp === b.timestamp ? a.logIndex - b.logIndex : a.timestamp - b.timestamp
        );
        // --- End Optimistic Chat Merging ---

        // Update the chatLogs in the snapshot before final mapping
        const snapshotWithMergedChat: typeof domainSnapshot = {
          ...domainSnapshot,
          chatLogs: finalChatLogs
        };

        // Then convert domain model to UI model
        currentGameState = worldSnapshotToGameState(snapshotWithMergedChat);
        
        // store for next render cycle
        previousGameStateRef.current = currentGameState;
        
      } catch (err) {
        console.error("[useBattleNads] Error processing game state:", err);
        console.log("[useBattleNads] Problematic data:", safeStringify(rawData));
        currentGameState = previousGameStateRef.current; // Return previous state on error
      }
      
      return { gameState: currentGameState, mappedDomainSnapshot: domainSnapshot };
    },
    [rawData, owner]
  );

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
      timestamp: Date.now() / 1000, // Approximate timestamp (seconds)
      sender: { 
        id: currentPlayer.id, 
        name: currentPlayer.name, 
        index: currentPlayer.index 
      },
      message: message,
      isOptimistic: true,
    };

    setOptimisticChatMessages(prev => [...prev, optimisticMsg]);
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