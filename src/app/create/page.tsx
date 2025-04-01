'use client';

import React from 'react';
import { Box } from '@chakra-ui/react';
import NavBar from '../../components/NavBar';
import CharacterCreation from '../../components/characters/CharacterCreation';
import { useWallet } from '../../providers/WalletProvider';
import { useRouter } from 'next/navigation';

export default function CreatePage() {
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
        <CharacterCreation />
      </Box>
    </Box>
  );
} 