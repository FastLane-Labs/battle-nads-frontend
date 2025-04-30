import React from 'react';
import {
  Center,
  VStack,
  Heading,
  Alert,
  AlertIcon,
  AlertDescription,
  Button,
  Image
} from '@chakra-ui/react';

interface SessionKeyPromptProps {
  sessionKeyState: string;
  onUpdate: () => Promise<void>;
  isUpdating: boolean;
}

const SessionKeyPrompt: React.FC<SessionKeyPromptProps> = ({
  sessionKeyState,
  onUpdate,
  isUpdating
}) => {
  return (
    <Center height="100vh" className="bg-gray-900" color="white">
      <VStack spacing={6} maxWidth="600px" p={6}>
        <Image 
          src="/BattleNadsLogo.png" 
          alt="Battle Nads Logo" 
          width="300px" 
          maxWidth="80%" 
          objectFit="contain" 
          mb={4}
        />
        <Heading size="md" color="yellow.400">Session Key Update Required</Heading>
        <Alert status="warning">
          <AlertIcon />
          <AlertDescription>
            Your session key needs to be updated ({sessionKeyState}) to perform actions.
          </AlertDescription>
        </Alert>
        <Button 
          colorScheme="yellow" 
          onClick={onUpdate}
          isLoading={isUpdating}
          loadingText="Updating..."
        >
          Update Session Key
        </Button>
      </VStack>
    </Center>
  );
};

export default SessionKeyPrompt; 