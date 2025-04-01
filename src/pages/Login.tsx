import React, { useEffect, useState } from 'react';
import { Box, Heading, Button, Center, VStack, Text, Spinner, Image } from '@chakra-ui/react';
import { usePrivy } from '@privy-io/react-auth';
import { useNavigate } from 'react-router-dom';
import { useBattleNads } from '../hooks/useBattleNads';

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
      login();
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
    <Center height="100vh">
      <Box p={8} maxWidth="500px" borderWidth={1} borderRadius="lg" boxShadow="lg">
        <VStack align="center" spacing={6}>
          <Image 
            src="/BattleNadsLogo.png" 
            alt="Battle Nads Logo"
            maxWidth="250px" 
            mb={2}
          />
          <Heading as="h1" size="xl">Battle Nads</Heading>
          <Heading as="h2" size="md">Login to continue</Heading>
          <Button 
            colorScheme="blue" 
            size="lg" 
            onClick={handleLogin}
            width="full"
          >
            Connect Wallet
          </Button>
        </VStack>
      </Box>
    </Center>
  );
};

export default Login; 