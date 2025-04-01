import { PrivyProvider } from "@privy-io/react-auth";
import { ReactNode } from "react";
import { Alert, AlertIcon, AlertTitle, AlertDescription, Box, Button, Center, Heading, Link, VStack } from "@chakra-ui/react";

interface PrivyAuthProviderProps {
  children: ReactNode;
}

// Define Monad testnet chain
const MONAD_TESTNET_CHAIN = {
  name: 'Monad Testnet',
  id: 10143,
  rpcUrls: {
    default: {
      http: ['https://rpc-testnet.monadinfra.com/rpc/Dp2u0HD0WxKQEvgmaiT4dwCeH9J14C24']
    }
  },
  nativeCurrency: {
    name: 'Monad',
    symbol: 'MON',
    decimals: 18,
  },
  blockExplorers: {
    default: {
      name: 'Monad Explorer',
      url: 'https://explorer-testnet.monadinfra.com',
    },
  },
};

export function PrivyAuthProvider({ children }: PrivyAuthProviderProps) {
  // Get the Privy App ID from environment variables with a fallback value
  const appId = import.meta.env.VITE_PRIVY_APP_ID || "cm8y2nx5c00tqbiy22u72uzc9";
  const walletConnectCloudProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "a5b30bbd0c93590a44b3694cb75344f0";
  
  /**
   * Privy Configuration Guide:
   * 
   * 1. `loginMethods` - Specify which login methods to show in the Privy UI
   * 2. `appearance` - Control the UI appearance including theme colors
   * 3. `embeddedWallets` - Controls when embedded wallets are created
   * 4. `supportedChains` - Chains that wallets can connect to
   * 5. `defaultChain` - The default chain for wallet connections
   */
  return (
    <PrivyProvider
      appId={appId}
      config={{
        // Allow both wallet and email login options
        loginMethods: ['wallet', 'email'],
        
        // UI appearance settings
        appearance: {
          theme: 'dark',
          accentColor: '#8a5cf6',
          showWalletLoginFirst: true
        },
        
        // Embedded wallet settings - automatically create wallets for all authenticated users
        embeddedWallets: {
          createOnLogin: 'all-users'
        },
        
        // Chain configuration
        supportedChains: [MONAD_TESTNET_CHAIN],
        defaultChain: MONAD_TESTNET_CHAIN,
        walletConnectCloudProjectId: walletConnectCloudProjectId
      }}
    >
      {children}
    </PrivyProvider>
  );
} 