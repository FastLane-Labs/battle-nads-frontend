import '../styles/globals.css';
import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import PrivyAuthProvider from '../components/PrivyAuthProvider';

interface AppProps {
  Component: React.ComponentType<any>;
  pageProps: any;
}

// Create a basic theme value
const themeContext = {
  colorMode: 'light',
  toggleColorMode: () => {},
  theme: {}
};

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