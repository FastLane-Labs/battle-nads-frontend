import React, { useEffect, useState } from 'react';
import { Box, Heading, Button, Center, VStack, Text, Spinner, Image, Icon } from '@chakra-ui/react';
import { usePrivy } from '@privy-io/react-auth';
import { useNavigate } from 'react-router-dom';
import { useBattleNads } from '../hooks/useBattleNads';
import { FaEthereum } from 'react-icons/fa';

const Login: React.FC = () => {
  const { login, authenticated, ready, user } = usePrivy();
  const navigate = useNavigate();
  const { getPlayerCharacterID, loading, characterId } = useBattleNads();
  const [checkingCharacter, setCheckingCharacter] = useState(false);

  // Check if user has a character directly using the contract function
  useEffect(() => {
    const checkCharacter = async () => {
      if (ready && authenticated && user?.wallet?.address) {
        try {
          setCheckingCharacter(true);
          console.log("Checking for character using EOA address:", user.wallet.address);
          
          // Use the direct contract call to check if this EOA has a character
          const characterID = await getPlayerCharacterID(user.wallet.address);
          
          if (characterID) {
            console.log("Found character ID:", characterID);
            // Character exists, go to game
            navigate('/game');
          } else {
            console.log("No character found, redirecting to character creation");
            // No character, go to character creation
            navigate('/create');
          }
        } catch (error) {
          console.error("Error checking character:", error);
          // If there's an error, default to character creation
          navigate('/create');
        } finally {
          setCheckingCharacter(false);
        }
      }
    };

    checkCharacter();
  }, [authenticated, ready, navigate, user, getPlayerCharacterID]);

  // Also check if characterId exists in state
  useEffect(() => {
    if (characterId) {
      console.log("Character ID found in state, redirecting to game");
      navigate('/game');
    }
  }, [characterId, navigate]);

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

  if (!ready || loading || checkingCharacter) {
    return (
      <Center height="100vh">
        <VStack spacing={4}>
          <Spinner size="xl" />
          <Text>Loading authentication and checking for existing character...</Text>
        </VStack>
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
            Connect Ethereum Wallet
          </Button>
        </VStack>
      </Box>
    </Center>
  );
};

export default Login; 