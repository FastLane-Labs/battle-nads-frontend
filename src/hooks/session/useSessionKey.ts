import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateSessionKeyQueries } from '../utils';
import { SessionKeyState } from '@/types/domain/session';
import { validateSessionKey } from '../../utils/sessionKeyValidation';
import { useWallet } from '../../providers/WalletProvider';
import { useContractPolling } from '../game/useContractPolling';
import { ZeroAddress } from 'ethers';
import { hooks } from '@/types';

/**
 * Hook for managing and validating session keys
 * Derives session key data and block number from useBattleNads (which uses useContractPolling)
 * Uses consolidated session key validation utility
 */
export const useSessionKey = (characterId: string | null): hooks.UseSessionKeyReturn => {
  // Get wallets
  const { embeddedWallet, injectedWallet } = useWallet();
  const ownerAddress = injectedWallet?.address ?? null; // Ensure ownerAddress is string | null
  const queryClient = useQueryClient();

  
  // Get snapshot data directly from useContractPolling to avoid circular dependency
  // Poll data with just owner address, but validate session key only when embedded wallet is available
  const { 
    data: snapshotData,
    isLoading: isSnapshotLoading, 
    error: snapshotError, 
  } = useContractPolling(ownerAddress); // Poll with owner address

  // Extract session key data from snapshot
  const rawSessionKeyData = snapshotData?.sessionKeyData;
  const rawEndBlock = snapshotData?.endBlock;

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
          } else {
             // Data is available post-load, but invalid for validation (e.g., zero key)
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
        queryKey: ['contractPolling', ownerAddress] 
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

  // Define refresh function using queryClient
  const refreshSessionKey = () => {
    if (ownerAddress) {
      queryClient.invalidateQueries({ queryKey: ['contractPolling', ownerAddress] });
    }
  };
  
  // Early return if we don't have the owner address
  if (!ownerAddress) {
    return {
      sessionKeyData: null,
      isLoading: false,
      error: null,
      refreshSessionKey: () => {},
      sessionKeyState: SessionKeyState.IDLE,
      needsUpdate: false,
      currentBlock: 0,
    };
  }

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