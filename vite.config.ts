import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'buffer': 'buffer/',
    },
  },
  define: {
    // Polyfill for various globals that Privy's dependencies might need
    global: 'globalThis',
    'process.env': {},
  },
  optimizeDeps: {
    esbuildOptions: {
      // Node.js global to browser globalThis
      define: {
        global: 'globalThis',
      },
    },
    include: ['buffer'],
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true, // Handle both ESM and CJS modules
    },
    rollupOptions: {
      // Instead of externalizing, properly bundle buffer
      plugins: []
    },
  },
  server: {
    port: 3000,
    open: true,
    headers: {
      'Cross-Origin-Embedder-Policy': 'credentialless',
      // Removed per Coinbase Wallet SDK requirements
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.privy.io https://*.walletconnect.com https://*.walletconnect.org; style-src 'self' 'unsafe-inline'; connect-src 'self' https://rpc-testnet.monadinfra.com https://*.privy.io https://*.walletconnect.com https://*.walletconnect.org wss://*.walletconnect.org wss://*.walletconnect.com https://*.web3auth.io https://*.web3modal.com https://*.web3modal.io; img-src 'self' data: https://*.privy.io https://*.walletconnect.com https://*.walletconnect.org; frame-src 'self' https://*.privy.io https://*.walletconnect.com https://*.walletconnect.org https://*.web3auth.io https://*.web3modal.com;",
    }
  }
}); 