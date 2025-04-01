import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import * as ethers from 'ethers';

/**
 * Types of wallets we can manage:
 * - 'metamask' : user-supplied EOA via MetaMask
 * - 'embedded' : Privy Embedded wallet
 * - 'none'     : not connected
 */
type WalletType = 'metamask' | 'embedded' | 'none';

interface WalletContextValue {
  currentWallet: WalletType;
  address: string | null;
  signer: ethers.Signer | null;
  provider: ethers.BrowserProvider | null;
  loading: boolean;
  error: string | null;
  sessionKey: string | null;
  wallets: any[];
  connectMetamask: () => Promise<void>;
  connectPrivyEmbedded: () => Promise<void>;
  logout: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue>({
  currentWallet: 'none',
  address: null,
  signer: null,
  provider: null,
  loading: false,
  error: null,
  sessionKey: null,
  wallets: [],
  connectMetamask: async () => undefined,
  connectPrivyEmbedded: async () => undefined,
  logout: async () => undefined,
});

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { authenticated, user, logout: privyLogout, connectWallet: privyConnectWallet } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();

  const [currentWallet, setCurrentWallet] = useState<WalletType>('none');
  const [address, setAddress] = useState<string | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionKey, setSessionKey] = useState<string | null>(null);

  const desiredChainId = 10143; // Monad Testnet

  /**
   * Request a wallet switch if the connected chain is not correct.
   */
  const checkAndSwitchChain = useCallback(
    async (browserProvider: ethers.BrowserProvider) => {
      const network = await browserProvider.getNetwork();
      const chainIdHex = '0x' + desiredChainId.toString(16);

      if (Number(network.chainId) !== desiredChainId) {
        try {
          await (window as any).ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: chainIdHex }],
          });
        } catch (switchErr: any) {
          throw new Error(`Please switch to Monad Testnet (chainId: ${desiredChainId}).`);
        }
      }
    },
    [desiredChainId],
  );

  /**
   * Connect via Metamask, set signer and address.
   */
  const connectMetamask = useCallback(async () => {
    try {
      if (!(window as any).ethereum) {
        throw new Error('MetaMask not found');
      }
      setLoading(true);
      setError(null);

      // Force a request for the user to connect their accounts in MetaMask
      const metamaskProvider = new ethers.BrowserProvider((window as any).ethereum);
      await metamaskProvider.send('eth_requestAccounts', []);
      await checkAndSwitchChain(metamaskProvider);

      const theSigner = await metamaskProvider.getSigner();
      const userAddress = await theSigner.getAddress();

      setCurrentWallet('metamask');
      setProvider(metamaskProvider);
      setSigner(theSigner);
      setAddress(userAddress);
    } catch (err: any) {
      setError(err.message || 'Failed to connect Metamask');
    } finally {
      setLoading(false);
    }
  }, [checkAndSwitchChain]);

  /**
   * Connect via Privy Embedded wallet.
   */
  const connectPrivyEmbedded = useCallback(async () => {
    if (!authenticated || !user) {
      setError('User is not authenticated via Privy');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // This triggers the embedded wallet flow
      await privyConnectWallet({ connector: 'embedded' } as any);
      
      // After connecting, we'll let the useEffect handle the wallet setup
      // since Privy will update the wallets array with the new embedded wallet
      
    } catch (err: any) {
      setError(err.message || 'Failed to connect Privy embedded wallet');
      setLoading(false);
    }
  }, [authenticated, user, privyConnectWallet]);

  /**
   * Logout from Privy (if authenticated) and clear wallet states.
   */
  const handleLogout = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setCurrentWallet('none');
      setSigner(null);
      setProvider(null);
      setAddress(null);
      setSessionKey(null);

      // Also call the Privy logout if user is authenticated
      if (authenticated) {
        await privyLogout();
      }
    } catch (err: any) {
      setError(err.message || 'Logout failed');
    } finally {
      setLoading(false);
    }
  }, [authenticated, privyLogout]);

  // Setup a wallet using provider and address
  const setupWallet = useCallback(async (walletProvider: any, walletAddress: string, walletType: WalletType) => {
    try {
      const ethProvider = new ethers.BrowserProvider(walletProvider);
      await checkAndSwitchChain(ethProvider);
      const walletSigner = await ethProvider.getSigner();
      
      setCurrentWallet(walletType);
      setProvider(ethProvider);
      setSigner(walletSigner);
      setAddress(walletAddress);
      
      // Set session key for embedded wallets
      if (walletType === 'embedded') {
        try {
          // For embedded wallets, the session key is the wallet address itself in this implementation
          // In a real implementation, we would get this from a smart contract or backend
          setSessionKey(walletAddress);
        } catch (err) {
          console.error('Error getting session key:', err);
        }
      }
    } catch (err) {
      console.error('Error setting up wallet:', err);
      // Don't clear address - we still want to show the connected wallet
      // even if we can't get the signer
    }
  }, [checkAndSwitchChain]);

  // Automatically detect and sync with Privy wallets
  useEffect(() => {
    const syncWithPrivyWallets = async () => {
      try {
        // Only proceed if we have wallets ready and authentication
        if (!walletsReady || !authenticated) {
          if (!walletsReady) {
            console.log("Waiting for wallets to be ready...");
          }
          if (!authenticated) {
            console.log("User not authenticated");
            setLoading(false);
          }
          return;
        }
        
        console.log("Syncing with wallets:", wallets);
        
        // If we have no wallets connected, clear state and return
        if (wallets.length === 0) {
          console.log("No wallets connected");
          setCurrentWallet('none');
          setSigner(null);
          setProvider(null);
          setAddress(null);
          setSessionKey(null);
          setLoading(false);
          return;
        }
        
        // Prioritize embedded wallet if available, otherwise use the first injected wallet
        const embeddedWallet = wallets.find(wallet => wallet.walletClientType === 'privy');
        const injectedWallet = wallets.find(wallet => wallet.walletClientType === 'injected');
        
        const activeWallet = embeddedWallet || injectedWallet || wallets[0];
        console.log("Selected active wallet:", activeWallet);
        
        // Set the address immediately so UI can show it
        setAddress(activeWallet.address);
        
        // Determine wallet type
        const walletType: WalletType = 
          activeWallet.walletClientType === 'injected' ? 'metamask' :
          activeWallet.walletClientType === 'privy' ? 'embedded' : 'none';
        
        // Set up the provider and signer
        if (activeWallet && window.ethereum) {
          await setupWallet(window.ethereum, activeWallet.address, walletType);
        } else {
          console.log("No provider available for wallet, setting address only");
          setCurrentWallet(walletType);
          
          // Even without provider, set session key for embedded wallets
          if (walletType === 'embedded') {
            setSessionKey(activeWallet.address);
          }
        }
      } catch (err) {
        console.error('Error syncing with Privy wallets:', err);
      } finally {
        setLoading(false);
      }
    };
    
    syncWithPrivyWallets();
  }, [walletsReady, authenticated, wallets, setupWallet]);

  return (
    <WalletContext.Provider
      value={{
        currentWallet,
        address,
        signer,
        provider,
        loading,
        error,
        sessionKey,
        wallets,
        connectMetamask,
        connectPrivyEmbedded,
        logout: handleLogout,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext); 