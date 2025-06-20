'use client';

import { ReactNode } from 'react';
import { PrivyAuthProvider } from './PrivyAuthProvider';
import { WalletProvider } from './WalletProvider';
import { ChakraProvider, ColorModeScript } from '@chakra-ui/react';
import theme from '../app/theme';

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <PrivyAuthProvider>
        <WalletProvider>
          <ChakraProvider theme={theme}>
            {children}
          </ChakraProvider>
        </WalletProvider>
      </PrivyAuthProvider>
    </>
  );
} 