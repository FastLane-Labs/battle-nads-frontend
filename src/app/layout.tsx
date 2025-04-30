'use client';

import { ReactNode } from 'react';
import { PrivyAuthProvider } from '../providers/PrivyAuthProvider';
import { WalletProvider } from '../providers/WalletProvider';
import { ReactQueryProvider } from '../providers/ReactQueryProvider';
import { ChakraProvider, ColorModeScript } from '@chakra-ui/react';
import { RecoilRoot } from 'recoil';
import ErrorBoundary from './ErrorBoundary';
import theme from './theme';
import './globals.css';
import React, { useEffect } from 'react';

export const metadata = {
  title: 'BattleNads | Web3 RPG Game on Monad',
  description: 'A web3 RPG where you create characters, explore an rpg world, battle other players and monsters, and manage equipment - all on the Monad blockchain.',
  keywords: ['web3', 'RPG', 'blockchain game', 'Monad', 'BattleNads', 'play-to-earn', 'crypto gaming', 'fastlane', 'shmonad', 'shmon'],
  openGraph: {
    title: 'BattleNads | Web3 RPG Game on Monad',
    description: 'A web3 RPG where you create characters, explore an rpg world, battle other players and monsters, and manage equipment - all on the Monad blockchain.',
    url: 'https://battlenads.com', 
    siteName: 'BattleNads',
    images: [
      {
        url: '/og/battlenads-og-image.png', 
        width: 1200,
        height: 630,
        alt: 'BattleNads Game Preview',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BattleNads | Web3 RPG on Monad',
    description: 'A web3 RPG where you create characters, explore an rpg world, battle other players and monsters, and manage equipment - all on the Monad blockchain.',
    images: ['/og/battlenads-og-image.png'],
    creator: '@0xFastLaneLabs',
  },
  authors: [{ name: 'FastLane Labs' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#1A202C',
};

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
          <ReactQueryProvider>
            <PrivyAuthProvider>
              <WalletProvider>
                <RecoilRoot>
                  <ChakraProvider theme={theme}>
                    {children}
                  </ChakraProvider>
                </RecoilRoot>
              </WalletProvider>
            </PrivyAuthProvider>
          </ReactQueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
} 