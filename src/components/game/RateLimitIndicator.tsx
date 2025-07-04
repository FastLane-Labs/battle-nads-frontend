import React from 'react';
import { Alert, AlertIcon, AlertDescription, Box, Progress } from '@chakra-ui/react';

interface RateLimitIndicatorProps {
  isRateLimited?: boolean;
  retryInSeconds?: number;
}

export const RateLimitIndicator: React.FC<RateLimitIndicatorProps> = ({ 
  isRateLimited, 
  retryInSeconds 
}) => {
  if (!isRateLimited) return null;

  return (
    <Box 
      position="fixed" 
      top="80px" 
      right="20px" 
      zIndex={1000}
      maxW="300px"
    >
      <Alert status="warning" variant="subtle" borderRadius="md" shadow="md">
        <AlertIcon />
        <Box>
          <AlertDescription fontSize="sm">
            Network busy - using cached data
            {retryInSeconds && retryInSeconds > 0 && (
              <>
                <br />
                Retrying in {retryInSeconds}s...
                <Progress 
                  value={(retryInSeconds / 60) * 100} 
                  size="xs" 
                  colorScheme="yellow" 
                  mt={1}
                  isAnimated
                />
              </>
            )}
          </AlertDescription>
        </Box>
      </Alert>
    </Box>
  );
};