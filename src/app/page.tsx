'use client';

import React from 'react';
import { Box, Center, Image } from '@chakra-ui/react';
import NavBar from '../components/NavBar';
import Login from './Login';
import { useWallet } from '../providers/WalletProvider';

export default function HomePage() {
  const { address } = useWallet();
  
  return (
    <Box className="min-h-screen bg-gray-900">
      <NavBar />
      <Box pt="60px">
        {/* Display logo at the top */}
        <Center mb={6}>
          <Image 
            src="/BattleNadsLogo.png" 
            alt="Battle Nads Logo" 
            maxHeight="150px"
            objectFit="contain"
          />
        </Center>
        
        {/* If not connected, show login page */}
        {!address ? (
          <Login />
        ) : (
          // If connected, the user will navigate to other pages via NavBar
          <Center height="60vh" flexDirection="column">
            <Box textAlign="center" p={8}>
              <h1 className="text-3xl font-bold text-white mb-4">Welcome to Battle Nads</h1>
              <p className="text-gray-300">
                Use the navigation menu to create characters or play the game!
              </p>
            </Box>
          </Center>
        )}
      </Box>
    </Box>
  );
} 