import { useState, useEffect, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';

interface WalletConnectionStatus {
  isWalletLocked: boolean;
  isWrongNetwork: boolean;
  networkSwitching: boolean;
  connectionError: string | null;
  retryConnection: () => Promise<void>;
  promptWalletUnlock: () => void;
}

export const useWalletConnectionStatus = (): WalletConnectionStatus => {
  const { ready, authenticated } = usePrivy();
  const [isWalletLocked, setIsWalletLocked] = useState(false);
  const [isWrongNetwork, setIsWrongNetwork] = useState(false);
  const [networkSwitching, setNetworkSwitching] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Check if wallet is available and unlocked
  const checkWalletStatus = useCallback(async () => {
    if (!ready || authenticated) return;

    try {
      setConnectionError(null);
      
      // Check if wallet extension is available
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          // Request accounts to check if wallet is unlocked
          const accounts = await window.ethereum.request({ 
            method: 'eth_accounts' 
          });
          
          // If no accounts returned, wallet might be locked
          if (!accounts || accounts.length === 0) {
            setIsWalletLocked(true);
          } else {
            setIsWalletLocked(false);
            
            // Check network if wallet is unlocked
            const chainId = await window.ethereum.request({ 
              method: 'eth_chainId' 
            });
            const currentChainId = parseInt(chainId, 16);
            const targetChainId = 10143; // Monad Testnet
            
            setIsWrongNetwork(currentChainId !== targetChainId);
          }
        } catch (error: any) {
          // If we get a specific "unauthorized" error, wallet is likely locked
          if (error.code === 4001 || error.message?.includes('unauthorized')) {
            setIsWalletLocked(true);
          } else {
            setConnectionError(error.message || 'Failed to check wallet status');
          }
        }
      } else {
        setConnectionError('No wallet extension detected. Please install MetaMask or another Web3 wallet.');
      }
    } catch (error: any) {
      setConnectionError(error.message || 'Failed to check wallet connection');
    }
  }, [ready, authenticated]);

  // Listen for wallet events
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          setIsWalletLocked(true);
        } else {
          setIsWalletLocked(false);
          checkWalletStatus();
        }
      };

      const handleChainChanged = (chainId: string) => {
        const currentChainId = parseInt(chainId, 16);
        const targetChainId = 10143; // Monad Testnet
        setIsWrongNetwork(currentChainId !== targetChainId);
        setNetworkSwitching(false);
      };

      const handleConnect = () => {
        setIsWalletLocked(false);
        checkWalletStatus();
      };

      const handleDisconnect = () => {
        setIsWalletLocked(true);
      };

      // Add event listeners
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      window.ethereum.on('connect', handleConnect);
      window.ethereum.on('disconnect', handleDisconnect);

      // Initial check
      checkWalletStatus();

      // Cleanup listeners
      return () => {
        if (window.ethereum) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
          window.ethereum.removeListener('connect', handleConnect);
          window.ethereum.removeListener('disconnect', handleDisconnect);
        }
      };
    }
  }, [checkWalletStatus]);

  const retryConnection = useCallback(async () => {
    setConnectionError(null);
    setIsWalletLocked(false);
    setIsWrongNetwork(false);
    await checkWalletStatus();
  }, [checkWalletStatus]);

  const promptWalletUnlock = useCallback(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      // Attempt to trigger wallet unlock by requesting accounts
      window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      }).then(() => {
        setIsWalletLocked(false);
        checkWalletStatus();
      }).catch((error: any) => {
        if (error.code === 4001) {
          setConnectionError('Please unlock your wallet and try again');
        } else {
          setConnectionError(error.message || 'Failed to unlock wallet');
        }
      });
    } else {
      setConnectionError('No wallet extension detected');
    }
  }, [checkWalletStatus]);

  return {
    isWalletLocked,
    isWrongNetwork,
    networkSwitching,
    connectionError,
    retryConnection,
    promptWalletUnlock,
  };
};