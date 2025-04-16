import { useState, useEffect, useRef, useCallback } from 'react';
import { useWallet } from '../providers/WalletProvider';
import { useBattleNads, useGameActions } from './useBattleNads';
import { useSetRecoilState, useRecoilValue } from 'recoil';
import { gameStateAtom } from '../state/gameState';
import { parseFrontendData, createGameState } from '../utils/gameDataConverters';
import { isValidCharacterId } from '../utils/getCharacterLocalStorageKey';

// This hook handles game state management and orchestration
export const useGame = () => {
  const { 
    address, 
    injectedWallet, 
    embeddedWallet
  } = useWallet();
  
  const { 
    getPlayerCharacterID, 
    characterId: battleNadsCharacterId, 
    getFullFrontendData,
    moveCharacter: contractMoveCharacter,
    highestSeenBlock,
    getCurrentBlockNumber
  } = useBattleNads();
  
  // Use Recoil for global state management - MUST be at the top level
  const setGameState = useSetRecoilState(gameStateAtom);
  const gameState = useRecoilValue(gameStateAtom);
  
  // Get the game actions for session key operations
  const { getCurrentSessionKey } = useGameActions();
  
  // Local state for initialization and session key validation
  const [status, setStatus] = useState<string>('checking');
  const [error, setError] = useState<string | null>(null);
  const [sessionKeyWarning, setSessionKeyWarning] = useState<string | null>(null);
  
  // Use refs to track transaction state across renders
  const processingRef = useRef(false);
  const transactionSentRef = useRef(false);
  // Add initialization tracker ref
  const initializationDoneRef = useRef(false);
  
  // Store embedded wallet address to keep it stable during state transitions
  const embeddedWalletRef = useRef<string | null>(null);
  
  // Add a ref to keep track of the highest seen block
  const highestSeenBlockRef = useRef<number>(0);
  
  // Update embedded wallet reference when it changes
  useEffect(() => {
    if (embeddedWallet?.address && !embeddedWalletRef.current) {
      console.log("Storing embedded wallet reference:", embeddedWallet.address);
      embeddedWalletRef.current = embeddedWallet.address;
    }
  }, [embeddedWallet]);
  
  // Update highestSeenBlockRef when highestSeenBlock changes
  useEffect(() => {
    if (highestSeenBlock && highestSeenBlock > highestSeenBlockRef.current) {
      console.log(`Updating highestSeenBlockRef from ${highestSeenBlockRef.current} to ${highestSeenBlock}`);
      highestSeenBlockRef.current = highestSeenBlock;
    }
  }, [highestSeenBlock]);
  
  // Reset transaction flags
  const resetTransactionFlags = useCallback(() => {
    transactionSentRef.current = false;
    processingRef.current = false;
  }, []);

  // Function to check owner wallet connection
  const checkOwnerWallet = useCallback(async () => {
    try {
      setStatus('checking-owner-wallet');
      console.log("Checking owner wallet...", { 
        address, 
        injectedWallet: injectedWallet?.address,
        embeddedWallet: embeddedWallet?.address,
        walletType: injectedWallet?.walletClientType 
      });
      
      // Check if any wallet is connected - either injected wallet or address from context
      if (!injectedWallet?.address && !address) {
        console.log("No wallet connected");
        setStatus('need-owner-wallet');
        processingRef.current = false;
        return false;
      }
      
      // If we have an address but no injected wallet, we might be using Privy or another provider
      if (!injectedWallet?.address && address) {
        console.log("Using address from context as owner wallet:", address);
      } else {
        console.log("Owner wallet connected:", injectedWallet?.address);
      }
      
      return true;
    } catch (error) {
      console.error("Error checking owner wallet:", error);
      setError("Failed to check owner wallet connection");
      setStatus('error');
      processingRef.current = false;
      return false;
    }
  }, [address, injectedWallet]);
  
  // Function to check embedded wallet availability
  const checkEmbeddedWallet = useCallback(async () => {
    try {
      setStatus('checking-embedded-wallet');
      console.log("Checking embedded wallet...", { 
        embeddedWallet: embeddedWallet?.address,
        storedAddress: embeddedWalletRef.current,
        walletType: embeddedWallet?.walletClientType
      });
      
      // If embedded wallet is temporarily unavailable, add a small delay and retry
      if (!embeddedWallet?.address && !embeddedWalletRef.current) {
        console.log("Embedded wallet not available, waiting briefly before final check...");
        
        // Add a short delay to allow wallet state to stabilize
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // If still not available after delay, report failure
        if (!embeddedWallet?.address) {
          console.log("Embedded wallet still not available after delay");
          setStatus('need-embedded-wallet');
          processingRef.current = false;
          return false;
        }
      }
      
      // Use the stored reference if the current embeddedWallet is unavailable
      if (!embeddedWallet?.address && embeddedWalletRef.current) {
        console.log("Embedded wallet temporarily unavailable, using stored reference:", embeddedWalletRef.current);
        return true;
      }
      
      if (!embeddedWallet?.address) {
        console.log("Embedded wallet not available and no stored reference");
        setStatus('need-embedded-wallet');
        processingRef.current = false;
        return false;
      }
      
      // Update our stored reference
      if (embeddedWallet.address) {
        embeddedWalletRef.current = embeddedWallet.address;
      }
      
      // Also check if the embedded wallet has a signer - crucial for operations
      if (!embeddedWallet.signer) {
        console.error("Embedded wallet has no signer");
        console.error("Embedded wallet details:", {
          address: embeddedWallet.address,
          type: embeddedWallet.walletClientType,
          hasProvider: !!embeddedWallet.provider
        });
        
        // If we have a stored reference, we can potentially proceed
        if (embeddedWalletRef.current) {
          console.log("Proceeding with stored embedded wallet reference despite missing signer");
          return true;
        }
        
        setStatus('need-embedded-wallet');
        processingRef.current = false;
        return false;
      }
      
      console.log("Embedded wallet available:", embeddedWallet.address);
      console.log("Embedded wallet has signer:", !!embeddedWallet.signer);
      return true;
    } catch (error) {
      console.error("Error checking embedded wallet:", error);
      setError("Failed to check embedded wallet");
      setStatus('error');
      processingRef.current = false;
      return false;
    }
  }, [embeddedWallet]);
  
  // Function to check character
  const checkCharacter = useCallback(async () => {
    try {
      console.log("Checking character state");
      
      // Clear previous errors
      setError(null);
      
      // Skip if transaction was sent
      if (transactionSentRef.current) {
        console.log("Transaction already sent, skipping character check");
        return battleNadsCharacterId;
      }
      
      // If we already have a character ID, validate it's not the zero address
      if (battleNadsCharacterId) {
        console.log("Using existing character ID:", battleNadsCharacterId);
        if (!isValidCharacterId(battleNadsCharacterId)) {
          console.log("Character ID is the zero address, need to create a character");
          setStatus('need-character');
          processingRef.current = false;
          return null;
        }
        return battleNadsCharacterId;
      }
      
      // Make sure wallet is connected
      if (!injectedWallet?.address && !address) {
        console.log("No wallet connected, can't check character");
        setStatus('need-owner-wallet');
        processingRef.current = false;
        return null;
      }
      
      // Check character ID
      console.log("Attempting to get player character ID");
      const charId = await getPlayerCharacterID();
      console.log("Character ID from chain:", charId);
      
      // Check if character ID is null or the zero address
      if (!isValidCharacterId(charId)) {
        console.log("No valid character found (null or zero address), need to create one");
        setStatus('need-character');
        processingRef.current = false;
        return null;
      }
      
      console.log("Valid character confirmed:", charId);
      return charId;
    } catch (error) {
      console.error("Error checking character:", error);
      const errorMessage = (error as Error)?.message || "Unknown error";
      console.log("Error in checkCharacter:", errorMessage);
      
      // Only set error if it's not a temporary state like "checking"
      if (errorMessage !== "checking" && !errorMessage.includes("checking")) {
        setError(`Failed to check character: ${errorMessage}`);
        setStatus('error');
      } else {
        console.log("Character is still in checking state, continuing");
      }
      
      processingRef.current = false;
      return null;
    }
  }, [battleNadsCharacterId, getPlayerCharacterID, injectedWallet, address]);
  
  // Function to check session key health and fix if needed
  const checkSessionKey = useCallback(async (charId: string) => {
    try {
      // Skip if a transaction has already been sent
      if (transactionSentRef.current) {
        console.log("Transaction already sent, skipping session key check");
        return false;
      }
      
      setStatus('checking-session-key');
      console.log("=== SESSION KEY CHECK STARTED ===");
      console.log("Checking session key for character:", charId);
      console.log("Embedded wallet address:", embeddedWallet?.address || embeddedWalletRef.current || "Not available");
      
      // Skip session key check if character ID is zero address (byte32(0)) or null
      if (!charId || charId === "0x0000000000000000000000000000000000000000000000000000000000000000") {
        console.log("Character ID is zero/null, skipping session key check");
        return true; // Continue with game initialization without warning
      }

      // Get the full session key data including expiration
      // First try to use the useBattleNads hook's getCurrentSessionKey function
      let sessionKeyData;
      try {
        if (getCurrentSessionKey) {
          sessionKeyData = await getCurrentSessionKey(charId);
          console.log("Got session key data from getCurrentSessionKey:", sessionKeyData);
        }
      } catch (err) {
        console.warn("Failed to get session key data directly, will use gameData as fallback:", err);
      }
      
      // Fallback: If we couldn't get the full session key data or it doesn't have an expiration,
      // use the game data to get the address part
      let sessionKeyAddress = sessionKeyData?.key;
      let sessionKeyExpiration = sessionKeyData?.expiration;
      
      if (!sessionKeyAddress) {
        // Get session key from game data
        const gameData = await getFullFrontendData();
        
        if (!gameData || !gameData.sessionKey) {
          console.error("Failed to retrieve current session key");
          setSessionKeyWarning("Unable to verify session key. Some game actions may fail.");
          return true; // Continue with game initialization despite warning
        }
        
        sessionKeyAddress = gameData.sessionKey;
        console.log("Current session key address (from gameData):", sessionKeyAddress);
      } else {
        console.log("Current session key address (from direct call):", sessionKeyAddress);
        console.log("Session key expiration block:", sessionKeyExpiration);
      }
      
      // Use either the current embedded wallet address or the stored reference
      const embeddedAddress = embeddedWallet?.address || embeddedWalletRef.current;
      console.log("Using embedded wallet address for comparison:", embeddedAddress);
      
      // Make sure we have an embedded wallet address to compare with
      if (!embeddedAddress) {
        console.error("No embedded wallet address available for comparison");
        setError("Embedded wallet not available");
        setStatus('error');
        processingRef.current = false;
        return false;
      }
      
      // Check if session key is zero address
      if (sessionKeyAddress === "0x0000000000000000000000000000000000000000") {
        console.log("Session key is zero address but we have an embedded wallet to use");
        
        // Set a warning that session key needs to be updated from zero address
        const warningMessage = "Your session key is not set. Game actions will fail until you update your session key.";
        console.log("Setting session key warning:", warningMessage);
        setSessionKeyWarning(warningMessage);
        
        return true; // Continue with game initialization but with the warning
      }
      
      // Check for session key expiration
      if (sessionKeyExpiration) {
        // Use the ref value for highestSeenBlock
        console.log(`Current highestSeenBlockRef value: ${highestSeenBlockRef.current || 'undefined'}`);
        
        // Use highestSeenBlockRef if available, or try to get the current block as fallback
        let currentBlock = highestSeenBlockRef.current;
        
        // If highestSeenBlockRef is 0 or undefined, try to get current block via other means
        if (!currentBlock || currentBlock === 0) {
          try {
            console.log("highestSeenBlockRef not available, trying to get current block from chain data");
            const gameData = await getFullFrontendData();
            if (gameData && gameData.lastFetchedBlock) {
              currentBlock = gameData.lastFetchedBlock;
              console.log(`Got current block from chain data: ${currentBlock}`);
            }
            
            // If still no block, use getCurrentBlockNumber as last resort
            if (!currentBlock || currentBlock === 0) {
              currentBlock = await getCurrentBlockNumber();
              console.log(`Got current block from getCurrentBlockNumber: ${currentBlock}`);
              
              // Update the ref with this value
              if (currentBlock > 0) {
                highestSeenBlockRef.current = currentBlock;
              }
            }
          } catch (err) {
            console.warn("Failed to get current block from chain data:", err);
          }
        }
        
        // Force checking the expiration if we have any block number
        if (currentBlock) {
          console.log(`Checking session key expiration: ${sessionKeyExpiration} vs current block ${currentBlock}`);
          
          if (sessionKeyExpiration < currentBlock) {
            console.log("SESSION KEY EXPIRED! Expiration block is lower than current block");
            
            // Set a warning that session key has expired
            const warningMessage = `Your session key has expired at block ${sessionKeyExpiration} (current block: ${currentBlock}). Game actions will fail until you update your session key.`;
            console.log("Setting session key warning:", warningMessage);
            setSessionKeyWarning(warningMessage);
            
            // Dispatch an event to trigger the update session key dialog
            const sessionKeyUpdateEvent = new CustomEvent('sessionKeyUpdateNeeded', {
              detail: { 
                characterId: charId,
                owner: address,
                currentSessionKey: sessionKeyAddress,
                embeddedWalletAddress: embeddedAddress,
                reason: 'expired',
                expirationBlock: sessionKeyExpiration,
                currentBlock: currentBlock
              }
            });
            window.dispatchEvent(sessionKeyUpdateEvent);
            
            // Set the status to explicitly indicate warning
            setStatus('session-key-warning');
            
            // Return true to continue with initialization but with the warning
            return true;
          }
        } else {
          // If we still don't have a current block, assume expired as a safety measure
          console.warn("Could not get current block to check expiration - assuming expired for safety");
          
          // Set a warning that session key expiration couldn't be verified
          const warningMessage = `Your session key expiration couldn't be verified (expiration block: ${sessionKeyExpiration}). Game actions may fail.`;
          console.log("Setting session key warning:", warningMessage);
          setSessionKeyWarning(warningMessage);
          
          // Dispatch an event to trigger the update session key dialog
          const sessionKeyUpdateEvent = new CustomEvent('sessionKeyUpdateNeeded', {
            detail: { 
              characterId: charId,
              owner: address,
              currentSessionKey: sessionKeyAddress,
              embeddedWalletAddress: embeddedAddress,
              reason: 'unknown',
              expirationBlock: sessionKeyExpiration,
              currentBlock: 0
            }
          });
          window.dispatchEvent(sessionKeyUpdateEvent);
          
          // Set the status to explicitly indicate warning
          setStatus('session-key-warning');
          
          // Return true to continue with initialization but with the warning
          return true;
        }
      } else {
        console.warn("Session key expiration data not available - cannot verify if expired");
      }
      
      // Check if current session key matches the embedded wallet
      const sessionKeyMatches = sessionKeyAddress?.toLowerCase() === embeddedAddress.toLowerCase();
      console.log("Session key matches embedded wallet:", sessionKeyMatches);
      
      if (!sessionKeyMatches) {
        console.log("Session key mismatch. Needs update.");
        console.log("Current session key:", sessionKeyAddress || "Not available");
        console.log("Embedded wallet address:", embeddedAddress);
        
        // Set a warning that session keys don't match
        const warningMessage = "Your session key doesn't match your embedded wallet. Some game actions may fail.";
        console.log("Setting session key warning:", warningMessage);
        setSessionKeyWarning(warningMessage);
        
        console.log("Skipping session key update and continuing");
        return true;
      } else {
        console.log("Session key already matches embedded wallet!");
        setStatus('session-key-valid');
        return true;
      }
    } catch (error) {
      console.error("Error checking session key:", error);
      const errorMessage = (error as Error)?.message || "Unknown error";
      console.error(`Detailed error in checkSessionKey: ${errorMessage}`);
      
      // Set warning instead of error to allow game to continue
      setSessionKeyWarning("Failed to verify session key: " + errorMessage);
      setStatus('warning');
      processingRef.current = false;
      return true; // Continue with game initialization despite warning
    } finally {
      console.log("=== SESSION KEY CHECK COMPLETED ===");
    }
  }, [embeddedWallet, embeddedWalletRef, getFullFrontendData, highestSeenBlockRef, getCurrentBlockNumber, address, getCurrentSessionKey]);
  
  // Function to reset session key warning
  const resetSessionKeyWarning = useCallback(() => {
    console.log("Resetting session key warning state");
    setSessionKeyWarning(null);
  }, []);
  
  // Load game state from blockchain
  const loadGameState = useCallback(async (characterId: string) => {
    try {
      // Set loading state
      setGameState(prev => ({ ...prev, loading: true, error: null }));
      
      console.log(`[loadGameState] Loading game state for character ${characterId}`);
      
      // Get data from contract
      const frontendDataRaw = await getFullFrontendData(characterId);
      
      if (!frontendDataRaw) {
        console.error(`[loadGameState] No data returned from getFullFrontendData`);
        setGameState(prev => ({ ...prev, loading: false, error: "Failed to load game data" }));
        return false;
      }
      
      // Parse the data
      const parsedData = parseFrontendData(frontendDataRaw);
      const gameState = createGameState(parsedData);
      
      // Update global state
      setGameState(prev => ({
        ...gameState,
        loading: false,
        error: null
      }));
      
      console.log(`[loadGameState] Game state loaded successfully`);
      return true;
    } catch (error) {
      console.error(`[loadGameState] Error:`, error);
      const errorMessage = (error as Error)?.message || "Unknown error";
      setGameState(prev => ({ ...prev, loading: false, error: errorMessage }));
      return false;
    }
  }, [getFullFrontendData, setGameState]);
  
  // Main initialization function
  const initializeGame = useCallback(async () => {
    // Don't re-initialize if already processing or transaction was sent
    if (processingRef.current || transactionSentRef.current) {
      console.log("Skipping initialization due to flags:", {
        processing: processingRef.current,
        transactionSent: transactionSentRef.current
      });
      return { success: false, status };
    }
    
    // Set processing flag to prevent multiple executions
    processingRef.current = true;
    
    // Set global loading state
    setGameState(prev => ({ ...prev, loading: true }));
    
    console.log("Starting game initialization flow");
    
    try {
      // Set status for progress messaging only
      setStatus('checking');
      
      // Step 1: Check owner wallet
      setStatus('checking-owner-wallet');
      if (!await checkOwnerWallet()) {
        return { success: false, status: 'need-owner-wallet' };
      }
      
      // Step 2: Check embedded wallet
      setStatus('checking-embedded-wallet');
      if (!await checkEmbeddedWallet()) {
        return { success: false, status: 'need-embedded-wallet' };
      }
      
      // Step 3: Check character
      setStatus('checking-character');
      const charId = await checkCharacter();
      if (!charId) {
        // If we're in a temporary checking state, return checking instead of need-character
        // This allows the game component to wait for the state to resolve
        if (status === 'checking' || status === 'checking-character') {
          return { success: false, status: 'checking' };
        }
        return { success: false, status: 'need-character' };
      }
      
      // Step 4: Check session key - but don't try to update it even if it's invalid
      setStatus('checking-session-key');
      const sessionKeyCheckResult = await checkSessionKey(charId);
      
      // Step 5: Load game data
      setStatus('loading-game-data');
      await loadGameState(charId);
      
      // All necessary checks completed - update status based on session key warning
      if (sessionKeyWarning) {
        console.log("Session key warning exists, setting status to session-key-warning");
        setStatus('session-key-warning');
      } else {
        console.log("No session key warning, setting status to ready");
        setStatus('ready');
      }
      
      // Give a small delay to ensure state updates propagate
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return { success: true, status: 'ready' };
    } catch (error) {
      console.error("Error during game initialization:", error);
      
      // Don't set error for temporary states
      const errorMessage = (error as Error)?.message || "Unknown error";
      if (errorMessage === "checking" || errorMessage.includes("checking") || status === 'checking') {
        console.log("Game is still initializing, returning checking status");
        return { success: false, status: 'checking' };
      }
      
      setError("Game initialization failed: " + errorMessage);
      setStatus('error');
      setGameState(prev => ({ ...prev, error: errorMessage }));
      return { success: false, status: 'error', error: errorMessage };
    } finally {
      processingRef.current = false;
      setGameState(prev => ({ ...prev, loading: false }));
    }
  }, [checkOwnerWallet, checkEmbeddedWallet, checkCharacter, checkSessionKey, loadGameState, setGameState, status]);
  
  // Move player with state management
  const moveCharacter = useCallback(async (characterId: string, direction: string) => {
    try {
      // Set moving state
      setGameState(prev => ({ ...prev, isMoving: true, error: null }));
      
      console.log(`[moveCharacter] Moving character ${characterId} ${direction}`);
      
      // Call contract function 
      await contractMoveCharacter(characterId, direction);
      
      // Reload state after movement
      await loadGameState(characterId);
      
      // Reset moving state
      setGameState(prev => ({ ...prev, isMoving: false }));
      return true;
    } catch (error) {
      console.error(`[moveCharacter] Error:`, error);
      const errorMessage = (error as Error)?.message || "Unknown error";
      setGameState(prev => ({ ...prev, isMoving: false, error: errorMessage }));
      return false;
    }
  }, [contractMoveCharacter, loadGameState, setGameState]);
  
  // Update session key with state management
  const updateSessionKey = useCallback(async () => {
    try {
      // Set loading state
      setGameState(prev => ({ ...prev, loading: true, error: null }));
      
      console.log(`[updateSessionKey] Updating session key to embedded wallet`);
      
      if (!embeddedWallet?.address) {
        throw new Error("No embedded wallet available to use as session key");
      }
      
      // We'll get the session key status from the game data
      const gameData = await getFullFrontendData();
      
      // Reset session key warning
      resetSessionKeyWarning();
      
      // Get character ID to verify the update
      if (!battleNadsCharacterId) {
        console.warn(`[updateSessionKey] No character ID available for verification`);
        return { success: true };
      }
      
      // Check if the session key is already set correctly
      if (gameData && gameData.sessionKey) {
        const sessionKeyMatches = gameData.sessionKey.toLowerCase() === embeddedWallet.address.toLowerCase();
        
        // Reset loading state
        setGameState(prev => ({ ...prev, loading: false }));
        
        if (!sessionKeyMatches) {
          console.warn(`[updateSessionKey] Session key still doesn't match after update`);
          setSessionKeyWarning("Session key update may have failed. Some game actions may not work.");
          return { success: false, error: "Session key update verification failed" };
        }
        
        return { success: true };
      }
      
      throw new Error("Failed to update session key");
    } catch (error) {
      console.error(`[updateSessionKey] Error:`, error);
      const errorMessage = (error as Error)?.message || "Unknown error";
      setGameState(prev => ({ ...prev, loading: false, error: errorMessage }));
      return { success: false, error: errorMessage };
    }
  }, [embeddedWallet, battleNadsCharacterId, getFullFrontendData, resetSessionKeyWarning, setGameState]);
  
  // Auto-initialize on component mount
  useEffect(() => {
    // Only initialize once
    if (injectedWallet && embeddedWallet && !initializationDoneRef.current) {
      console.log("Auto-initializing game once...");
      initializationDoneRef.current = true;
      initializeGame().then(result => {
        console.log("Auto-initialization result:", result);
      });
    }
  }, [injectedWallet, embeddedWallet, initializeGame]);
  
  // Helper function to get stored embedded wallet address
  const getStoredEmbeddedWalletAddress = useCallback(() => {
    return embeddedWalletRef.current;
  }, []);
  
  // Helper function to check if we have all required wallet types
  const hasAllRequiredWallets = useCallback(() => {
    return !!(injectedWallet?.address && (embeddedWallet?.address || embeddedWalletRef.current));
  }, [injectedWallet, embeddedWallet]);
  
  // Add effect to listen for forceSessionKeyWarning events
  useEffect(() => {
    const handleForceSessionKeyWarning = (event: CustomEvent) => {
      if (event.detail && event.detail.warning) {
        console.log(`[useGame] Received forceSessionKeyWarning event with warning: ${event.detail.warning}`);
        setSessionKeyWarning(event.detail.warning);
      }
    };

    window.addEventListener('forceSessionKeyWarning', handleForceSessionKeyWarning as EventListener);
    
    return () => {
      window.removeEventListener('forceSessionKeyWarning', handleForceSessionKeyWarning as EventListener);
    };
  }, []);
  
  // Debug log to check if we're getting highestSeenBlock
  useEffect(() => {
    console.log(`[useGame] Received highestSeenBlock from useBattleNads: ${highestSeenBlock || 'undefined'}`);
    if (highestSeenBlock > 0) {
      highestSeenBlockRef.current = highestSeenBlock;
    }
  }, [highestSeenBlock]);
  
  return {
    // Game status
    status,
    error,
    sessionKeyWarning,
    sessionKeyStatus: embeddedWallet && battleNadsCharacterId ? {
      isSessionKeyMismatch: sessionKeyWarning !== null,
      embeddedWalletAddress: embeddedWallet?.address || null
    } : null,
    
    // Game initialization
    initializeGame,
    loadGameState,
    
    // Game actions
    moveCharacter,
    updateSessionKey,
    
    // Status functions
    checkOwnerWallet,
    checkEmbeddedWallet,
    hasAllRequiredWallets,
    
    // Session key management
    resetSessionKeyWarning,
    
    // Flags
    isProcessing: processingRef.current,
    isTransactionSent: transactionSentRef.current,
    
    // Utility function to reset flags
    resetTransactionFlags,
    
    // Function to get stored embedded wallet address
    getStoredEmbeddedWalletAddress,
  };
};

export default useGame;
