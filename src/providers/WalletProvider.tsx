/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { usePrivy, useWallets, useSendTransaction, UnsignedTransactionRequest  } from '@privy-io/react-auth';
import { ethers, TransactionRequest, TransactionResponse } from 'ethers';
import { useQueryClient } from '@tanstack/react-query';
import { getCharacterLocalStorageKey } from '../utils/getCharacterLocalStorageKey';
import { safeStringify } from '../utils/bigintSerializer';

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
});

interface InjectedWallet {
  address: string;
  provider: ethers.BrowserProvider;
  signer: ethers.JsonRpcSigner;
  walletType: InjectedWalletClientType;
}

interface EmbeddedWallet {
  address: string;
  provider: ethers.BrowserProvider;
  signer: ethers.JsonRpcSigner;
  walletType: string;
}

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const { 
    ready: privyReady, 
    authenticated,
    user,
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
  const {sendTransaction} = useSendTransaction();
  
  // References for timers and wallet management
  const lastEmbeddedWalletRef = useRef<string | null>(null);
  const fallbackTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
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

      if (authenticated) {
        await privyLogout();
      }
      
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
        
    // Tracking variables for wallet creation
    let foundInjectedWallet: FoundWalletInfo | null = null;
    let foundEmbeddedWallet: FoundWalletInfo | null = null;
    
    if (wallets && wallets.length > 0) {
      // Find the MetaMask wallet first
      const metamaskWallet = wallets.find((wallet: any) => wallet.walletClientType === 'metamask');

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
            } catch (e) {
              console.error('[WalletProvider] Failed to create MetaMask wallet signer:', e);
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
            } catch (e) {
              console.error('[WalletProvider] Failed to create injected wallet signer:', e);
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
          } catch (e) {
            console.error('[WalletProvider] Failed to create embedded wallet signer:', e);
          }
        }
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
      
      // Only set initialized to true if we have BOTH wallets properly set up
      const hasInjected = !!foundInjectedWallet && !!foundInjectedWallet.signer;
      const hasEmbedded = !!foundEmbeddedWallet && !!foundEmbeddedWallet.signer;
      
      if (hasInjected && hasEmbedded) {
        setIsInitialized(true);
        
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
      } else {
        // Clear current wallet state but still mark as initialized if authentication state is known
        setCurrentWallet('none');
        setSigner(null);
        setProvider(null);
        
        // Important: Set isInitialized to true even if wallets are not available
        // This allows redirect logic to work when cookies/storage are cleared
        setIsInitialized(walletsReady || !authenticated);
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

  // Detect wallet address changes and invalidate cached data
  useEffect(() => {
    const currentInjectedAddress = injectedWallet?.address || null;
    const currentEmbeddedAddress = embeddedWallet?.address || null;
    
    // Check if injected wallet address changed
    if (previousInjectedAddressRef.current !== null && 
        previousInjectedAddressRef.current !== currentInjectedAddress) {
      
      console.log('[WalletProvider] Injected wallet address changed:', {
        previous: previousInjectedAddressRef.current,
        current: currentInjectedAddress
      });
      
      // Invalidate React Query cache for the previous wallet
      if (previousInjectedAddressRef.current) {
        queryClient.invalidateQueries({ 
          queryKey: ['uiSnapshot', previousInjectedAddressRef.current] 
        });
      }
      
      // Clear localStorage for the previous wallet if it exists
      if (previousInjectedAddressRef.current) {
        const prevStorageKey = getCharacterLocalStorageKey(previousInjectedAddressRef.current);
        if (prevStorageKey) {
          localStorage.removeItem(prevStorageKey);
        }
      }
    }
    
    // Check if embedded wallet address changed
    if (previousEmbeddedAddressRef.current !== null && 
        previousEmbeddedAddressRef.current !== currentEmbeddedAddress) {
      
      console.log('[WalletProvider] Embedded wallet address changed:', {
        previous: previousEmbeddedAddressRef.current,
        current: currentEmbeddedAddress
      });
      
      // Invalidate React Query cache for embedded wallet changes
      if (currentInjectedAddress) {
        queryClient.invalidateQueries({ 
          queryKey: ['uiSnapshot', currentInjectedAddress] 
        });
      }
    }
    
    // Update refs for next comparison
    previousInjectedAddressRef.current = currentInjectedAddress;
    previousEmbeddedAddressRef.current = currentEmbeddedAddress;
    
  }, [injectedWallet?.address, embeddedWallet?.address, queryClient]);

  const connectMetamask = async () => {
    if (privyReady && !authenticated) {
      await login();
    }
  };

  const connectPrivyEmbedded = async () => {
    if (privyReady && !authenticated) {
      await login();
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
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);  