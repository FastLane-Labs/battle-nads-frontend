'use client';

import React, { useEffect, useState } from 'react';
import { Box, Center, Spinner, Text } from '@chakra-ui/react';
import NavBar from '../../components/NavBar';
import { useWallet } from '../../providers/WalletProvider';
import { useBattleNads } from '../../hooks/useBattleNads';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { address } = useWallet();
  const router = useRouter();
  const { getPlayerCharacterID, characterId } = useBattleNads();
  const [loading, setLoading] = useState(true);
  
  // Redirect to home if not connected
  useEffect(() => {
    if (!address) {
      router.push('/');
    }
  }, [address, router]);
  
  // Check for character and redirect accordingly
  useEffect(() => {
    async function checkForCharacter() {
      if (address) {
        try {
          // Check if we already know the character ID
          if (characterId) {
            router.push('/game');
            return;
          }
          
          // Otherwise, check with the contract
          const cID = await getPlayerCharacterID(address);
          
          if (cID) {
            // Has character, go to game
            router.push('/game');
          } else {
            // No character, go to character creation
            router.push('/create');
          }
        } catch (error) {
          console.error("Error checking for character:", error);
          // On error, default to character creation
          router.push('/create');
        } finally {
          setLoading(false);
        }
      }
    }
    
    checkForCharacter();
  }, [address, router, characterId, getPlayerCharacterID]);
  
  if (!address || loading) {
    return (
      <Box className="min-h-screen bg-gray-900">
        <NavBar />
        <Box pt="60px">
          <Center height="80vh">
            <Spinner size="xl" color="blue.400" />
            <Text ml={4} color="white">Checking character status...</Text>
          </Center>
        </Box>
      </Box>
    );
  }
  
  return null; // This page just redirects, no actual UI needed
} 