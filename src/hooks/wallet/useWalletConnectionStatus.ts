import { useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallet } from '../../providers/WalletProvider';

interface WalletConnectionStatus {
  isWalletLocked: boolean;
  isWrongNetwork: boolean;
  networkSwitching: boolean;
  connectionError: string | null;
  retryConnection: () => Promise<void>;
  promptWalletUnlock: () => void;
}

export const useWalletConnectionStatus = (): WalletConnectionStatus => {
  const { login } = usePrivy();
  const { isWalletLocked, networkSwitching, error, promptWalletUnlock } = useWallet();

  // Use wallet provider's error as connection error
  const connectionError = error;

  const retryConnection = useCallback(async () => {
    // Simply trigger login again which will handle everything through Privy
    login();
  }, [login]);

  return {
    isWalletLocked,
    isWrongNetwork: false, // Network switching is handled automatically in WalletProvider
    networkSwitching,
    connectionError,
    retryConnection,
    promptWalletUnlock,
  };
};