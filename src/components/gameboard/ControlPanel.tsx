import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  VStack, 
  HStack, 
  Button, 
  Text, 
  Heading, 
  Tooltip, 
  useToast,
  Modal, 
  ModalOverlay, 
  ModalContent, 
  ModalHeader, 
  ModalFooter, 
  ModalBody, 
  ModalCloseButton, 
  useDisclosure,
  Alert,
  AlertIcon,
  Image
} from '@chakra-ui/react';
import { useWallet } from '../../providers/WalletProvider';
import { useBattleNads, useGameActions, useCharacterData } from '../../hooks/useBattleNads';
import { useGameData } from '../../providers/GameDataProvider';
import MovementControls from './MovementControls';

interface ControlPanelProps {
  characterId: string;
}

export default function ControlPanel({ characterId }: ControlPanelProps) {
  const { injectedWallet, embeddedWallet } = useWallet();
  const { moveCharacter, updateSessionKey, getCurrentSessionKey } = useGameActions();
  const { gameData } = useGameData();
  
  // Use Chakra UI's useDisclosure for Modal state management
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  // Generate unique instance ID for debugging
  const instanceId = useRef<string>(`ControlPanel-${Math.random().toString(36).substring(2, 9)}`);
  
  const [isMoving, setIsMoving] = useState(false);
  const [movementError, setMovementError] = useState<string | null>(null);
  const [isUpdatingSessionKey, setIsUpdatingSessionKey] = useState(false);
  const toast = useToast();
  
  // Register this component instance in the mount effect for debugging
  useEffect(() => {
    const timestamp = new Date().toISOString();
    console.log(`[ControlPanel ${timestamp}] Component instance ${instanceId.current} created`);
    
    return () => {
      const cleanupTime = new Date().toISOString();
      console.log(`[ControlPanel ${cleanupTime}] Component instance ${instanceId.current} destroyed`);
    };
  }, []);
  
  // Listen for sessionKeyUpdateNeeded event
  useEffect(() => {
    const handleSessionKeyUpdateNeeded = (event: CustomEvent) => {
      console.log(`[ControlPanel ${instanceId.current}] Received sessionKeyUpdateNeeded event:`, event.detail);
      // Force window to open even if we're not ready for other reasons
      onOpen();
    };
    
    // Listen for sessionKeyValid event to close dialog if open
    const handleSessionKeyValid = (event: CustomEvent) => {
      console.log(`[ControlPanel ${instanceId.current}] Received sessionKeyValid event:`, event.detail);
      if (isOpen) {
        onClose();
        toast({
          title: "Session key is now valid",
          description: "Your session key has been updated successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      }
    };
    
    console.log(`[ControlPanel ${instanceId.current}] Setting up session key event listeners`);
    
    // Add event listeners
    window.addEventListener('sessionKeyUpdateNeeded', handleSessionKeyUpdateNeeded as EventListener);
    window.addEventListener('sessionKeyValid', handleSessionKeyValid as EventListener);
    
    // Clean up
    return () => {
      console.log(`[ControlPanel ${instanceId.current}] Removing session key event listeners`);
      window.removeEventListener('sessionKeyUpdateNeeded', handleSessionKeyUpdateNeeded as EventListener);
      window.removeEventListener('sessionKeyValid', handleSessionKeyValid as EventListener);
    };
  }, [isOpen, onOpen, onClose, toast, instanceId]);
  
  // Manually emit the session key update event for testing
  const testSessionKeyUpdateEvent = () => {
    console.log(`[ControlPanel ${instanceId.current}] Manually dispatching sessionKeyUpdateNeeded event for testing`);
    const sessionKeyUpdateEvent = new CustomEvent('sessionKeyUpdateNeeded', {
      detail: { 
        characterId,
        owner: injectedWallet?.address,
        currentSessionKey: embeddedWallet?.address,
        embeddedWalletAddress: embeddedWallet?.address,
        reason: 'test'
      }
    });
    window.dispatchEvent(sessionKeyUpdateEvent);
  };
  
  // Function to check session key health and fix if needed
  const checkSessionKey = async () => {
    try {
      // Show dialog immediately if it's triggered from the button click
      onOpen();
      
      // Display a toast to inform user we're checking
      toast({
        title: "Checking session key status...",
        status: "info",
        duration: 3000,
        isClosable: true,
      });
      
      console.log(`[ControlPanel ${instanceId.current}] Manually checking session key for character: ${characterId}`);
      
      // First get the current character's session key
      const sessionKeyData = await getCurrentSessionKey(characterId);
      console.log(`[ControlPanel ${instanceId.current}] Current session key for character:`, sessionKeyData);
      
      if (!sessionKeyData) {
        console.log(`[ControlPanel ${instanceId.current}] No session key found, needs update`);
        toast({
          title: "Session key issue",
          description: "No session key found. Please update it to continue playing.",
          status: "warning",
          duration: 5000,
          isClosable: true,
        });
        
        // Manually dispatch the update needed event
        const updateEvent = new CustomEvent('sessionKeyUpdateNeeded', {
          detail: { 
            characterId,
            owner: injectedWallet?.address,
            currentSessionKey: null,
            embeddedWalletAddress: embeddedWallet?.address,
            reason: 'manual-check-missing',
            source: 'ControlPanel'
          }
        });
        window.dispatchEvent(updateEvent);
        console.log(`[ControlPanel ${instanceId.current}] Dispatched sessionKeyUpdateNeeded event due to missing key`);
        return;
      }
      
      // Check if session key is expired
      const currentBlock = (gameData?.lastFetchedBlock || 0);
      const isExpired = sessionKeyData.expiration < currentBlock;
      
      if (isExpired) {
        console.log(`[ControlPanel ${instanceId.current}] Session key expired - expiration: ${sessionKeyData.expiration}, current block: ${currentBlock}`);
        toast({
          title: "Session key expired",
          description: `Your session key expired at block ${sessionKeyData.expiration} (current block: ${currentBlock}).`,
          status: "warning",
          duration: 5000,
          isClosable: true,
        });
        
        // Manually dispatch the update needed event
        const updateEvent = new CustomEvent('sessionKeyUpdateNeeded', {
          detail: { 
            characterId,
            owner: injectedWallet?.address,
            currentSessionKey: sessionKeyData.key,
            embeddedWalletAddress: embeddedWallet?.address,
            reason: 'manual-check-expired',
            source: 'ControlPanel'
          }
        });
        window.dispatchEvent(updateEvent);
        console.log(`[ControlPanel ${instanceId.current}] Dispatched sessionKeyUpdateNeeded event due to expired key`);
        return;
      }
      
      // If not expired, compare with embedded wallet address
      const matchesEmbedded = sessionKeyData.key.toLowerCase() === embeddedWallet?.address?.toLowerCase();
      console.log(`[ControlPanel ${instanceId.current}] Session key matches embedded wallet:`, matchesEmbedded);
      
      if (!matchesEmbedded) {
        // Show a toast explaining we need to update the session key
        toast({
          title: "Session key mismatch",
          description: "Session key doesn't match your current wallet. Update needed.",
          status: "warning",
          duration: 5000,
          isClosable: true,
        });
        
        // Manually dispatch the update needed event
        const updateEvent = new CustomEvent('sessionKeyUpdateNeeded', {
          detail: { 
            characterId,
            owner: injectedWallet?.address,
            currentSessionKey: sessionKeyData.key,
            embeddedWalletAddress: embeddedWallet?.address,
            reason: 'manual-check-mismatch',
            source: 'ControlPanel'
          }
        });
        window.dispatchEvent(updateEvent);
        console.log(`[ControlPanel ${instanceId.current}] Dispatched sessionKeyUpdateNeeded event due to mismatched key`);
      } else {
        toast({
          title: "Session key is valid",
          description: "Your session key is correctly set and not expired",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        onClose();
      }
    } catch (error) {
      console.error(`[ControlPanel ${instanceId.current}] Error checking session key:`, error);
      toast({
        title: "Error checking session key",
        description: error instanceof Error ? error.message : "Unknown error",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  // Function to handle session key update
  const handleUpdateSessionKey = async () => {
    try {
      setIsUpdatingSessionKey(true);
      
      if (!embeddedWallet?.address) {
        throw new Error("No embedded wallet available to use as session key");
      }
      
      const result = await updateSessionKey(embeddedWallet.address);
      
      if (result?.success) {
        toast({
          title: "Session key updated",
          description: "Your session key has been updated successfully",
          status: "success",
          duration: 5000,
          isClosable: true,
        });
        onClose();
      } else {
        throw new Error(result?.error || "Unknown error updating session key");
      }
    } catch (error) {
      console.error("[handleUpdateSessionKey] Error:", error);
      toast({
        title: "Session key update failed",
        description: error instanceof Error ? error.message : "Unknown error",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsUpdatingSessionKey(false);
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
      
      // Check if error indicates expired session key
      if (errorMessage.includes("session key has expired")) {
        toast({
          title: "Session key expired",
          description: "Your session key has expired. Click 'Fix Session Key' to update it.",
          status: "warning",
          duration: 10000,
          isClosable: true,
        });
      }
      // Also check for other session key related issues
      else if (errorMessage.includes("session key") || errorMessage.includes("Transaction failed")) {
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
                  gameData: gameData ? 'Available' : 'Not available',
                  injectedWallet: {
                    address: injectedWallet?.address,
                    type: injectedWallet?.walletClientType
                  },
                  embeddedWallet: {
                    address: embeddedWallet?.address,
                    type: 'embedded'
                  }
                });
                
                // Also test the session key update event
                testSessionKeyUpdateEvent();
                
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
        
        {/* Session Key Update Modal - using Chakra UI's Modal component */}
        <Modal isOpen={isOpen} onClose={onClose} isCentered size="md">
          <ModalOverlay />
          <ModalContent bg="gray.800" color="white">
            <ModalHeader>Session Key Update Required</ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              <VStack spacing={4} align="center">
                <Image 
                  src="/BattleNadsLogo.png" 
                  alt="Battle Nads Logo"
                  width="200px"
                  maxWidth="80%"
                  objectFit="contain"
                  mb={2}
                />
                
                <Alert status="warning" borderRadius="md">
                  <AlertIcon />
                  <Text fontSize="sm">
                    Your session key needs to be updated to continue playing.
                  </Text>
                </Alert>
                
                <Text fontSize="sm">This can happen when:</Text>
                
                <VStack align="start" spacing={1} w="100%" pl={4}>
                  <Text fontSize="sm">• Your session key has expired</Text>
                  <Text fontSize="sm">• Your session key doesn't match your current wallet</Text>
                  <Text fontSize="sm">• Your session key is not set</Text>
                </VStack>
                
                <Text fontSize="sm">
                  Click the button below to update your session key. This will require a transaction from your main wallet.
                </Text>
              </VStack>
            </ModalBody>

            <ModalFooter>
              <Button 
                colorScheme="green" 
                mr={3} 
                onClick={handleUpdateSessionKey}
                isLoading={isUpdatingSessionKey}
                loadingText="Updating..."
              >
                Update Session Key
              </Button>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </VStack>
    </Box>
  );
} 