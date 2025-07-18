'use client';

import { ReactNode } from 'react';
import { PrivyAuthProvider } from '../providers/PrivyAuthProvider';
import { WalletProvider } from '../providers/WalletProvider';
import { ReactQueryProvider } from '../providers/ReactQueryProvider';
import { OptimisticUpdatesProvider } from '../providers/OptimisticUpdatesProvider';
import { ChakraProvider, ColorModeScript } from '@chakra-ui/react';
import ErrorBoundary from './ErrorBoundary';
import theme from './theme';
import './globals.css';
import React, { useEffect } from 'react';
import { ContractCheckProvider } from '../contexts/ContractCheckContext';
import { AuthStateWrapper } from '../components/AuthStateWrapper';

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
      <head>
        <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      </head>
      <body  
      className="bg-cover bg-center bg-repeat-y lg:bg-no-repeat"
      style={{ backgroundImage: "url('/assets/bg/dark-smoky-bg.webp')" }}
      >
          <ErrorBoundary>
            <ReactQueryProvider>
              <ChakraProvider theme={theme} toastOptions={{ defaultOptions: { position: 'bottom-right' } }} >
                <ContractCheckProvider>
                  <PrivyAuthProvider>
                    <WalletProvider>
                      <OptimisticUpdatesProvider>
                        <AuthStateWrapper>
                          {children}
                        </AuthStateWrapper>
                      </OptimisticUpdatesProvider>
                    </WalletProvider>
                  </PrivyAuthProvider>
                </ContractCheckProvider>
              </ChakraProvider>
            </ReactQueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
} 