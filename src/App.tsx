import React, { ReactNode } from 'react';
import NavBar from './components/NavBar';
import { Box } from '@chakra-ui/react';

interface AppProps {
  children?: ReactNode;
}

function App({ children }: AppProps) {
  return (
    <Box className="min-h-screen bg-gray-900">
      <NavBar />
      <Box pt="60px">
        {/* Routing is now handled in index.tsx */}
        {children}
      </Box>
    </Box>
  );
}

export default App; 