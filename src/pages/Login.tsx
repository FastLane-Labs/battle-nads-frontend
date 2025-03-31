import React, { useEffect } from 'react';
import { Box, Heading, Button, Center, VStack, Text, Spinner } from '@chakra-ui/react';
import { usePrivy } from '@privy-io/react-auth';
import { useNavigate } from 'react-router-dom';
import { useBattleNads } from '../hooks/useBattleNads';

const Login: React.FC = () => {
  const { login, authenticated, ready, user } = usePrivy();
  const navigate = useNavigate();
  const { getPlayerCharacters, loading } = useBattleNads();

  // Check if user has a character and redirect accordingly
  useEffect(() => {
    const checkCharacter = async () => {
      if (ready && authenticated && user?.wallet?.address) {
        try {
          const characters = await getPlayerCharacters(user.wallet.address);
          
          // Redirect based on whether they have a character
          if (characters && characters.length > 0) {
            navigate('/game');
          } else {
            navigate('/create');
          }
        } catch (error) {
          console.error("Error checking character:", error);
          // If there's an error, default to character creation
          navigate('/create');
        }
      }
    };

    checkCharacter();
  }, [authenticated, ready, navigate, user, getPlayerCharacters]);

  const handleLogin = () => {
    // Only attempt login if not already authenticated
    if (!authenticated) {
      login();
    }
    // Redirect will happen in the useEffect above
  };

  if (!ready || loading) {
    return (
      <Center height="100vh">
        <VStack spacing={4}>
          <Spinner size="xl" />
          <Text>Loading authentication...</Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Center height="100vh">
      <Box p={8} maxWidth="500px" borderWidth={1} borderRadius="lg" boxShadow="lg">
        <VStack align="center" spacing={6}>
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