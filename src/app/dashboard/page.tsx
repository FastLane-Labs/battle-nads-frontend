'use client';

import React, { useEffect } from 'react';
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
  
  // Show loading spinner while wallet state is initializing
  if (!isInitialized) {
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