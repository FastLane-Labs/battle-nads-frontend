'use client';

import { ReactNode } from 'react';
import { PrivyAuthProvider } from '../providers/PrivyAuthProvider';
import { WalletProvider } from '../providers/WalletProvider';
import { ChakraProvider, ColorModeScript } from '@chakra-ui/react';
import { RecoilRoot } from 'recoil';
import theme from './theme';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" style={{ colorScheme: 'dark' }} data-theme="dark">
      <body className="chakra-ui-dark">
        <ColorModeScript initialColorMode={theme.config.initialColorMode} />
        <PrivyAuthProvider>
          <WalletProvider>
            <RecoilRoot>
              <ChakraProvider theme={theme}>
                {children}
              </ChakraProvider>
            </RecoilRoot>
          </WalletProvider>
        </PrivyAuthProvider>
      </body>
    </html>
  );
} 