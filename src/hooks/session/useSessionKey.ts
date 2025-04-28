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
      return data === undefined ? null : data;
    },
    enabled: !!characterId && !!client && !!injectedWallet?.address,
    staleTime: 30_000, // 30 seconds
    refetchInterval: 30_000, // Refresh every 30 seconds
  });

  // Query for current block number (for expiration checks)
  const { 
    data: currentBlock 
  } = useQuery({
    queryKey: ['currentBlock'],
    queryFn: async () => {
      if (!client) {
        throw new Error('Client missing for block number fetch');
      }
      console.log("[useSessionKey] Fetching current block number...");
      const ownerForBlockFetch = injectedWallet?.address || embeddedWallet?.address || null;
      if (!ownerForBlockFetch) return 0;
      
      try {
        const block = await client.getLatestBlockNumber();
        return Number(block);
      } catch (err) {
        console.error("[useSessionKey] Error fetching block number:", err);
        return 0;
      }
    },
    enabled: !!client,
    staleTime: 12_000, // ~1 block time
    refetchInterval: 12_000,
  });

  // Validate session key
  let sessionKeyState = SessionKeyState.IDLE;
  const isQueryEnabled = !!characterId && !!client && !!injectedWallet?.address;
  const validationInput = {
    sessionKeyAddress: sessionKey?.key,
    ownerAddress: injectedWallet?.address,
    embeddedAddress: embeddedWallet?.address,
    expiration: sessionKey?.expiration ? Number(sessionKey.expiration) : 0,
    currentBlock: currentBlock
  };

  if (isQueryEnabled && sessionKey !== undefined && currentBlock !== undefined) {
    if (sessionKey && embeddedWallet?.address && currentBlock) {
      console.log("[useSessionKey] Validating session key:", validationInput);
      sessionKeyState = sessionKeyMachine.validate(
        sessionKey.key,
        embeddedWallet.address,
        Number(sessionKey.expiration),
        currentBlock
      );
      console.log("[useSessionKey] Validation result state:", sessionKeyState);
    } else {
      console.log("[useSessionKey] Validation skipped: Query enabled but data missing:", validationInput);
      sessionKeyState = SessionKeyState.MISSING;
    }
  } else if (!isQueryEnabled) {
    console.log("[useSessionKey] Validation skipped: Query disabled.");
    sessionKeyState = SessionKeyState.IDLE;
  } else {
    console.log("[useSessionKey] Validation skipped: Query loading or error...", { isLoadingSessionKey, sessionKeyError });
    sessionKeyState = SessionKeyState.MISSING;
  }

  // Determine if session key needs update
  const needsUpdate = 
    sessionKeyState === SessionKeyState.EXPIRED || 
    sessionKeyState === SessionKeyState.MISMATCH ||
    sessionKeyState === SessionKeyState.MISSING;

  return {
    sessionKey,
    isLoading: isLoadingSessionKey,
    error: sessionKeyError ? (sessionKeyError as Error).message : null,
    refreshSessionKey,
    sessionKeyState,
    needsUpdate,
    currentBlock: currentBlock || 0
  };
}; 