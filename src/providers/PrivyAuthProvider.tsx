import { PrivyProvider } from "@privy-io/react-auth";
import { ReactNode } from "react";

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
  // Get the Privy App ID from environment variables
  const appId = import.meta.env.VITE_PRIVY_APP_ID || "";
  
  if (!appId) {
    console.warn("No Privy App ID found. Please set VITE_PRIVY_APP_ID in your environment variables.");
  }
  
  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["twitter", "discord", "email", "wallet"],
        embeddedWallets: {
          createOnLogin: 'all-users',
        },
        appearance: {
          theme: "dark",
          accentColor: "#4F46E5",
        },
        supportedChains: [MONAD_TESTNET_CHAIN],
      }}
    >
      {children}
    </PrivyProvider>
  );
} 