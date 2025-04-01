import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import * as ethers from 'ethers';
import { Wallet as EthersWallet, randomBytes } from 'ethers';

/**
 * Types of wallets we can manage:
 * - 'metamask' : user-supplied EOA via MetaMask
 * - 'embedded' : Privy Embedded wallet
 * - 'none'     : not connected
 */
type WalletType = 'metamask' | 'embedded' | 'none';

interface WalletContextValue {
  // Owner wallet (MetaMask/EOA)
  ownerWallet: {
    address: string | null;
    signer: ethers.Signer | null;
    provider: ethers.Provider | null;
    connected: boolean;
  };
  // Session key wallet (Privy Embedded)
  sessionWallet: {
    address: string | null;
    signer: ethers.Signer | null;
    provider: ethers.Provider | null;
    connected: boolean;
  };
  // Current active wallet
  currentWallet: WalletType;
  address: string | null;
  signer: ethers.Signer | null;
  provider: ethers.Provider | null;
  loading: boolean;
  error: string | null;
  // Both wallets connected
  allWalletsReady: boolean;
  connectMetamask: () => Promise<void>;
  connectPrivyEmbedded: () => Promise<void>;
  switchToOwnerWallet: () => Promise<void>;
  switchToSessionWallet: () => Promise<void>;
  logout: () => Promise<void>;
  resetEmbeddedWallet: () => Promise<boolean>;
  clearError: () => void;
  forceCreateEmbeddedWallet: () => Promise<boolean>;
}

const WalletContext = createContext<WalletContextValue>({
  ownerWallet: {
    address: null,
    signer: null,
    provider: null,
    connected: false,
  },
  sessionWallet: {
    address: null,
    signer: null,
    provider: null,
    connected: false,
  },
  currentWallet: 'none',
  address: null,
  signer: null,
  provider: null,
  loading: false,
  error: null,
  allWalletsReady: false,
  connectMetamask: async () => undefined,
  connectPrivyEmbedded: async () => undefined,
  switchToOwnerWallet: async () => undefined,
  switchToSessionWallet: async () => undefined,
  logout: async () => undefined,
  resetEmbeddedWallet: async () => false,
  clearError: () => undefined,
  forceCreateEmbeddedWallet: async () => false,
});

// Constants for RPC connection
const RPC_URL = "https://rpc-testnet.monadinfra.com/rpc/Dp2u0HD0WxKQEvgmaiT4dwCeH9J14C24";
const CHAIN_ID = 10143;

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Track Privy's authentication state
  const { login, authenticated, user, logout, connectWallet: privyConnectWallet } = usePrivy();
  
  // Get the list of wallets from Privy
  const { wallets } = useWallets();
  
  // Get Privy App ID from environment variables with fallback
  const privyAppId = import.meta.env.VITE_PRIVY_APP_ID || "cm8y2nx5c00tqbiy22u72uzc9";
  
  // Track if we've already attempted to connect MetaMask to avoid repeated prompts
  const hasAttemptedMetaMaskConnection = useRef(false);
  
  // Track embedded wallet creation attempts to avoid conflicts
  const creatingEmbeddedWallet = useRef(false);
  const lastCreationAttempt = useRef(0);
  
  // Additional flags to control concurrent processes
  const walletOperationInProgress = useRef(false);
  const autoConnectDisabled = useRef(false);
  const autoConnectRunning = useRef(false);
  const syncRunning = useRef(false);

  // Owner wallet (MetaMask/EOA)
  const [ownerWallet, setOwnerWallet] = useState<{
    address: string | null;
    signer: ethers.Signer | null;
    provider: ethers.Provider | null;
    connected: boolean;
  }>({
    address: null,
    signer: null,
    provider: null,
    connected: false,
  });

  // Session key wallet (Privy Embedded)
  const [sessionWallet, setSessionWallet] = useState<{
    address: string | null;
    signer: ethers.Signer | null;
    provider: ethers.Provider | null;
    connected: boolean;
  }>({
    address: null,
    signer: null,
    provider: null,
    connected: false,
  });

  // Current active wallet type
  const [currentWallet, setCurrentWallet] = useState<WalletType>('none');

  // Current active wallet details (points to either owner or session)
  const [address, setAddress] = useState<string | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [provider, setProvider] = useState<ethers.Provider | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Flag to indicate both wallets are connected
  const [allWalletsReady, setAllWalletsReady] = useState(false);

  const desiredChainId = 10143; // Monad Testnet

  // Helper to check if MetaMask is already connected
  const isMetaMaskConnected = useCallback(async (): Promise<boolean> => {
    if (!(window as any).ethereum) {
      return false;
    }
    
    try {
      // This shouldn't trigger a connection prompt, just check existing accounts
      const accounts = await (window as any).ethereum.request({ 
        method: 'eth_accounts' 
      });
      return accounts && accounts.length > 0;
    } catch (err) {
      console.error("Error checking if MetaMask is connected:", err);
      return false;
    }
  }, []);

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
   * Connect via Privy Embedded wallet (session key).
   */
  const connectPrivyEmbedded = useCallback(async () => {
    // If an operation is already in progress, don't start another one
    if (walletOperationInProgress.current) {
      console.log("WALLET-DEBUG: Another wallet operation is already in progress, skipping this connectPrivyEmbedded call");
      return;
    }
    
    // CRITICAL FIX: Verify authentication before proceeding
    // Since the authenticated state might not be immediately reflected after login
    // We need to double-check and wait if needed
    let isAuthenticated = authenticated;
    
    if (!isAuthenticated) {
      console.log('WALLET-DEBUG: Not authenticated, checking localStorage');
      
      // Try to detect if we're in a state where authentication just happened but state hasn't updated
      const privyAuthState = localStorage.getItem('privy:auth:state');
      
      if (privyAuthState && privyAuthState.includes('authenticated')) {
        console.log('WALLET-DEBUG: Found authenticated state in localStorage despite React state not showing it');
        isAuthenticated = true;
      } else {
        console.log('WALLET-DEBUG: Not authenticated in React state or localStorage, cannot create embedded wallet');
        setError('Authentication required. Please refresh the page and try again.');
        return;
      }
    } else {
      console.log('WALLET-DEBUG: Authenticated according to React state');
    }
    
    if (!user) {
      console.log('WALLET-DEBUG: User object not available, waiting...');
      // Wait up to 5 seconds for user object to be available
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        if (user) {
          console.log('WALLET-DEBUG: User object became available after waiting');
          break;
        }
      }
      
      // If still no user after waiting, fail
      if (!user) {
        console.log('WALLET-DEBUG: User object still not available after waiting, aborting embedded wallet connection');
        setError('User data not available. Please refresh and try again.');
        return;
      }
    }

    // Require owner wallet to be connected before proceeding
    if (!ownerWallet.connected) {
      setError('Owner wallet must be connected before creating or connecting embedded wallet');
      console.log('WALLET-DEBUG: Cannot connect embedded wallet: Owner wallet not connected');
      return;
    }

    // If already connected, don't reconnect
    if (sessionWallet.connected) {
      console.log("WALLET-DEBUG: Embedded wallet already connected:", sessionWallet.address);
      return;
    }

    // Set global operation lock to prevent any other wallet operations
    walletOperationInProgress.current = true;
    
    // Disable auto-connect while we're manually connecting
    autoConnectDisabled.current = true;

    console.log("WALLET-DEBUG: Starting embedded wallet connection from connectPrivyEmbedded");
    console.log("WALLET-DEBUG: Current Privy state - authenticated:", isAuthenticated, "user:", user?.id, "wallets count:", wallets.length);
    
    // Add a short delay before proceeding to ensure we're not in the middle of a render
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      // Check if we already have an embedded wallet in the wallets array
      const embeddedWallets = wallets.filter(w => w.walletClientType === 'privy');
      
      console.log("WALLET-DEBUG: Available wallets:", wallets.map(w => `${w.address} (${w.walletClientType})`).join(', '));
      console.log("WALLET-DEBUG: Found", embeddedWallets.length, "embedded wallets");
      
      if (embeddedWallets.length > 0) {
        // We found an embedded wallet, connect to it
        const embeddedWallet = embeddedWallets[0];
        console.log("WALLET-DEBUG: Connecting to existing embedded wallet:", embeddedWallet.address);
        
        // Connect to the embedded wallet
        try {
          await privyConnectWallet({ connector: 'embedded' } as any);
          
          // Check if chain is correct
          if (embeddedWallet.chainId && Number(embeddedWallet.chainId) !== desiredChainId) {
            // Use safe approach for accessing provider
            if (window.ethereum) {
              await checkAndSwitchChain(new ethers.BrowserProvider(window.ethereum));
            }
          }
          
          // Update session wallet state
          setSessionWallet({
            address: embeddedWallet.address,
            signer: null,
            provider: null,
            connected: true,
          });
          
          console.log("WALLET-DEBUG: Successfully connected to embedded wallet:", embeddedWallet.address);
          
          // Auto-switch to session wallet
          setCurrentWallet('embedded');
        } catch (err) {
          console.error("WALLET-DEBUG: Error connecting to existing embedded wallet:", err);
          setError(`Failed to connect to embedded wallet: ${(err as any)?.message || 'Unknown error'}`);
        }
      } else {
        // No embedded wallet found, create one
        console.log("WALLET-DEBUG: No embedded wallet found, creating new one...");
        
        // Check if we're already attempting to create a wallet
        if (creatingEmbeddedWallet.current) {
          console.log("WALLET-DEBUG: Already creating embedded wallet, skipping duplicate request");
          walletOperationInProgress.current = false;
          return;
        }
        
        // Prevent multiple simultaneous creation attempts
        creatingEmbeddedWallet.current = true;
        lastCreationAttempt.current = Date.now();
        
        try {
          console.log("WALLET-DEBUG: Creating embedded wallet NOW...");
          
          // Check if any iframes are in a broken state and attempt to reset them
          const privyIframes = document.querySelectorAll('iframe[src*="privy"]');
          console.log(`WALLET-DEBUG: Found ${privyIframes.length} Privy iframes before wallet creation`);
          
          // Clear storage issue marker if present
          try {
            if (localStorage.getItem('privy:embedded-wallet-being-created')) {
              console.log("WALLET-DEBUG: Found stale wallet creation marker in localStorage, clearing it");
              localStorage.removeItem('privy:embedded-wallet-being-created');
            }
            
            // Set our own marker
            localStorage.setItem('embedded-wallet-creation-attempt', Date.now().toString());
          } catch (e) {
            console.log("WALLET-DEBUG: Unable to access localStorage", e);
          }
          
          // Call privyConnectWallet with createWallet option - wrap in a try/catch
          let creationSuccess = false;
          try {
            console.log("WALLET-DEBUG: Calling privyConnectWallet with embedded+createWallet=true");
            
            // Force Privy to create a new embedded wallet with explicit options
            await privyConnectWallet({ 
              connector: 'embedded', 
              createWallet: true,
              forceCreate: true  // Extra option to try to force creation
            } as any);
            
            console.log("WALLET-DEBUG: privyConnectWallet call completed successfully");
            creationSuccess = true;
          } catch (createErr: any) {
            // If we get an error that contains "already exists", it means the wallet exists but isn't showing in the list
            if (createErr?.message?.includes('already exists') || createErr?.message?.includes('wallet already exists')) {
              console.log("WALLET-DEBUG: Wallet already exists but isn't showing in wallets list. Will try connecting.");
              
              try {
                // Try to connect to the wallet
                await privyConnectWallet({ connector: 'embedded' } as any);
                console.log("WALLET-DEBUG: Connected to existing embedded wallet after create error");
                
                // Assume success, updated wallet state will be handled by useEffect
                creatingEmbeddedWallet.current = false;
                walletOperationInProgress.current = false;
                return;
              } catch (connectErr) {
                console.error("WALLET-DEBUG: Error connecting to existing wallet:", connectErr);
              }
            } else {
              console.error("WALLET-DEBUG: Error in privyConnectWallet call:", createErr);
            }
          }
          
          // Wait much longer for wallet to show up in wallets list - Privy can be slow
          console.log("WALLET-DEBUG: Waiting for embedded wallet to appear in Privy wallets list");
          
          // Try multiple times with increasing delays 
          let totalWaitTime = 0;
          const maxWaitTime = 15000; // 15 seconds max wait
          
          for (let attempt = 1; attempt <= 5; attempt++) {
            const waitTime = Math.min(attempt * 1000, 3000); // Increasing wait times
            console.log(`WALLET-DEBUG: Wait attempt ${attempt}, waiting ${waitTime}ms...`);
            
            await new Promise(resolve => setTimeout(resolve, waitTime));
            totalWaitTime += waitTime;
            
            // Force refresh wallets list by calling refreshWallets if available
            // Note: Direct refresh not available, we'll rely on Privy's internal state updates
            try {
              console.log("WALLET-DEBUG: Manually refreshing wallets list via reconnect attempt");
              // Try to trigger a refresh by calling connectWallet again
              try {
                await privyConnectWallet({ 
                  connector: 'embedded',
                  silent: true 
                } as any);
              } catch (refreshErr) {
                // Ignore errors during silent refresh attempt
                console.log("WALLET-DEBUG: Expected error during silent refresh attempt");
              }
            } catch (e) {
              console.log("WALLET-DEBUG: Error during manual wallet refresh", e);
            }
            
            // Check for embedded wallet after delay
            const newWallets = wallets.filter(wallet => wallet.walletClientType === 'privy');
            console.log(`WALLET-DEBUG: After waiting (attempt ${attempt}), found ${newWallets.length} embedded wallets`);
            
            if (newWallets.length > 0) {
              // Wallet was found, try to connect to it
              const newWallet = newWallets[0];
              console.log("WALLET-DEBUG: Successfully found embedded wallet:", newWallet.address);
              
              try {
                // Connect to the wallet
                console.log("WALLET-DEBUG: Connecting to discovered embedded wallet");
                await privyConnectWallet({ connector: 'embedded' } as any);
                console.log("WALLET-DEBUG: Successfully connected to embedded wallet");
                
                // Update session wallet state
                setSessionWallet({
                  address: newWallet.address,
                  signer: null,
                  provider: null,
                  connected: true,
                });
                
                // Auto-switch to session wallet
                setCurrentWallet('embedded');
                
                // Success! Break out of the retry loop
                creatingEmbeddedWallet.current = false;
                walletOperationInProgress.current = false;
                return;
              } catch (connectErr) {
                console.error("WALLET-DEBUG: Error connecting to embedded wallet:", connectErr);
              }
            }
            
            // If we've waited too long, break out of the loop
            if (totalWaitTime >= maxWaitTime) {
              console.log("WALLET-DEBUG: Max wait time reached, giving up on wallet creation");
              break;
            }
          }
          
          // If we get here, we still haven't found an embedded wallet - try one more approach
          console.error("WALLET-DEBUG: Failed to create embedded wallet - no wallet found after creation");
          setError('Failed to create embedded wallet. Please try again using the manual button below.');
          
          // Last resort recovery - try to force UI refresh and manual control
          try {
            // Display error UI with manual button (handled by error state in the UI)
            console.log("WALLET-DEBUG: Setting up manual wallet creation fallback");
            
            // One last attempt with a different approach - use a direct method
            console.log("WALLET-DEBUG: Trying final approach to create embedded wallet");
            await privyConnectWallet({ 
              connector: 'privy',
              createEmbeddedWallet: true
            } as any);
            console.log("WALLET-DEBUG: Final approach completed");
          } catch (lastErr) {
            console.error("WALLET-DEBUG: Final approach failed:", lastErr);
          }
        } catch (err) {
          console.error("WALLET-DEBUG: Error in embedded wallet creation:", err);
          setError(`Failed to create embedded wallet: ${(err as any)?.message || 'Unknown error'} - Try using the manual button.`);
        } finally {
          setTimeout(() => {
            creatingEmbeddedWallet.current = false;
            walletOperationInProgress.current = false;
            console.log("WALLET-DEBUG: Released wallet creation locks");
          }, 1000);
        }
      }
    } catch (err) {
      console.error("WALLET-DEBUG: Uncaught error in connectPrivyEmbedded:", err);
      setError(`Unexpected error: ${(err as any)?.message || 'Unknown error'}`);
      walletOperationInProgress.current = false;
      creatingEmbeddedWallet.current = false;
    } finally {
      autoConnectDisabled.current = false;
    }
  }, [authenticated, user, privyConnectWallet, checkAndSwitchChain, wallets, sessionWallet.connected, sessionWallet.address, ownerWallet.connected, ownerWallet.address]);

  // Connect to MetaMask
  const connectMetamask = async () => {
    if (walletOperationInProgress.current) {
      console.log("Another wallet operation in progress, skipping MetaMask connection");
      return;
    }

    // If already connected, just update UI and return
    if (ownerWallet.connected && ownerWallet.address) {
      console.log("MetaMask already connected:", ownerWallet.address);
      
      // Make sure we have a signer and provider setup
      if (!ownerWallet.signer || !ownerWallet.provider) {
        console.log("MetaMask connected but signer/provider not set up, creating them now");
        try {
          if (window.ethereum) {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            console.log("Created signer for already connected MetaMask wallet");
            
            setOwnerWallet({
              ...ownerWallet,
              signer,
              provider,
            });
          }
        } catch (err) {
          console.error("Error creating signer for already connected MetaMask:", err);
        }
      }
      return;
    }

    walletOperationInProgress.current = true;
    setLoading(true);

    try {
      console.log("Connecting to MetaMask...");
      
      // First check if MetaMask is installed
      if (!(window as any).ethereum) {
        throw new Error("MetaMask not installed or detected");
      }
      
      let wallet: any = null;
      
      // First, check if we have a connected Privy wallets already
      const metamaskWallet = wallets.find(w => 
        w.walletClientType === 'injected' && 
        !w.address.includes(':')
      );
      
      if (metamaskWallet) {
        console.log("Found already connected MetaMask wallet in Privy:", metamaskWallet.address);
        wallet = metamaskWallet;
      } else {
        // Try to get existing connected accounts without prompting
        try {
          const accounts = await (window as any).ethereum.request({ 
            method: 'eth_accounts' 
          });
          
          if (accounts && accounts.length > 0) {
            console.log("Found MetaMask accounts without prompting:", accounts[0]);
            // Create a wallet-like object
            wallet = {
              address: accounts[0],
              walletClientType: 'injected'
            };
          }
        } catch (err) {
          console.log("Error checking existing MetaMask accounts:", err);
          // Continue to connection attempt
        }
        
        // Need to connect wallet if not already connected
        if (!wallet) {
          try {
            console.log("Connecting to MetaMask via Privy...");
            
            // First try with Privy's connectWallet
            await privyConnectWallet({ 
              connector: 'injected'
            } as any);
            
            // Wait a moment for Privy to update
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Check if connection was successful by looking at Privy wallets
            const foundWallet = wallets.find(w => 
              w.walletClientType === 'injected' && 
              !w.address.includes(':')
            );
            
            if (foundWallet) {
              wallet = foundWallet;
            } else {
              // Fall back to direct connection if Privy method fails
              const accounts = await (window as any).ethereum.request({ 
                method: 'eth_requestAccounts' 
              });
              
              if (accounts && accounts.length > 0) {
                wallet = {
                  address: accounts[0],
                  walletClientType: 'injected'
                };
              } else {
                throw new Error("No accounts returned from MetaMask");
              }
            }
          } catch (err) {
            console.error("Error connecting to MetaMask:", err);
            throw new Error("Failed to connect MetaMask");
          }
        }
      }
      
      // Create ethers provider and signer from connected wallet
      let provider: ethers.BrowserProvider | null = null;
      let signer: ethers.Signer | null = null;
      
      try {
        if (window.ethereum) {
          console.log("Creating provider and signer for MetaMask wallet");
          provider = new ethers.BrowserProvider(window.ethereum);
          signer = await provider.getSigner();
          console.log("Successfully created signer for wallet address:", await signer.getAddress());
        }
      } catch (signerErr) {
        console.error("Error creating provider/signer for MetaMask:", signerErr);
        // Continue with just the address
      }
      
      // Update state with connected wallet
      if (wallet && wallet.address) {
        console.log("Successfully connected to MetaMask wallet:", wallet.address);
        setOwnerWallet({
          address: wallet.address,
          signer,
          provider,
          connected: true,
        });
        
        // Set current wallet to metamask
        setCurrentWallet('metamask');
        
        // Track that we've attempted connection
        hasAttemptedMetaMaskConnection.current = true;
      } else {
        throw new Error("Could not find MetaMask wallet after connection");
      }
    } catch (error: any) {
      console.error("Error connecting MetaMask:", error);
      setOwnerWallet({
        address: null,
        signer: null,
        provider: null,
        connected: false,
      });
      throw error;
    } finally {
      setLoading(false);
      walletOperationInProgress.current = false;
    }
  };

  // Update current active wallet when switching between owner and session
  useEffect(() => {
    // Set the current wallet's address, signer, and provider based on selected wallet type
    if (currentWallet === 'metamask') {
      setAddress(ownerWallet.address);
      setSigner(ownerWallet.signer);
      setProvider(ownerWallet.provider);
    } else if (currentWallet === 'embedded') {
      setAddress(sessionWallet.address);
      setSigner(sessionWallet.signer);
      setProvider(sessionWallet.provider);
    } else {
      setAddress(null);
      setSigner(null);
      setProvider(null);
    }
    
    // Check if both wallets are connected
    const bothWalletsConnected = ownerWallet.connected && sessionWallet.connected;
    setAllWalletsReady(bothWalletsConnected);
    
    // If we just connected both wallets, log it
    if (bothWalletsConnected) {
      console.log("Both wallets are now connected:", {
        owner: ownerWallet.address,
        session: sessionWallet.address
      });
    }
  }, [currentWallet, ownerWallet, sessionWallet]);

  /**
   * Switch to owner wallet (MetaMask) for operations.
   */
  const switchToOwnerWallet = useCallback(async () => {
    if (!ownerWallet.connected) {
      throw new Error('Owner wallet not connected');
    }
    setCurrentWallet('metamask');
  }, [ownerWallet.connected]);

  /**
   * Switch to session wallet (Embedded) for operations.
   */
  const switchToSessionWallet = useCallback(async () => {
    if (!sessionWallet.connected) {
      throw new Error('Session wallet not connected');
    }
    setCurrentWallet('embedded');
  }, [sessionWallet.connected]);

  /**
   * Logout from Privy (if authenticated) and clear wallet states.
   */
  const handleLogout = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Reset wallet states
      setOwnerWallet({
        address: null,
        signer: null,
        provider: null,
        connected: false,
      });
      
      setSessionWallet({
        address: null,
        signer: null,
        provider: null,
        connected: false,
      });
      
      setCurrentWallet('none');
      setAllWalletsReady(false);
      
      // Reset connection tracking on logout
      hasAttemptedMetaMaskConnection.current = false;

      // Also call the Privy logout if user is authenticated
      if (authenticated) {
        await logout();
      }
    } catch (err: any) {
      setError(err.message || 'Logout failed');
    } finally {
      setLoading(false);
    }
  }, [authenticated, logout]);

  // Check for existing MetaMask connection on mount
  useEffect(() => {
    const checkExistingMetaMask = async () => {
      try {
        // Only check once and only if not already connected and not in progress
        if (ownerWallet.connected || walletOperationInProgress.current || hasAttemptedMetaMaskConnection.current) {
          return;
        }
        
        // Don't prompt the user, just check if already connected
        const connected = await isMetaMaskConnected();
        
        if (connected) {
          console.log("Existing MetaMask connection detected on mount");
          hasAttemptedMetaMaskConnection.current = true;
          
          try {
            // Get accounts without prompting
            const accounts = await (window as any).ethereum.request({ 
              method: 'eth_accounts' 
            });
            
            if (accounts && accounts.length > 0) {
              // Set the wallet directly rather than calling connectMetamask
              // to avoid potential connection loops or race conditions
              console.log("Setting existing MetaMask connection:", accounts[0]);
              setOwnerWallet({
                address: accounts[0],
                signer: null,
                provider: null,
                connected: true,
              });
            }
          } catch (err) {
            console.error("Error retrieving existing MetaMask accounts:", err);
          }
        }
      } catch (err) {
        console.error("Error checking for existing MetaMask connection:", err);
      }
    };
    
    checkExistingMetaMask();
  }, [isMetaMaskConnected, ownerWallet.connected]);

  // Implement autoConnectEmbedded to work with Privy's authentication flow
  const autoConnectEmbedded = useCallback(async () => {
    if (walletOperationInProgress.current || autoConnectRunning.current) {
      console.log("Skipping autoConnectEmbedded - operation in progress");
      return;
    }

    console.log("Attempting to auto-connect embedded wallet");
    
    try {
      autoConnectRunning.current = true;

      // Check if already authenticated and the owner wallet is connected
      if (!authenticated) {
        console.log("Not authenticated, cannot create embedded wallet");
        autoConnectRunning.current = false;
        return;
      }

      if (!ownerWallet.connected) {
        console.log("Owner wallet not connected, cannot create embedded wallet");
        autoConnectRunning.current = false;
        return;
      }

      // Skip if session wallet is already connected
      if (sessionWallet.connected) {
        console.log("Session wallet already connected:", sessionWallet.address);
        autoConnectRunning.current = false;
        return;
      }

      console.log("All conditions met to create/connect embedded wallet");

      // Check for existing embedded wallet
      const embeddedWallets = wallets.filter(wallet => wallet.walletClientType === 'privy');
      console.log("Found", embeddedWallets.length, "embedded wallets");
      
      if (embeddedWallets.length > 0) {
        // Connect to existing embedded wallet
        const wallet = embeddedWallets[0];
        console.log("Connecting to existing embedded wallet:", wallet.address);
        
        await privyConnectWallet({ connector: 'embedded' } as any);
        
        console.log("Successfully connected to existing embedded wallet");
      } else {
        // No embedded wallet found, create a new one
        console.log("No embedded wallet found - creating a new one");
        
        // Use Privy's API to create an embedded wallet
        await privyConnectWallet({ 
          connector: 'embedded',
          createWallet: true 
        } as any);
        
        console.log("Embedded wallet creation initiated");
      }
    } catch (error) {
      console.error("Error in autoConnectEmbedded:", error);
    } finally {
      autoConnectRunning.current = false;
    }
  }, [authenticated, ownerWallet.connected, sessionWallet.connected, privyConnectWallet, wallets]);

  // Simplified syncWithPrivyWallets function
  const syncWithPrivyWallets = useCallback(async () => {
    // Don't run if already syncing or during other operations
    if (syncRunning.current || walletOperationInProgress.current) {
      return;
    }

    try {
      syncRunning.current = true;
      
      console.log("Syncing with Privy wallets...");
      console.log("Current state:", {
        authenticated,
        ownerWalletConnected: ownerWallet.connected,
        sessionWalletConnected: sessionWallet.connected,
        walletCount: wallets.length,
        autoConnectDisabled: autoConnectDisabled.current
      });
      
      // Don't proceed if not authenticated
      if (!authenticated || !user) {
        console.log("Not authenticated or no user, skipping sync");
          return;
        }
      
      // Check wallets and update state
      console.log("Checking wallets:", wallets.map(w => `${w.address} (${w.walletClientType})`).join(', '));
      
      // Look for metamask wallet (injected)
      const metamaskWallet = wallets.find(w => 
        (w.walletClientType === 'injected' || w.walletClientType === 'metamask') &&
        !w.address.includes(':')
      );
      
      // Look for embedded wallet (privy)
      const embeddedWallet = wallets.find(w => w.walletClientType === 'privy');
      
      // Update owner wallet state if found
      if (metamaskWallet && (!ownerWallet.connected || ownerWallet.address !== metamaskWallet.address)) {
        console.log("Updating owner wallet status with:", metamaskWallet.address);
        setOwnerWallet({
          address: metamaskWallet.address,
          signer: null,
          provider: null,
          connected: true,
        });
      }
      
      // Update session wallet state if found
      if (embeddedWallet && (!sessionWallet.connected || sessionWallet.address !== embeddedWallet.address)) {
        console.log("Updating session wallet status with:", embeddedWallet.address);
        setSessionWallet({
          address: embeddedWallet.address,
          signer: null,
          provider: null,
          connected: true,
        });
      }
      
      // If owner wallet is connected but no embedded wallet exists, create one
      if (ownerWallet.connected && !embeddedWallet && !autoConnectDisabled.current) {
        console.log("No embedded wallet found during sync but owner is connected and authenticated. Creating embedded wallet...");
        // Schedule this to avoid doing it during render
        setTimeout(() => {
          autoConnectEmbedded();
        }, 500);
      }
    } catch (error) {
      console.error("Error syncing with Privy wallets:", error);
    } finally {
      syncRunning.current = false;
      console.log("Sync operation complete");
    }
  }, [authenticated, user, wallets, ownerWallet.connected, sessionWallet.connected, autoConnectEmbedded]);

  // Force resync if authentication status changes
  useEffect(() => {
    if (!authenticated) {
      setOwnerWallet({
        address: null,
        signer: null,
        provider: null,
        connected: false,
      });
      
      setSessionWallet({
        address: null,
        signer: null,
        provider: null,
        connected: false,
      });
      
      setCurrentWallet('none');
      setAllWalletsReady(false);
      
      // Reset connection tracking on logout
      hasAttemptedMetaMaskConnection.current = false;
    }
  }, [authenticated]);

  // Implement a timeout to prevent getting stuck in loading state
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn("WalletProvider stuck in loading state. Forcing reset...");
        setLoading(false);
      }
    }, 10000);
    
    return () => clearTimeout(timeout);
  }, [loading]);

  /**
   * Reset the embedded wallet connection state.
   * This is useful when the wallet connection is stuck.
   */
  const resetEmbeddedWallet = useCallback(async () => {
    try {
      console.log("Resetting embedded wallet connection state");
      
      // Stop any ongoing operations
      walletOperationInProgress.current = true;
      
      // Release any creation locks
      creatingEmbeddedWallet.current = false;
      lastCreationAttempt.current = 0;
      
      // Temporarily disable auto-connect during reset
      autoConnectDisabled.current = true;
      
      // Reset session wallet state
      setSessionWallet({
        address: null,
        signer: null,
        provider: null,
        connected: false,
      });
      
      // Instead of manipulating DOM directly, we'll just wait
      // This gives time for React to properly unmount components
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log("Embedded wallet reset complete");
      
      // Release locks after a delay to ensure no operations start immediately after reset
      setTimeout(() => {
        walletOperationInProgress.current = false;
        autoConnectDisabled.current = false;
      }, 1000);
      
      return true;
    } catch (err) {
      console.error("Error resetting embedded wallet:", err);
      
      // Make sure locks are released even if there's an error
      setTimeout(() => {
        walletOperationInProgress.current = false;
        autoConnectDisabled.current = false;
        creatingEmbeddedWallet.current = false;
      }, 1000);
      
      return false;
    }
  }, []);

  // Direct method for creating an embedded wallet using DOM manipulation
  // This is a last-resort approach when the normal Privy API fails
  const forceCreateEmbeddedWallet = useCallback(async () => {
    console.log("WALLET-DEBUG: Using direct DOM-based method to force embedded wallet creation");
    
    try {
      // First try the normal API method
      await privyConnectWallet({ 
        connector: 'embedded',
        createWallet: true,
        forceCreate: true
      } as any);
      
      // Wait for a short time to see if it worked
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Look for embedded wallet in wallets list
      const embeddedWallet = wallets.find(wallet => wallet.walletClientType === 'privy');
      
      if (embeddedWallet) {
        console.log("WALLET-DEBUG: Found embedded wallet using standard method:", embeddedWallet.address);
        return true;
      }
      
      // If we get here, we need to try the DOM-based approach
      console.log("WALLET-DEBUG: Standard method failed, attempting DOM-based approach");
      
      // First, let's forcibly remove any broken iframes
      const existingIframes = document.querySelectorAll('iframe[src*="privy"]');
      console.log(`WALLET-DEBUG: Found ${existingIframes.length} existing Privy iframes, removing them`);
      existingIframes.forEach(iframe => iframe.remove());
      
      // Clear any error state in local storage
      try {
        const keysToRemove = Object.keys(localStorage)
          .filter(key => key.includes('privy:iframe') || key.includes('privy:error'));
        
        console.log(`WALLET-DEBUG: Clearing ${keysToRemove.length} problematic localStorage keys`);
        keysToRemove.forEach(key => localStorage.removeItem(key));
      } catch (e) {
        console.log("WALLET-DEBUG: Error cleaning localStorage", e);
      }
      
      // Find or create the Privy container
      let privyContainer = document.querySelector('#privy-dialog-container');
      
      if (!privyContainer) {
        console.log("WALLET-DEBUG: No Privy container found, creating one");
        privyContainer = document.createElement('div');
        privyContainer.id = 'privy-dialog-container';
        document.body.appendChild(privyContainer);
      }
      
      // Create a custom iframe targeting Privy's embedded wallet creation directly
      const customIframe = document.createElement('iframe');
      customIframe.style.display = 'none'; // Hidden initially
      
      // Target the Privy embedded wallet creation URL directly
      customIframe.src = `https://embedded.privy.io/wallet?dappId=${privyAppId}&action=create`;
      customIframe.id = 'privy-custom-iframe';
      customIframe.allow = 'clipboard-read; clipboard-write';
      document.body.appendChild(customIframe);
      
      console.log("WALLET-DEBUG: Created custom iframe to force wallet creation");
      
      // Wait a moment then try to trigger Privy's API again
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Try to reuse the Privy API now that we have a fresh iframe
      try {
        await privyConnectWallet({ 
          connector: 'embedded',
          createWallet: true
        } as any);
        
        // Wait to see if the wallet appears
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check if it worked this time
        const newWallet = wallets.find(wallet => wallet.walletClientType === 'privy');
        if (newWallet) {
          console.log("WALLET-DEBUG: Successfully created wallet after iframe reset:", newWallet.address);
          return true;
        }
      } catch (e) {
        console.log("WALLET-DEBUG: Error after iframe reset:", e);
      }
      
      // As a last resort, try to simulate UI interactions
      console.log("WALLET-DEBUG: Attempting to simulate UI interactions");
      
      // Find and click any buttons related to wallet creation
      try {
        // Find any elements related to embedded wallet creation
        const walletButtons = Array.from(document.querySelectorAll('button'))
          .filter(btn => {
            const text = btn.textContent?.toLowerCase() || '';
            return (text.includes('wallet') || text.includes('create') || text.includes('connect')) &&
                   !text.includes('metamask');
          });
        
        console.log(`WALLET-DEBUG: Found ${walletButtons.length} potential wallet creation buttons`);
        
        // Click all potential buttons one by one
        for (const btn of walletButtons) {
          console.log("WALLET-DEBUG: Clicking button:", btn.textContent);
          btn.click();
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Wait for wallet to appear
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Final check for wallet
        const finalWallet = wallets.find(wallet => wallet.walletClientType === 'privy');
        if (finalWallet) {
          console.log("WALLET-DEBUG: Wallet created after UI simulation:", finalWallet.address);
          return true;
        }
      } catch (e) {
        console.error("WALLET-DEBUG: Error during UI simulation:", e);
      }
      
      console.log("WALLET-DEBUG: All embedded wallet creation attempts failed");
      return false;
    } catch (e) {
      console.error("WALLET-DEBUG: Error during force-create operation:", e);
      return false;
    }
  }, [privyConnectWallet, wallets, privyAppId]);

  // Add this function to generate a local session wallet
  const createLocalSessionWallet = useCallback(async () => {
    console.log("Creating local session wallet as fallback for Privy embedded wallet");
    
    try {
      // Generate a random private key
      const privateKey = '0x' + Array.from(randomBytes(32))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      // Create a provider
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      
      // Create a wallet with provider
      const wallet = new EthersWallet(privateKey, provider);
      
      // Store the wallet in localStorage (only for development)
      if (import.meta.env.DEV) {
        try {
          localStorage.setItem('local_session_wallet', JSON.stringify({
            address: wallet.address,
            privateKey: privateKey
          }));
          console.log("Local session wallet stored in localStorage (DEV MODE ONLY)");
        } catch (e) {
          console.error("Failed to store local session wallet in localStorage:", e);
        }
      }
      
      // Update session wallet state
      setSessionWallet({
        address: wallet.address,
        signer: wallet,
        provider: provider,
        connected: true,
      });
      
      console.log("Created local session wallet:", wallet.address);
      
      // Show a warning that this is a fallback mechanism
      console.warn(
        "FALLBACK MODE: Privy embedded wallet creation failed. Using a locally generated session wallet as fallback. " +
        "This is less secure but allows you to continue using the app."
      );
      
      return true;
    } catch (err) {
      console.error("Error creating local session wallet:", err);
      setError("Failed to create local session wallet: " + (err as any)?.message || "Unknown error");
      return false;
    }
  }, []);

  /**
   * Context value to be provided
   */
  const contextValue: WalletContextValue = useMemo(() => ({
    ownerWallet,
    sessionWallet,
    currentWallet,
    allWalletsReady: ownerWallet.connected && sessionWallet.connected,
    loading,
    error,
    // Current wallet properties
    address: currentWallet === 'metamask' ? ownerWallet.address : sessionWallet.address,
    signer: currentWallet === 'metamask' ? ownerWallet.signer : sessionWallet.signer,
    provider: currentWallet === 'metamask' ? ownerWallet.provider : sessionWallet.provider,
    // Actions
    connectMetamask,
    connectPrivyEmbedded,
    switchToOwnerWallet,
    switchToSessionWallet,
    logout: handleLogout,
    resetEmbeddedWallet,
    clearError: () => setError(null),
    // Add the force create function
    forceCreateEmbeddedWallet,
  }), [
    ownerWallet, 
    sessionWallet, 
    currentWallet,
    loading, 
    error,
    connectMetamask,
    connectPrivyEmbedded,
    switchToOwnerWallet,
    switchToSessionWallet,
    handleLogout,
    resetEmbeddedWallet,
    forceCreateEmbeddedWallet
  ]);

  // Auto-connect on mount (if possible)
  useEffect(() => {
    // Only run this once on first mount
    if (autoConnectRunning.current) return;
    autoConnectRunning.current = true;
    
    console.log("WalletProvider: Running auto-connect on mount");
    
    const attemptConnection = async () => {
      // Skip auto-connect if connection is already in progress
      if (walletOperationInProgress.current) {
        console.log("WalletProvider: Skipping auto-connect, another operation in progress");
        return;
      }
      
      // Only attempt MetaMask auto-connect if not already connected
      // This prevents redundant reconnection attempts
      if (!ownerWallet.connected) {
        try {
          console.log("WalletProvider: Attempting to auto-connect MetaMask");
          await connectMetamask();
          
          // Add a delay before attempting embedded wallet connection
          setTimeout(async () => {
            if (ownerWallet.connected && !sessionWallet.connected) {
              console.log("MetaMask connected, now attempting to create/connect embedded wallet");
              // Force walletOperationInProgress to false to ensure we can start a new operation
              walletOperationInProgress.current = false;
              await autoConnectEmbedded();
            }
          }, 2000);
          } catch (err) {
          console.log("WalletProvider: Auto-connect MetaMask failed (expected if user hasn't connected before)");
        }
      } else {
        console.log("WalletProvider: Owner wallet already connected, skipping MetaMask auto-connect");
        
        // If MetaMask is already connected but session wallet isn't, try to connect the embedded wallet
        if (!sessionWallet.connected) {
          console.log("Owner wallet already connected, attempting to create/connect embedded wallet");
          // Wait a bit before trying to connect embedded wallet
          setTimeout(async () => {
            // Ensure no other operation is in progress
            walletOperationInProgress.current = false;
            await autoConnectEmbedded();
          }, 1500);
        }
      }
    };
    
    // Wait a moment before attempting auto-connect
    setTimeout(attemptConnection, 1000);
  }, [wallets, authenticated, ownerWallet.connected, sessionWallet.connected, connectMetamask, autoConnectEmbedded]);

  // Add effect to sync with Privy wallets when authentication or wallets change
  useEffect(() => {
    // Skip if not authenticated
    if (!authenticated || !user) {
      return;
    }
    
    // Add a delay to avoid race conditions
    const timeoutId = setTimeout(() => {
    syncWithPrivyWallets();
    }, 1000);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [authenticated, user, wallets, syncWithPrivyWallets]);
  
  // Modify the Effect to auto-connect embedded wallet when owner wallet connects
  useEffect(() => {
    // Check if we should auto-connect embedded wallet
    if (ownerWallet.connected && !sessionWallet.connected && !autoConnectDisabled.current) {
      console.log("Owner wallet connected but session wallet not - attempting auto-connect");
      
      // Add a small delay to ensure state is stable
      const timeoutId = setTimeout(() => {
        // Try the standard approach first
        autoConnectEmbedded();
        
        // Add a fallback for when Privy's embedded wallet creation fails
        const fallbackTimeoutId = setTimeout(async () => {
          // Check if session wallet is still not connected after initial attempt
          if (!sessionWallet.connected) {
            console.log("Privy embedded wallet creation failed, attempting local fallback");
            
            // In development mode, always use local fallback
            if (import.meta.env.DEV) {
              // Try to restore a previously saved wallet first
              try {
                const savedWallet = localStorage.getItem('local_session_wallet');
                if (savedWallet) {
                  const { address, privateKey } = JSON.parse(savedWallet);
                  console.log("Found saved local session wallet:", address);
                  
                  // Create wallet from saved private key
                  const wallet = new EthersWallet(privateKey);
                  
                  // Update session wallet state
                  setSessionWallet({
                    address: wallet.address,
                    signer: wallet,
                    provider: null,
                    connected: true,
                  });
                  
                  console.log("Restored local session wallet:", wallet.address);
                  return;
                }
              } catch (e) {
                console.error("Error restoring local session wallet:", e);
              }
              
              // If no saved wallet or restoration failed, create a new one
              await createLocalSessionWallet();
            } else {
              // In production, only use fallback if user confirms
              const userConfirmed = window.confirm(
                "Privy's embedded wallet creation has failed. Would you like to create a local session wallet as fallback? " +
                "Note: This is less secure than Privy's solution but will allow you to continue."
              );
              
              if (userConfirmed) {
                await createLocalSessionWallet();
              }
            }
          }
        }, 8000); // Wait 8 seconds for Privy to try first
        
        return () => {
          clearTimeout(fallbackTimeoutId);
        };
      }, 1000);
      
      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [ownerWallet.connected, sessionWallet.connected, ownerWallet.address, autoConnectEmbedded, createLocalSessionWallet]);

  return (
    <WalletContext.Provider
      value={contextValue}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext); 