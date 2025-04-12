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

export function PrivyAuthProvider({ children }: PrivyAuthProviderProps) {
  // Try to get the Privy App ID from environment variables, fallback to hardcoded value
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "cm8slyoyy00f99gvop4024o4m";
  
  // Hardcoded backup in case .env file doesn't load properly
  if (!appId) {
    console.warn("Using fallback Privy App ID - preferably set NEXT_PUBLIC_PRIVY_APP_ID in your environment variables.");
  }
  
  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["wallet"],
        embeddedWallets: {
          createOnLogin: 'all-users',
        },
        appearance: {
          theme: "dark",
          accentColor: "#4F46E5",
        },
        supportedChains: [MONAD_TESTNET_CHAIN],
        defaultChain: MONAD_TESTNET_CHAIN,
      }}
      // @ts-ignore - Add these custom properties to force auto-approval
      autoApprove={true}
      autoApproveSignature={true}
      requireUserConfirmation={false}
    >
      {children}
    </PrivyProvider>
  );
} 