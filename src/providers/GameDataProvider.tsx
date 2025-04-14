'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef, useMemo } from 'react';
import { useBattleNads } from '../hooks/useBattleNads';
import { useWallet } from './WalletProvider';

// Create a context for the game data
interface GameDataContextType {
  gameData: any | null;
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
}

const GameDataContext = createContext<GameDataContextType>({
  gameData: null,
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
  processedEventLogs: []
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
  pollInterval: propPollInterval = 1000 // Changed from 5000 to 1000 (1 second polling)
}) => {
  // Force 1 second polling regardless of prop value
  const pollInterval = 1000;
  
  // Generate unique ID for this provider instance
  const instanceId = useRef<string>(`GameDataProvider-${Math.random().toString(36).substring(2, 9)}`);
  
  // Track last poll time for this instance
  const lastPollTime = useRef<number>(0);
  
  // Using a ref for poll count instead of state
  const pollCountRef = useRef<number>(0);
  
  // Ref for tracking interval ID
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
  
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
  
  // Pass provider role to useBattleNads to mark this as the authorized instance
  const battleNadsHook = useBattleNads({ role: 'provider' });
  const { getFullFrontendData, getOwnerWalletAddress, chatMessages: hookChatMessages } = battleNadsHook;
  const { injectedWallet, connectMetamask } = useWallet();
  
  // State for game data and loading status
  const [gameData, setGameData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [consecutiveErrors, setConsecutiveErrors] = useState<number>(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isPollingEnabled, setIsPollingEnabled] = useState<boolean>(true);
  
  // Add state for processed data
  const [processedChatMessages, setProcessedChatMessages] = useState<any[]>([]);
  const [processedEventLogs, setProcessedEventLogs] = useState<any[]>([]);
  
  // Add effect to sync chat messages from the hook
  useEffect(() => {
    console.log(`[GameDataProvider] Received ${hookChatMessages.length} chat messages from useBattleNads`);
    if (hookChatMessages.length > 0) {
      console.log('[GameDataProvider] Messages from hook:', hookChatMessages);
      setProcessedChatMessages(hookChatMessages);
    }
  }, [hookChatMessages]);
  
  // Function to prompt user to connect wallet
  const connectWallet = useCallback(async () => {
    const timestamp = new Date().toISOString();
    console.log(`[POLL-DEBUG ${timestamp}] Prompting user to connect wallet`);
    
    try {
      if (connectMetamask) {
        // Attempt to connect MetaMask
        await connectMetamask();
        
        // Check if connection was successful
        if (window.ethereum && (window.ethereum as any).selectedAddress) {
          console.log(`[POLL-DEBUG ${timestamp}] Successfully connected wallet: ${(window.ethereum as any).selectedAddress}`);
          setError(null);
          
          // Trigger a data fetch after connection
          fetchGameData();
        }
      }
      
      console.warn(`[POLL-DEBUG ${timestamp}] Failed to connect wallet`);
      setError("Failed to connect wallet. Please try again or refresh the page.");
    } catch (err) {
      console.error(`[POLL-DEBUG ${timestamp}] Error connecting wallet:`, err);
      setError(`Error connecting wallet: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [connectMetamask]);

  // Function to fetch game data
  const fetchGameData = useCallback(async () => {
    if (!isPollingEnabled) {
      console.log('[GameDataProvider] Polling disabled, skipping fetch');
      return;
    }

    pollCountRef.current++;
    const shouldLogDetailed = pollCountRef.current <= 5 || pollCountRef.current % 10 === 0;
    
    try {
      // Get owner wallet address using the enhanced function
      const ownerAddress = getOwnerWalletAddress();
      
      // We'll try to fetch data even without a wallet connected
      const result = await getFullFrontendData();
      
      // If we got a result, reset consecutive errors counter
      if (result) {
        setConsecutiveErrors(0);
        
        // Add debug check specifically for chatLogs
        if (result.dataFeeds && Array.isArray(result.dataFeeds)) {
          let totalChatLogs = 0;
          let chatLogsContent: string[] = [];
          
          // Check each data feed for chatLogs
          for (const feed of result.dataFeeds) {
            if (feed && Array.isArray(feed.chatLogs) && feed.chatLogs.length > 0) {
              totalChatLogs += feed.chatLogs.length;
              chatLogsContent = chatLogsContent.concat(feed.chatLogs);
            }
          }
          
          // Log what we found
          if (totalChatLogs > 0) {
            console.log(`[GameDataProvider] Found ${totalChatLogs} chat messages in data feeds:`, chatLogsContent);
          } else {
            console.log(`[GameDataProvider] No chat messages found in ${result.dataFeeds.length} data feeds`);
          }
        }
        
        // Process data feeds for chat and event logs
        if (result.dataFeeds && Array.isArray(result.dataFeeds)) {
          const timestamp = new Date().toISOString();
          
          // Add more detailed debug for chat logs in dataFeeds
          console.log(`[GameDataProvider] Data feeds structure check:`, {
            feedCount: result.dataFeeds.length,
            firstFeedHasChatLogs: result.dataFeeds[0] && Array.isArray(result.dataFeeds[0].chatLogs),
            firstFeedChatLogsLength: result.dataFeeds[0] && Array.isArray(result.dataFeeds[0].chatLogs) ? result.dataFeeds[0].chatLogs.length : 0,
            responseStructure: result.dataFeeds[0] ? Object.keys(result.dataFeeds[0]) : []
          });
          
          // Process all logs from data feeds
          const allLogs = result.dataFeeds.flatMap((feed: any) => 
            Array.isArray(feed?.logs) ? feed.logs : []
          );
          
          if (shouldLogDetailed) {
            console.log(`[GameDataProvider] Processing ${allLogs.length} logs from data feeds`);
          }
          
          // Extract chat messages (logType 6 is chat)
          const chatLogs = allLogs
            .filter((log: any) => log?.logType === 6)
            .map((log: any) => ({
              characterName: log.characterName || 'Unknown',
              message: log.message || '',
              timestamp: Date.now()
            }));
          
          // Extract event logs (all non-chat logs)
          const events = allLogs.filter((log: any) => log?.logType !== 6);
          
          // Update processed data state if we have new logs
          if (chatLogs.length > 0) {
            if (shouldLogDetailed) {
              console.log(`[GameDataProvider] Adding ${chatLogs.length} new chat messages:`, chatLogs);
            }
            setProcessedChatMessages(prev => {
              const newState = [...chatLogs, ...prev];
              console.log(`[GameDataProvider] Updated processedChatMessages state, now has ${newState.length} messages`);
              return newState;
            });
          }
          
          if (events.length > 0) {
            if (shouldLogDetailed) {
              console.log(`[GameDataProvider] Adding ${events.length} new event logs`);
            }
            setProcessedEventLogs(prev => [...events, ...prev]);
          }
        }
        
        // Update game data
        setGameData(result);
        setLastUpdated(new Date());
      } else if (shouldLogDetailed) {
        console.log('[GameDataProvider] No data returned from getFullFrontendData');
      }
    } catch (error) {
      console.log('[GameDataProvider] Error in fetchGameData:', error);
      setConsecutiveErrors(prev => {
        const newCount = prev + 1;
        // Only log detailed error information after 3 consecutive errors to reduce noise
        if (newCount >= 3 || shouldLogDetailed) {
          console.error(`[GameDataProvider] Error fetching game data (error #${newCount}):`, error);
        }
        return newCount;
      });
    } finally {
      setIsLoading(false);
    }
  }, [getFullFrontendData, getOwnerWalletAddress, isPollingEnabled]);

  // Set up polling interval - this was missing
  useEffect(() => {
    console.log(`[GameDataProvider] Setting up polling interval: ${pollInterval}ms`);
    
    // Do an initial fetch
    fetchGameData();
    
    // Set up the interval for regular polling
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      console.log('[GameDataProvider] Cleared existing polling interval');
    }
    
    // Create new interval - always polls regardless of isPollingEnabled flag
    // isPollingEnabled is checked inside fetchGameData instead
    intervalIdRef.current = setInterval(() => {
      console.log(`[GameDataProvider] Polling interval triggered after ${pollInterval}ms`);
      fetchGameData();
    }, pollInterval);
    
    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
        console.log('[GameDataProvider] Cleaned up polling interval on unmount');
      }
    };
  }, [pollInterval]); // Remove fetchGameData from dependencies

  // Enable/disable polling functions
  const enablePolling = useCallback(() => {
    console.log('[GameDataProvider] Enabling polling');
    setIsPollingEnabled(true);
  }, []);

  const disablePolling = useCallback(() => {
    console.log('[GameDataProvider] Disabling polling');
    setIsPollingEnabled(false);
  }, []);

  // Provide context to children
  const contextValue = useMemo(() => ({
    gameData,
    isLoading,
    error,
    lastUpdated,
    refetch: fetchGameData,
    enablePolling,
    disablePolling,
    isPollingEnabled,
    pollCount: pollCountRef.current,
    connectWallet,
    // Add processed data to context
    processedChatMessages,
    processedEventLogs
  }), [gameData, isLoading, error, lastUpdated, fetchGameData, enablePolling, disablePolling, 
       isPollingEnabled, connectWallet, processedChatMessages, processedEventLogs]);

  return (
    <GameDataContext.Provider value={contextValue}>
      {children}
    </GameDataContext.Provider>
  );
};