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
import { useGame } from '../../hooks/game/useGame';
import { domain } from '../../types';
import MovementControls from './MovementControls';
import { SessionKeyState } from '../../machines/sessionKeyMachine';

interface ControlPanelProps {
  characterId: string;
}

function mapDirectionStringToEnum(direction: string): domain.Direction | null {
  switch (direction.toLowerCase()) {
    case 'north': return domain.Direction.North;
    case 'south': return domain.Direction.South;
    case 'east': return domain.Direction.East;
    case 'west': return domain.Direction.West;
    case 'up': return domain.Direction.Up;
    case 'down': return domain.Direction.Down;
    default: return null;
  }
}

export default function ControlPanel({ characterId }: ControlPanelProps) {
  const { 
    owner,
    characterId: gameCharacterId,
    gameState,
    isLoading: isGameLoading,
    error: gameError,
    moveCharacter, 
    isMoving: isMovingFromHook,
    updateSessionKey,
    isUpdatingSessionKey: isUpdatingFromHook,
    sessionKeyState,
    needsSessionKeyUpdate
  } = useGame();
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const instanceId = useRef<string>(`ControlPanel-${Math.random().toString(36).substring(2, 9)}`);
  const toast = useToast();
  
  useEffect(() => {
    const timestamp = new Date().toISOString();
    console.log(`[ControlPanel ${timestamp}] Component instance ${instanceId.current} created`);
    
    return () => {
      const cleanupTime = new Date().toISOString();
      console.log(`[ControlPanel ${cleanupTime}] Component instance ${instanceId.current} destroyed`);
    };
  }, []);
  
  useEffect(() => {
    const handleSessionKeyUpdateNeeded = (event: CustomEvent) => {
      console.log(`[ControlPanel ${instanceId.current}] Received sessionKeyUpdateNeeded event:`, event.detail);
      onOpen();
    };
    
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
    
    window.addEventListener('sessionKeyUpdateNeeded', handleSessionKeyUpdateNeeded as EventListener);
    window.addEventListener('sessionKeyValid', handleSessionKeyValid as EventListener);
    
    return () => {
      console.log(`[ControlPanel ${instanceId.current}] Removing session key event listeners`);
      window.removeEventListener('sessionKeyUpdateNeeded', handleSessionKeyUpdateNeeded as EventListener);
      window.removeEventListener('sessionKeyValid', handleSessionKeyValid as EventListener);
    };
  }, [isOpen, onOpen, onClose, toast, instanceId]);
  
  const testSessionKeyUpdateEvent = () => {
    console.log(`[ControlPanel ${instanceId.current}] Manually dispatching sessionKeyUpdateNeeded event for testing`);
    const sessionKeyUpdateEvent = new CustomEvent('sessionKeyUpdateNeeded', {
      detail: { 
        characterId,
        owner: owner,
        currentSessionKey: owner,
        embeddedWalletAddress: owner,
        reason: 'test'
      }
    });
    window.dispatchEvent(sessionKeyUpdateEvent);
  };
  
  const checkSessionKey = async () => {
    console.warn("checkSessionKey current logic is basic, review if more detail needed");
    if (needsSessionKeyUpdate) {
        toast({ title: "Session Key Issue Detected", description: `State: ${sessionKeyState}. Please update.`, status: "warning" });
        onOpen();
    } else if (sessionKeyState === SessionKeyState.VALID) {
        toast({ title: "Session key is valid", status: "success" });
    } else {
        toast({ title: "Session Key Status", description: `Current state: ${sessionKeyState}`, status: "info" });
    }
  };
  
  const handleUpdateSessionKey = () => {
    console.log(`[ControlPanel ${instanceId.current}] Triggering session key update via useGame hook...`);
    updateSessionKey();
  };
  
  const handleMove = async (directionString: string) => {
    const direction = mapDirectionStringToEnum(directionString);
    if (!moveCharacter || !direction) {
      toast({ title: "Cannot move", description: `Invalid direction or move function unavailable.`, status: "error" });
      return;
    }
    console.log(`[ControlPanel] Moving ${directionString} via useGame hook...`);
    moveCharacter(direction);
  };

  return (
    <Box p={4} bg="gray.800" borderRadius="md" width="100%">
      <VStack spacing={4} align="stretch">
        <Heading size="md">Controls</Heading>
        
        <MovementControls 
          onMove={handleMove} 
          isDisabled={isMovingFromHook || isUpdatingFromHook}
        />
        
        <HStack spacing={4} justify="center" mt={2}>
          <Button 
            colorScheme="yellow" 
            size="sm" 
            onClick={checkSessionKey}
            isDisabled={isMovingFromHook || isUpdatingFromHook || !owner}
          >
            Check/Fix Session Key
          </Button>
          
          <Tooltip label="Shows wallet and character details for debugging">
            <Button 
              colorScheme="gray" 
              size="sm" 
              onClick={() => {
                console.log({
                  passedCharacterId: characterId,
                  gameHookCharacterId: gameCharacterId,
                  ownerAddress: owner,
                  gameStateAvailable: !!gameState,
                  isGameLoading: isGameLoading,
                  gameError: gameError,
                  sessionKeyState: sessionKeyState,
                  needsSessionKeyUpdate: needsSessionKeyUpdate,
                });
                toast({ title: "Debug info logged", status: "info" });
              }}
            >
              Debug
            </Button>
          </Tooltip>
        </HStack>
        
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
                isLoading={isUpdatingFromHook}
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