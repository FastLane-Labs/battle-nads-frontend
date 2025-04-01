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

      // Now, window.ethereum should be the embedded wallet provider
      const embeddedProvider = new ethers.BrowserProvider(window.ethereum as any);
      await checkAndSwitchChain(embeddedProvider);

      const theSigner = await embeddedProvider.getSigner();
      const userAddress = await theSigner.getAddress();

      setCurrentWallet('embedded');
      setProvider(embeddedProvider);
      setSigner(theSigner);
      setAddress(userAddress);
    } catch (err: any) {
      setError(err.message || 'Failed to connect Privy embedded wallet');
    } finally {
      setLoading(false);
    }
  }, [authenticated, user, privyConnectWallet, checkAndSwitchChain]);

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

  // Automatically detect and sync with Privy wallets
  useEffect(() => {
    const syncWithPrivyWallets = async () => {
      try {
        // Wait until wallets are ready and we have authentication
        if (!walletsReady || !authenticated) {
          return;
        }
        
        // If we already have an address set, no need to re-sync
        if (address) {
          setLoading(false);
          return;
        }
        
        // If we have no wallets connected, clear state and return
        if (wallets.length === 0) {
          setCurrentWallet('none');
          setSigner(null);
          setProvider(null);
          setAddress(null);
          setLoading(false);
          return;
        }
        
        // Get the first connected wallet
        const activeWallet = wallets[0];
        
        // Set the address immediately
        setAddress(activeWallet.address);
        
        // Determine wallet type
        const walletType: WalletType = activeWallet.walletClientType === 'injected' 
          ? 'metamask' 
          : 'embedded';
        
        setCurrentWallet(walletType);
        
        // Try to get ethereum provider
        if (window.ethereum) {
          try {
            const ethProvider = new ethers.BrowserProvider(window.ethereum);
            await checkAndSwitchChain(ethProvider);
            const walletSigner = await ethProvider.getSigner();
            
            setProvider(ethProvider);
            setSigner(walletSigner);
          } catch (err) {
            console.error('Error getting provider/signer:', err);
            // Still keep the address even if we can't get a signer
          }
        }
      } catch (err) {
        console.error('Error syncing with Privy wallets:', err);
      } finally {
        setLoading(false);
      }
    };
    
    syncWithPrivyWallets();
  }, [walletsReady, authenticated, wallets, address, checkAndSwitchChain]);

  return (
    <WalletContext.Provider
      value={{
        currentWallet,
        address,
        signer,
        provider,
        loading,
        error,
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