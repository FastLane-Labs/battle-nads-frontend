/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { usePrivy, useWallets, useSendTransaction, UnsignedTransactionRequest } from '@privy-io/react-auth';
import { ethers, TransactionRequest, TransactionResponse } from 'ethers';
import { getCharacterLocalStorageKey } from '../utils/getCharacterLocalStorageKey';
import { useRouter } from 'next/navigation';

type WalletType = 'injected' | 'embedded' | 'none';

export interface WalletInfo {
  type: WalletType;
  walletClientType?: string;
  address: string | null;
  signer: ethers.Signer | null;
  provider: ethers.BrowserProvider | null;
  privyWallet: any | null;
}

interface WalletContextType {
  currentWallet: WalletType;
  address: string | null;
  signer: ethers.Signer | null;
  provider: ethers.BrowserProvider | null;
  loading: boolean;
  error: string | null;
  sessionKey: string | null;
  isInitialized: boolean;
  injectedWallet: WalletInfo | null;
  embeddedWallet: WalletInfo | null;
  connectMetamask: () => Promise<void>;
  connectPrivyEmbedded: () => Promise<void>;
  isWalletLocked: boolean;
  promptWalletUnlock: () => Promise<void>;
  logout: () => Promise<void>;
  networkSwitching: boolean;
  sendPrivyTransaction: (unsignedTx: TransactionRequest) => Promise<TransactionResponse>;
}

const WalletContext = createContext<WalletContextType>({
  currentWallet: 'none',
  address: null,
  signer: null,
  provider: null,
  loading: false,
  error: null,
  sessionKey: null,
  isInitialized: false,
  injectedWallet: null,
  embeddedWallet: null,
  connectMetamask: async () => undefined,
  connectPrivyEmbedded: async () => undefined,
  isWalletLocked: false,
  promptWalletUnlock: async () => undefined,
  logout: async () => undefined,
  networkSwitching: false,
  sendPrivyTransaction: async () => { throw new Error('Transaction function not initialized'); },
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const { ready, authenticated, login, logout: privyLogout } = usePrivy();
  const { wallets } = useWallets();
  const { sendTransaction } = useSendTransaction();
  const router = useRouter();
  
  const [currentWallet, setCurrentWallet] = useState<WalletType>('none');
  const [address, setAddress] = useState<string | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [injectedWallet, setInjectedWallet] = useState<WalletInfo | null>(null);
  const [embeddedWallet, setEmbeddedWallet] = useState<WalletInfo | null>(null);
  const [networkSwitching, setNetworkSwitching] = useState(false);
  const [isWalletLocked, setIsWalletLocked] = useState(false);
  const [hasHadWallet, setHasHadWallet] = useState(false);

  // Track previous wallet address to detect changes
  const [previousAddress, setPreviousAddress] = useState<string | null>(null);

  // Detect wallet address changes and trigger logout
  useEffect(() => {
    // Only process if we're authenticated
    if (!authenticated || wallets.length === 0) {
      // If not authenticated, clear previous address to avoid issues on next login
      if (!authenticated && previousAddress) {
        setPreviousAddress(null);
      }
      return;
    }
    
    // Only track injected wallet changes, not embedded wallet
    const currentInjectedWallet = wallets.find(w => w.connectorType === 'injected');
    const currentInjectedAddress = currentInjectedWallet?.address;
    
    // If we have a previous address and it's different from current injected wallet, logout
    if (previousAddress && currentInjectedAddress && previousAddress !== currentInjectedAddress) {
      console.log('[WalletProvider] Injected wallet address changed, logging out', {
        previousAddress,
        currentInjectedAddress
      });
      
      // Clear cached data for the old wallet
      const characterKey = getCharacterLocalStorageKey(previousAddress);
      if (characterKey && typeof window !== 'undefined') {
        localStorage.removeItem(characterKey);
      }
      
      // Clear wallet state immediately
      setInjectedWallet(null);
      setEmbeddedWallet(null);
      setProvider(null);
      setSigner(null);
      setSessionKey(null);
      setPreviousAddress(null);
      
      // Small delay to ensure state is cleared before logout
      setTimeout(() => {
        privyLogout();
        router.push('/');
      }, 100);
      return; // Don't update previous address after logout
    }
    
    // Update previous address only if we have a current injected address
    if (currentInjectedAddress && currentInjectedAddress !== previousAddress) {
      setPreviousAddress(currentInjectedAddress);
    }
  }, [authenticated, wallets, previousAddress, privyLogout, router]);

  useEffect(() => {
    async function setupWallet() {
      // Set initialized once Privy is ready
      if (!ready) {
        return;
      }
      
      setIsInitialized(true);
      
      // Check if wallet is "locked" - in Privy terms, this means:
      // 1. User was previously authenticated but now isn't (session expired/logged out)
      // 2. This is different from never having connected a wallet
      const isCurrentlyLocked = ready && !authenticated && hasHadWallet;
      setIsWalletLocked(isCurrentlyLocked);
      
      if (!authenticated || wallets.length === 0) {
        setCurrentWallet('none');
        setAddress(null);
        setSigner(null);
        setProvider(null);
        setSessionKey(null);
        setInjectedWallet(null);
        setEmbeddedWallet(null);
        setLoading(false);
        return;
      }
      
      // If we reach here, user is authenticated with wallets
      setHasHadWallet(true);
      setIsWalletLocked(false);

      try {
        // Find injected and embedded wallets
        const privyInjectedWallet = wallets.find(w => w.connectorType === 'injected');
        const privyEmbeddedWallet = wallets.find(w => w.connectorType === 'embedded');
        
        // Setup injected wallet if available
        if (privyInjectedWallet) {
          const walletProvider = await privyInjectedWallet.getEthereumProvider();
          const browserProvider = new ethers.BrowserProvider(walletProvider);
          const walletSigner = await browserProvider.getSigner();
          
          setInjectedWallet({
            type: 'injected',
            walletClientType: privyInjectedWallet.walletClientType,
            address: privyInjectedWallet.address,
            signer: walletSigner,
            provider: browserProvider,
            privyWallet: privyInjectedWallet
          });
        }
        
        // Setup embedded wallet if available
        if (privyEmbeddedWallet) {
          const walletProvider = await privyEmbeddedWallet.getEthereumProvider();
          const browserProvider = new ethers.BrowserProvider(walletProvider);
          const walletSigner = await browserProvider.getSigner();
          
          setEmbeddedWallet({
            type: 'embedded',
            walletClientType: 'privy',
            address: privyEmbeddedWallet.address,
            signer: walletSigner,
            provider: browserProvider,
            privyWallet: privyEmbeddedWallet
          });
          
          // Session key is the embedded wallet address
          setSessionKey(privyEmbeddedWallet.address);
        } else {
          setSessionKey(null);
        }
        
        // Prioritize injected wallet over embedded
        const activeWallet = privyInjectedWallet || privyEmbeddedWallet || wallets[0];
        setAddress(activeWallet.address);
        
        // Determine wallet type
        const walletType: WalletType = activeWallet.connectorType === 'embedded' ? 'embedded' : 'injected';
        setCurrentWallet(walletType);
        
        // Get provider and signer from the active wallet
        const walletProvider = await activeWallet.getEthereumProvider();
        const browserProvider = new ethers.BrowserProvider(walletProvider);
        
        // Check and switch network if needed
        const desiredChainId = 10143; // Monad Testnet
        try {
          const network = await browserProvider.getNetwork();
          if (Number(network.chainId) !== desiredChainId) {
            setNetworkSwitching(true);
            setError(null);
            
            const chainIdHex = '0x' + desiredChainId.toString(16);
            await browserProvider.send('wallet_switchEthereumChain', [{ chainId: chainIdHex }]);
            
            // Wait a moment for the network switch to complete
            await new Promise(resolve => setTimeout(resolve, 1000));
            setNetworkSwitching(false);
          }
        } catch (switchErr: any) {
          setNetworkSwitching(false);
          
          if (switchErr.code === 4902) {
            setError('Monad Testnet not found in wallet. Please add it manually.');
          } else if (switchErr.code === 4001) {
            setError('Network switch cancelled. Please switch to Monad Testnet manually.');
          } else {
            setError(`Failed to switch to Monad Testnet: ${switchErr.message || 'Unknown error'}`);
          }
        }
        
        setProvider(browserProvider);
        
        const walletSigner = await browserProvider.getSigner();
        setSigner(walletSigner);
        
        // Only set error to null if we didn't have a network switch error
        if (!error) {
          setError(null);
        }
      } catch (err: any) {
        console.error('[WalletProvider] Error setting up wallet:', err);
        setError(err.message || 'Failed to setup wallet');
      } finally {
        setLoading(false);
      }
    }

    setupWallet();
  }, [ready, authenticated, wallets, error, hasHadWallet]);

  const connectMetamask = async () => {
    console.log('[WalletProvider] connectMetamask called', { 
      authenticated, 
      currentWallet,
      ready 
    });
    
    // If already authenticated with a different wallet, disconnect first
    if (authenticated && currentWallet !== 'injected') {
      console.log('[WalletProvider] Disconnecting from current wallet before switching to MetaMask');
      
      // Clear any cached character data for the current wallet
      if (address) {
        const characterKey = getCharacterLocalStorageKey(address);
        if (characterKey && typeof window !== 'undefined') {
          localStorage.removeItem(characterKey);
        }
      }
      
      await privyLogout();
      // Small delay to ensure clean state before reconnecting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (ready && !authenticated) {
      console.log('[WalletProvider] Initiating MetaMask login');
      login();
    }
  };

  const promptWalletUnlock = async () => {
    if (!authenticated) {
      login();
    }
  };

  const connectPrivyEmbedded = async () => {
    console.log('[WalletProvider] connectPrivyEmbedded called', { 
      authenticated, 
      currentWallet,
      ready 
    });
    
    // If already authenticated with a different wallet, disconnect first
    if (authenticated && currentWallet !== 'embedded') {
      console.log('[WalletProvider] Disconnecting from current wallet before switching to Privy embedded wallet');
      
      // Clear any cached character data for the current wallet
      if (address) {
        const characterKey = getCharacterLocalStorageKey(address);
        if (characterKey && typeof window !== 'undefined') {
          localStorage.removeItem(characterKey);
        }
      }
      
      await privyLogout();
      // Small delay to ensure clean state before reconnecting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (ready && !authenticated) {
      console.log('[WalletProvider] Initiating Privy embedded wallet login');
      login();
    }
  };

  const logout = async () => {
    if (authenticated) {
      await privyLogout();
      // Clear session key and wallet info on logout
      setSessionKey(null);
      setInjectedWallet(null);
      setEmbeddedWallet(null);
      setPreviousAddress(null);
      // Redirect to root after logout
      router.push('/');
    }
  };

  const sendPrivyTransaction = useCallback(async (unsignedTx: TransactionRequest): Promise<TransactionResponse> => {
    try {
      let unsignedTransactionRequest: UnsignedTransactionRequest = {
        to: unsignedTx.to as string,
        gasLimit: Number(unsignedTx.gasLimit)
      }
      if (unsignedTx.value) {
        unsignedTransactionRequest.value = unsignedTx.value;
      }
      if (unsignedTx.data) {
        unsignedTransactionRequest.data = unsignedTx.data as string;
      }
      if (unsignedTx.gasPrice) {
        unsignedTransactionRequest.gasPrice = unsignedTx.gasPrice;
      }
      if (unsignedTx.maxFeePerGas) {
        unsignedTransactionRequest.maxFeePerGas = unsignedTx.maxFeePerGas;
      }
      if (unsignedTx.maxPriorityFeePerGas) {
        unsignedTransactionRequest.maxPriorityFeePerGas = unsignedTx.maxPriorityFeePerGas;
      }
      if (unsignedTx.nonce) {
        unsignedTransactionRequest.nonce = unsignedTx.nonce;
      }
      if (unsignedTx.chainId) {
        unsignedTransactionRequest.chainId = Number(unsignedTx.chainId);
      }

      // Send transaction using Privy
      const hash = await sendTransaction(
        unsignedTransactionRequest,
        {uiOptions: {showWalletUIs: false}}
      );

      // Create a minimal TransactionResponse object that satisfies the required interface
      return {
        hash,
        wait: async () => {
          if (embeddedWallet?.provider) {
            return embeddedWallet.provider.waitForTransaction(hash.toString());
          }
          throw new Error('No provider available to wait for transaction');
        }
      } as unknown as TransactionResponse;
    } catch (error) {
      console.error('[WalletProvider] Error during embedded wallet transaction send:', error);
      throw error;
    }
  }, [embeddedWallet?.provider, sendTransaction]);

  const value = {
    currentWallet,
    address,
    signer,
    provider,
    loading,
    error,
    sessionKey,
    isInitialized,
    injectedWallet,
    embeddedWallet,
    connectMetamask,
    connectPrivyEmbedded,
    isWalletLocked,
    promptWalletUnlock,
    logout,
    networkSwitching,
    sendPrivyTransaction,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);