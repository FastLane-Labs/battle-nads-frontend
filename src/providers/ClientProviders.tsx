'use client';

import { ReactNode } from 'react';
import { PrivyAuthProvider } from './PrivyAuthProvider';
import { WalletProvider } from './WalletProvider';
import { ChakraProvider, ColorModeScript } from '@chakra-ui/react';
import { RecoilRoot } from 'recoil';
import theme from '../app/theme';

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <>
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
    </>
  );
} 