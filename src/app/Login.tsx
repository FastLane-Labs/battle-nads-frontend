'use client';

import React, { useEffect, useState } from 'react';
import { Box, Button, Center, VStack, Spinner, Icon, Text } from '@chakra-ui/react';
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

  // Debug loading states
  useEffect(() => {
    console.log("Loading states:", { 
      privyReady: ready, 
      authenticated, 
      checkingCharacter,
      initialCheckComplete 
    });
  }, [ready, authenticated, checkingCharacter, initialCheckComplete]);

  // Use the Privy wallets information to set up our wallet provider
  useEffect(() => {
    if (ready && authenticated && walletsReady && wallets.length > 0 && !address) {
      // Instead of manually connecting, let the WalletProvider sync with Privy's state
      console.log("Wallet is connected via Privy:", wallets[0].address);
    }
  }, [ready, authenticated, walletsReady, wallets, address]);

  // Make sure initial check is completed even if not authenticated
  useEffect(() => {
    if (ready && !initialCheckComplete) {
      setInitialCheckComplete(true);
    }
  }, [ready, initialCheckComplete]);

  // Check if user has a character directly using the contract function
  useEffect(() => {
    const checkCharacter = async () => {
      // Only proceed if the user is authenticated and has a wallet
      if (ready && authenticated && user?.wallet?.address) {
        try {
          setCheckingCharacter(true);
          console.log("Checking for character using EOA address:", user.wallet.address);
          
          // After login, always go to dashboard which will handle redirects
          router.push('/dashboard');
        } catch (error) {
          console.error("Error after authentication:", error);
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
  }, [authenticated, ready, router, user]);

  // Also check if characterId exists in state, but only if authenticated
  useEffect(() => {
    if (authenticated && characterId) {
      console.log("Character ID found in state, redirecting to dashboard");
      router.push('/dashboard');
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

  // Simplified loading check - only show spinner when we're actively checking character
  if (checkingCharacter) {
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
            isLoading={!ready}
            loadingText="Loading..."
          >
            Connect Evm Wallet
          </Button>
        </VStack>
      </Box>
    </Center>
  );
};

export default Login; 