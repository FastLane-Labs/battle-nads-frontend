import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@chakra-ui/react';

import Login from './pages/Login';
import CharacterCreation from './pages/CharacterCreation';
import GameDemo from './components/GameDemo';
import ProtectedRoute from './components/ProtectedRoute';
import NavBar from './components/NavBar';

function App() {
  return (
    <Box>
      <NavBar />
      
      {/* Main content area - add top padding to account for fixed navbar */}
      <Box pt="70px" minH="100vh">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route 
            path="/create/*" 
            element={
              <ProtectedRoute>
                <CharacterCreation />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/game/*" 
            element={
              <ProtectedRoute>
                <GameDemo />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Box>
    </Box>
  );
}

export default App; 