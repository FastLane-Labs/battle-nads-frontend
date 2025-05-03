import { useState, useEffect } from 'react';
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
  
  // Get snapshot data from useBattleNads
  const { 
    rawSessionKeyData, // Use the raw data exposed by useBattleNads
    rawEndBlock,       // Use the raw endBlock exposed by useBattleNads
    isLoading: isSnapshotLoading, 
    error: snapshotError, 
    refetch: refreshSnapshot // Can use this to trigger a refresh of the source data
  } = useBattleNads(ownerAddress); // Pass owner address (now guaranteed string | null)

  // Local state for the derived validation state
  const [sessionKeyState, setSessionKeyState] = useState<SessionKeyState>(SessionKeyState.IDLE);

  // Effect to calculate and update session key state when relevant dependencies change
  useEffect(() => {
    // Determine if the necessary inputs for validation are available and valid
    const embeddedAddr = embeddedWallet?.address;
    const sessionKey = rawSessionKeyData?.key; // Use optional chaining
    const expiration = rawSessionKeyData?.expiration ? Number(rawSessionKeyData.expiration) : 0;
    const currentBlock = rawEndBlock ? Number(rawEndBlock) : 0;
    
    const isInputAvailable = 
      !!characterId && 
      !!ownerAddress && 
      !!embeddedAddr &&
      rawSessionKeyData !== undefined && // Check if data object exists (even if null)
      rawEndBlock !== undefined; // Check if endBlock exists

    const isReadyForValidation = 
      isInputAvailable && 
      !isSnapshotLoading && // Only validate after initial load of snapshot
      !snapshotError && 
      sessionKey && // Ensure key is not null/undefined
      sessionKey.toLowerCase() !== ZeroAddress.toLowerCase() && 
      currentBlock > 0; 

    let newSessionKeyState = SessionKeyState.IDLE;

    if (isReadyForValidation) {
      // All checks passed, safe to assert non-null based on isReadyForValidation checks
      newSessionKeyState = sessionKeyMachine.validate(
        sessionKey!, 
        embeddedAddr!, 
        expiration, // Already converted to number
        currentBlock
      );
      console.log("[useSessionKey Effect] Validation result state:", newSessionKeyState);
    } else {
      // Determine why validation isn't ready and set state
      if (!characterId || !ownerAddress) {
        console.log("[useSessionKey Effect] Validation skipped: Hook disabled (no charId or owner).");
        newSessionKeyState = SessionKeyState.IDLE;
      } else if (isSnapshotLoading) { 
        console.log("[useSessionKey Effect] Validation skipped: Snapshot loading...");
        newSessionKeyState = SessionKeyState.MISSING; // Indicate data is not ready during initial load
      } else if (snapshotError) {
        console.log("[useSessionKey Effect] Validation skipped: Snapshot query error...", snapshotError);
        newSessionKeyState = SessionKeyState.MISSING; // Error prevents validation
      } else if (isInputAvailable) { // Snapshot loaded without error, but data is invalid
          console.log("[useSessionKey Effect] Validation skipped: Invalid data post-load:", {
              sessionKey, expiration, currentBlock, embeddedAddr
          });
          if (!sessionKey || sessionKey.toLowerCase() === ZeroAddress.toLowerCase()) {
             console.warn("[useSessionKey Effect] - Session key missing or zero address post-load");
          }
          if (!embeddedAddr) console.warn("[useSessionKey Effect] - Embedded wallet address missing post-load");
          if (currentBlock <= 0) {
              console.warn("[useSessionKey Effect] - Current block number invalid (<=0) post-load");
          }
          newSessionKeyState = SessionKeyState.MISSING; // Data present but invalid
      } else {
          // Fallback for any other intermediate state
          console.log("[useSessionKey Effect] Validation skipped: Waiting for data (snapshot query enabled but data missing)...", { characterId, ownerAddress, embeddedAddr, rawSessionKeyData, rawEndBlock });
          newSessionKeyState = SessionKeyState.MISSING;
      }
    }

    // Update the state only if it has actually changed
    setSessionKeyState(prevState => {
        if (prevState !== newSessionKeyState) {
            console.log(`[useSessionKey Effect] State transition: ${prevState} -> ${newSessionKeyState}`);
            return newSessionKeyState;
        }
        return prevState;
    });

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

  // Determine if session key needs update (based on final state)
  const needsUpdate = 
    sessionKeyState === SessionKeyState.EXPIRED || 
    sessionKeyState === SessionKeyState.MISMATCH ||
    sessionKeyState === SessionKeyState.MISSING;

  // Return values needed by consuming components
  // isLoading/isFetching now reflect the snapshot query state
  //console.log(`[useSessionKey Return Debug] isSnapshotLoading=${isSnapshotLoading}`);

  return {
    // Return the raw data used for validation (might be needed by UI)
    sessionKeyData: rawSessionKeyData,
    isLoading: isSnapshotLoading, 
    error: snapshotError, // Pass snapshot error
    refreshSessionKey: refreshSnapshot, // Expose snapshot refetch
    sessionKeyState, // The state calculated by the useEffect
    needsUpdate,
    currentBlock: rawEndBlock ? Number(rawEndBlock) : 0 // Provide current block derived from snapshot
  };
}; 