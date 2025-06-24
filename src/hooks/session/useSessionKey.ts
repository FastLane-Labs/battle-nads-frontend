import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateSessionKeyQueries } from '../utils';
import { SessionKeyState } from '@/types/domain/session';
import { validateSessionKey } from '../../utils/sessionKeyValidation';
import { useWallet } from '../../providers/WalletProvider';
import { useContractPolling } from '../game/useContractPolling';
import { ZeroAddress } from 'ethers';

/**
 * Hook for managing and validating session keys
 * Derives session key data and block number from useBattleNads (which uses useContractPolling)
 * Uses consolidated session key validation utility
 */
export const useSessionKey = (characterId: string | null) => {
  // Get wallets
  const { embeddedWallet, injectedWallet } = useWallet();
  const ownerAddress = injectedWallet?.address ?? null; // Ensure ownerAddress is string | null
  const queryClient = useQueryClient();

  // Only log when addresses change to reduce spam
  const prevOwnerRef = useRef<string | null>(null);
  const prevEmbeddedRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (prevOwnerRef.current !== ownerAddress || prevEmbeddedRef.current !== (embeddedWallet?.address ?? null)) {
      if (prevOwnerRef.current !== null || prevEmbeddedRef.current !== null) { // Skip initial load
        console.log('[useSessionKey] Wallet addresses changed:', {
          previousOwner: prevOwnerRef.current,
          newOwner: ownerAddress,
          previousEmbedded: prevEmbeddedRef.current,
          newEmbedded: embeddedWallet?.address
        });
      }
      prevOwnerRef.current = ownerAddress;
      prevEmbeddedRef.current = embeddedWallet?.address ?? null;
    }
  }, [ownerAddress, embeddedWallet?.address]);
  
  // Get snapshot data directly from useContractPolling to avoid circular dependency
  const { 
    data: snapshotData,
    isLoading: isSnapshotLoading, 
    error: snapshotError, 
  } = useContractPolling(ownerAddress); // Pass owner address (now guaranteed string | null)

  // Extract session key data from snapshot
  const rawSessionKeyData = snapshotData?.sessionKeyData;
  const rawEndBlock = snapshotData?.endBlock;

  // Local state for the derived validation state
  const [sessionKeyState, setSessionKeyState] = useState<SessionKeyState>(SessionKeyState.IDLE);
  const lastLoggedStateRef = useRef<string | null>(null);

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

    // Only log validation inputs if there's a problem or first time (debug only)
    if (process.env.NODE_ENV === 'development' && (!isInputAvailable || !sessionKey || sessionKey.toLowerCase() === ZeroAddress.toLowerCase())) {
      console.log('[useSessionKey] Validation issue detected:', {
        characterId,
        ownerAddress,
        embeddedAddr,
        sessionKey,
        expiration,
        currentBlock,
        isInputAvailable,
        isSnapshotLoading
      });
    }

    // --- Primary Logic: Only calculate final state AFTER loading is complete --- 
    if (!isSnapshotLoading) {
      // Snapshot has finished loading (or wasn't loading)
      let newSessionKeyState = SessionKeyState.IDLE; // Default if validation can't run

      if (snapshotError) {
        newSessionKeyState = SessionKeyState.MISSING; // Error prevents validation
      } else if (isInputAvailable) {
          // We have the inputs, now check if they are valid for validation
          const isReadyForValidation = 
             sessionKey && 
             sessionKey.toLowerCase() !== ZeroAddress.toLowerCase() &&
             currentBlock > 0;

          if (isReadyForValidation) {
             // All checks passed, safe to assert non-null
             // Convert raw session key data to domain format for validation
             const sessionKeyData = rawSessionKeyData ? {
               owner: ownerAddress!,
               key: sessionKey!,
               balance: String(rawSessionKeyData.balance || '0'),
               targetBalance: String(rawSessionKeyData.targetBalance || '0'), 
               ownerCommittedAmount: String(rawSessionKeyData.ownerCommittedAmount || '0'),
               ownerCommittedShares: String(rawSessionKeyData.ownerCommittedShares || '0'),
               expiration: String(rawSessionKeyData.expiration || '0')
             } : undefined;
             
             const validation = validateSessionKey(
                 sessionKeyData,
                 ownerAddress!,
                 embeddedAddr!,
                 currentBlock
             );
             
             newSessionKeyState = validation.state;
             
             // Only log if validation fails or shows problems, and state has changed (debug only)
             if (process.env.NODE_ENV === 'development' && newSessionKeyState !== SessionKeyState.VALID) {
               const stateKey = `${newSessionKeyState}-${sessionKey}-${embeddedAddr}`;
               if (lastLoggedStateRef.current !== stateKey) {
                 console.log('[useSessionKey] Session key validation failed:', {
                   newSessionKeyState,
                   sessionKey,
                   embeddedAddr,
                   sessionKeyMatches: sessionKey?.toLowerCase() === embeddedAddr?.toLowerCase(),
                   isExpired: expiration < currentBlock,
                   expiration,
                   currentBlock,
                   blocksUntilExpiry: expiration - currentBlock
                 });
                 lastLoggedStateRef.current = stateKey;
               }
             } else {
               // Reset logged state when validation becomes valid
               lastLoggedStateRef.current = null;
             }
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
                  // Handle session key state changes that require cache invalidation
                  if ((newSessionKeyState === SessionKeyState.EXPIRED || 
                       newSessionKeyState === SessionKeyState.MISMATCHED) && 
                      prevState !== newSessionKeyState) {
                    // Use centralized utility for session key invalidation
                    invalidateSessionKeyQueries(queryClient);
                  }
                  
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
        queryKey: ['contractPolling', ownerAddress, embeddedWallet.address] 
      });
    }
  }, [embeddedWallet?.address, ownerAddress, queryClient]);

  // Determine if session key needs update (based on final state)
  const needsUpdate = 
    sessionKeyState === SessionKeyState.EXPIRED || 
    sessionKeyState === SessionKeyState.MISMATCHED ||
    sessionKeyState === SessionKeyState.MISSING;

  // Return values needed by consuming components
  // isLoading/isFetching now reflect the snapshot query state
  //console.log(`[useSessionKey Return Debug] isSnapshotLoading=${isSnapshotLoading}`);

  // Define refresh function using queryClient
  const refreshSessionKey = () => {
    if (ownerAddress) {
      queryClient.invalidateQueries({ queryKey: ['contractPolling', ownerAddress, embeddedWallet?.address] });
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