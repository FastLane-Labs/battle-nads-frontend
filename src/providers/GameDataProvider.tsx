'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef, useMemo } from 'react';
import { useBattleNads } from '../hooks/game/useBattleNads';
import { useWallet } from './WalletProvider';
import { getCharacterLocalStorageKey } from '../utils/getCharacterLocalStorageKey';
import { useBattleNadsClient } from '../hooks/contracts/useBattleNadsClient';
import { LogType, Log, DataFeed, ChatMessage, PollResponse, SessionKeyData, BattleNadUnformatted, BattleNadLiteUnformatted, BattleNadLite, BattleNad, GameUpdates, GameState } from '../types/gameTypes';
import { ethers } from 'ethers';
import { sessionKeyMachine, SessionKeyState, SessionKeyEvent } from '../session/sessionKeyMachine';
import { mapUiSnapshotToGameState } from '../types/gameMaps';
import { POLL_INTERVAL } from '../config/env';

// Feature flag to control service layer usage
const REFAC_SERVICE_LIVE = process.env.NEXT_PUBLIC_REFAC_SERVICE_LIVE === 'true';

/**
 * Deep equality check for objects
 * This helps prevent unnecessary rerenders when objects haven't meaningfully changed
 */
const isEqual = (obj1: any, obj2: any): boolean => {
  // Handle simple cases
  if (obj1 === obj2) return true;
  if (obj1 == null || obj2 == null) return false;
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return false;
  
  // If one is array but other is not
  if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;
  
  // For arrays, compare length and contents
  if (Array.isArray(obj1)) {
    if (obj1.length !== obj2.length) return false;
    return obj1.every((item, index) => isEqual(item, obj2[index]));
  }
  
  // For objects
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  // Special case for BigInt values
  return keys1.every(key => {
    if (typeof obj1[key] === 'bigint' && typeof obj2[key] === 'bigint') {
      return obj1[key].toString() === obj2[key].toString();
    }
    if (typeof obj1[key] === 'object' && obj1[key] !== null) {
      return isEqual(obj1[key], obj2[key]);
    }
    return obj1[key] === obj2[key];
  });
};

// Create a context for the game data
interface GameDataContextType {
  gameData: GameState;
  lastUpdated: Date | null;
  isLoading: boolean;
  error: string | null;
  connectWallet: () => Promise<void>; // Add wallet connection function to context
  refetch: () => Promise<void>;
  enablePolling: () => void;
  disablePolling: () => void;
  isPollingEnabled: boolean;
  pollCount: number;
  // Add new fields for processed data
  processedChatMessages: any[];
  processedEventLogs: any[];
  addManualCombatEvent: (eventData: any) => void;
}

const initialGameData: GameState = {
  owner: null,
  character: null,
  others: new Array<BattleNadLite>(65),
  position: { x: 0, y: 0, depth: 0 },
  movementOptions: {
    canMoveNorth: false,
    canMoveSouth: false,
    canMoveEast: false,
    canMoveWest: false,
    canMoveUp: false,
    canMoveDown: false
  },
  eventLogs: [],
  chatLogs: [],
  updates: {
    owner: false,
    character: false,
    sessionKey: false,
    others: new Array<boolean>(65).fill(false),
    position: false,
    combat: false,
    movementOptions: false,
    eventLogs: false,
    chatLogs: false,
    lastBlock: false,
    error: false
  },
  sessionKey: {
    owner: '',
    key: '',
    balance: BigInt(0),
    targetBalance: BigInt(0),
    ownerCommittedAmount: BigInt(0),
    ownerCommittedShares: BigInt(0),
    expiration: 0
  },
  lastBlock: 0,
  loading: false,
  error: null
}

const GameDataContext = createContext<GameDataContextType>({
  gameData: initialGameData,
  lastUpdated: null,
  isLoading: false,
  error: null,
  connectWallet: async () => {}, // Default no-op function
  refetch: async () => {}, // Default no-op function
  enablePolling: () => {}, // Default no-op function
  disablePolling: () => {}, // Default no-op function
  isPollingEnabled: true,
  pollCount: 0,
  // Initialize new fields
  processedChatMessages: [],
  processedEventLogs: [],
  addManualCombatEvent: () => {}
});

// Custom hook to use the game data context
export const useGameData = () => {
  const context = useContext(GameDataContext);
  
  // Add debug logging to see what's in the context
  useEffect(() => {
    console.log(`[useGameData] Context has ${context.processedChatMessages.length} chat messages`);
    if (context.processedChatMessages.length > 0) {
      console.log('[useGameData] Messages:', context.processedChatMessages);
    }
  }, [context.processedChatMessages]);
  
  return context;
};

interface GameDataProviderProps {
  children: ReactNode;
  pollInterval?: number;
}

// Track all provider instances to help debug multiple polling
const PROVIDER_INSTANCES: { id: string; timestamp: string; active: boolean }[] = [];

export const GameDataProvider: React.FC<GameDataProviderProps> = ({ 
  children, 
  pollInterval: propPollInterval = POLL_INTERVAL
}) => {
  // Use the centralized poll interval
  const pollInterval = POLL_INTERVAL;
  
  // Generate unique ID for this provider instance
  const instanceId = useRef<string>(`GameDataProvider-${Math.random().toString(36).substring(2, 9)}`);
  
  // Using a ref for poll count instead of state
  const pollCountRef = useRef<number>(0);
  
  // Ref for tracking interval ID
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
  
  // Add ref to store current game data that persists between renders and polling cycles
  // This prevents stale closures in the fetchGameData function
  const gameDataRef = useRef<any>(null);
  
  // Add ref to track last known position for more reliable position change detection
  const lastKnownPositionRef = useRef<{x: number, y: number, depth: number} | null>(null);

  // Add ref to store the highest seen block persistently
  const highestSeenBlockRef = useRef<number>(0);
  
  // Counter for alternating polling
  const callCounterRef = useRef<number>(0);

  // Track this instance
  useEffect(() => {
    const timestamp = new Date().toISOString();
    console.log(`[POLL-DEBUG ${timestamp}] GameDataProvider instance ${instanceId.current} created with interval ${pollInterval}ms`);
    
    // Register this instance
    PROVIDER_INSTANCES.push({
      id: instanceId.current,
      timestamp,
      active: true
    });
    
    // Log all active instances
    console.log(`[POLL-DEBUG ${timestamp}] Active GameDataProvider instances: ${PROVIDER_INSTANCES.filter(i => i.active).length}`);
    PROVIDER_INSTANCES.filter(i => i.active).forEach(instance => {
      console.log(`[POLL-DEBUG ${timestamp}] - Instance ${instance.id} created at ${instance.timestamp}`);
    });
    
    return () => {
      const cleanupTime = new Date().toISOString();
      console.log(`[POLL-DEBUG ${cleanupTime}] GameDataProvider instance ${instanceId.current} destroyed`);
      
      // Mark this instance as inactive
      const instanceIndex = PROVIDER_INSTANCES.findIndex(i => i.id === instanceId.current);
      if (instanceIndex >= 0) {
        PROVIDER_INSTANCES[instanceIndex].active = false;
      }
      
      // Clear the interval if it exists
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    };
  }, [pollInterval]);
  
  // We'll use the client directly instead of the hook for polling
  const { injectedWallet, embeddedWallet, connectMetamask } = useWallet();
  const { client } = useBattleNadsClient(); // Get the client from useBattleNadsClient
  
  // State for game data and loading status
  const [gameData, setGameData] = useState<GameState>(initialGameData);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [consecutiveErrors, setConsecutiveErrors] = useState<number>(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isPollingEnabled, setIsPollingEnabled] = useState<boolean>(true);
  
  // Add state for processed data
  const [processedChatMessages, setProcessedChatMessages] = useState<any[]>([]);
  const [processedEventLogs, setProcessedEventLogs] = useState<any[]>([]);

  // Effect to update embedded wallet address ref when it changes
  useEffect(() => {
    if (embeddedWallet?.address) {
      console.log(`[GameDataProvider] Updating embedded wallet address ref: ${embeddedWallet.address}`);
    }
  }, [embeddedWallet?.address]);
  
  // Helper function to validate session key using the state machine
  const validateSessionKey = useCallback((sessionKey: string, embeddedAddress: string, expiration: number, currentBlock: number) => {
    // Use the session key state machine to validate
    const state = sessionKeyMachine.validate(sessionKey, embeddedAddress, expiration, currentBlock);
    
    console.log(`[validateSessionKey] Session key validation result: ${state}`, {
      sessionKey,
      embeddedAddress,
      expiration,
      currentBlock
    });
    
    return state;
  }, []);

  // Helper to check if session key is valid
  const isValidCharacterId = useCallback((id: string | null | undefined): boolean => {
    if (!id) return false;
    // Simple validity check - ensures ID is not zero and has expected format
    return id !== '0x0000000000000000000000000000000000000000000000000000000000000000';
  }, []);

  // The fetchGameData function should now use the client directly
  const fetchGameData = useCallback(async () => {
    if (!isPollingEnabled) {
      console.log('[GameDataProvider] Polling disabled, skipping data fetch');
      return;
    }
    
    // Increment poll counter
    pollCountRef.current += 1;
    
    // Skip polling if there's no client
    if (!client) {
      console.log('[GameDataProvider] No client available, skipping data fetch');
      return;
    }
    
    // Get owner address (prefer injected wallet for stability)
    const ownerAddress = injectedWallet?.address || null;
    
    if (!ownerAddress) {
      console.log('[GameDataProvider] No owner address available, skipping data fetch');
      // Don't set an error here as this is a normal state before wallet connection
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Get last known block from gameData or default to 0
      const lastKnownBlock = gameData?.lastBlock || 0;
      
      // Call the client's getUiSnapshot method directly
      const result = await client.getUiSnapshot(ownerAddress, BigInt(lastKnownBlock));
      
      if (!result) {
        throw new Error('Failed to fetch game data: Empty response');
      }
      
      // Use the mapper to transform the raw data to GameState
      const newGameData = mapUiSnapshotToGameState(result, ownerAddress);
      
      // Update highest seen block
      if (newGameData.lastBlock > highestSeenBlockRef.current) {
        highestSeenBlockRef.current = newGameData.lastBlock;
      }
      
      // Validate session key using the state machine
      if (embeddedWallet?.address && newGameData.sessionKey) {
        const sessionKeyState = validateSessionKey(
          newGameData.sessionKey.key,
          embeddedWallet.address,
          newGameData.sessionKey.expiration,
          newGameData.lastBlock
        );
        
        // Dispatch events based on state
        if (sessionKeyState === SessionKeyState.MISMATCH || sessionKeyState === SessionKeyState.EXPIRED) {
          // Create the event object with detailed debugging info
          const eventDetail = {
            characterId: newGameData.character?.id,
            owner: ownerAddress,
            currentSessionKey: newGameData.sessionKey.key,
            embeddedWalletAddress: embeddedWallet.address,
            reason: sessionKeyState === SessionKeyState.MISMATCH ? 'mismatch' : 'expired',
            timestamp: new Date().toISOString(),
            instanceId: instanceId.current
          };
          
          console.log(`[GameDataProvider] Dispatching sessionKeyUpdateNeeded event with details:`, eventDetail);
          
          // Dispatch the event
          const event = new CustomEvent('sessionKeyUpdateNeeded', { detail: eventDetail });
          window.dispatchEvent(event);
        }
      }
      
      // Set the new game data state
      setGameData(newGameData);
      
      // Update timestamp
      setLastUpdated(new Date());
      
      // Process data feeds for chat and event logging
      const dataFeeds = (result as any).dataFeeds;
      if (dataFeeds && Array.isArray(dataFeeds)) {
        // Extract all logs from data feeds
        const allLogs = dataFeeds.flatMap((feed: any) => 
          Array.isArray(feed?.logs) ? feed.logs : []
        );
        
        // Extract chat events (logType 4 is Chat)
        const chatEvents = allLogs.filter((log: any) => log?.logType === LogType.Chat);
        
        // Collect all chat contents from data feeds
        const chatContents = dataFeeds.flatMap((feed: any) => 
          Array.isArray(feed?.chatLogs) ? feed.chatLogs : []
        );
        
        // Only log when we actually have chat content
        if (chatEvents.length > 0 || chatContents.length > 0) {
          console.log(`[GameDataProvider] Found ${chatEvents.length} chat events and ${chatContents.length} chat contents`);
        }
        
        // Extract event logs (all non-chat logs)
        const events = allLogs.filter((log: any) => log?.logType !== LogType.Chat);
        
        // Update processed data state
        if (chatContents.length > 0) {
          // Transform chat logs into the expected format
          const chatMessages = chatContents.map((content: string) => ({
            characterName: 'Unknown', // This would ideally be populated from the data
            message: content,
            timestamp: Date.now()
          }));
          
          setProcessedChatMessages(prev => [...prev, ...chatMessages]);
        }
        
        if (events.length > 0) {
          // Transform event logs into the expected format
          const eventMessages = events.map((event: any) => ({
            message: `Event type ${event.logType}`, // This would ideally be a human-readable message
            timestamp: Date.now()
          }));
          
          setProcessedEventLogs(prev => [...prev, ...eventMessages]);
        }
      }
      
      // Check for meaningful changes to trigger UI updates
      // Update the hasChangedMeaningfully check to be more granular and detect specific changes
      // Use gameDataRef.current for comparison to avoid stale closures
      const hasChangedMeaningfully = !gameDataRef.current || 
        // Character ID changed
        newGameData.character?.id !== gameDataRef.current.characterID ||
        // Session key balance changed
        (newGameData.sessionKey?.balance?.toString() !== gameDataRef.current.sessionKeyBalance?.toString()) ||
        // Position changed (check explicitly)
        (newGameData.position && (!lastKnownPositionRef.current || 
          newGameData.position.x !== lastKnownPositionRef.current.x || 
          newGameData.position.y !== lastKnownPositionRef.current.y || 
          newGameData.position.depth !== lastKnownPositionRef.current.depth));
      
      if (hasChangedMeaningfully) {
        // Dispatch a gameDataUpdated event
        const gameDataUpdatedEvent = new CustomEvent('gameDataUpdated', { 
          detail: newGameData 
        });
        window.dispatchEvent(gameDataUpdatedEvent);
        console.log('[GameDataProvider] Dispatched gameDataUpdated event with changed data');
        
        // Check for position change
        if (newGameData.position) {
          // Extract position values
          const newPosition = newGameData.position;
          
          // Get current position from ref or default
          const currentPosition = lastKnownPositionRef.current;
          
          // Check if position has changed
          const hasPositionChanged = !currentPosition || 
            newPosition.x !== currentPosition.x || 
            newPosition.y !== currentPosition.y || 
            newPosition.depth !== currentPosition.depth;
          
          if (hasPositionChanged) {
            console.log('[GameDataProvider] Position changed detected:', 
              { from: lastKnownPositionRef.current, to: newPosition });
            
            // Update lastKnownPositionRef with the new position
            lastKnownPositionRef.current = newPosition;
            
            // Store in window for cross-component access
            (window as any).lastKnownCharacterPosition = newPosition;
            
            // Create and dispatch position change event
            const positionChangedEvent = new CustomEvent('characterPositionChanged', {
              detail: { 
                position: newPosition,
                character: newGameData.character
              }
            });
            window.dispatchEvent(positionChangedEvent);
            console.log('[GameDataProvider] Dispatched characterPositionChanged event with position:', newPosition);
          }
        }
      }
      
      // If we got a result, reset consecutive errors counter
      setConsecutiveErrors(0);
      
    } catch (err) {
      console.error('[GameDataProvider] Error fetching game data:', err);
      setError(`Failed to fetch game data: ${(err as Error)?.message || 'Unknown error'}`);
      
      // Increment consecutive errors counter
      setConsecutiveErrors(prev => prev + 1);
      
      // If we've had too many consecutive errors, disable polling
      if (consecutiveErrors > 10) {
        console.error('[GameDataProvider] Too many consecutive errors, disabling polling');
        setIsPollingEnabled(false);
      }
    } finally {
      setIsLoading(false);
    }
  }, [client, injectedWallet?.address, embeddedWallet?.address, isPollingEnabled, gameData?.lastBlock, validateSessionKey, consecutiveErrors]);

  // Set up polling interval
  useEffect(() => {
    // Only set up polling if it's enabled
    if (!isPollingEnabled) {
      console.log('[GameDataProvider] Polling disabled, not setting up interval');
      return;
    }
    
    console.log(`[GameDataProvider] Setting up polling interval: ${pollInterval}ms`);
    
    // Initial fetch
    fetchGameData();
    
    // Set up interval
    const intervalId = setInterval(fetchGameData, pollInterval);
    intervalIdRef.current = intervalId;
    
    // Clean up
    return () => {
      clearInterval(intervalId);
      intervalIdRef.current = null;
    };
  }, [fetchGameData, pollInterval, isPollingEnabled]);

  // Add listeners for the session key machine events
  useEffect(() => {
    // Listen for session key state changes
    const handleSessionKeyValid = (data: any) => {
      console.log('[GameDataProvider] Session key is valid:', data);
      // Dispatch a custom event for the UI
      window.dispatchEvent(new CustomEvent('sessionKeyValid', { detail: data }));
    };
    
    const handleSessionKeyMismatch = (data: any) => {
      console.log('[GameDataProvider] Session key mismatch:', data);
      // Dispatch a custom event for the UI
      window.dispatchEvent(new CustomEvent('sessionKeyMismatch', { detail: data }));
    };
    
    const handleSessionKeyExpired = (data: any) => {
      console.log('[GameDataProvider] Session key expired:', data);
      // Dispatch a custom event for the UI
      window.dispatchEvent(new CustomEvent('sessionKeyExpired', { detail: data }));
    };
    
    // Register event listeners
    sessionKeyMachine.on(SessionKeyEvent.VALID, handleSessionKeyValid);
    sessionKeyMachine.on(SessionKeyEvent.MISMATCH, handleSessionKeyMismatch);
    sessionKeyMachine.on(SessionKeyEvent.EXPIRED, handleSessionKeyExpired);
    
    // Clean up
    return () => {
      // We would unregister listeners here if the API supported it
    };
  }, []);

  // Add a listener for character creation events to trigger immediate data fetch
  useEffect(() => {
    const handleCharacterCreated = (event: CustomEvent) => {
      console.log("[GameDataProvider] Received characterCreated event:", event.detail);
      if (event.detail && event.detail.characterId) {
        console.log("[GameDataProvider] Triggering immediate data fetch for new character");
        fetchGameData();
      }
    };

    // Add event listener
    window.addEventListener('characterCreated', handleCharacterCreated as EventListener);
    
    // Clean up
    return () => {
      window.removeEventListener('characterCreated', handleCharacterCreated as EventListener);
    };
  }, [fetchGameData]);

  // Update the useEffect for contextValue to also ensure gameDataRef is in sync with gameData state
  useEffect(() => {
    // Keep the ref in sync with state changes
    if (gameData !== null && gameData !== undefined) {
      gameDataRef.current = gameData;
    }
  }, [gameData]);

  // Function to connect wallet and fetch data
  const connectWallet = useCallback(async () => {
    try {
      // Use the connect function from the wallet provider
      await connectMetamask();
      
      // After connecting, trigger a data fetch
      fetchGameData();
    } catch (err) {
      console.error('[GameDataProvider] Error connecting wallet:', err);
      setError(`Failed to connect wallet: ${(err as Error)?.message || 'Unknown error'}`);
    }
  }, [connectMetamask, fetchGameData]);

  // Function to manually refetch data
  const refetch = useCallback(async () => {
    console.log('[GameDataProvider] Manual refetch requested');
    await fetchGameData();
  }, [fetchGameData]);

  // Functions to enable/disable polling
  const enablePolling = useCallback(() => {
    console.log('[GameDataProvider] Enabling polling');
    setIsPollingEnabled(true);
    
    // Reset consecutive errors
    setConsecutiveErrors(0);
    
    // Trigger an immediate fetch
    fetchGameData();
  }, [fetchGameData]);

  const disablePolling = useCallback(() => {
    console.log('[GameDataProvider] Disabling polling');
    setIsPollingEnabled(false);
    
    // Clear the interval if it exists
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
  }, []);

  // Add manual combat event handler
  const addManualCombatEvent = useCallback((eventData: any) => {
    console.log('[GameDataProvider] Adding manual combat event:', eventData);
    
    // Create an event message
    const eventMessage = {
      message: eventData.message || 'Combat event',
      timestamp: Date.now()
    };
    
    // Add to processed event logs
    setProcessedEventLogs(prev => [...prev, eventMessage]);
    
    // Dispatch a custom event
    window.dispatchEvent(new CustomEvent('manualCombatEvent', { detail: eventData }));
  }, []);

  // Create the context value
  const contextValue = {
    gameData,
    lastUpdated,
    isLoading,
    error,
    connectWallet,
    refetch,
    enablePolling,
    disablePolling,
    isPollingEnabled,
    pollCount: pollCountRef.current,
    processedChatMessages,
    processedEventLogs,
    addManualCombatEvent
  };

  return (
    <GameDataContext.Provider value={contextValue}>
      {children}
    </GameDataContext.Provider>
  );
};