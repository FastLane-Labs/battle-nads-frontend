'use client';

import React, { useEffect, useState } from 'react';
import { Box, Center, Spinner } from '@chakra-ui/react';
import NavBar from '../../components/NavBar';
import Game from '../../components/gameboard/game';
import { useWallet } from '../../providers/WalletProvider';
import { useRouter } from 'next/navigation';

export default function GamePage() {
  const { address, isInitialized } = useWallet();
  const router = useRouter();
  const [showLoading, setShowLoading] = useState(true);
  
  // Redirect to home if not connected, but only after wallet state is initialized
  useEffect(() => {
    if (isInitialized && !address) {
      console.log("No wallet address detected, redirecting to login");
      router.push('/');
    }
  }, [address, router, isInitialized]);
  
  // Redirect to home if not connected, but only after wallet state is initialized
  useEffect(() => {
    // If no address, redirect to login regardless of isInitialized state
    // This ensures we don't get stuck in a loading screen
    if (!address) {
      console.log("No wallet address detected, redirecting to login");
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
  
  useEffect(() => {
    // Set a timeout to stop showing the loading spinner after 3 seconds
    const timer = setTimeout(() => {
      setShowLoading(false);
      // If still not initialized, redirect to login
      if (!isInitialized && !address) {
        console.log("Wallet initialization timed out, redirecting to login");
        router.push('/');
      }
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [isInitialized, address, router]);
  
  // Show loading spinner while wallet state is initializing
  if (!isInitialized) {
    return (
      <Center height="100vh" className="bg-gray-900">
        <Spinner size="xl" color="purple.500" thickness="4px" />
      </Center>
    );
  }
  
  if (!isInitialized && showLoading) {
    return (
      <Center height="100vh" className="bg-gray-900">
        <Spinner size="xl" color="purple.500" thickness="4px" />
      </Center>
    );
  }
  
  return (
    <Box className="min-h-screen bg-gray-900">
      <NavBar />
      <Box pt="60px">
        <Game key="stable-game-instance" />
      </Box>
    </Box>
  );
} 