/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { usePrivy, useWallets, useSendTransaction, UnsignedTransactionRequest  } from '@privy-io/react-auth';
import { ethers, TransactionRequest, TransactionResponse } from 'ethers';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateWalletQueries } from '../hooks/utils';

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

interface WalletContextType {
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
  sendPrivyTransaction: (unsignedTx: TransactionRequest) => Promise<TransactionResponse>;
  isInitialized: boolean;
  networkSwitching: boolean;
  isWalletLocked: boolean;
  promptWalletUnlock: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType>({
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
  sendPrivyTransaction: async () => { throw new Error('Transaction function not initialized'); },
  isInitialized: false,
  networkSwitching: false,
  isWalletLocked: false,
  promptWalletUnlock: async () => undefined,
});


interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const { 
    ready: privyReady, 
    authenticated,
    login,
    logout: privyLogout,
  } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const queryClient = useQueryClient();

  const [currentWallet, setCurrentWallet] = useState<WalletType>('none');
  const [address, setAddress] = useState<string | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const [injectedWallet, setInjectedWallet] = useState<WalletInfo | null>(null);
  const [embeddedWallet, setEmbeddedWallet] = useState<WalletInfo | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [networkSwitching, setNetworkSwitching] = useState<boolean>(false);
  const [isWalletLocked, setIsWalletLocked] = useState<boolean>(false);
  const {sendTransaction} = useSendTransaction();
  
  // References for wallet management
  const lastEmbeddedWalletRef = useRef<string | null>(null);
  const previousInjectedAddressRef = useRef<string | null>(null);
  const previousEmbeddedAddressRef = useRef<string | null>(null);

  // Type for tracking found wallets
  type FoundWalletInfo = {
    address: string;
    wallet: any;
    provider: any;
    signer: any;
    walletType?: InjectedWalletClientType | "privy";
  };

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
          setNetworkSwitching(true);
          setError(null);
          
          await (window as any).ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: chainIdHex }],
          });
          
          // Wait a moment for the network switch to complete
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (switchErr: any) {
          setNetworkSwitching(false);
          
          // More specific error handling
          if (switchErr.code === 4902) {
            // Network not added to wallet
            throw new Error('Monad Testnet not found in wallet. Please add it manually.');
          } else if (switchErr.code === 4001) {
            // User rejected the request
            throw new Error('Network switch cancelled. Please switch to Monad Testnet manually.');
          } else {
            throw new Error(`Failed to switch to Monad Testnet: ${switchErr.message || 'Unknown error'}`);
          }
        } finally {
          setNetworkSwitching(false);
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

      if (authenticated) {
        await privyLogout();
      }
      
      // Clear all React Query cache on logout
      console.log('[WalletProvider] Clearing React Query cache on logout');
      queryClient.clear();
      
      // Clear state AFTER privyLogout
      setCurrentWallet('none');
      setSigner(null);
      setProvider(null);
      setAddress(null);
      setSessionKey(null);
      setInjectedWallet(null);
      setEmbeddedWallet(null);
      lastEmbeddedWalletRef.current = null;
      previousInjectedAddressRef.current = null;
      previousEmbeddedAddressRef.current = null;
      
    } catch (err: any) {
      setError(err.message || 'Logout failed');
    } finally {
      setLoading(false);
    }
  }, [authenticated, privyLogout]);

  // Sync with Privy wallets and update state
  const syncWithPrivyWallets = useCallback(async () => {
    if (!privyReady || !walletsReady || !authenticated) {
      return;
    }
    
    // Note: Removed initial lock check here since polling handles it
        
    // Tracking variables for wallet creation
    let foundInjectedWallet: FoundWalletInfo | null = null;
    let foundEmbeddedWallet: FoundWalletInfo | null = null;
    
    if (wallets && wallets.length > 0) {

      // Store the embedded wallet address for resilience
      const embeddedWallet = wallets.find((wallet: any) => wallet.connectorType === 'embedded');
      if (embeddedWallet) {
        lastEmbeddedWalletRef.current = embeddedWallet.address;
      }
      
      // Process wallets and create providers/signers
      for (const wallet of wallets) {
        if (wallet.connectorType === 'injected') {
          // If it's MetaMask, prioritize it
          if (wallet.walletClientType === 'metamask') {
            try {
              // Create provider/signer for injected wallet
              const privyProvider = await wallet.getEthereumProvider();
              const provider = new ethers.BrowserProvider(privyProvider);
              await checkAndSwitchChain(provider);
              const signer = await provider.getSigner();
              foundInjectedWallet = {
                address: wallet.address,
                wallet: wallet,
                provider,
                signer,
                walletType: wallet.walletClientType as InjectedWalletClientType
              };
            } catch (e: any) {
              console.error('[WalletProvider] Failed to create MetaMask wallet signer:', e);
              // Check if error is due to wallet being locked
              if (e.code === 4001 || e.message?.includes('unauthorized') || e.message?.includes('User rejected') || e.message?.includes('account access')) {
                console.log('[WalletProvider] MetaMask wallet appears to be locked');
                setIsWalletLocked(true);
              }
            }
          } 
          // If we don't have an injected wallet yet, use this one
          else if (!foundInjectedWallet) {
            try {
              // Create provider/signer for injected wallet
              const privyProvider = await wallet.getEthereumProvider();
              const provider = new ethers.BrowserProvider(privyProvider);
              await checkAndSwitchChain(provider);
              const signer = await provider.getSigner();
              foundInjectedWallet = {
                address: wallet.address,
                wallet: wallet,
                provider,
                signer,
                walletType: wallet.walletClientType as InjectedWalletClientType
              };
            } catch (e: any) {
              console.error('[WalletProvider] Failed to create injected wallet signer:', e);
              // Check if error is due to wallet being locked
              if (e.code === 4001 || e.message?.includes('unauthorized') || e.message?.includes('User rejected') || e.message?.includes('account access')) {
                console.log('[WalletProvider] Injected wallet appears to be locked');
                setIsWalletLocked(true);
              }
            }
          }
        } 
        // Handle embedded wallet
        else if (wallet.connectorType === 'embedded') {
          try {
            // Create provider/signer for embedded wallet
            const privyProvider = await wallet.getEthereumProvider();
            
            // Set auto-approval properties on the provider if possible
            if (privyProvider && typeof privyProvider === 'object') {
              try {
                // Set any available auto-approval properties
                (privyProvider as any).autoApprove = true;
                (privyProvider as any).autoApproveSignature = true;
                (privyProvider as any).autoApproveTransactions = true;
                (privyProvider as any).noPromptOnSignature = true;
                (privyProvider as any).noPromptOnTransaction = true;
              } catch (propErr) {
                console.warn('[WalletProvider] Could not set auto-approval properties:', propErr);
              }
            }
            
            const provider = new ethers.BrowserProvider(privyProvider);
            await checkAndSwitchChain(provider);
            const signer = await provider.getSigner();
            
            // Try to set auto-approval properties on the signer as well
            try {
              if (signer && typeof signer === 'object') {
                (signer as any).autoApprove = true;
                (signer as any).autoApproveSignature = true;
                (signer as any).autoApproveTransactions = true;
              }
            } catch (signerPropErr) {
              console.warn('[WalletProvider] Could not set auto-approval properties on signer:', signerPropErr);
            }
            
            foundEmbeddedWallet = {
              address: wallet.address,
              wallet: wallet,
              provider,
              signer,
              walletType: 'privy' as const
            };
          } catch (e: any) {
            console.error('[WalletProvider] Failed to create embedded wallet signer:', e);
          }
        }
      }

      // Clear wallet locked state if we successfully found injected wallet
      if (foundInjectedWallet) {
        setIsWalletLocked(false);
      }
      
      // Update wallet states with proper WalletInfo objects
      if (foundInjectedWallet) {
        setInjectedWallet({
          type: 'injected',
          walletClientType: foundInjectedWallet.walletType,
          address: foundInjectedWallet.address,
          signer: foundInjectedWallet.signer,
          provider: foundInjectedWallet.provider,
          privyWallet: wallets.find((w: any) => w.address === foundInjectedWallet?.address)
        });
      } else {
        setInjectedWallet(null);
      }
      
      if (foundEmbeddedWallet) {
        setEmbeddedWallet({
          type: 'embedded',
          walletClientType: 'privy',
          address: foundEmbeddedWallet.address,
          signer: foundEmbeddedWallet.signer,
          provider: foundEmbeddedWallet.provider,
          privyWallet: wallets.find((w: any) => w.address === foundEmbeddedWallet?.address)
        });
        
        // Set session key to embedded wallet address
        setSessionKey(foundEmbeddedWallet.address);
      } else {
        setEmbeddedWallet(null);
      }
      
      // Check wallet setup status
      const hasInjected = !!foundInjectedWallet && !!foundInjectedWallet.signer;
      const hasEmbedded = !!foundEmbeddedWallet && !!foundEmbeddedWallet.signer;
      
      // Always set initialized to true if we have authentication state
      setIsInitialized(true);
      
      if (hasInjected && hasEmbedded) {
        // Set active wallet based on priorities
        if (hasInjected && foundInjectedWallet) {
          setCurrentWallet('injected');
          setSigner(foundInjectedWallet.signer);
          setProvider(foundInjectedWallet.provider);
          setAddress(foundInjectedWallet.address);
        } else if (hasEmbedded && foundEmbeddedWallet) {
          setCurrentWallet('embedded');
          setSigner(foundEmbeddedWallet.signer);
          setProvider(foundEmbeddedWallet.provider);
          setAddress(foundEmbeddedWallet.address);
        }
      } else if (hasEmbedded && foundEmbeddedWallet) {
        // Only embedded wallet available (injected might be locked)
        setCurrentWallet('embedded');
        setSigner(foundEmbeddedWallet.signer);
        setProvider(foundEmbeddedWallet.provider);
        setAddress(foundEmbeddedWallet.address);
      } else {
        // No wallets available or injected wallet locked
        setCurrentWallet('none');
        setSigner(null);
        setProvider(null);
        setAddress(null);
      }
    }
  }, [privyReady, walletsReady, authenticated, wallets, checkAndSwitchChain]);

  // Check if wallets have actually changed
  useEffect(() => {
    const initWallets = async () => {
      try {
        if (authenticated && walletsReady) {
          await syncWithPrivyWallets();
        } else {
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('[WalletProvider] Error initializing wallets:', error);
        setIsInitialized(true); // Still set to true so the app can proceed
      }
    };
    
    initWallets();
  }, [authenticated, walletsReady, syncWithPrivyWallets, currentWallet, address, injectedWallet?.address, embeddedWallet?.address, sessionKey, isInitialized]);

  // Polling-based wallet lock detection (since events don't work for locking)
  useEffect(() => {
    if (!authenticated || !isInitialized) return;
    
    let pollInterval: NodeJS.Timeout;
    
    const pollWalletLockState = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          const isLocked = accounts.length === 0;
          
          if (isLocked !== isWalletLocked) {
            console.log('[WalletProvider] Wallet lock state changed:', isLocked ? 'LOCKED' : 'UNLOCKED');
            setIsWalletLocked(isLocked);
            
            if (!isLocked) {
              // Wallet was unlocked, re-sync
              setTimeout(() => syncWithPrivyWallets(), 500);
            }
          }
        } catch (error) {
          console.error('[WalletProvider] Error checking wallet lock state:', error);
          // On error, assume locked
          if (!isWalletLocked) {
            setIsWalletLocked(true);
          }
        }
      }
    };
    
    // Start polling every 2 seconds
    pollInterval = setInterval(pollWalletLockState, 2000);
    
    // Initial check
    pollWalletLockState();
    
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [authenticated, isInitialized, isWalletLocked, syncWithPrivyWallets]);
  
  // Listen for wallet events (for disconnect detection only)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccountsChanged = async (accounts: string[]) => {
        console.log('[WalletProvider] Accounts changed:', accounts);
        if (accounts.length === 0) {
          // This is disconnect, not lock
          console.log('[WalletProvider] Wallet disconnected');
          setIsWalletLocked(true);
        } else {
          // Account changed or reconnected
          console.log('[WalletProvider] Account changed/reconnected');
          setIsWalletLocked(false);
          setTimeout(() => syncWithPrivyWallets(), 500);
        }
      };

      const handleChainChanged = (chainId: string) => {
        console.log('[WalletProvider] Chain changed to:', chainId);
        setTimeout(() => syncWithPrivyWallets(), 500);
      };

      // Only listen to events for disconnect/reconnect, not lock detection
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        if (window.ethereum) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, [syncWithPrivyWallets]);

  // Detect wallet address changes and invalidate cached data
  useEffect(() => {
    const currentInjectedAddress = injectedWallet?.address || null;
    const currentEmbeddedAddress = embeddedWallet?.address || null;
    
    
    // Check if injected wallet address changed
    if (previousInjectedAddressRef.current !== null && 
        previousInjectedAddressRef.current !== currentInjectedAddress) {
      
      console.log('[WalletProvider] Injected wallet address changed - logging out from Privy to create fresh embedded wallet:', {
        previous: previousInjectedAddressRef.current,
        current: currentInjectedAddress
      });
      
      // Logout from Privy to force creation of new embedded wallet for new injected wallet
      handleLogout().then(() => {
        console.log('[WalletProvider] Privy logout completed due to wallet change');
        // The user will need to reconnect, which will create a fresh embedded wallet
      }).catch((error) => {
        console.error('[WalletProvider] Failed to logout from Privy on wallet change:', error);
      });
      
      return; // Exit early since we're logging out
    }
    
    // Check if embedded wallet address changed
    if (previousEmbeddedAddressRef.current !== null && 
        previousEmbeddedAddressRef.current !== currentEmbeddedAddress) {
      // Invalidate React Query cache for embedded wallet changes
      console.log('[WalletProvider] Embedded wallet changed - invalidating cache:', {
        previous: previousEmbeddedAddressRef.current,
        current: currentEmbeddedAddress,
        injectedAddress: currentInjectedAddress
      });
      
      if (currentInjectedAddress) {
        // Use centralized utility for wallet query invalidation
        invalidateWalletQueries(queryClient, currentInjectedAddress);
      }
    }
    
    // Update refs for next comparison
    previousInjectedAddressRef.current = currentInjectedAddress;
    previousEmbeddedAddressRef.current = currentEmbeddedAddress;
    
  }, [injectedWallet?.address, embeddedWallet?.address, queryClient]);

  const connectMetamask = async () => {
    if (privyReady && !authenticated) {
      login();
    }
  };

  const connectPrivyEmbedded = async () => {
    if (privyReady && !authenticated) {
      login();
    }
  };

  const promptWalletUnlock = useCallback(async () => {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        // Attempt to trigger wallet unlock by requesting accounts
        await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        });
        
        // Re-sync wallets after unlock attempt
        await syncWithPrivyWallets();
      } else {
        setError('No wallet extension detected');
      }
    } catch (error: any) {
      if (error.code === 4001) {
        setError('Please unlock your wallet and try again');
      } else {
        setError(error.message || 'Failed to unlock wallet');
      }
    }
  }, [syncWithPrivyWallets]);

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
  }, [embeddedWallet?.address, embeddedWallet?.provider, sendTransaction]);

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
        connectMetamask,
        connectPrivyEmbedded,
        logout: handleLogout,
        sendPrivyTransaction,
        isInitialized,
        networkSwitching,
        isWalletLocked,
        promptWalletUnlock,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);  