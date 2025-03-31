import React from 'react';
import { Box, Heading, Button, Center } from '@chakra-ui/react';

const CharacterCreation: React.FC = () => {
  return (
    <Center height="100vh">
      <Box p={8} maxWidth="500px" borderWidth={1} borderRadius="lg" boxShadow="lg">
        <Heading as="h1" size="xl" mb={6} textAlign="center">Create Character</Heading>
        <Button 
          colorScheme="blue" 
          width="full"
        >
          Create Character
        </Button>
      </Box>
    </Center>
  );
};

export default CharacterCreation; 