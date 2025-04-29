import { useQuery } from '@tanstack/react-query';
import { useBattleNadsClient } from '../contracts/useBattleNadsClient';
import { SessionKeyState, sessionKeyMachine } from '../../machines/sessionKeyMachine';
import { useWallet } from '../../providers/WalletProvider';

/**
 * Hook for managing and validating session keys
 * Leverages React-Query for caching and the session key state machine for validation
 */
export const useSessionKey = (characterId: string | null) => {
  const { client } = useBattleNadsClient();
  const { embeddedWallet, injectedWallet } = useWallet();

  // Query for session key data
  const { 
    data: sessionKey, 
    isLoading: isLoadingSessionKey,
    isFetching: isFetchingSessionKey, // Use isFetching to track background updates
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
      const data = await client.getCurrentSessionKeyData(owner);
      console.log(`[useSessionKey] Received session key data:`, JSON.stringify(data, (key, value) => 
        typeof value === 'bigint' ? value.toString() : value
      ));
      // Ensure we return null if data is undefined, otherwise React Query might keep old data during errors
      return data === undefined ? null : data; 
    },
    enabled: !!characterId && !!client && !!injectedWallet?.address,
    // --- Optimizations --- 
    // Keep session key data fresh for a longer period (e.g., 5 minutes)
    // It primarily changes on expiration (checked against currentBlock) or manual updates.
    staleTime: 5 * 60 * 1000, // 5 minutes 
    // Refetch less frequently in the background as a safety check 
    refetchInterval: 5 * 60 * 1000, // 5 minutes 
    // Keep default refetchOnWindowFocus (true) - if window is refocused after staleTime, it will refetch.
    // Keep default refetchOnMount (true) - if mounted after staleTime, it will refetch.
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

  // Determine state based on query readiness and data validity
  let sessionKeyState = SessionKeyState.IDLE;
  const isQueryEnabled = !!characterId && !!client && !!injectedWallet?.address;
  const areQueriesLoading = isLoadingSessionKey || isLoadingBlock;
  const areQueriesFetching = isFetchingSessionKey || isFetchingBlock;
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
    sessionKey !== undefined && // Data is fetched
    sessionKey?.key && // Key is present and not zero address (implicitly checked by machine)
    currentBlock !== undefined && // Data is fetched
    currentBlock > 0 && // Block number is valid
    embeddedWallet?.address && // Wallet is present
    !areQueriesLoading && // Initial load finished
    !hasQueryError; // No errors

  if (isReadyForValidation) {
    console.log("[useSessionKey] Validating session key:", validationInput);
    // All checks passed, safe to assert non-null
    sessionKeyState = sessionKeyMachine.validate(
      sessionKey.key!, // Asserting non-null based on isReadyForValidation
      embeddedWallet.address!, // Asserting non-null based on isReadyForValidation
      Number(sessionKey.expiration!), // Asserting non-null based on isReadyForValidation
      currentBlock! // Asserting non-null and >0 based on isReadyForValidation
    );
    console.log("[useSessionKey] Validation result state:", sessionKeyState);
  } else {
    // Determine why validation isn't ready and set state
    if (!isQueryEnabled) {
      console.log("[useSessionKey] Validation skipped: Query disabled.");
      sessionKeyState = SessionKeyState.IDLE;
    } else if (areQueriesLoading) {
      // Log loading state only during initial load (isLoading)
      console.log("[useSessionKey] Validation skipped: Queries loading...", {
          isLoadingSessionKey,
          isLoadingBlock
      });
      sessionKeyState = SessionKeyState.MISSING; // Indicate data is not ready
    } else if (hasQueryError) {
      console.log("[useSessionKey] Validation skipped: Query error...", {
          sessionKeyError: sessionKeyError?.message,
          blockError: blockError?.message
      });
      sessionKeyState = SessionKeyState.MISSING; // Error prevents validation
    } else if (sessionKey !== undefined && currentBlock !== undefined) {
        // Queries finished loading without error, but data is still invalid
        console.log("[useSessionKey] Validation skipped: Invalid data post-load:", validationInput);
        if (!sessionKey?.key) console.warn("[useSessionKey] - Session key missing or invalid post-load");
        if (!embeddedWallet?.address) console.warn("[useSessionKey] - Embedded wallet address missing post-load");
        // Only log block error if it finished loading and is <= 0
        if (!isLoadingBlock && !blockError && currentBlock <= 0) {
            console.warn("[useSessionKey] - Current block number invalid (<=0) post-load");
        }
        sessionKeyState = SessionKeyState.MISSING; // Data present but invalid
    } else if (!areQueriesFetching) {
        // Fallback for any other intermediate state, but only log if not fetching in background
        console.log("[useSessionKey] Validation skipped: Waiting for data...");
        sessionKeyState = SessionKeyState.MISSING;
    }
    // If areQueriesFetching is true but none of the above conditions met, 
    // it means we are likely background refetching, keep the existing state implicitly.
  }

  // Determine if session key needs update (based on final state)
  const needsUpdate = 
    sessionKeyState === SessionKeyState.EXPIRED || 
    sessionKeyState === SessionKeyState.MISMATCH ||
    sessionKeyState === SessionKeyState.MISSING;

  return {
    sessionKey,
    // Use isLoading for initial load indication, isFetching for background updates
    isLoading: areQueriesLoading, 
    isFetching: areQueriesFetching, 
    error: sessionKeyError 
      ? (sessionKeyError as Error).message 
      : blockError 
        ? (blockError as Error).message 
        : null,
    refreshSessionKey,
    sessionKeyState,
    needsUpdate,
    currentBlock: currentBlock || 0
  };
}; 