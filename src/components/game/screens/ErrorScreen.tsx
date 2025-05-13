import React from 'react';
import {
  Center,
  VStack,
  Heading,
  Alert,
  AlertIcon,
  AlertDescription,
  Button,
} from '@chakra-ui/react';

interface ErrorScreenProps {
  error: string | null;
  retry?: () => void;
  onGoToLogin?: () => void;
}

const ErrorScreen: React.FC<ErrorScreenProps> = ({
  error,
  retry,
  onGoToLogin
}) => {
  return (
    <Center height="100%" className="bg-gray-900" color="white">
      <VStack spacing={6} maxWidth="600px" p={6}>
        <Heading as="h1" size="xl" color="white" mb={2}>Battle Nads</Heading>
        <Heading size="md" color="red.400">Error Loading Game</Heading>
        <Alert status="error" variant="solid">
          <AlertIcon />
          <AlertDescription>{error || "An unknown error occurred"}</AlertDescription>
        </Alert>
        {retry && (
          <Button colorScheme="blue" onClick={retry}>Retry</Button>
        )}
        {onGoToLogin && (
          <Button variant="outline" onClick={onGoToLogin}>Go to Login</Button>
        )}
      </VStack>
    </Center>
  );
};

export default ErrorScreen; 