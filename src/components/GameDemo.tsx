import React from 'react';
import { Box, Heading, Center } from '@chakra-ui/react';

const GameDemo: React.FC = () => {
  return (
    <Center height="100vh">
      <Box p={8} maxWidth="500px" borderWidth={1} borderRadius="lg" boxShadow="lg">
        <Heading as="h1" size="xl" textAlign="center">Game Demo</Heading>
      </Box>
    </Center>
  );
};

export default GameDemo; 