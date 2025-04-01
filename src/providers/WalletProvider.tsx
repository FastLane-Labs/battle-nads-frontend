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

interface WalletData {
  address: string | null;
  signer: ethers.Signer | null;
  provider: ethers.BrowserProvider | null;
  sessionKey: string | null;
}

interface WalletContextValue {
  currentWallet: WalletType;
  address: string | null;
  signer: ethers.Signer | null;
  provider: ethers.BrowserProvider | null;
  loading: boolean;
  error: string | null;
  sessionKey: string | null;
  wallets: any[];
  embeddedWallet: WalletData;
  injectedWallet: WalletData;
  logout: () => Promise<void>;
  switchWallet: (type: WalletType) => void;
}

const emptyWalletData: WalletData = {
  address: null,
  signer: null,
  provider: null,
  sessionKey: null,
};

const WalletContext = createContext<WalletContextValue>({
  currentWallet: 'none',
  address: null,
  signer: null,
  provider: null,
  loading: false,
  error: null,
  sessionKey: null,
  wallets: [],
  embeddedWallet: { ...emptyWalletData },
  injectedWallet: { ...emptyWalletData },
  logout: async () => undefined,
  switchWallet: () => undefined,
});

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { authenticated, user, logout: privyLogout, connectWallet: privyConnectWallet, ready: privyReady } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();

  const [currentWallet, setCurrentWallet] = useState<WalletType>('none');
  const [address, setAddress] = useState<string | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  
  // Track both wallet types separately
  const [embeddedWallet, setEmbeddedWallet] = useState<WalletData>({ ...emptyWalletData });
  const [injectedWallet, setInjectedWallet] = useState<WalletData>({ ...emptyWalletData });

  const desiredChainId = 10143; // Monad Testnet

  /**
   * Switch between available wallets
   */
  const switchWallet = useCallback((type: WalletType) => {
    if (type === 'none') {
      setCurrentWallet('none');
      setAddress(null);
      setSigner(null);
      setProvider(null);
      setSessionKey(null);
      return;
    }
    
    const targetWallet = type === 'embedded' ? embeddedWallet : injectedWallet;
    
    if (targetWallet.address) {
      setCurrentWallet(type);
      setAddress(targetWallet.address);
      setSigner(targetWallet.signer);
      setProvider(targetWallet.provider);
      setSessionKey(targetWallet.sessionKey);
    } else {
      console.warn(`Attempted to switch to ${type} wallet, but it's not connected`);
    }
  }, [embeddedWallet, injectedWallet]);

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
      setEmbeddedWallet({ ...emptyWalletData });
      setInjectedWallet({ ...emptyWalletData });

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
      
      const walletData: WalletData = {
        address: walletAddress,
        provider: ethProvider,
        signer: walletSigner,
        sessionKey: walletType === 'embedded' ? walletAddress : null,
      };
      
      if (walletType === 'embedded') {
        setEmbeddedWallet(walletData);
      } else if (walletType === 'metamask') {
        setInjectedWallet(walletData);
      }
      
      // If this is the first wallet or matches current wallet type, set as active
      if (currentWallet === 'none' || currentWallet === walletType) {
        setCurrentWallet(walletType);
        setProvider(ethProvider);
        setSigner(walletSigner);
        console.log("Setting address:", walletAddress);
        setAddress(walletAddress);
        setSessionKey(walletData.sessionKey);
      }
    } catch (err) {
      console.error('Error setting up wallet:', err);
      // Still store the address even if we can't get the signer
      const basicWalletData: WalletData = {
        address: walletAddress,
        provider: null,
        signer: null,
        sessionKey: walletType === 'embedded' ? walletAddress : null,
      };
      
      if (walletType === 'embedded') {
        setEmbeddedWallet(basicWalletData);
      } else if (walletType === 'metamask') {
        setInjectedWallet(basicWalletData);
      }
      
      // Update main address even if we couldn't get the signer
      if (currentWallet === 'none' || currentWallet === walletType) {
        setCurrentWallet(walletType);
        setAddress(walletAddress);
      }
    }
  }, [checkAndSwitchChain, currentWallet]);

  // Automatically detect and sync with Privy wallets
  useEffect(() => {
    const syncWithPrivyWallets = async () => {
      try {
        // Clear loading state when authentication is ready
        if (privyReady) {
          setLoading(false);
        }
        
        // If not authenticated, reset wallet state and return early
        if (!authenticated) {
          if (currentWallet !== 'none') {
            setCurrentWallet('none');
            setSigner(null);
            setProvider(null);
            setAddress(null);
            setSessionKey(null);
            setEmbeddedWallet({ ...emptyWalletData });
            setInjectedWallet({ ...emptyWalletData });
          }
          return;
        }
        
        // First check user.wallet from Privy - this is available immediately 
        // even before wallets are ready
        if (user?.wallet?.address && !address) {
          console.log("Setting address from user.wallet:", user.wallet.address);
          setAddress(user.wallet.address);
          
          // Create a basic wallet data without provider/signer
          const basicWalletData: WalletData = {
            address: user.wallet.address,
            provider: null,
            signer: null,
            sessionKey: null,
          };
          
          // Default to injected wallet type for now
          setCurrentWallet('metamask');
          setInjectedWallet(basicWalletData);
          
          // Try to set up the wallet with a provider if ethereum is available
          if (window.ethereum) {
            try {
              await setupWallet(window.ethereum, user.wallet.address, 'metamask');
            } catch (err) {
              console.error("Failed to set up wallet with provider:", err);
            }
          }
        }
        
        // Now process Privy wallets collection if ready
        if (walletsReady) {
          console.log("Syncing with wallets:", wallets);
          
          // If we have no wallets connected but user is authenticated,
          // keep the address from user.wallet
          if (wallets.length === 0 && user?.wallet?.address) {
            // We already set this above, just keep it
            return;
          } else if (wallets.length === 0) {
            console.log("No wallets connected");
            setCurrentWallet('none');
            setSigner(null);
            setProvider(null);
            setAddress(null);
            setSessionKey(null);
            setEmbeddedWallet({ ...emptyWalletData });
            setInjectedWallet({ ...emptyWalletData });
            return;
          }
          
          // Find both embedded and injected wallets
          const embeddedWallet = wallets.find(wallet => wallet.walletClientType === 'privy');
          const injectedWallet = wallets.find(wallet => wallet.walletClientType === 'injected');
          
          // Set up both wallets if they exist
          if (embeddedWallet && window.ethereum) {
            await setupWallet(window.ethereum, embeddedWallet.address, 'embedded');
          }
          
          if (injectedWallet && window.ethereum) {
            await setupWallet(window.ethereum, injectedWallet.address, 'metamask');
          }
          
          // If no active wallet is set but we have wallets, prioritize embedded
          if (currentWallet === 'none' && (embeddedWallet || injectedWallet)) {
            if (embeddedWallet) {
              switchWallet('embedded');
            } else if (injectedWallet) {
              switchWallet('metamask');
            }
          }
        }
      } catch (err) {
        console.error('Error syncing with Privy wallets:', err);
      }
    };
    
    syncWithPrivyWallets();
  }, [walletsReady, authenticated, wallets, setupWallet, switchWallet, currentWallet, user, address, privyReady]);

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
        embeddedWallet,
        injectedWallet,
        logout: handleLogout,
        switchWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext); 