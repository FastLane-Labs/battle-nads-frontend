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