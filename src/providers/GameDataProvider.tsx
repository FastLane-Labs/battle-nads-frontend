'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef, useMemo } from 'react';
import { useBattleNads } from '../hooks/useBattleNads';
import { useWallet } from './WalletProvider';
import { isValidCharacterId, getCharacterLocalStorageKey } from '../utils/getCharacterLocalStorageKey';
// Comment out the problematic import
// import { useWeb3Onboard } from '@web3-onboard/react';
// Remove or comment out imports that are causing errors
// import { useOnAccountChanged } from "@/hooks/useOnAccountChanged";
// import { defaultGameState } from "@/game/character";
// import { CreateCharacterResponse } from "@/game/character/create";
// import { useConnectWallet } from "@web3-onboard/react";

// Create a context for the game data
export interface GameDataContextType {
  gameData: any;
  lastUpdated: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
  isPolling: boolean;
  connectWallet: () => void;
  characterId: string | null;
  setCharacterId: (characterId: string | null) => void;
  processedChatMessages: any[];
  eventLogs: any[];
}

export const GameDataContext = createContext<GameDataContextType | undefined>(undefined);

// Custom hook to use the game data context
export const useGameData = () => {
  const context = useContext(GameDataContext);
  if (context === undefined) {
    throw new Error('useGameData must be used within a GameDataProvider');
  }
  return context;
};

interface GameDataProviderProps {
  children: ReactNode;
  pollInterval?: number;
}

// Track all provider instances to help debug multiple polling
const PROVIDER_INSTANCES: { id: string; timestamp: string; active: boolean }[] = [];

// Helper functions for character ID management
// Remove duplicate functions that conflict with imports
// const isValidCharacterId = (characterId: string): boolean => {
//   return characterId !== undefined && characterId !== null && characterId !== "0x0000000000000000000000000000000000000000000000000000000000000000";
// };

// const getCharacterLocalStorageKey = (walletAddress: string): string => {
//   return `characterId_${walletAddress?.toLowerCase()}`;
// };

export const GameDataProvider: React.FC<GameDataProviderProps> = ({ children, pollInterval = 1000 }) => {
  const { connectMetamask: connectToWallet, injectedWallet, address } = useWallet();
  // const { connecting } = useWeb3Onboard(); // Commented out problematic import
  
  // State for character ID
  const [characterId, setCharacterId] = useState<string | null>(null);
  const [lastValidCharacterIdTimestamp, setLastValidCharacterIdTimestamp] = useState<number>(0);
  
  // State for game data
  const [gameData, setGameData] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Polling configuration
  const [isPolling, setIsPolling] = useState<boolean>(true);
  const [pollCount, setPollCount] = useState<number>(0);
  const [consecutiveErrors, setConsecutiveErrors] = useState<number>(0);
  
  // Processed data for UI
  const [processedChatMessages, setProcessedChatMessages] = useState<any[]>([]);
  const [eventLogs, setEventLogs] = useState<any[]>([]);
  
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
  const { getFullFrontendData, getOwnerWalletAddress: hookGetOwnerWalletAddress, chatMessages: hookChatMessages } = battleNadsHook;
  const { connectMetamask } = useWallet();
  // Comment out the problematic line
  // const { connecting } = useWeb3Onboard();
  
  // Add effect to sync chat messages from the hook
  useEffect(() => {
    console.log(`[GameDataProvider] Received ${hookChatMessages.length} chat messages from useBattleNads`);
    if (hookChatMessages.length > 0) {
      console.log('[GameDataProvider] Messages from hook:', hookChatMessages);
      setProcessedChatMessages(hookChatMessages);
    }
  }, [hookChatMessages]);
  
  // Get owner wallet address properly inside the component
  const getOwnerWalletAddress = useCallback((): string | undefined => {
    return address?.toLowerCase();
  }, [address]);
  
  // Function to fetch game data
  const fetchGameData = useCallback(async (refresh = false) => {
    if (!isPolling) {
      console.log('[GameDataProvider] Polling disabled, skipping fetch');
      return;
    }

    pollCountRef.current++;
    const shouldLogDetailed = pollCountRef.current <= 5 || pollCountRef.current % 10 === 0;
    
    try {
      setIsLoading(true);
      
      // Get owner wallet address using the enhanced function
      const ownerAddress = getOwnerWalletAddress();
      
      if (shouldLogDetailed) {
        console.log(`[GameDataProvider] Fetching game data with owner address: ${ownerAddress}`);
      }
      
      // Check if we have a stored characterId for this wallet
      const storageKey = ownerAddress ? getCharacterLocalStorageKey(ownerAddress) : null;
      const storedCharacterId = storageKey ? localStorage.getItem(storageKey) : null;
      
      // Also check fallback key for backwards compatibility
      const fallbackStoredId = localStorage.getItem('battleNadsCharacterId');
      
      if (shouldLogDetailed) {
        console.log(`[GameDataProvider] Found stored characterId: ${storedCharacterId || fallbackStoredId || 'none'}`);
      }
      
      // We'll try to fetch data even without a wallet connected
      const result = await getFullFrontendData();
      
      // Process the character ID from the result
      if (result) {
        // Check the character ID from the contract
        const contractCharacterId = result.characterID || null;
        
        if (shouldLogDetailed) {
          console.log(`[GameDataProvider] Contract returned characterId: ${contractCharacterId}`);
        }
        
        // Process the character ID logic with priority ordering:
        let finalCharacterId = null;
        
        // 1. Use valid character ID from contract first
        if (contractCharacterId && isValidCharacterId(contractCharacterId)) {
          if (shouldLogDetailed) {
            console.log(`[GameDataProvider] Using valid contract characterId: ${contractCharacterId}`);
          }
          finalCharacterId = contractCharacterId;
        } 
        // 2. If contract returned zero but we have a stored ID from less than 5 minutes ago, prefer that
        else if (
          ((storedCharacterId && isValidCharacterId(storedCharacterId)) || 
           (fallbackStoredId && isValidCharacterId(fallbackStoredId))) && 
          (Date.now() - lastValidCharacterIdTimestamp < 5 * 60 * 1000)
        ) {
          finalCharacterId = storedCharacterId || fallbackStoredId;
          if (shouldLogDetailed) {
            console.log(`[GameDataProvider] Using stored characterId: ${finalCharacterId} (contract returned zero/invalid address)`);
          }
        }
        // 3. Otherwise go with whatever the contract says
        else {
          finalCharacterId = contractCharacterId;
          if (shouldLogDetailed) {
            console.log(`[GameDataProvider] Using contract characterId: ${contractCharacterId} (may be zero)`);
          }
        }
        
        // Update the state with the character ID we've determined
        setCharacterId(finalCharacterId);
        
        // Check if we have a valid non-zero character ID
        const hasValidCharacter = finalCharacterId && isValidCharacterId(finalCharacterId);
        
        // If we have a valid character ID, store it
        if (hasValidCharacter) {
          if (storageKey) {
            localStorage.setItem(storageKey, finalCharacterId!);
          }
          localStorage.setItem('battleNadsCharacterId', finalCharacterId!);
          setLastValidCharacterIdTimestamp(Date.now());
          
          // Make sure the result object has the correct characterID
          result.characterID = finalCharacterId;
          result.hasCharacter = true;
        }

        // If we got a result, reset consecutive errors counter
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
            setEventLogs(prev => [...events, ...prev]);
          }
        }
        
        // Update game data
        setGameData(result);
        setLastUpdated(Date.now());
        
        // Dispatch gameDataUpdated event to notify listening components about the new data
        // This is CRITICAL for character ID updates to propagate to the NavBar and other components
        const gameDataUpdatedEvent = new CustomEvent('gameDataUpdated', { 
          detail: result 
        });
        console.log('[GameDataProvider] Dispatching gameDataUpdated event with characterID:', result.characterID);
        window.dispatchEvent(gameDataUpdatedEvent);
      } else if (shouldLogDetailed) {
        console.log('[GameDataProvider] No data returned from getFullFrontendData');
      }
    } catch (error) {
      console.log('[GameDataProvider] Error in fetchGameData:', error);
      setConsecutiveErrors((prev: number) => {
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
  }, [getFullFrontendData, isPolling]);

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

  // Start the polling mechanism
  const startPolling = useCallback(() => {
    setIsPolling(true);
  }, []);

  // Stop the polling mechanism
  const stopPolling = useCallback(() => {
    setIsPolling(false);
  }, []);
  
  // Connect wallet function
  const connectWallet = useCallback(() => {
    connectToWallet();
  }, [connectToWallet]);

  // Listen for character created events
  useEffect(() => {
    const handleCharacterCreated = (event: CustomEvent<{characterId: string, owner: string}>) => {
      console.log("GameDataProvider received characterCreated event:", event.detail);
      
      // Explicitly save the created character ID to localStorage and state
      if (event.detail?.characterId && isValidCharacterId(event.detail.characterId)) {
        console.log(`GameDataProvider: Saving valid characterId ${event.detail.characterId} to state and localStorage`);
        
        // Set the character ID in provider state
        setCharacterId(event.detail.characterId);
        
        // Set in localStorage with the wallet-specific key if possible
        if (event.detail.owner) {
          const storageKey = getCharacterLocalStorageKey(event.detail.owner);
          if (storageKey) {
            localStorage.setItem(storageKey, event.detail.characterId);
            console.log(`Saved characterId to localStorage with key ${storageKey}`);
          }
        }
        
        // Also use fixed key for backwards compatibility
        localStorage.setItem('battleNadsCharacterId', event.detail.characterId);
        
        // Increment the lastValidCharacterIdTimestamp to track when we last confirmed a valid ID
        setLastValidCharacterIdTimestamp(Date.now());
        
        // IMPORTANT: Make sure we manually update the gameData object with the new characterID
        // This ensures it's included in the gameDataUpdated event
        if (gameData) {
          const updatedGameData = {
            ...gameData,
            characterID: event.detail.characterId,
            hasCharacter: true
          };
          
          // Update gameData state
          setGameData(updatedGameData);
          
          // Immediately dispatch an event to notify components like NavBar
          const gameDataUpdatedEvent = new CustomEvent('gameDataUpdated', { 
            detail: updatedGameData 
          });
          console.log('[GameDataProvider] Dispatching immediate gameDataUpdated event for new character:', event.detail.characterId);
          window.dispatchEvent(gameDataUpdatedEvent);
        }
        
        // Reset the error state in case there was a previous error
        setError(null);
        
        // Trigger a data refresh after a short delay to ensure blockchain state is updated
        setTimeout(() => {
          fetchGameData(true);
        }, 2000);
      } else {
        console.error("Invalid characterId received:", event.detail?.characterId);
      }
    };

    window.addEventListener('characterCreated', handleCharacterCreated as EventListener);
    
    return () => {
      window.removeEventListener('characterCreated', handleCharacterCreated as EventListener);
    };
  }, [fetchGameData, gameData]);

  // Try to get the character ID from localStorage if we have an active wallet connection
  useEffect(() => {
    // Use the address that was already obtained at the component level
    if (address) {
      const storageKey = getCharacterLocalStorageKey(address);
      if (storageKey) {
        const storedCharacterId = localStorage.getItem(storageKey);
        
        console.log(`[GameDataProvider] Checking localStorage with key ${storageKey} for wallet ${address}`);
        console.log(`[GameDataProvider] Found stored characterId: ${storedCharacterId}`);
        
        if (storedCharacterId && isValidCharacterId(storedCharacterId)) {
          console.log(`[GameDataProvider] Setting valid characterId from localStorage: ${storedCharacterId}`);
          setCharacterId(storedCharacterId);
        }
      }
    }
  }, [address]);

  // Create the context value object
  const contextValue = useMemo(() => ({
    gameData,
    lastUpdated,
    isLoading,
    error,
    refetch: fetchGameData,
    startPolling,
    stopPolling,
    isPolling,
    connectWallet,
    characterId,
    setCharacterId,
    processedChatMessages,
    eventLogs
  }), [
    gameData,
    lastUpdated,
    isLoading,
    error,
    fetchGameData,
    startPolling,
    stopPolling,
    isPolling,
    connectWallet,
    characterId,
    processedChatMessages,
    eventLogs
  ]);

  return (
    <GameDataContext.Provider value={contextValue}>
      {children}
    </GameDataContext.Provider>
  );
};