import React from 'react';
import { Box, VStack, Text, Center, useColorModeValue } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';

interface LoadingScreenProps {
  message?: string;
}

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = 'Loading...' 
}) => {
  const spinAnimation = `${spin} 1.5s linear infinite`;
  const bgColor = useColorModeValue('gray.800', 'gray.900');
  const borderColor = useColorModeValue('blue.400', 'purple.500');
  
  return (
    <Center height="100vh" bg={bgColor}>
      <VStack spacing={8}>
        <Box
          width="80px"
          height="80px"
          borderRadius="50%"
          border="3px solid transparent"
          borderTopColor={borderColor}
          borderBottomColor={borderColor}
          animation={spinAnimation}
        />
        <VStack>
          <Text fontSize="xl" fontWeight="bold" color="white">
            Battle Nads
          </Text>
          <Text color="gray.300">
            {message}
          </Text>
        </VStack>
      </VStack>
    </Center>
  );
};

export default LoadingScreen; 