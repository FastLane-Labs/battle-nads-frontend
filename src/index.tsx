import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RecoilRoot } from 'recoil';
import { ChakraProvider, ColorModeScript } from '@chakra-ui/react';
import './index.css';
import App from './App';
import Login from './pages/Login';
import CharacterCreation from './pages/CharacterCreation';
import GameDemo from './components/GameDemo';
import ProtectedRoute from './components/ProtectedRoute';
import { PrivyAuthProvider } from './providers/PrivyAuthProvider';
import { WalletProvider } from './providers/WalletProvider';
import theme from './theme';

// Create a simple loading indicator to test rendering
const Loading = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh',
    color: 'white',
    backgroundColor: '#1f2937'
  }}>
    <h1>Loading Battle Nads...</h1>
  </div>
);

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

try {
  // First render just a simple component to test basic rendering
  root.render(<Loading />);
  
  // Then after a short delay try the full app
  setTimeout(() => {
    try {
      const GamePage = () => (
        <App>
          <GameDemo />
        </App>
      );
      
      const CharacterPage = () => (
        <App>
          <CharacterCreation />
        </App>
      );
      
      root.render(
        <React.StrictMode>
          <ColorModeScript initialColorMode={theme.config.initialColorMode} />
          <PrivyAuthProvider>
            <WalletProvider>
              <RecoilRoot>
                <ChakraProvider theme={theme}>
                  <BrowserRouter>
                    <Routes>
                      <Route path="/" element={<Login />} />
                      <Route path="/game" element={<ProtectedRoute><GamePage /></ProtectedRoute>} />
                      <Route path="/create" element={<ProtectedRoute><CharacterPage /></ProtectedRoute>} />
                    </Routes>
                  </BrowserRouter>
                </ChakraProvider>
              </RecoilRoot>
            </WalletProvider>
          </PrivyAuthProvider>
        </React.StrictMode>
      );
    } catch (error) {
      console.error("Error rendering full app:", error);
      // If full app fails, show error message
      root.render(
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          color: 'white',
          backgroundColor: '#1f2937',
          padding: '20px'
        }}>
          <h1>Error Loading Battle Nads</h1>
          <p>Something went wrong. Check console for details.</p>
          <pre style={{ 
            maxWidth: '100%', 
            overflow: 'auto', 
            backgroundColor: '#111827',
            padding: '10px',
            borderRadius: '4px',
            marginTop: '20px'
          }}>
            {error instanceof Error ? error.message : String(error)}
          </pre>
        </div>
      );
    }
  }, 1000);
} catch (error) {
  document.body.innerHTML = `
    <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; color: white; background-color: #1f2937; padding: 20px;">
      <h1>Critical Error</h1>
      <p>The application failed to initialize.</p>
      <pre style="max-width: 100%; overflow: auto; background-color: #111827; padding: 10px; border-radius: 4px; margin-top: 20px;">
        ${error instanceof Error ? error.message : String(error)}
      </pre>
    </div>
  `;
} 