'use client';

import React, { useEffect, useState } from 'react';
import { Box, Center, Spinner, Text } from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import NavBar from '../../components/NavBar';
import { useWallet } from '../../providers/WalletProvider';

export default function DashboardPage() {
  // Always define all state variables at the top
  const [showLoading, setShowLoading] = useState(true);
  
  // Always call all hooks at the top level in the same order
  const { address, isInitialized } = useWallet();
  const router = useRouter();
  
  // First useEffect - redirection logic
  useEffect(() => {
    if (isInitialized && !address) {
      console.log("No wallet address detected, redirecting to login");
      router.push('/');
    }
  }, [address, router, isInitialized]);
  
  // Second useEffect - additional redirection logic
  useEffect(() => {
    // If no address, redirect to login regardless of isInitialized state
    // This ensures we don't get stuck in a loading screen
    if (!address) {
      console.log("No wallet address detected, redirecting to login");
      router.push('/');
    }
  }, [address, router]);
  
  // Third useEffect - loading timeout
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
  
  // Determine what to render based on state
  // Use a single return statement with conditional rendering inside
  // to ensure consistent hook calls
  return (
    <>
      {(!isInitialized || (!isInitialized && showLoading)) ? (
        <Center height="100vh" className="bg-gray-900">
          <Spinner size="xl" color="purple.500" thickness="4px" />
        </Center>
      ) : !address ? (
        null // Will redirect without showing game
      ) : (
        <Box className="min-h-screen bg-gray-900">
          <NavBar />
          <Box pt="60px">
            <Center h="calc(100vh - 60px)"><Text color="white">Dashboard Content Placeholder</Text></Center>
          </Box>
        </Box>
      )}
    </>
  );
} 