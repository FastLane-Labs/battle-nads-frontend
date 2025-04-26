'use client';

import { ReactNode } from 'react';
import { PrivyAuthProvider } from '../providers/PrivyAuthProvider';
import { WalletProvider } from '../providers/WalletProvider';
import { GameDataProvider } from '../providers/GameDataProvider';
import { ChakraProvider, ColorModeScript } from '@chakra-ui/react';
import { RecoilRoot } from 'recoil';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ErrorBoundary from './ErrorBoundary';
import theme from './theme';
import './globals.css';
import React, { useEffect } from 'react';

// Create a client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000,
      retry: false,
    },
  },
});

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Filter React DOM prop warnings from Privy
  useEffect(() => {
    // Store original console.error
    const originalConsoleError = console.error;
    
    // Filter out specific warnings
    console.error = (...args) => {
      // We can remove the isActive filter since we've fixed that issue
      // Keep any other specific filters if needed
      // If no filters are needed, this entire useEffect can be removed
      originalConsoleError(...args);
    };
    
    // Restore original on unmount
    return () => {
      console.error = originalConsoleError;
    };
  }, []);

  return (
    <html lang="en" style={{ colorScheme: 'dark' }} data-theme="dark">
      <body className="chakra-ui-dark">
        <ColorModeScript initialColorMode={theme.config.initialColorMode} />
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <PrivyAuthProvider>
              <WalletProvider>
                <RecoilRoot>
                  <ChakraProvider theme={theme}>
                    <GameDataProvider pollInterval={5000}>
                      {children}
                    </GameDataProvider>
                  </ChakraProvider>
                </RecoilRoot>
              </WalletProvider>
            </PrivyAuthProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
} 