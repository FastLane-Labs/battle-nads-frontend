'use client';

import React, { useEffect, useState } from 'react';
import { Box, Heading, Button, Center, VStack, Text, Image, Icon, Spinner } from '@chakra-ui/react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { useBattleNads } from '../hooks/useBattleNads';
import { FaEthereum } from 'react-icons/fa';
import { useWallet } from '../providers/WalletProvider';

const Login: React.FC = () => {
  const { login, authenticated, ready, user } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const router = useRouter();
  const { getPlayerCharacterID, characterId } = useBattleNads();
  // Get wallet state from our WalletProvider
  const { address } = useWallet();
  const [checkingCharacter, setCheckingCharacter] = useState(false);
  const [initialCheckComplete, setInitialCheckComplete] = useState(false);

  // Use the Privy wallets information to set up our wallet provider
  useEffect(() => {
    if (ready && authenticated && walletsReady && wallets.length > 0 && !address) {
      // Instead of manually connecting, let the WalletProvider sync with Privy's state
      console.log("Wallet is connected via Privy:", wallets[0].address);
    }
  }, [ready, authenticated, walletsReady, wallets, address]);

  // Check if user has a character directly using the contract function
  useEffect(() => {
    const checkCharacter = async () => {
      // Only proceed if the user is authenticated and has a wallet
      if (ready && authenticated && user?.wallet?.address) {
        try {
          setCheckingCharacter(true);
          console.log("Checking for character using EOA address:", user.wallet.address);
          
          // Use the direct contract call to check if this EOA has a character
          const characterID = await getPlayerCharacterID(user.wallet.address);
          
          if (characterID) {
            console.log("Found character ID:", characterID);
            // Character exists, go to game
            router.push('/game');
          } else {
            console.log("No character found, redirecting to character creation");
            // No character, go to character creation
            router.push('/create');
          }
        } catch (error) {
          console.error("Error checking character:", error);
          // If there's an error, default to character creation
          router.push('/create');
        } finally {
          setCheckingCharacter(false);
          setInitialCheckComplete(true);
        }
      } else if (ready && !authenticated) {
        // If user is not authenticated, make sure we stay on the login page
        // and clear any loading state
        setCheckingCharacter(false);
        setInitialCheckComplete(true);
        console.log("User not authenticated, showing login page");
      }
    };

    if (ready) {
      checkCharacter();
    }
  }, [authenticated, ready, router, user, getPlayerCharacterID]);

  // Also check if characterId exists in state, but only if authenticated
  useEffect(() => {
    if (authenticated && characterId) {
      console.log("Character ID found in state, redirecting to game");
      router.push('/game');
    }
  }, [characterId, router, authenticated]);

  const handleLogin = () => {
    // Only attempt login if not already authenticated
    if (!authenticated) {
      login({
        loginMethods: ['wallet'],
        walletChainType: 'ethereum-only'
      });
    }
    // Redirect will happen in the useEffect above
  };

  // Show loading spinner until we've made initial authentication check
  if (!ready || checkingCharacter || (!initialCheckComplete && authenticated)) {
    return (
      <Center height="100vh" bg="gray.900">
        <Spinner size="xl" color="purple.500" thickness="4px" />
      </Center>
    );
  }

  return (
    <Center height="100vh" bg="gray.900">
      <Box 
        p={8} 
        maxWidth="500px" 
        borderWidth={1} 
        borderRadius="lg" 
        boxShadow="dark-lg"
        bg="gray.800"
        borderColor="gray.700"
      >
        <VStack align="center" spacing={6}>
          <Heading as="h1" size="xl" color="white">Battle Nads</Heading>
          <Heading as="h2" size="md" color="gray.300">Login to continue</Heading>
          <Button 
            colorScheme="purple" 
            size="lg" 
            onClick={handleLogin}
            width="full"
            borderRadius="md"
            py={6}
            fontWeight="bold"
            bgGradient="linear(to-r, blue.400, purple.500)"
            _hover={{
              bgGradient: "linear(to-r, blue.500, purple.600)",
              transform: "translateY(-2px)",
              boxShadow: "lg"
            }}
            _active={{
              bgGradient: "linear(to-r, blue.600, purple.700)",
              transform: "translateY(0)",
            }}
            leftIcon={<Icon as={FaEthereum} boxSize={5} />}
          >
            Connect Evm Wallet
          </Button>
        </VStack>
      </Box>
    </Center>
  );
};

export default Login; 