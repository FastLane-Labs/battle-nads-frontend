'use client';

import React, { useEffect } from 'react';
import { Box, Button, Center, VStack, Icon } from '@chakra-ui/react';
import { usePrivy } from '@privy-io/react-auth';
import { FaEthereum } from 'react-icons/fa';

const Login: React.FC = () => {
  const { login, authenticated, ready } = usePrivy();

  const handleLogin = () => {
    // Only attempt login if Privy is ready and not already authenticated
    if (ready && !authenticated) {
      console.log("Login button clicked, initiating Privy login...");
      login({
        loginMethods: ['wallet'],
        walletChainType: 'ethereum-only'
      });
    } else if (!ready) {
      console.log("Login button clicked, but Privy is not ready yet.");
    } else {
      console.log("Login button clicked, but already authenticated via Privy.");
    }
  };

  // Show login button centered on the page
  return (
    <Center height="100vh">
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
            // Button loading state is now ONLY dependent on Privy's readiness
            isLoading={!ready}
            loadingText="Connecting..."
            // Disable button if Privy is not ready OR if already authenticated
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