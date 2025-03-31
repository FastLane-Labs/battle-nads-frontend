import React, { ReactNode } from 'react';
import { PrivyProvider } from '@privy-io/react-auth';

interface PrivyAuthProviderProps {
  children: ReactNode;
}

const PrivyAuthProvider: React.FC<PrivyAuthProviderProps> = ({ children }) => {
  // Replace with your actual Privy app ID
  const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'your-privy-app-id';

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      onSuccess={() => console.log('User authenticated')}
      config={{
        loginMethods: ['email', 'wallet'],
        appearance: {
          theme: 'light',
          accentColor: '#676FFF',
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
};

export default PrivyAuthProvider; 