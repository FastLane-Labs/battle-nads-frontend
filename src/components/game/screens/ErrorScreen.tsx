import React, { useEffect, useState } from 'react';
import {
  Center,
  VStack,
  Heading,
  Alert,
  AlertIcon,
  AlertDescription,
  Button,
  Spinner,
  Text,
  Progress,
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
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);
  const isRateLimitError = error?.includes('Network is busy') || error?.includes('rate limit');
  const isTransientError = error?.includes('Unable to fetch game data') || error?.includes('missing revert data');
  
  useEffect(() => {
    if (isRateLimitError && error) {
      // Extract retry time from error message
      const match = error.match(/(\d+)\s+seconds/);
      if (match) {
        const seconds = parseInt(match[1]);
        setRetryCountdown(seconds);
      }
    } else if (isTransientError) {
      // Auto-retry transient errors after 3 seconds
      setRetryCountdown(3);
    }
  }, [error, isRateLimitError, isTransientError]);

  useEffect(() => {
    if (retryCountdown !== null && retryCountdown > 0) {
      const timer = setTimeout(() => {
        setRetryCountdown(prev => prev !== null ? prev - 1 : null);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (retryCountdown === 0 && retry) {
      // Auto-retry when countdown reaches 0
      retry();
    }
  }, [retryCountdown, retry]);

  const isNetworkBusy = isRateLimitError && retryCountdown !== null && retryCountdown > 0;
  const isTemporaryError = (isTransientError || isNetworkBusy) && retryCountdown !== null && retryCountdown > 0;

  return (
    <Center height="100%" className="bg-gray-900" color="white">
      <VStack spacing={6} maxWidth="600px" p={6}>
        <Heading as="h1" size="xl" color="white" mb={2}>Battle Nads</Heading>
        <Heading size="md" color={isTemporaryError ? "yellow.400" : "red.400"}>
          {isNetworkBusy ? "Network Busy" : isTransientError ? "Connection Issue" : "Error Loading Game"}
        </Heading>
        
        {isTemporaryError ? (
          <>
            <Alert status="warning" variant="solid">
              <AlertIcon />
              <AlertDescription>
                {isNetworkBusy 
                  ? "The network is experiencing high traffic. We'll automatically retry in a moment."
                  : "Temporary connection issue. Retrying automatically..."}
              </AlertDescription>
            </Alert>
            <VStack spacing={3}>
              <Text fontSize="lg">Retrying in {retryCountdown} seconds...</Text>
              <Progress 
                value={(retryCountdown / (parseInt(error?.match(/(\d+)\s+seconds/)?.[1] || '10') || 10)) * 100} 
                size="xs" 
                colorScheme="yellow" 
                width="200px"
                isAnimated
              />
              <Spinner size="lg" color="yellow.400" />
            </VStack>
          </>
        ) : (
          <>
            <Alert status="error" variant="solid">
              <AlertIcon />
              <AlertDescription>{error || "An unknown error occurred"}</AlertDescription>
            </Alert>
            {retry && (
              <Button colorScheme="blue" onClick={retry}>Retry</Button>
            )}
          </>
        )}
        
        {onGoToLogin && (
          <Button variant="outline" onClick={onGoToLogin}>Go to Login</Button>
        )}
      </VStack>
    </Center>
  );
};

export default ErrorScreen; 