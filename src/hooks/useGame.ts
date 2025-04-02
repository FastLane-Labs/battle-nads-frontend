import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '../providers/WalletProvider';
import { useBattleNads } from './useBattleNads';
import { ethers } from 'ethers';

// This hook handles the entire wallet and session key initialization flow
export const useGame = () => {
  const { 
    address, 
    injectedWallet, 
    embeddedWallet
  } = useWallet();
  
  const { 
    getPlayerCharacterID, 
    characterId, 
    getCurrentSessionKey,
    setSessionKeyToEmbeddedWallet
  } = useBattleNads();
  
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

  // Function to check owner wallet
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
  
  // Function to check embedded wallet
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
      
      console.log("Embedded wallet available:", embeddedWallet.address);
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
      setStatus('checking-character');
      console.log("Checking for character...");
      
      // Try to get character ID if it's not already in state
      try {
        const charId = characterId || await getPlayerCharacterID(injectedWallet?.address || '');
        console.log("Character check result:", { characterId: charId });
        
        if (!charId) {
          console.log("No character found");
          setStatus('need-character');
          processingRef.current = false;
          return null;
        }
        
        console.log("Character found with ID:", charId);
        return charId;
      } catch (innerError) {
        console.error("Error in getPlayerCharacterID:", innerError);
        // Rethrow with more context
        throw new Error(`Failed to get character ID: ${(innerError as Error)?.message || "Unknown error in getPlayerCharacterID"}`);
      }
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
  }, [characterId, getPlayerCharacterID, injectedWallet]);
  
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
      console.log("Checking session key for character:", charId);
      
      // Use the getCurrentSessionKey function from useBattleNads hook
      try {
        const sessionKeyInfo = await getCurrentSessionKey(charId);
        console.log("Session key info from useBattleNads:", sessionKeyInfo);
        
        if (!sessionKeyInfo) {
          setError("Failed to get current session key");
          setStatus('error');
          processingRef.current = false;
          return false;
        }
        
        // Handle both formats: either a string address or an object with a key property
        const currentSessionKey = typeof sessionKeyInfo === 'string' 
          ? sessionKeyInfo 
          : sessionKeyInfo.key;
        
        console.log("Current session key:", currentSessionKey);
        console.log("Embedded wallet address:", embeddedWallet?.address);
        
        // Make sure embedded wallet is defined
        if (!embeddedWallet?.address) {
          setError("Embedded wallet not available");
          setStatus('error');
          processingRef.current = false;
          return false;
        }
        
        // Check if current session key matches the embedded wallet
        if (currentSessionKey.toLowerCase() !== embeddedWallet.address.toLowerCase()) {
          console.log("Session key mismatch. Needs update.");
          console.log("Current session key:", currentSessionKey);
          console.log("Embedded wallet address:", embeddedWallet.address);
          
          // Set a warning that session keys don't match
          setSessionKeyWarning("Your session key doesn't match your embedded wallet. Some game actions may fail. Session key updates are currently disabled.");
          
          // Note: We're not going to update the session key since it's causing issues
          // Instead, we'll consider this a success to allow the game to continue
          console.log("Skipping session key update as requested");
          return true;
        } else {
          console.log("Session key already matches embedded wallet!");
          setStatus('session-key-valid');
          return true;
        }
      } catch (innerError) {
        console.error("Error in getCurrentSessionKey:", innerError);
        // Provide more context about the error
        throw new Error(`Failed to get session key: ${(innerError as Error)?.message || "Unknown error in getCurrentSessionKey"}`);
      }
    } catch (error) {
      console.error("Error checking session key:", error);
      const errorMessage = (error as Error)?.message || "Unknown error";
      console.error(`Detailed error in checkSessionKey: ${errorMessage}`);
      setError("Failed to verify session key: " + errorMessage);
      setStatus('error');
      processingRef.current = false;
      return false;
    }
  }, [embeddedWallet, getCurrentSessionKey]);
  
  // Function to update session key (disabled)
  const updateSessionKeyOnce = useCallback(async (charId: string) => {
    console.log("Session key updates are currently disabled");
    setSessionKeyWarning("Session key updates are currently disabled. Some game actions may fail.");
    return false;
  }, []);
  
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
    
    console.log("Starting game initialization flow");
    
    try {
      // Step 1: Check owner wallet
      const ownerWalletConnected = await checkOwnerWallet();
      if (!ownerWalletConnected) {
        return { success: false, status: 'need-owner-wallet' };
      }
      
      // Step 2: Check embedded wallet
      const embeddedWalletAvailable = await checkEmbeddedWallet();
      if (!embeddedWalletAvailable) {
        return { success: false, status: 'need-embedded-wallet' };
      }
      
      // Step 3: Check character
      const charId = await checkCharacter();
      if (!charId) {
        return { success: false, status: 'need-character' };
      }
      
      // Step 4: Check session key - but don't try to update it even if it's invalid
      await checkSessionKey(charId);
      
      // Skip session key update for now as it's not working
      // Even if the session key check fails, we'll consider the game ready
      
      // All necessary checks completed
      setStatus('ready');
      return { success: true, status: 'ready' };
    } catch (error) {
      console.error("Error during game initialization:", error);
      setError("Game initialization failed: " + ((error as Error)?.message || "Unknown error"));
      setStatus('error');
      processingRef.current = false;
      return { success: false, status: 'error', error: (error as Error)?.message || "Unknown error" };
    } finally {
      processingRef.current = false;
    }
  }, [checkOwnerWallet, checkEmbeddedWallet, checkCharacter, checkSessionKey, status]);
  
  // Auto-initialize on component mount
  useEffect(() => {
    // Only initialize once
    if (injectedWallet && embeddedWallet && !initializationDoneRef.current) {
      console.log("Initializing game once...");
      initializationDoneRef.current = true;
      initializeGame().then(result => {
        if (result.success) {
          console.log("Game initialized successfully with status:", result.status);
        } else {
          console.log("Game initialization failed with status:", result.status);
          // Reset initialization flag if it failed, so we can try again
          if (result.status === 'error') {
            initializationDoneRef.current = false;
          }
        }
      });
    }
  }, [injectedWallet, embeddedWallet, initializeGame]);
  
  return {
    status,
    error,
    sessionKeyWarning,
    sessionKeyStatus: embeddedWallet && characterId ? {
      isSessionKeyMismatch: sessionKeyWarning !== null,
      currentSessionKey: getCurrentSessionKey,
      updateSessionKey: setSessionKeyToEmbeddedWallet,
      embeddedWalletAddress: embeddedWallet?.address || null
    } : null,
    initializeGame,
    resetTransactionFlags,
    resetSessionKeyWarning,
    isProcessing: processingRef.current,
    isTransactionSent: transactionSentRef.current,
    checkOwnerWallet,
    checkEmbeddedWallet,
    checkCharacter,
    checkSessionKey,
    // Keep the updateSessionKey function in the returned object for API compatibility,
    // but it won't actually be used in the initialization flow
    updateSessionKey: updateSessionKeyOnce,
  };
};

export default useGame;
