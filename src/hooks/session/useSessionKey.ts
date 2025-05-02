import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useBattleNadsClient } from '../contracts/useBattleNadsClient';
import { SessionKeyState, sessionKeyMachine } from '../../machines/sessionKeyMachine';
import { useWallet } from '../../providers/WalletProvider';
import { useState, useEffect } from 'react';
import { ZeroAddress } from 'ethers';

/**
 * Hook for managing and validating session keys
 * Leverages React-Query for caching and the session key state machine for validation
 */
export const useSessionKey = (characterId: string | null) => {
  const { client } = useBattleNadsClient();
  const { embeddedWallet, injectedWallet } = useWallet();
  const [sessionKeyState, setSessionKeyState] = useState<SessionKeyState>(SessionKeyState.IDLE);
  const queryClient = useQueryClient();

  // Query for session key data
  const { 
    data: sessionKey, 
    isLoading: isLoadingSessionKey,
    isFetching: isFetchingSessionKey,
    error: sessionKeyError,
    refetch: refreshSessionKey 
  } = useQuery({
    queryKey: ['sessionKey', injectedWallet?.address, characterId],
    queryFn: async () => {
      const owner = injectedWallet?.address;
      if (!client || !owner || !characterId) {
        throw new Error('Client, owner address, or character ID missing for session key fetch');
      }
      
      console.log(`[useSessionKey] Fetching session key data for owner: ${owner}`);
      
      try {
        const data = await client.getCurrentSessionKeyData(owner);
        console.log(`[useSessionKey] Received session key data:`, JSON.stringify(data, (key, value) => 
          typeof value === 'bigint' ? value.toString() : value
        ));
        
        return data === undefined ? null : data; 
      } catch (error) {
        console.error("[useSessionKey] Error fetching session key data:", error);
        throw error;
      }
    },
    enabled: !!characterId && !!client && !!injectedWallet?.address,
    // Keep optimistic caching settings
    staleTime: 5 * 60 * 1000, 
    refetchInterval: 5 * 60 * 1000, 
  });

  // Query for current block number (for expiration checks)
  const { 
    data: currentBlock,
    isLoading: isLoadingBlock,
    isFetching: isFetchingBlock, // Use isFetching to track background updates
    error: blockError
  } = useQuery({
    queryKey: ['currentBlock'],
    queryFn: async () => {
      if (!client) {
        // Should not happen if enabled is correct, but good practice
        console.error("[useSessionKey] Client missing for block number fetch despite query being enabled.");
        throw new Error('Client missing for block number fetch'); 
      }
      // Wallet address check is now implicitly handled by the 'enabled' condition below
      console.log("[useSessionKey] Fetching current block number...");
      
      try {
        const block = await client.getLatestBlockNumber();
        const blockNumber = Number(block);
        // Ensure we don't return NaN or a non-positive number
        if (isNaN(blockNumber) || blockNumber <= 0) {
            console.warn(`[useSessionKey] Invalid block number received: ${blockNumber}, returning 0`);
            return 0; // Return 0 if block number is invalid
        }
        console.log(`[useSessionKey] Current block number: ${blockNumber}`);
        return blockNumber;
      } catch (err) {
        console.error("[useSessionKey] Error fetching block number:", err);
        return 0;
      }
    },
    // Enable only when the client AND at least one wallet (owner or session) is available
    enabled: !!client && !!(injectedWallet?.address || embeddedWallet?.address),
    staleTime: 12_000, // ~1 block time
    refetchInterval: 12_000,
  });

  // Effect to calculate and update session key state when relevant dependencies change
  useEffect(() => {
    const isQueryEnabled = !!characterId && !!client && !!injectedWallet?.address;
    // Use initial loading flags for core readiness check
    const areQueriesInitiallyLoading = isLoadingSessionKey || isLoadingBlock;
    
    const hasQueryError = !!sessionKeyError || !!blockError;

    const validationInput = {
      sessionKeyAddress: sessionKey?.key,
      ownerAddress: injectedWallet?.address,
      embeddedAddress: embeddedWallet?.address,
      expiration: sessionKey?.expiration ? Number(sessionKey.expiration) : 0,
      currentBlock: currentBlock || 0
    };

    // Check if all data required for validation is ready and valid
    const isReadyForValidation = 
      isQueryEnabled &&
      sessionKey !== undefined && // Data is fetched (even if potentially stale during refetch)
      sessionKey?.key && 
      sessionKey.key.toLowerCase() !== ZeroAddress.toLowerCase() && 
      currentBlock !== undefined && 
      currentBlock > 0 && 
      embeddedWallet?.address && 
      !areQueriesInitiallyLoading && // Ensure initial load is complete
      !hasQueryError; 

    let newSessionKeyState = SessionKeyState.IDLE;

    if (isReadyForValidation) {
      // All checks passed, safe to assert non-null
      newSessionKeyState = sessionKeyMachine.validate(
        sessionKey.key!, // Asserting non-null based on isReadyForValidation
        embeddedWallet.address!, // Asserting non-null based on isReadyForValidation
        Number(sessionKey.expiration!), // Asserting non-null based on isReadyForValidation
        currentBlock! // Asserting non-null and >0 based on isReadyForValidation
      );
      console.log("[useSessionKey Effect] Validation result state:", newSessionKeyState);
    } else {
      // Determine why validation isn't ready and set state
      if (!isQueryEnabled) {
        console.log("[useSessionKey Effect] Validation skipped: Query disabled.");
        newSessionKeyState = SessionKeyState.IDLE;
      } else if (areQueriesInitiallyLoading) { // Check INITIAL loading state here
        // Log loading state only during initial load (isLoading)
        console.log("[useSessionKey Effect] Validation skipped: Initial queries loading...");
        newSessionKeyState = SessionKeyState.MISSING; // Indicate data is not ready during initial load
      } else if (hasQueryError) {
        console.log("[useSessionKey Effect] Validation skipped: Query error...", {
            sessionKeyError: sessionKeyError?.message,
            blockError: blockError?.message
        });
        newSessionKeyState = SessionKeyState.MISSING; // Error prevents validation
      } else if (sessionKey !== undefined && currentBlock !== undefined) {
          // Queries finished loading without error, but data is still invalid
          console.log("[useSessionKey Effect] Validation skipped: Invalid data post-load:", validationInput);
          // Check for specific invalid data conditions
          if (!sessionKey?.key || sessionKey.key.toLowerCase() === ZeroAddress.toLowerCase()) {
             console.warn("[useSessionKey Effect] - Session key missing or zero address post-load");
          }
          if (!embeddedWallet?.address) console.warn("[useSessionKey Effect] - Embedded wallet address missing post-load");
          // Only log block error if it finished loading and is <= 0
          if (!isLoadingBlock && !blockError && currentBlock <= 0) {
              console.warn("[useSessionKey Effect] - Current block number invalid (<=0) post-load");
          }
          newSessionKeyState = SessionKeyState.MISSING; // Data present but invalid
      } else {
          // Fallback for any other intermediate state before both queries resolve
          console.log("[useSessionKey Effect] Validation skipped: Waiting for data...");
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
    client,
    injectedWallet?.address,
    embeddedWallet?.address,
    // Use stable primitives/strings from sessionKey where possible
    sessionKey?.key,
    sessionKey?.expiration,
    // sessionKey, // Avoid depending on the whole object reference if possible 
    currentBlock, 
    isLoadingSessionKey, // Still need loading flags
    isLoadingBlock,
    sessionKeyError,
    blockError
  ]);

  // Determine if session key needs update (based on final state)
  const needsUpdate = 
    sessionKeyState === SessionKeyState.EXPIRED || 
    sessionKeyState === SessionKeyState.MISMATCH ||
    sessionKeyState === SessionKeyState.MISSING;

  // Return values needed by consuming components
  const finalIsLoading = isLoadingSessionKey || isLoadingBlock;
  console.log(`[useSessionKey Return Debug] isLoadingSessionKey=${isLoadingSessionKey}, isLoadingBlock=${isLoadingBlock}, finalIsLoading=${finalIsLoading}`);

  return {
    sessionKey,
    // Use isLoading for initial load indication, isFetching for background updates
    isLoading: finalIsLoading, 
    isFetching: isFetchingSessionKey || isFetchingBlock, 
    error: sessionKeyError 
      ? (sessionKeyError as Error).message 
      : blockError 
        ? (blockError as Error).message 
        : null,
    refreshSessionKey,
    sessionKeyState, // The state calculated by the useEffect
    needsUpdate,
    currentBlock: currentBlock || 0
  };
}; 