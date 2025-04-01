import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { RecoilRoot } from 'recoil';
import { ChakraProvider, ColorModeScript } from '@chakra-ui/react';
import { PrivyAuthProvider } from './providers/PrivyAuthProvider';
import { WalletProvider } from './providers/WalletProvider';
import theme from './theme';

// Polyfill buffer for web3 libraries
import { Buffer } from 'buffer';
window.Buffer = Buffer;
(window as any).global = window;
(window as any).process = { env: { NODE_ENV: 'development' } };

// Add debug logging 
console.log("Starting application initialization");

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ColorModeScript initialColorMode={theme.config.initialColorMode} />
    <PrivyAuthProvider>
      <WalletProvider>
        <RecoilRoot>
          <ChakraProvider theme={theme}>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </ChakraProvider>
        </RecoilRoot>
      </WalletProvider>
    </PrivyAuthProvider>
  </React.StrictMode>,
); 