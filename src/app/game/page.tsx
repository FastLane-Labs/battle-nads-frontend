'use client';

import React from 'react';
import { Box } from '@chakra-ui/react';
import NavBar from '../../components/NavBar';
import GameDemo from '../../components/GameDemo';
import { useWallet } from '../../providers/WalletProvider';
import { useRouter } from 'next/navigation';

export default function GamePage() {
  const { address } = useWallet();
  const router = useRouter();
  
  // Redirect to home if not connected
  React.useEffect(() => {
    if (!address) {
      router.push('/');
    }
  }, [address, router]);
  
  // Check if we're coming from character creation
  React.useEffect(() => {
    // Clear any cached redirect flags from character creation
    localStorage.removeItem('justCreatedCharacter');
    
    // Check if we have a query parameter indicating we just created a character
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('newCharacter')) {
      console.log("New character detected from URL parameters");
      
      // Clear URL parameters without triggering a page reload
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);
  
  if (!address) {
    return null; // Will redirect
  }
  
  return (
    <Box className="min-h-screen bg-gray-900">
      <NavBar />
      <Box pt="60px">
        <GameDemo />
      </Box>
    </Box>
  );
} 