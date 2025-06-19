import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SessionKeyState, sessionKeyMachine } from '../../machines/sessionKeyMachine';
import { useWallet } from '../../providers/WalletProvider';
import { useBattleNads } from '../game/useBattleNads';
import { ZeroAddress } from 'ethers';
import { contract } from '../../types';

/**
 * Hook for managing and validating session keys
 * Derives session key data and block number from useBattleNads (which uses useUiSnapshot)
 * Leverages the session key state machine for validation
 */
export const useSessionKey = (characterId: string | null) => {
  // Get wallets
  const { embeddedWallet, injectedWallet } = useWallet();
  const ownerAddress = injectedWallet?.address ?? null; // Ensure ownerAddress is string | null
  const queryClient = useQueryClient();

  console.log('[useSessionKey] Hook setup:', {
    characterId,
    ownerAddress,
    embeddedWalletAddress: embeddedWallet?.address,
    injectedWalletAddress: injectedWallet?.address
  });
  
  // Get snapshot data from useBattleNads
  const { 
    rawSessionKeyData, // Use the raw data exposed by useBattleNads
    rawEndBlock,       // Use the raw endBlock exposed by useBattleNads
    isLoading: isSnapshotLoading, 
    error: snapshotError, 
  } = useBattleNads(ownerAddress); // Pass owner address (now guaranteed string | null)

  // Local state for the derived validation state
  const [sessionKeyState, setSessionKeyState] = useState<SessionKeyState>(SessionKeyState.IDLE);

  // Effect to calculate and update session key state when relevant dependencies change
  useEffect(() => {
    let isMounted = true; // Add mount check for safety with async nature

    // Determine if the necessary inputs for validation are available and valid
    const embeddedAddr = embeddedWallet?.address;
    const sessionKey = rawSessionKeyData?.key;
    // Ensure expiration and currentBlock are derived safely
    const expiration = Number(rawSessionKeyData?.expiration || '0');
    const currentBlock = Number(rawEndBlock || '0'); 
    
    const isInputAvailable = 
      !!characterId && 
      !!ownerAddress && 
      !!embeddedAddr &&
      rawSessionKeyData !== undefined && 
      rawEndBlock !== undefined;

    console.log('[useSessionKey] Validation inputs:', {
      characterId,
      ownerAddress,
      embeddedAddr,
      sessionKey,
      expiration,
      currentBlock,
      isInputAvailable,
      isSnapshotLoading,
      rawSessionKeyData
    });

    // --- Primary Logic: Only calculate final state AFTER loading is complete --- 
    if (!isSnapshotLoading) {
      // Snapshot has finished loading (or wasn't loading)
      let newSessionKeyState = SessionKeyState.IDLE; // Default if validation can't run

      if (snapshotError) {
        newSessionKeyState = SessionKeyState.MISSING; // Error prevents validation
      } else if (isInputAvailable) {
          // We have the inputs, now check if they are valid for validation machine
          const isReadyForValidationMachine = 
             sessionKey && 
             sessionKey.toLowerCase() !== ZeroAddress.toLowerCase() &&
             currentBlock > 0;

          if (isReadyForValidationMachine) {
             // All checks passed, safe to assert non-null
             console.log('[useSessionKey] Running validation machine with:', {
               sessionKey,
               embeddedAddr,
               expiration,
               currentBlock
             });
             
             newSessionKeyState = sessionKeyMachine.validate(
                 sessionKey!, 
                 embeddedAddr!, 
                 expiration, 
                 currentBlock
             );
             
             console.log('[useSessionKey] Validation result:', {
               newSessionKeyState,
               sessionKeyMatches: sessionKey?.toLowerCase() === embeddedAddr?.toLowerCase(),
               isExpired: expiration < currentBlock
             });
          } else {
             // Data is available post-load, but invalid for validation (e.g., zero key)
             console.warn("[useSessionKey Effect] Validation skipped post-load: Invalid data:", {
                 sessionKey, expiration, currentBlock, embeddedAddr
             });
             newSessionKeyState = SessionKeyState.MISSING; 
          }
      } else {
          // Snapshot loaded fine, but core inputs (charId, owner, embedAddr, rawData) missing
          newSessionKeyState = SessionKeyState.IDLE; // Or MISSING depending on desired state
      }
      
      // Update the state only if it has actually changed
      if (isMounted) { // Check mount status before setting state
          setSessionKeyState(prevState => {
              if (prevState !== newSessionKeyState) {
                  return newSessionKeyState;
              }
              return prevState;
          });
      }

    } else {
      // --- Snapshot IS Loading --- 
      // Do not change the session key state while the underlying data is refreshing.
      // Keep the previous state.
    }
    // --- End Primary Logic --- 

    // Cleanup function
    return () => {
        isMounted = false;
    };

  }, [
    // Dependencies that should trigger re-validation
    characterId,
    ownerAddress,
    embeddedWallet?.address,
    rawSessionKeyData, // Depend on the raw data object from snapshot
    rawEndBlock,       // Depend on the raw end block from snapshot
    isSnapshotLoading, // Depend on snapshot loading state
    snapshotError      // Depend on snapshot error state
  ]);

  // Effect to handle wallet address changes and invalidate cache
  useEffect(() => {
    // When embedded wallet address changes, invalidate the query to force refresh
    if (ownerAddress && embeddedWallet?.address) {
      queryClient.invalidateQueries({ 
        queryKey: ['uiSnapshot', ownerAddress, embeddedWallet.address] 
      });
    }
  }, [embeddedWallet?.address, ownerAddress, queryClient]);

  // Determine if session key needs update (based on final state)
  const needsUpdate = 
    sessionKeyState === SessionKeyState.EXPIRED || 
    sessionKeyState === SessionKeyState.MISMATCH ||
    sessionKeyState === SessionKeyState.MISSING;

  // Return values needed by consuming components
  // isLoading/isFetching now reflect the snapshot query state
  //console.log(`[useSessionKey Return Debug] isSnapshotLoading=${isSnapshotLoading}`);

  // Define refresh function using queryClient
  const refreshSessionKey = () => {
    if (ownerAddress) {
      queryClient.invalidateQueries({ queryKey: ['uiSnapshot', ownerAddress, embeddedWallet?.address] });
    }
  };

  return {
    // Return the raw data used for validation (might be needed by UI)
    sessionKeyData: rawSessionKeyData,
    isLoading: isSnapshotLoading, 
    error: snapshotError, // Pass snapshot error
    refreshSessionKey, // Expose the new refresh function
    sessionKeyState, // The state calculated by the useEffect
    needsUpdate,
    currentBlock: rawEndBlock ? Number(rawEndBlock) : 0 // Provide current block derived from snapshot
  };
}; 