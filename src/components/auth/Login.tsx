'use client';

import React, { useEffect } from 'react';
import { Box, Button, Center, VStack, Spinner, Icon, Text } from '@chakra-ui/react';
import { usePrivy } from '@privy-io/react-auth'; // Keep usePrivy for login function
import { useRouter } from 'next/navigation';
// Removed: import { useBattleNads } from '../../hooks/game/useBattleNads';
import { FaEthereum } from 'react-icons/fa';
import { useWallet } from '../../providers/WalletProvider';
import { useGame } from '../../hooks/game/useGame'; // Corrected path
import { isValidCharacterId } from '../../utils/getCharacterLocalStorageKey'; // Added import
import { safeStringify } from '../../utils/bigintSerializer';

const Login: React.FC = () => {
  const { login, authenticated, ready } = usePrivy(); // Still need login, maybe ready for button state
  const router = useRouter(); // Keep router for eventual redirection
  
  // Use the useGame hook - Destructure relevant state
  const {
    isLoading, // Loading state from useBattleNads via useGame
    error: gameError, // Error state from useBattleNads via useGame
    hasWallet, // Boolean indicating if owner wallet is connected
    characterId, // Player's character ID (null if not found/loaded)
    sessionKeyState, // State of the session key (from useSessionKey via useGame)
    needsSessionKeyUpdate // Boolean indicating if session key needs update
  } = useGame();

  // Debug game status and relevant state - using safe stringify for BigInt values
  useEffect(() => {
    // Use safe stringify to handle BigInt values safely
    console.log("Login Component - Game Hook State:", safeStringify({
      isLoading,
      gameError,
      hasWallet,
      characterId,
      sessionKeyState,
      needsSessionKeyUpdate,
    }));
    console.log("Login Component - Privy State:", { ready, authenticated });
  }, [isLoading, gameError, hasWallet, characterId, sessionKeyState, needsSessionKeyUpdate, ready, authenticated]);

  // Re-introduce redirection logic based on useGame state
  useEffect(() => {
    // Only redirect if wallet is connected and game data is no longer loading
    if (hasWallet && !isLoading) {
      console.log("Login Component: Checking redirection conditions...", { characterId });
      
      if (isValidCharacterId(characterId)) {
        // If a valid character exists, go to the main game page
        console.log("Login Component: Valid character found, redirecting to /game...");
        router.push('/game');
      } else if (characterId === "0x0000000000000000000000000000000000000000000000000000000000000000") {
        // If characterId is the zero address, no character exists, go to creation
        console.log("Login Component: No character found (zero address), redirecting to /create...");
        router.push('/create');
      } 
      // If characterId is null (still loading or error?), we wait.
      // If needsSessionKeyUpdate is true, we still redirect to /create or /game;
      // session key handling will occur on those pages.
    }
  }, [isLoading, hasWallet, characterId, router]);

  // Removed old effects managing local state and redirection

  const handleLogin = () => {
    // Only attempt login if not already authenticated via Privy
    if (!authenticated) {
      console.log("Login button clicked, initiating Privy login...");
      login({
        loginMethods: ['wallet'],
        walletChainType: 'ethereum-only'
      });
    } else {
      console.log("Login button clicked, but already authenticated via Privy.");
      // If Privy is authenticated but game state isn't ready, 
      // useGame hook should automatically try to load data based on wallet presence.
    }
    // Redirection is paused, will be handled by observing state changes later
  };

  // Determine overall loading state for the page spinner
  // Show spinner if useGame is loading OR if Privy isn't ready yet.
  const showPageSpinner = isLoading || !ready;

  // Show loading spinner
  if (showPageSpinner) {
    return (
      <Center height="100vh" bg="gray.900">
        <VStack>
           <Spinner size="xl" color="purple.500" thickness="4px" />
           {/* Provide more context based on isLoading vs !ready if needed */}
           <Text color="white" mt={4}>Loading...</Text>
        </VStack>
      </Center>
    );
  }

  // Show error state if gameError exists from useGame
  if (gameError) {
    return (
      <Center height="100vh" bg="gray.900">
        <VStack>
           <Text color="red.400" mb={4}>Error initializing game: {gameError}</Text>
           {/* Maybe provide a retry mechanism later if applicable */}
           <Button colorScheme="blue" onClick={() => window.location.reload()}>Refresh Page</Button>
        </VStack>
      </Center>
    );
  }

  // Show login button
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
            // Use Privy's ready state for the button's immediate loading feedback
            isLoading={!ready}
            loadingText="Connecting..."
            // Disable button if Privy is not ready OR if already authenticated (login action is N/A)
            isDisabled={!ready || authenticated}
          >
            {authenticated ? "Connected" : "Connect Evm Wallet"} 
          </Button>
        </VStack>
      </Box>
    </Center>
  );
};

export default Login; 