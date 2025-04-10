'use client';

import React, { useEffect, useState } from 'react';
import { Box, Center, Spinner } from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import NavBar from '../../components/NavBar';
import Game from '../../components/gameboard/game';
import { useWallet } from '../../providers/WalletProvider';

export default function DashboardPage() {
  const { address, isInitialized } = useWallet();
  const router = useRouter();
  
  // Redirect to home if not connected, but only after wallet state is initialized
  useEffect(() => {
    if (isInitialized && !address) {
      console.log("No wallet address detected, redirecting to login");
      router.push('/');
    }
  }, [address, router, isInitialized]);
  
  // Redirect to home if not connected regardless of initialization state
  useEffect(() => {
    // If no address, redirect to login regardless of isInitialized state
    // This ensures we don't get stuck in a loading screen
    if (!address) {
      console.log("No wallet address detected, redirecting to login");
      router.push('/');
    }
  }, [address, router]);
  
  // Show loading spinner while wallet state is initializing
  if (!isInitialized) {
    return (
      <Center height="100vh" className="bg-gray-900">
        <Spinner size="xl" color="purple.500" thickness="4px" />
      </Center>
    );
  }
  
  // Show loading spinner while wallet state is initializing, but with a timeout
  // to prevent infinite loading
  const [showLoading, setShowLoading] = useState(true);
  
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
  
  if (!isInitialized && showLoading) {
    return (
      <Center height="100vh" className="bg-gray-900">
        <Spinner size="xl" color="purple.500" thickness="4px" />
      </Center>
    );
  }
  
  // Early return if no wallet to prevent Game mounting
  if (!address) {
    return null; // Will redirect without showing game
  }
  
  return (
    <Box className="min-h-screen bg-gray-900">
      <NavBar />
      <Box pt="60px">
        <Game />
      </Box>
    </Box>
  );
} 