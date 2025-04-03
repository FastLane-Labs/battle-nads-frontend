import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '../providers/WalletProvider';
import { useBattleNads } from './useBattleNads';
import { useSetRecoilState, useRecoilValue } from 'recoil';
import { gameStateAtom } from '../state/gameState';
import { parseFrontendData, createGameState } from '../utils/gameDataConverters';

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
    getCurrentSessionKey,
    setSessionKeyToEmbeddedWallet,
    getFrontendData,
    moveCharacter: contractMoveCharacter,
    attackTarget: contractAttackTarget,
  } = useBattleNads();
  
  // Use Recoil for global state management - MUST be at the top level
  const setGameState = useSetRecoilState(gameStateAtom);
  const gameState = useRecoilValue(gameStateAtom);
  
  // Local state for initialization and session key validation
  const [status, setStatus] = useState<string>('checking');
  const [error, setError] = useState<string | null>(null);
  const [sessionKeyWarning, setSessionKeyWarning] = useState<string | null>(null);
  
  // Use refs to track transaction state across renders
  const processingRef = useRef(false);
  const transactionSentRef = useRef(false);
  // Add initialization tracker ref
  const initializationDoneRef = useRef(false);
  
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
        walletType: embeddedWallet?.walletClientType
      });
      
      if (!embeddedWallet?.address) {
        console.log("Embedded wallet not available");
        setStatus('need-embedded-wallet');
        processingRef.current = false;
        return false;
      }
      
      // Also check if the embedded wallet has a signer - crucial for operations
      if (!embeddedWallet.signer) {
        console.error("Embedded wallet has no signer");
        console.error("Embedded wallet details:", {
          address: embeddedWallet.address,
          type: embeddedWallet.walletClientType,
          hasProvider: !!embeddedWallet.provider
        });
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
  
  // Function to check character existence
  const checkCharacter = useCallback(async () => {
    try {
      setStatus('checking-character');
      console.log("Checking for character...");
      
      // Try to get character ID if it's not already in state
      const ownerAddress = injectedWallet?.address || address;
      const charId = battleNadsCharacterId || await getPlayerCharacterID(ownerAddress || '');
      console.log("Character check result:", { characterId: charId });
      
      if (!charId) {
        console.log("No character found");
        setStatus('need-character');
        processingRef.current = false;
        return null;
      }
      
      console.log("Character found with ID:", charId);
      return charId;
    } catch (error) {
      console.error("Error checking character:", error);
      // Set more detailed error message for debugging
      const errorMessage = (error as Error)?.message || "Unknown error";
      console.error(`Detailed error in checkCharacter: ${errorMessage}`);
      setError(`Failed to check character: ${errorMessage}`);
      setStatus('error');
      processingRef.current = false;
      return null;
    }
  }, [battleNadsCharacterId, getPlayerCharacterID, injectedWallet, address]);
  
  // Function to check session key
  const checkSessionKey = useCallback(async (charId: string) => {
    try {
      // Clear previous warnings
      setSessionKeyWarning(null);
      
      // Skip if a transaction has already been sent
      if (transactionSentRef.current) {
        console.log("Transaction already sent, skipping session key check");
        return false;
      }
      
      setStatus('checking-session-key');
      console.log("=== SESSION KEY CHECK STARTED ===");
      console.log("Checking session key for character:", charId);
      console.log("Embedded wallet address:", embeddedWallet?.address);
      
      // Use the getCurrentSessionKey function from useBattleNads hook
      const currentSessionKey = await getCurrentSessionKey(charId);
      console.log("Current session key:", currentSessionKey);
      
      // Handle case when getCurrentSessionKey returns null
      if (currentSessionKey === null) {
        console.error("Failed to retrieve current session key");
        setSessionKeyWarning("Unable to verify session key. Some game actions may fail.");
        return true; // Continue with game initialization despite warning
      }
      
      console.log("Embedded wallet address:", embeddedWallet?.address);
      
      // Make sure embedded wallet is defined
      if (!embeddedWallet?.address) {
        console.error("Embedded wallet address is null or undefined");
        setError("Embedded wallet not available");
        setStatus('error');
        processingRef.current = false;
        return false;
      }
      
      // Check if current session key matches the embedded wallet
      const sessionKeyMatches = currentSessionKey.toLowerCase() === embeddedWallet.address.toLowerCase();
      console.log("Session key matches embedded wallet:", sessionKeyMatches);
      
      if (!sessionKeyMatches) {
        console.log("Session key mismatch. Needs update.");
        console.log("Current session key:", currentSessionKey);
        console.log("Embedded wallet address:", embeddedWallet.address);
        
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
  }, [embeddedWallet, getCurrentSessionKey]);
  
  // Function to reset session key warning
  const resetSessionKeyWarning = useCallback(() => {
    console.log("Resetting session key warning state");
    setSessionKeyWarning(null);
  }, []);
  
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
      // Step 1: Check owner wallet
      const ownerWalletConnected = await checkOwnerWallet();
      if (!ownerWalletConnected) {
        setGameState(prev => ({ ...prev, loading: false }));
        return { success: false, status: 'need-owner-wallet' };
      }
      
      // Step 2: Check embedded wallet
      const embeddedWalletAvailable = await checkEmbeddedWallet();
      if (!embeddedWalletAvailable) {
        setGameState(prev => ({ ...prev, loading: false }));
        return { success: false, status: 'need-embedded-wallet' };
      }
      
      // Step 3: Check character
      const charId = await checkCharacter();
      if (!charId) {
        setGameState(prev => ({ ...prev, loading: false }));
        return { success: false, status: 'need-character' };
      }
      
      // Step 4: Check session key - but don't try to update it even if it's invalid
      await checkSessionKey(charId);
      
      // Step 5: Load game data
      await loadGameState(charId);
      
      // All necessary checks completed
      setStatus('ready');
      setGameState(prev => ({ ...prev, loading: false }));
      return { success: true, status: 'ready' };
    } catch (error) {
      console.error("Error during game initialization:", error);
      setError("Game initialization failed: " + ((error as Error)?.message || "Unknown error"));
      setStatus('error');
      processingRef.current = false;
      setGameState(prev => ({ ...prev, loading: false, error: (error as Error)?.message || "Unknown error" }));
      return { success: false, status: 'error', error: (error as Error)?.message || "Unknown error" };
    } finally {
      processingRef.current = false;
    }
  }, [checkOwnerWallet, checkEmbeddedWallet, checkCharacter, checkSessionKey, setGameState, status]);
  
  // Load game state from blockchain
  const loadGameState = useCallback(async (characterId: string) => {
    try {
      // Set loading state
      setGameState(prev => ({ ...prev, loading: true, error: null }));
      
      console.log(`[loadGameState] Loading game state for character ${characterId}`);
      
      // Get data from contract
      const frontendDataRaw = await getFrontendData(characterId);
      
      if (!frontendDataRaw) {
        console.error(`[loadGameState] No data returned from getFrontendData`);
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
  }, [getFrontendData, setGameState]);
  
  // Move character with state management
  const movePlayer = useCallback(async (characterId: string, direction: string) => {
    try {
      // Set moving state
      setGameState(prev => ({ ...prev, isMoving: true, error: null }));
      
      console.log(`[movePlayer] Moving character ${characterId} ${direction}`);
      
      // Call contract function
      await contractMoveCharacter(characterId, direction);
      
      // Reload state after movement
      await loadGameState(characterId);
      
      // Reset moving state
      setGameState(prev => ({ ...prev, isMoving: false }));
      return true;
    } catch (error) {
      console.error(`[movePlayer] Error:`, error);
      const errorMessage = (error as Error)?.message || "Unknown error";
      setGameState(prev => ({ ...prev, isMoving: false, error: errorMessage }));
      return false;
    }
  }, [contractMoveCharacter, loadGameState, setGameState]);
  
  // Attack target with state management
  const attackEnemy = useCallback(async (characterId: string, targetIndex: number) => {
    try {
      // Set attacking state
      setGameState(prev => ({ ...prev, isAttacking: true, error: null }));
      
      console.log(`[attackEnemy] Attacking target ${targetIndex} with character ${characterId}`);
      
      // Call contract function
      await contractAttackTarget(characterId, targetIndex);
      
      // Reload state after attack
      await loadGameState(characterId);
      
      // Reset attacking state
      setGameState(prev => ({ ...prev, isAttacking: false }));
      return true;
    } catch (error) {
      console.error(`[attackEnemy] Error:`, error);
      const errorMessage = (error as Error)?.message || "Unknown error";
      setGameState(prev => ({ ...prev, isAttacking: false, error: errorMessage }));
      return false;
    }
  }, [contractAttackTarget, loadGameState, setGameState]);
  
  // Update session key with state management
  const updateSessionKey = useCallback(async (characterId: string) => {
    try {
      // Set loading state
      setGameState(prev => ({ ...prev, loading: true, error: null }));
      
      console.log(`[updateSessionKey] Updating session key for character ${characterId}`);
      
      if (!embeddedWallet?.address) {
        throw new Error("No embedded wallet available to use as session key");
      }
      
      // Call contract function to set session key to embedded wallet
      const result = await setSessionKeyToEmbeddedWallet(characterId);
      
      if (result && result.success) {
        // Reset session key warning
        resetSessionKeyWarning();
        
        // Verify the update
        const updatedKey = await getCurrentSessionKey(characterId);
        
        // Check if updatedKey is null before using toLowerCase()
        const keyMatches = updatedKey ? 
          updatedKey.toLowerCase() === embeddedWallet.address.toLowerCase() : 
          false;
        
        // Reset loading state
        setGameState(prev => ({ ...prev, loading: false }));
        
        if (!keyMatches) {
          console.warn(`[updateSessionKey] Session key still doesn't match after update`);
          
          // Add more detailed logging for debugging
          if (updatedKey === null) {
            console.warn(`[updateSessionKey] Failed to retrieve session key after update (null)`);
          } else {
            console.warn(`[updateSessionKey] Actual: ${updatedKey}, Expected: ${embeddedWallet.address}`);
          }
          
          setSessionKeyWarning("Session key update may have failed. Some game actions may not work.");
          return { success: false, error: "Session key update verification failed" };
        }
        
        return { success: true };
      }
      
      throw new Error(result?.error || "Failed to update session key");
    } catch (error) {
      console.error(`[updateSessionKey] Error:`, error);
      const errorMessage = (error as Error)?.message || "Unknown error";
      setGameState(prev => ({ ...prev, loading: false, error: errorMessage }));
      return { success: false, error: errorMessage };
    }
  }, [embeddedWallet, setSessionKeyToEmbeddedWallet, getCurrentSessionKey, resetSessionKeyWarning, setGameState]);
  
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
  
  return {
    // Game status
    status,
    error,
    sessionKeyWarning,
    sessionKeyStatus: embeddedWallet && battleNadsCharacterId ? {
      isSessionKeyMismatch: sessionKeyWarning !== null,
      currentSessionKey: getCurrentSessionKey,
      updateSessionKey: setSessionKeyToEmbeddedWallet,
      embeddedWalletAddress: embeddedWallet?.address || null
    } : null,
    
    // Game initialization
    initializeGame,
    loadGameState,
    
    // Game actions
    movePlayer,
    attackEnemy,
    updateSessionKey,
    
    // Status functions
    checkOwnerWallet,
    checkEmbeddedWallet,
    
    // Session key management
    resetSessionKeyWarning,
    
    // Flags
    isProcessing: processingRef.current,
    isTransactionSent: transactionSentRef.current,
    
    // Utility function to reset flags
    resetTransactionFlags,
  };
};

export default useGame;
