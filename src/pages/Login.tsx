import React from 'react';
import { Box, Heading, Button, Center, VStack } from '@chakra-ui/react';
import { usePrivy } from '@privy-io/react-auth';

const Login: React.FC = () => {
  const { login } = usePrivy();

  return (
    <Center height="100vh">
      <Box p={8} maxWidth="500px" borderWidth={1} borderRadius="lg" boxShadow="lg">
        <VStack align="center" spacing={6}>
          <Heading as="h1" size="xl">Battle Nads</Heading>
          <Heading as="h2" size="md">Login to continue</Heading>
          <Button 
            colorScheme="blue" 
            size="lg" 
            onClick={login}
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