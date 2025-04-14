'use client';

import { ReactNode } from 'react';
import { PrivyAuthProvider } from '../providers/PrivyAuthProvider';
import { WalletProvider } from '../providers/WalletProvider';
import { GameDataProvider } from '../providers/GameDataProvider';
import { ChakraProvider, ColorModeScript } from '@chakra-ui/react';
import { RecoilRoot } from 'recoil';
import theme from './theme';
import './globals.css';
import React, { useEffect } from 'react';

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
      if (typeof args[0] === 'string' && 
          args[0].includes('Warning: React does not recognize the `isActive` prop')) {
        return;
      }
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
        <PrivyAuthProvider>
          <WalletProvider>
            <RecoilRoot>
              <ChakraProvider theme={theme}>
                <GameDataProvider pollInterval={1000}>
                  {children}
                </GameDataProvider>
              </ChakraProvider>
            </RecoilRoot>
          </WalletProvider>
        </PrivyAuthProvider>
      </body>
    </html>
  );
} 