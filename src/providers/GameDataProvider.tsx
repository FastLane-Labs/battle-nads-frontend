'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef, useMemo } from 'react';
import { useBattleNads, LogType } from '../hooks/useBattleNads';
import { useWallet } from './WalletProvider';
import { getCharacterLocalStorageKey } from '../utils/getCharacterLocalStorageKey';

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
  
  // Add ref to store current game data that persists between renders and polling cycles
  // This prevents stale closures in the fetchGameData function
  const gameDataRef = useRef<any>(null);
  
  // Add ref to track last known position for more reliable position change detection
  const lastKnownPositionRef = useRef<{x: number, y: number, depth: number} | null>(null);

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
  // Add suppressEvents:true to prevent duplicate event emissions
  const battleNadsHook = useBattleNads({ role: 'provider', suppressEvents: true });
  const { getFullFrontendData, getOwnerWalletAddress, chatMessages: hookChatMessages } = battleNadsHook;
  const { injectedWallet, embeddedWallet, connectMetamask } = useWallet();
  
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
      
      // Check if the sessionKey is the zero address or null/undefined, and if so, set sessionKeyBalance to zero
      // This prevents showing a balance for an address the user doesn't have access to
      if (!result.sessionKey || result.sessionKey === '0x0000000000000000000000000000000000000000') {
        console.log('[GameDataProvider] Zero address or null sessionKey detected - setting sessionKeyBalance to zero');
        result.sessionKeyBalance = BigInt(0);
      }
      
      // Check if we need to update session key
      // Conditions: valid owner address (not zero address) AND valid characterID AND (zero address session key OR session key doesn't match embedded wallet)
      const validOwnerAddress = ownerAddress && ownerAddress !== '0x0000000000000000000000000000000000000000';
      const validCharId = result.characterID && result.characterID !== '0x0000000000000000000000000000000000000000000000000000000000000000';
      const zeroSessionKey = !result.sessionKey || result.sessionKey === '0x0000000000000000000000000000000000000000';
      const sessionKeyMismatch = embeddedWallet?.address && result.sessionKey && result.sessionKey !== embeddedWallet.address;
      
      if (validOwnerAddress && validCharId && (zeroSessionKey || sessionKeyMismatch)) {
        console.log('[GameDataProvider] Session key update needed:', {
          ownerAddress,
          characterID: result.characterID,
          currentSessionKey: result.sessionKey,
          embeddedWalletAddress: embeddedWallet?.address || 'Not available'
        });
        
        // Dispatch event to trigger session key update page
        const sessionKeyUpdateEvent = new CustomEvent('sessionKeyUpdateNeeded', {
          detail: { 
            characterId: result.characterID,
            owner: ownerAddress,
            currentSessionKey: result.sessionKey,
            embeddedWalletAddress: embeddedWallet?.address
          }
        });
        window.dispatchEvent(sessionKeyUpdateEvent);
      }
      
      // Debug logging for zero session key with valid character ID
      const isZeroSessionKey = result.sessionKey === '0x0000000000000000000000000000000000000000';
      const isValidCharacterId = result.characterID && 
        result.characterID !== '0x0000000000000000000000000000000000000000000000000000000000000000';
      
      if (isZeroSessionKey && isValidCharacterId) {
        console.log(`[GameDataProvider] ZERO SESSION KEY DETECTED with valid characterID`, {
          ownerAddress,
          startBlock: result.lastFetchedBlock || 'unknown', // or the value passed to getFullFrontendData
          characterID: result.characterID,
          sessionKey: result.sessionKey,
          sessionKeyBalance: result.sessionKeyBalance?.toString(),
          bondedShMonadBalance: result.bondedShMonadBalance?.toString(),
          balanceShortfall: result.balanceShortfall?.toString(),
          unallocatedAttributePoints: result.unallocatedAttributePoints?.toString()
        });
      }
      
      // If we got a result, reset consecutive errors counter
      if (result) {
        setConsecutiveErrors(0);
        
        // Helper function to check if a character ID is valid (non-zero) 
        const isValidCharacterId = (id: string | null | undefined): boolean => {
          return !!id && id !== '0x0000000000000000000000000000000000000000000000000000000000000000';
        };
        
        // Make sure we have either valid IDs or clear zero values for comparison
        // USE THE REF FOR CURRENT GAME DATA INSTEAD OF STATE to avoid stale closures
        const currentId = gameDataRef.current?.characterID || '0x0000000000000000000000000000000000000000000000000000000000000000';
        const newId = result.characterID || '0x0000000000000000000000000000000000000000000000000000000000000000';
        
        // Check specifically for zero session key with valid character ID
        if (isValidCharacterId(newId) && result.sessionKey === '0x0000000000000000000000000000000000000000') {
          console.log(`[GameDataProvider] WARNING: Zero session key with valid character ID detected`, {
            characterID: newId,
            sessionKey: result.sessionKey,
            sessionKeyBalance: result.sessionKeyBalance?.toString(),
            bondedShMonadBalance: result.bondedShMonadBalance?.toString(),
            balanceShortfall: result.balanceShortfall?.toString(),
            ownerAddress: getOwnerWalletAddress() || 'unknown'
          });
        }
        
        // Only trigger characterID changed events if we have a valid new ID that's different from the current one
        // AND we have a reference to existing game data
        if (gameDataRef.current && newId !== currentId && isValidCharacterId(newId)) {
          console.log(`[GameDataProvider] Valid character ID changed: ${currentId} -> ${newId}`);
          
          // Get wallet-specific localStorage key if we have an owner address
          if (ownerAddress) {
            const storageKey = getCharacterLocalStorageKey(ownerAddress);
            
            if (storageKey) {
              // Only update localStorage if this is a valid (non-zero) character ID
              if (isValidCharacterId(newId)) {
                localStorage.setItem(storageKey, newId);
                console.log(`[GameDataProvider] Updated localStorage with new character ID: ${newId}`);
                
                // Also use fixed key for backwards compatibility
                localStorage.setItem('battleNadsCharacterId', newId);
              } else {
                // Remove any existing character ID if new ID is invalid/zero
                localStorage.removeItem(storageKey);
                localStorage.removeItem('battleNadsCharacterId');
                console.log(`[GameDataProvider] Removed invalid character ID from localStorage`);
              }
            }
          }
          
          // Broadcast a global event for the character ID change
          const characterChangedEvent = new CustomEvent('characterIDChanged', {
            detail: { characterId: newId, owner: ownerAddress }
          });
          window.dispatchEvent(characterChangedEvent);
          console.log(`[GameDataProvider] Dispatched characterIDChanged event with ID: ${newId}`);
        } else if (currentId !== newId) {
          // Log if IDs are different but we're not triggering an event (zero address case)
          console.log(`[GameDataProvider] Character ID change not significant: ${currentId} -> ${newId}`);
        }
        
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
          
          // Log only when we actually find chat logs (keeping useful logs)
          if (totalChatLogs > 0) {
            console.log(`[GameDataProvider] Found ${totalChatLogs} chat messages in data feeds:`, chatLogsContent);
          }
        }
        
        // Process data feeds for chat and event logs
        if (result.dataFeeds && Array.isArray(result.dataFeeds)) {
          const timestamp = new Date().toISOString();
          
          // Remove detailed debug for chat logs in dataFeeds
          
          // Process all logs from data feeds
          const allLogs = result.dataFeeds.flatMap((feed: any) => 
            Array.isArray(feed?.logs) ? feed.logs : []
          );
          
          if (shouldLogDetailed) {
            console.log(`[GameDataProvider] Processing ${allLogs.length} logs from data feeds`);
          }
          
          // Extract chat events (logType 4 is Chat)
          const chatEvents = allLogs.filter((log: any) => log?.logType === LogType.Chat);
          
          // Collect all chat contents from data feeds
          const chatContents = result.dataFeeds.flatMap((feed: any) => 
            Array.isArray(feed?.chatLogs) ? feed.chatLogs : []
          );
          
          // Only log when we actually have chat content (keeping useful logs)
          if (chatEvents.length > 0 || chatContents.length > 0) {
            console.log(`[GameDataProvider] Found ${chatEvents.length} chat events and ${chatContents.length} chat contents`);
          }
          
          // Extract event logs (all non-chat logs)
          const events = allLogs.filter((log: any) => log?.logType !== LogType.Chat);
          
          // Update processed data state if we have new logs
          if (chatEvents.length > 0 && chatContents.length > 0) {
            // Combine chat events with their content
            const combinedChatMessages: { characterName: string; message: string; timestamp: number }[] = [];
            
            // Matching length indicates we can pair them directly by index
            if (chatEvents.length === chatContents.length) {
              for (let i = 0; i < chatEvents.length; i++) {
                combinedChatMessages.push({
                  characterName: chatEvents[i].characterName || 'Unknown',
                  message: chatContents[i] || '',
                  timestamp: Date.now()
                });
              }
              
              if (shouldLogDetailed) {
                console.log(`[GameDataProvider] Created ${combinedChatMessages.length} combined chat messages`);
              }
            } else {
              // If lengths don't match, try to match by index field if available
              for (const chatEvent of chatEvents) {
                if (chatEvent.index !== undefined && chatEvent.index < chatContents.length) {
                  combinedChatMessages.push({
                    characterName: chatEvent.characterName || 'Unknown',
                    message: chatContents[chatEvent.index] || '',
                    timestamp: Date.now()
                  });
                }
              }
              
              console.log(`[GameDataProvider] Created ${combinedChatMessages.length} chat messages using index matching`);
              
              // If we couldn't match any, fall back to simpler approach
              if (combinedChatMessages.length === 0) {
                console.log(`[GameDataProvider] Fallback: Using simpler approach for chat messages`);
                for (let i = 0; i < Math.min(chatEvents.length, chatContents.length); i++) {
                  combinedChatMessages.push({
                    characterName: chatEvents[i].characterName || 'Unknown',
                    message: chatContents[i] || '',
                    timestamp: Date.now()
                  });
                }
              }
            }
            
            // Update state with combined chat messages
            if (combinedChatMessages.length > 0) {
              setProcessedChatMessages(prev => {
                const newState = [...prev, ...combinedChatMessages];
                console.log(`[GameDataProvider] Updated processedChatMessages state, now has ${newState.length} messages`);
                return newState;
              });
            }
          }
          
          if (events.length > 0) {
            if (shouldLogDetailed) {
              console.log(`[GameDataProvider] Adding ${events.length} new event logs`);
            }
            setProcessedEventLogs(prev => [...events, ...prev]);
          }
        }
        
        // Important: Update the gameDataRef BEFORE updating state
        // This ensures the ref always has the latest data for the next polling cycle
        gameDataRef.current = result;
        
        // Update game data state
        setGameData(result);
        setLastUpdated(new Date());
        
        // Update the hasChangedMeaningfully check to be more granular and detect specific changes
        // Use gameDataRef.current for comparison to avoid stale closures
        const hasChangedMeaningfully = !gameDataRef.current || 
          // Character ID changed
          result.characterID !== gameDataRef.current.characterID ||
          // Session key balance changed
          (result.sessionKeyBalance?.toString() !== gameDataRef.current.sessionKeyBalance?.toString()) ||
          // Bonded balance changed
          (result.bondedShMonadBalance?.toString() !== gameDataRef.current.bondedShMonadBalance?.toString()) ||
          // Shortfall changed
          (result.balanceShortfall?.toString() !== gameDataRef.current.balanceShortfall?.toString()) ||
          // Position changed (check explicitly)
          (result.character?.stats && 
           (!gameDataRef.current?.character?.stats ||
            Number(result.character.stats.x || 0) !== Number(gameDataRef.current.character.stats.x || 0) ||
            Number(result.character.stats.y || 0) !== Number(gameDataRef.current.character.stats.y || 0) ||
            Number(result.character.stats.depth || 0) !== Number(gameDataRef.current.character.stats.depth || 0))) ||
          // Character stats/position changed - use deep comparison
          !isEqual(result.character, gameDataRef.current.character) ||
          // Combat state changed - check for combatants array changes
          !isEqual(result.combatants, gameDataRef.current.combatants) ||
          // New data feeds
          (Array.isArray(result.dataFeeds) && result.dataFeeds.length > 0 && 
           (!gameDataRef.current.dataFeeds || result.dataFeeds.some((feed: any, i: number) => !isEqual(feed, gameDataRef.current.dataFeeds?.[i]))));
        
        if (hasChangedMeaningfully) {
          // Also broadcast a general gameDataUpdated event
          const gameDataUpdatedEvent = new CustomEvent('gameDataUpdated', { 
            detail: result 
          });
          window.dispatchEvent(gameDataUpdatedEvent);
          console.log('[GameDataProvider] Dispatched gameDataUpdated event with changed data');
          
          // Add more specific event dispatches for different types of changes
          
          // 1. Check for character position change
          if (result.character?.stats) {
            // Extract position values, ensuring we have numbers not undefined
            const newX = Number(result.character.stats.x || 0);
            const newY = Number(result.character.stats.y || 0);
            const newDepth = Number(result.character.stats.depth || 0);
            
            // Get current values from lastKnownPositionRef or default to -1 to ensure initial position is always considered a change
            const currentX = lastKnownPositionRef.current?.x ?? -1;
            const currentY = lastKnownPositionRef.current?.y ?? -1;
            const currentDepth = lastKnownPositionRef.current?.depth ?? -1;
            
            // Check if position has changed
            const hasPositionChanged = 
              newX !== currentX || 
              newY !== currentY || 
              newDepth !== currentDepth;
            
            if (hasPositionChanged) {
              console.log('[GameDataProvider] Position changed detected:', 
                { from: lastKnownPositionRef.current, to: { x: newX, y: newY, depth: newDepth } });
              
              // Create a position object from stats for the event
              const position = { x: newX, y: newY, depth: newDepth };
              
              // Update lastKnownPositionRef with the new position
              lastKnownPositionRef.current = position;
              
              // Also store in window for cross-component access
              (window as any).lastKnownCharacterPosition = position;
              
              // Create and dispatch position change event
              const positionChangedEvent = new CustomEvent('characterPositionChanged', {
                detail: { 
                  position: position,
                  character: result.character
                }
              });
              window.dispatchEvent(positionChangedEvent);
              console.log('[GameDataProvider] Dispatched characterPositionChanged event with position:', position);
            }
          }
          
          // 2. Check for character health/stats change
          if (result.character?.stats && (!gameDataRef.current?.character?.stats ||
              result.character.stats.health !== gameDataRef.current.character.stats.health ||
              result.character.stats.maxHealth !== gameDataRef.current.character.stats.maxHealth)) {
            const statsChangedEvent = new CustomEvent('characterStatsChanged', {
              detail: { 
                stats: result.character.stats,
                character: result.character,
                isPlayerCharacter: true // Flag to identify this is the player character
              }
            });
            window.dispatchEvent(statsChangedEvent);
            console.log('[GameDataProvider] Dispatched characterStatsChanged event');
          }
          
          // 3. Check for combatants changes
          if (result.combatants) {
            // Improved check for actual combatant changes
            let combatantsChanged = false;
            
            // Only trigger when actually different
            if (!gameDataRef.current?.combatants) {
              // First time getting combatants
              combatantsChanged = result.combatants.length > 0;
            } else if (result.combatants.length !== gameDataRef.current.combatants.length) {
              // Length change is meaningful
              combatantsChanged = true;
            } else if (result.combatants.length > 0) {
              // Compare IDs and health values
              const oldIds = gameDataRef.current.combatants.map((c: any) => c.id).sort().join(',');
              const newIds = result.combatants.map((c: any) => c.id).sort().join(',');
              
              if (oldIds !== newIds) {
                combatantsChanged = true;
              } else {
                // Deep compare combatants for health changes
                combatantsChanged = !isEqual(result.combatants, gameDataRef.current.combatants);
              }
            }
            
            if (combatantsChanged) {
              const combatantsChangedEvent = new CustomEvent('combatantsChanged', {
                detail: { 
                  combatants: result.combatants,
                  previousCombatants: gameDataRef.current?.combatants || []
                }
              });
              window.dispatchEvent(combatantsChangedEvent);
              console.log('[GameDataProvider] Dispatched combatantsChanged event');
            }
          }
          
          // 4. Check for area info changes (miniMap) - use deep comparison
          if (result.miniMap && (!gameDataRef.current?.miniMap || !isEqual(result.miniMap, gameDataRef.current.miniMap))) {
            const areaChangedEvent = new CustomEvent('areaInfoChanged', {
              detail: { 
                miniMap: result.miniMap
              }
            });
            window.dispatchEvent(areaChangedEvent);
            console.log('[GameDataProvider] Dispatched areaInfoChanged event');
          }
        } else {
          console.log('[GameDataProvider] Skipping gameDataUpdated event - no meaningful changes detected');
        }
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
  }, [getFullFrontendData, getOwnerWalletAddress, isPollingEnabled, embeddedWallet?.address]);

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
      // Remove noisy polling trigger message
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