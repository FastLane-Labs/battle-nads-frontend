'use client';

import React, { ReactNode } from 'react';
import { PrivyProvider } from '@privy-io/react-auth';

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

// Mock token price information for MON (to help Privy with pricing)
const MON_TOKEN_INFO = {
  address: "0x0000000000000000000000000000000000000000", // Native token address
  symbol: "MON",
  name: "Monad",
  decimals: 18,
  logoURI: "https://explorer-testnet.monadinfra.com/static/media/mon-token-icon.1ea998d6.svg",
  chainId: 10143,
  price: {
    usd: 1.00, // Mocked price for testnet token
  }
};

export function PrivyAuthProvider({ children }: PrivyAuthProviderProps) {
  // Try to get the Privy App ID from environment variables, fallback to hardcoded value
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "cm8slyoyy00f99gvop4024o4m";
  
  // Hardcoded backup in case .env file doesn't load properly
  if (!appId) {
    console.warn("Using fallback Privy App ID - preferably set NEXT_PUBLIC_PRIVY_APP_ID in your environment variables.");
  }
  
  // Comprehensive configuration to bypass transaction approvals
  const privyConfig: any = {
    appId,
    config: {
      loginMethods: ["wallet"],
      embeddedWallets: {
        createOnLogin: 'all-users',
        noPromptOnSignature: true,
        noPromptOnTransaction: true
      },
      appearance: {
        theme: "dark",
        accentColor: "#4F46E5",
      },
      supportedChains: [MONAD_TESTNET_CHAIN],
      defaultChain: MONAD_TESTNET_CHAIN,
      // Add token information
      tokens: {
        // Add custom token list including our MON token
        custom: [MON_TOKEN_INFO]
      },
      fiatOnRamp: {
        defaultToken: {
          chain: MONAD_TESTNET_CHAIN.id,
          token: "MON"
        }
      }
    },
    // Mock token prices to help Privy
    _tokenPrices: {
      [MONAD_TESTNET_CHAIN.id]: {
        MON: {
          usd: 1.00
        }
      }
    }
  };
  
  console.log("[PrivyAuthProvider] Initialized with config:", JSON.stringify({
    appId: privyConfig.appId,
    autoApprove: privyConfig.autoApprove,
    autoApproveSignature: privyConfig.autoApproveSignature,
    noPromptOnSignature: privyConfig.config.embeddedWallets.noPromptOnSignature,
    noPromptOnTransaction: privyConfig.config.embeddedWallets.noPromptOnTransaction,
  }));
  
  return (
    <PrivyProvider {...privyConfig}>
      {children}
    </PrivyProvider>
  );
} 