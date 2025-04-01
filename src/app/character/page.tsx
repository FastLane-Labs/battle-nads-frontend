'use client';

import React from 'react';
import { Box } from '@chakra-ui/react';
import NavBar from '../../components/NavBar';
import CharacterDashboard from '../character'; // Updated import path
import { useWallet } from '../../providers/WalletProvider';
import { useRouter } from 'next/navigation';

export default function CharacterPage() {
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
        <CharacterDashboard />
      </Box>
    </Box>
  );
} 