import React, { useState, useEffect } from 'react';
import { Box, VStack, HStack, Button, Text, Heading, Tooltip, useToast } from '@chakra-ui/react';
import { useWallet } from '../../providers/WalletProvider';
import { useBattleNads } from '../../hooks/useBattleNads';
import MovementControls from './MovementControls';

interface ControlPanelProps {
  characterId: string;
}

export default function ControlPanel({ characterId }: ControlPanelProps) {
  const { injectedWallet, embeddedWallet } = useWallet();
  const { moveCharacter, getFullFrontendData, updateSessionKey, getCurrentSessionKey } = useBattleNads();
  const [isMoving, setIsMoving] = useState(false);
  const [movementError, setMovementError] = useState<string | null>(null);
  const toast = useToast();
  
  // Function to check session key health and fix if needed
  const checkSessionKey = async () => {
    try {
      // Display a toast to inform user we're checking
      toast({
        title: "Checking session key status...",
        status: "info",
        duration: 3000,
        isClosable: true,
      });
      
      // First get the current character's session key
      const currentSessionKey = await getCurrentSessionKey(characterId);
      console.log(`[checkSessionKey] Current session key for character:`, currentSessionKey);
      
      // Compare with embedded wallet address
      const matchesEmbedded = currentSessionKey === embeddedWallet?.address;
      console.log(`[checkSessionKey] Matches embedded wallet:`, matchesEmbedded);
      
      if (!matchesEmbedded) {
        // Show a toast explaining we need to update the session key
        toast({
          title: "Session key mismatch",
          description: "Updating your session key to fix movement issues...",
          status: "warning",
          duration: 5000,
          isClosable: true,
        });
        
        // Request update of session key using the embedded wallet address
        const result = await updateSessionKey(embeddedWallet?.address || undefined);
        
        if (result?.success) {
          toast({
            title: "Session key updated",
            description: "Your session key has been updated. You should now be able to move.",
            status: "success",
            duration: 5000,
            isClosable: true,
          });
        }
        
        // Fetch fresh data
        await getFullFrontendData();
      } else {
        toast({
          title: "Session key is valid",
          description: "Your session key is correctly set",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error("[checkSessionKey] Error:", error);
      toast({
        title: "Error checking session key",
        description: error instanceof Error ? error.message : "Unknown error",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  // Handle movement in a specific direction
  const handleMove = async (direction: string) => {
    try {
      setIsMoving(true);
      setMovementError(null);
      
      console.log(`[ControlPanel] Moving ${direction}...`);
      await moveCharacter(characterId, direction);
      
      // Show success toast
      toast({
        title: "Move successful",
        description: `You moved ${direction}`,
        status: "success",
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      console.error(`[ControlPanel] Movement error:`, error);
      
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setMovementError(errorMessage);
      
      // Show error toast
      toast({
        title: "Movement failed",
        description: errorMessage,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      
      // If the error suggests a session key issue, offer to fix it
      if (errorMessage.includes("session key") || errorMessage.includes("Transaction failed")) {
        toast({
          title: "Session key issue detected",
          description: "Click 'Fix Session Key' to resolve",
          status: "warning",
          duration: 10000,
          isClosable: true,
        });
      }
    } finally {
      setIsMoving(false);
    }
  };

  return (
    <Box p={4} bg="gray.800" borderRadius="md" width="100%">
      <VStack spacing={4} align="stretch">
        <Heading size="md">Controls</Heading>
        
        <MovementControls 
          onMove={handleMove} 
          isDisabled={isMoving}
        />
        
        {movementError && (
          <Text color="red.400" fontSize="sm">
            {movementError}
          </Text>
        )}
        
        <HStack spacing={4} justify="center" mt={2}>
          <Button 
            colorScheme="yellow" 
            size="sm" 
            onClick={checkSessionKey}
            isDisabled={isMoving}
          >
            Fix Session Key
          </Button>
          
          <Tooltip label="Shows wallet and character details for debugging">
            <Button 
              colorScheme="gray" 
              size="sm" 
              onClick={() => {
                console.log({
                  characterId,
                  injectedWallet: {
                    address: injectedWallet?.address,
                    type: injectedWallet?.walletClientType
                  },
                  embeddedWallet: {
                    address: embeddedWallet?.address,
                    type: 'embedded'
                  }
                });
                
                toast({
                  title: "Debug info logged",
                  description: "Check the console for wallet details",
                  status: "info",
                  duration: 3000,
                });
              }}
            >
              Debug
            </Button>
          </Tooltip>
        </HStack>
      </VStack>
    </Box>
  );
} 