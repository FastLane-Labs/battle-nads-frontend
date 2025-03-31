import '../styles/globals.css';
import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import PrivyAuthProvider from '../components/PrivyAuthProvider';
import type { AppProps } from 'next/app';

const MyApp = ({ Component, pageProps }: AppProps) => {
  return (
    <PrivyAuthProvider>
      <ChakraProvider>
        <Component {...pageProps} />
      </ChakraProvider>
    </PrivyAuthProvider>
  );
};

export default MyApp; 