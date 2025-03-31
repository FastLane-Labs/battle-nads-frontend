import { PrivyProvider } from "@privy-io/react-auth";
import { ReactNode } from "react";

interface PrivyAuthProviderProps {
  children: ReactNode;
}

export function PrivyAuthProvider({ children }: PrivyAuthProviderProps) {
  // The OAuth callback URL is automatically managed by Privy
  // We just need to ensure it's configured correctly in the Privy dashboard
  
  return (
    <PrivyProvider
      appId={import.meta.env.VITE_PRIVY_APP_ID || ""}
      config={{
        loginMethods: ["twitter"],
        embeddedWallets: {
          createOnLogin: 'all-users',
        },
        appearance: {
          theme: "dark",
          accentColor: "#4F46E5",
          logo: "/your-logo-url.png",
        },
        // You'll need to define MONAD_CHAIN or remove this if not needed
        // supportedChains: [MONAD_CHAIN],
      }}
    >
      {children}
    </PrivyProvider>
  );
} 