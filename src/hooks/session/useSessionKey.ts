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
  const { embeddedWallet } = useWallet();

  // Query for session key data
  const { 
    data: sessionKey, 
    isLoading: isLoadingSessionKey,
    error: sessionKeyError,
    refetch: refreshSessionKey 
  } = useQuery({
    queryKey: ['sessionKey', characterId],
    queryFn: async () => {
      if (!client || !characterId) {
        throw new Error('Client or character ID missing');
      }
      
      // Get owner address from characterId
      const owner = embeddedWallet?.address;
      if (!owner) {
        throw new Error('Wallet address not available');
      }
      
      return client.getCurrentSessionKeyData(owner);
    },
    enabled: !!characterId && !!client && !!embeddedWallet?.address,
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
        throw new Error('Client missing');
      }
      
      // Get UI snapshot has the latest block
      const owner = embeddedWallet?.address || null;
      if (!owner) return 0;
      
      const snapshot = await client.getUiSnapshot(owner, BigInt(0));
      return Number(snapshot.endBlock);
    },
    enabled: !!client && !!embeddedWallet?.address,
    staleTime: 12_000, // 12 seconds (average block time)
    refetchInterval: 12_000,
  });

  // Validate session key
  let sessionKeyState = SessionKeyState.IDLE;
  if (sessionKey && embeddedWallet?.address && currentBlock) {
    sessionKeyState = sessionKeyMachine.validate(
      sessionKey.key,
      embeddedWallet.address,
      Number(sessionKey.expiration),
      currentBlock
    );
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