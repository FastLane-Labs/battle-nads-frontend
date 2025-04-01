'use client';

import React, { useEffect, useState } from 'react';
import { Box, Spinner, Center, Text, Alert, AlertIcon } from '@chakra-ui/react';
import NavBar from '../../../components/NavBar';
import CharacterCreation from '../../../components/pages/CharacterCreation';
import { useWallet } from '../../../providers/WalletProvider';
import { useRouter } from 'next/navigation';
import { useBattleNads } from '../../../hooks/useBattleNads';

export default function CreateCharacterPage() {
  const { address, injectedWallet } = useWallet();
  const { getPlayerCharacterID } = useBattleNads();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [foundCharacter, setFoundCharacter] = useState<string | null>(null);
  
  // Check for URL parameter indicating we just created a character
  // This prevents an immediate check right after creation that could cause a loop
  const [skipRedirect, setSkipRedirect] = useState(() => {
    if (typeof window !== 'undefined') {
      // Check if we have a URL param or localStorage flag indicating we just created a character
      return window.location.search.includes('created=true') || 
             localStorage.getItem('justCreatedCharacter') === 'true';
    }
    return false;
  });
  
  // Check for existing character and redirect to game if found
  useEffect(() => {
    const checkExistingCharacter = async () => {
      try {
        setChecking(true);

        // First check localStorage for existing character ID
        const storedCharacterId = localStorage.getItem('battleNadsCharacterId');
        
        if (storedCharacterId) {
          console.log("Found existing character in localStorage:", storedCharacterId);
          setFoundCharacter(storedCharacterId);
          
          // Short delay before redirect
          setTimeout(() => {
            console.log("Character ID found, redirecting to game:", storedCharacterId);
            router.push('/game');
          }, 500);
          
          return;
        }
        
        // Try to get the MetaMask address directly as fallback
        let ownerAddress = injectedWallet?.address;
        if (window.ethereum && (window.ethereum as any).isMetaMask && (window.ethereum as any).selectedAddress) {
          console.log("Using MetaMask address directly:", (window.ethereum as any).selectedAddress);
          ownerAddress = (window.ethereum as any).selectedAddress;
        }
        
        // Only if not found in localStorage, check using owner address
        if (ownerAddress) {
          console.log("Checking for character with owner address:", ownerAddress);
          const characterId = await getPlayerCharacterID(ownerAddress);
          if (characterId) {
            console.log("Found existing character:", characterId);
            setFoundCharacter(characterId);
            
            // Store in localStorage for future use
            localStorage.setItem('battleNadsCharacterId', characterId);
            
            // Short delay before redirect  
            setTimeout(() => {
              console.log("Character ID found, redirecting to game:", characterId);
              router.push('/game');
            }, 500);
          }
        }
      } catch (err) {
        console.error("Error checking for existing character:", err);
      } finally {
        setChecking(false);
      }
    };

    checkExistingCharacter();
  }, [injectedWallet?.address, getPlayerCharacterID, router]);

  // Redirect to home if not connected
  useEffect(() => {
    if (!address) {
      router.push('/');
    }
  }, [address, router]);
  
  if (!address) {
    return null; // Will redirect
  }
  
  if (checking) {
    return (
      <Box className="min-h-screen bg-gray-900">
        <NavBar />
        <Center pt="120px">
          <Spinner size="xl" />
          <Text ml={4}>Checking for existing character...</Text>
        </Center>
      </Box>
    );
  }
  
  if (foundCharacter) {
    return (
      <Box className="min-h-screen bg-gray-900">
        <NavBar />
        <Center pt="120px" flexDirection="column">
          <Alert status="success" variant="solid" borderRadius="md">
            <AlertIcon />
            <Text>Character found! Redirecting to game...</Text>
          </Alert>
          <Spinner size="xl" mt={8} />
        </Center>
      </Box>
    );
  }
  
  return (
    <Box className="min-h-screen bg-gray-900">
      <NavBar />
      <Box pt="60px">
        <CharacterCreation onCharacterCreated={() => {
          // Set a flag to avoid immediate redirect checks after creation
          localStorage.setItem('justCreatedCharacter', 'true');
        }} />
      </Box>
    </Box>
  );
} 