'use client';

import React, { useEffect } from 'react';
import { Box } from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import NavBar from '../../components/NavBar';
import Game from '../../components/gameboard/game';
import { useWallet } from '../../providers/WalletProvider';

export default function DashboardPage() {
  const { address } = useWallet();
  const router = useRouter();
  
  // Redirect to home if not connected
  useEffect(() => {
    if (!address) {
      console.log("No wallet address detected, redirecting to login");
      router.push('/');
    }
  }, [address, router]);
  
  // Early return if no wallet to prevent UI flicker
  if (!address) {
    return null; // Will redirect
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