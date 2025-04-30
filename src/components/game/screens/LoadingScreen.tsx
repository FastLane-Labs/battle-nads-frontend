import React from 'react';
import {
  Center,
  VStack,
  Heading,
  Spinner,
  Text,
  Button
} from '@chakra-ui/react';

interface LoadingScreenProps {
  message?: string;
  showRefresh?: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = "Loading Game Data...",
  showRefresh = false
}) => {
  return (
    <Center height="100vh" className="bg-gray-900" color="white">
      <VStack spacing={6}>
        <Heading as="h1" size="xl" color="white">Battle Nads</Heading>
        <Spinner size="xl" thickness="4px" speed="0.8s" color="blue.500" />
        <Text fontSize="xl" color="white">{message}</Text>
        {showRefresh && (
          <Button onClick={() => window.location.reload()} variant="outline">Refresh</Button>
        )}
      </VStack>
    </Center>
  );
};

export default LoadingScreen; 