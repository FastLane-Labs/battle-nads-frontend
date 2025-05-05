import React from 'react';
import {
  Center,
  VStack,
  Heading,
  Text,
  Button,
  Image
} from '@chakra-ui/react';

interface ActionProps {
  label: string;
  onClick: () => void;
}

interface DisconnectedScreenProps {
  message?: string;
  description?: string;
  showLogo?: boolean;
  primaryAction?: ActionProps;
  secondaryAction?: ActionProps;
  onReturn?: () => void;
}

const DisconnectedScreen: React.FC<DisconnectedScreenProps> = ({
  message = "Wallet Disconnected",
  description = "Your wallet seems to be disconnected.",
  showLogo = true,
  primaryAction,
  secondaryAction,
  onReturn
}) => {
  return (
    <Center height="100vh" className="bg-gray-900" color="white">
      <VStack spacing={6} maxWidth="600px" p={6}>
        {showLogo ? (
          <Image 
            src="/BattleNadsLogo.png" 
            alt="Battle Nads Logo" 
            width="300px" 
            maxWidth="80%" 
            objectFit="contain" 
            mb={4}
          />
        ) : (
          <Heading as="h1" size="xl" color="white" mb={2}>Battle Nads</Heading>
        )}
        
        <Heading size="md" color="blue.400">{message}</Heading>
        <Text color="white" textAlign="center">{description}</Text>
        
        {primaryAction && (
          <Button 
            colorScheme="blue" 
            size="lg" 
            onClick={primaryAction.onClick}
          >
            {primaryAction.label}
          </Button>
        )}
        
        {secondaryAction && (
          <Button 
            variant="outline" 
            onClick={secondaryAction.onClick}
          >
            {secondaryAction.label}
          </Button>
        )}
        
        {onReturn && !secondaryAction && (
          <Button 
            colorScheme="blue" 
            onClick={onReturn}
          >
            Return to Login
          </Button>
        )}
      </VStack>
    </Center>
  );
};

export default DisconnectedScreen; 