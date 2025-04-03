/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { ethers } from 'ethers';

// Define wallet client types based on Privy's supported wallets
type InjectedWalletClientType = 
  | 'metamask' 
  | 'phantom' 
  | 'brave_wallet' 
  | 'rainbow' 
  | 'uniswap_wallet_extension' 
  | 'uniswap_extension' 
  | 'rabby_wallet' 
  | 'bybit_wallet' 
  | 'ronin_wallet' 
  | 'haha_wallet' 
  | 'crypto.com_wallet_extension' 
  | 'crypto.com_onchain';

/**
 * Types of wallets we can manage:
 * - injected: user-supplied EOA via injected wallet (metamask, phantom, etc.)
 * - embedded: Privy Embedded wallet
 * - none: not connected
 */
type WalletType = 'injected' | 'embedded' | 'none';

interface WalletInfo {
  type: WalletType;
  walletClientType?: InjectedWalletClientType | 'privy';
  address: string | null;
  signer: ethers.Signer | null;
  provider: ethers.BrowserProvider | null;
  privyWallet: any | null; // Reference to original Privy wallet object
}

interface WalletContextValue {
  currentWallet: WalletType;
  address: string | null;
  signer: ethers.Signer | null;
  provider: ethers.BrowserProvider | null;
  loading: boolean;
  error: string | null;
  sessionKey: string | null;
  injectedWallet: WalletInfo | null;
  embeddedWallet: WalletInfo | null;
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
  injectedWallet: null,
  embeddedWallet: null,
  connectMetamask: async () => undefined,
  connectPrivyEmbedded: async () => undefined,
  logout: async () => undefined,
});

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { authenticated, logout: privyLogout } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();

  const [currentWallet, setCurrentWallet] = useState<WalletType>('none');
  const [address, setAddress] = useState<string | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const [injectedWallet, setInjectedWallet] = useState<WalletInfo | null>(null);
  const [embeddedWallet, setEmbeddedWallet] = useState<WalletInfo | null>(null);

  // Store previous wallet states to prevent unnecessary updates
  const prevWalletsRef = useRef<any[]>([]);
  const prevWalletsReadyRef = useRef<boolean>(false);
  const prevAuthenticatedRef = useRef<boolean>(false);

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
        } catch (
          /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
          switchErr: any
        ) {
          throw new Error(`Please switch to Monad Testnet (chainId: ${desiredChainId}).`);
        }
      }
    },
    [desiredChainId],
  );

  /**
   * Logout from Privy and clear wallet states.
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
      setInjectedWallet(null);
      setEmbeddedWallet(null);

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

  // Sync with Privy wallets
  const syncWithPrivyWallets = useCallback(async () => {
    try {
      setLoading(true);

      // Wait until wallets are ready and we have authentication
      if (!walletsReady || !authenticated) {
        setLoading(false);
        return;
      }
      
      console.log("Available Privy wallets:", wallets);
      
      // Process all available wallets from Privy
      if (wallets.length === 0) {
        // No wallets connected, clear state
        setCurrentWallet('none');
        setSigner(null);
        setProvider(null);
        setAddress(null);
        setSessionKey(null);
        setInjectedWallet(null);
        setEmbeddedWallet(null);
        setLoading(false);
        return;
      }
      
      // Track which wallets we found
      let foundInjected = false;
      let foundEmbedded = false;
      let newCurrentWallet = currentWallet;
      
      // DEBUG: List all connected wallets
      console.log("WALLET DEBUG - Connected wallets:");
      wallets.forEach((wallet, index) => {
        console.log(`Wallet #${index}: Address=${wallet.address}, Type=${wallet.walletClientType}, ConnectorType=${wallet.connectorType}`);
      });
      
      // Find Owner Wallet (MetaMask) if available
      const metamaskWallet = wallets.find(w => w.walletClientType === 'metamask');
      if (metamaskWallet) {
        console.log("FOUND OWNER WALLET (MetaMask):", metamaskWallet.address);
      } else {
        console.log("No MetaMask wallet found among connected wallets");
      }
      
      // Process each wallet by type
      for (const wallet of wallets) {
        try {
          // Determine wallet type
          const isMetamask = wallet.walletClientType === 'metamask';
          const isInjected = wallet.walletClientType === 'injected' || isMetamask;
          const isEmbedded = wallet.walletClientType === 'privy' || wallet.connectorType === 'embedded';
          
          // For debugging
          console.log(`Wallet: ${wallet.address}, Type: ${wallet.walletClientType}, ConnectorType: ${wallet.connectorType}`);
          
          if (isMetamask) {
            // This is specifically Metamask - prioritize this as the injected wallet
            console.log("Found MetaMask wallet, setting as injectedWallet:", wallet.address);
            foundInjected = true;
            
            try {
              // Follow Privy documentation for ethers v6
              const privyProvider = await wallet.getEthereumProvider();
              const ethProvider = new ethers.BrowserProvider(privyProvider);
              await checkAndSwitchChain(ethProvider);
              const walletSigner = await ethProvider.getSigner();
              
              console.log("[WalletProvider] Successfully created MetaMask wallet signer:", 
                        { address: wallet.address, hasProvider: !!ethProvider, hasSigner: !!walletSigner });
              
              const walletInfo: WalletInfo = {
                type: 'injected',
                walletClientType: wallet.walletClientType,
                address: wallet.address,
                signer: walletSigner,
                provider: ethProvider,
                privyWallet: wallet
              };
              
              setInjectedWallet(walletInfo);
              
              // Always make MetaMask the active wallet when available
              newCurrentWallet = 'injected';
              setSigner(walletSigner);
              setProvider(ethProvider);
              setAddress(wallet.address);
            } catch (providerError) {
              console.error("Error setting up MetaMask provider:", providerError);
              setInjectedWallet({
                type: 'injected',
                walletClientType: wallet.walletClientType,
                address: wallet.address,
                signer: null,
                provider: null,
                privyWallet: wallet
              });
            }
          } else if (isInjected && !isMetamask && !injectedWallet) {
            // This is a non-MetaMask injected wallet, use only if no MetaMask found
            console.log("Found other injected wallet:", wallet.walletClientType, wallet.address);
            foundInjected = true;
            
            try {
              // Follow Privy documentation for ethers v6
              const privyProvider = await wallet.getEthereumProvider();
              const ethProvider = new ethers.BrowserProvider(privyProvider);
              await checkAndSwitchChain(ethProvider);
              const walletSigner = await ethProvider.getSigner();
              
              console.log("[WalletProvider] Successfully created injected wallet signer:", 
                        { address: wallet.address, type: wallet.walletClientType, hasProvider: !!ethProvider, hasSigner: !!walletSigner });
              
              const walletInfo: WalletInfo = {
                type: 'injected',
                walletClientType: wallet.walletClientType,
                address: wallet.address,
                signer: walletSigner,
                provider: ethProvider,
                privyWallet: wallet
              };
              
              setInjectedWallet(walletInfo);
              
              // If no active wallet set, make this the active one
              if (newCurrentWallet === 'none') {
                newCurrentWallet = 'injected';
                setSigner(walletSigner);
                setProvider(ethProvider);
                setAddress(wallet.address);
              }
            } catch (providerError) {
              console.error("Error setting up injected wallet provider:", providerError);
              // Create wallet info without provider/signer
              setInjectedWallet({
                type: 'injected',
                walletClientType: wallet.walletClientType,
                address: wallet.address,
                signer: null,
                provider: null,
                privyWallet: wallet
              });
            }
          } else if (isEmbedded) {
            // This is a Privy embedded wallet
            foundEmbedded = true;
            
            // Use the embedded wallet address as the session key instead of hardcoding
            setSessionKey(wallet.address);
            
            // Try to get a provider
            let embeddedProvider = null;
            let embeddedSigner = null;
            
            try {
              // For embedded wallets, use the Privy API to get the provider
              // Following Privy documentation for ethers v6
              const privyProvider = await wallet.getEthereumProvider();
              const ethProvider = new ethers.BrowserProvider(privyProvider);
              embeddedProvider = ethProvider;
              embeddedSigner = await ethProvider.getSigner();
              
              console.log("[WalletProvider] Successfully created embedded wallet signer:", 
                          { address: wallet.address, hasProvider: !!embeddedProvider, hasSigner: !!embeddedSigner });
            } catch (providerError) {
              console.error("Could not get provider for embedded wallet:", providerError);
            }
            
            // Create and store the wallet info
            const walletInfo: WalletInfo = {
              type: 'embedded',
              walletClientType: wallet.walletClientType,
              address: wallet.address,
              signer: embeddedSigner,
              provider: embeddedProvider,
              privyWallet: wallet
            };
            
            setEmbeddedWallet(walletInfo);
            
            // Prefer embedded wallet as active if available or if already selected
            if (newCurrentWallet === 'none' || newCurrentWallet === 'embedded') {
              newCurrentWallet = 'embedded';
              if (embeddedSigner) setSigner(embeddedSigner);
              if (embeddedProvider) setProvider(embeddedProvider);
              setAddress(wallet.address);
            }
          }
        } catch (walletError) {
          console.error(`Error processing wallet ${wallet.address}:`, walletError);
        }
      }
      
      // Clean up wallets that no longer exist
      if (!foundInjected && injectedWallet) {
        setInjectedWallet(null);
      }
      
      if (!foundEmbedded && embeddedWallet) {
        setEmbeddedWallet(null);
        setSessionKey(null);
      }
      
      // Ensure we have a current wallet set if any are available
      if (newCurrentWallet === 'none') {
        if (foundEmbedded) {
          newCurrentWallet = 'embedded';
        } else if (foundInjected) {
          newCurrentWallet = 'injected';
        }
      }

      // Only update the current wallet if it changed
      if (newCurrentWallet !== currentWallet) {
        setCurrentWallet(newCurrentWallet);
      }
      
    } catch (err) {
      console.error('Error syncing with Privy wallets:', err);
      setError('Failed to sync with wallets');
    } finally {
      setLoading(false);
    }
  }, [walletsReady, authenticated, wallets, checkAndSwitchChain, currentWallet, injectedWallet, embeddedWallet]);

  // Check if wallets have actually changed
  const walletsChanged = useCallback(() => {
    if (prevWalletsRef.current.length !== wallets.length) {
      return true;
    }
    
    // Check if any wallet addresses changed
    const prevAddresses = new Set(prevWalletsRef.current.map(w => w.address));
    const currentAddresses = new Set(wallets.map(w => w.address));
    
    if (prevAddresses.size !== currentAddresses.size) {
      return true;
    }
    
    for (const addr of currentAddresses) {
      if (!prevAddresses.has(addr)) {
        return true;
      }
    }
    
    return false;
  }, [wallets]);

  // Automatically detect and sync with Privy wallets
  useEffect(() => {
    // Skip update if nothing important changed
    if (
      prevWalletsReadyRef.current === walletsReady &&
      prevAuthenticatedRef.current === authenticated &&
      !walletsChanged()
    ) {
      return;
    }
    
    // Update refs for next comparison
    prevWalletsReadyRef.current = walletsReady;
    prevAuthenticatedRef.current = authenticated;
    prevWalletsRef.current = [...wallets];
    
    syncWithPrivyWallets();
  }, [walletsReady, authenticated, wallets, walletsChanged, syncWithPrivyWallets]);

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
        injectedWallet,
        embeddedWallet,
        connectMetamask: async () => undefined,
        connectPrivyEmbedded: async () => undefined,
        logout: handleLogout,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);

console.log('Displaying WalletProvider content'); 