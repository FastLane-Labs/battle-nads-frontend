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
import { useBattleNads } from '../../hooks/game/useBattleNads';
import { useBattleNadsClient } from '../../hooks/contracts/useBattleNadsClient';
import { domain } from '../../types';
import MovementControls from './MovementControls';

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
  const { injectedWallet, embeddedWallet } = useWallet();
  const { client } = useBattleNadsClient();
  const ownerAddress = injectedWallet?.address;
  const { gameState, isLoading: isGameStateLoading, error: gameStateError } = useBattleNads(ownerAddress || null);

  const { 
    moveCharacter, 
    updateSessionKey, 
    getCurrentSessionKeyData,
    getLatestBlockNumber
  } = client || {};
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const instanceId = useRef<string>(`ControlPanel-${Math.random().toString(36).substring(2, 9)}`);
  const [isMoving, setIsMoving] = useState(false);
  const [movementError, setMovementError] = useState<string | null>(null);
  const [isUpdatingSessionKey, setIsUpdatingSessionKey] = useState(false);
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
        owner: injectedWallet?.address,
        currentSessionKey: embeddedWallet?.address,
        embeddedWalletAddress: embeddedWallet?.address,
        reason: 'test'
      }
    });
    window.dispatchEvent(sessionKeyUpdateEvent);
  };
  
  const checkSessionKey = async () => {
    if (!ownerAddress || !getCurrentSessionKeyData) {
       toast({ title: "Cannot check session key", description: "Owner wallet not connected or client unavailable.", status: "error" });
       return;
    }
    try {
      onOpen();
      toast({ title: "Checking session key status...", status: "info" });
      console.log(`[ControlPanel ${instanceId.current}] Manually checking session key for owner: ${ownerAddress}`);
      
      const sessionKeyData = await getCurrentSessionKeyData(ownerAddress);
      console.log(`[ControlPanel ${instanceId.current}] Current session key data:`, sessionKeyData);
      
      if (!sessionKeyData || !sessionKeyData.key || sessionKeyData.key === '0x0000000000000000000000000000000000000000') {
        const updateEvent = new CustomEvent('sessionKeyUpdateNeeded', {
          detail: { characterId, owner: ownerAddress, currentSessionKey: null, embeddedWalletAddress: embeddedWallet?.address, reason: 'manual-check-missing', source: 'ControlPanel'}
        });
        window.dispatchEvent(updateEvent);
        return;
      }
      
      const currentBlock = BigInt(gameState?.lastBlock || 0);
      const isExpired = sessionKeyData.expiration <= currentBlock;
      
      if (isExpired) {
        const updateEvent = new CustomEvent('sessionKeyUpdateNeeded', {
          detail: { characterId, owner: ownerAddress, currentSessionKey: sessionKeyData.key, embeddedWalletAddress: embeddedWallet?.address, reason: 'manual-check-expired', source: 'ControlPanel'}
        });
        window.dispatchEvent(updateEvent);
        return;
      }
      
      const matchesEmbedded = sessionKeyData.key.toLowerCase() === embeddedWallet?.address?.toLowerCase();
      
      if (!matchesEmbedded) {
        const updateEvent = new CustomEvent('sessionKeyUpdateNeeded', {
          detail: { characterId, owner: ownerAddress, currentSessionKey: sessionKeyData.key, embeddedWalletAddress: embeddedWallet?.address, reason: 'manual-check-mismatch', source: 'ControlPanel'}
        });
        window.dispatchEvent(updateEvent);
      } else {
        toast({ title: "Session key is valid", status: "success" });
        onClose();
      }
    } catch (error) {
      console.error(`[ControlPanel ${instanceId.current}] Error checking session key:`, error);
      toast({ title: "Error checking session key", description: error instanceof Error ? error.message : "Unknown error", status: "error" });
    }
  };
  
  const handleUpdateSessionKey = async () => {
    if (!updateSessionKey || !embeddedWallet?.address || !getLatestBlockNumber) {
      toast({ title: "Cannot update session key", description: "Update function, block fetch, or embedded wallet unavailable.", status: "error" });
      return;
    }
    try {
      setIsUpdatingSessionKey(true);
      
      const currentBlock = await getLatestBlockNumber();
      const expirationBlock = currentBlock + BigInt(43200);
      
      const tx = await updateSessionKey(embeddedWallet.address, Number(expirationBlock));
      
      toast({ title: "Update transaction sent", description: "Waiting for confirmation...", status: "info" });
      
      await tx.wait();

      toast({ title: "Session key updated", status: "success" });
      onClose();

    } catch (error) {
      console.error("[handleUpdateSessionKey] Error:", error);
      toast({ title: "Session key update failed", description: error instanceof Error ? error.message : "Unknown error", status: "error" });
    } finally {
      setIsUpdatingSessionKey(false);
    }
  };
  
  const handleMove = async (directionString: string) => {
    const direction = mapDirectionStringToEnum(directionString);
    if (!moveCharacter || !direction) {
      toast({ title: "Cannot move", description: `Invalid direction or move function unavailable.`, status: "error" });
      return;
    }
    try {
      setIsMoving(true);
      setMovementError(null);
      console.log(`[ControlPanel] Moving ${directionString}...`);
      
      const tx = await moveCharacter(characterId, direction);
      
      toast({ title: "Move transaction sent", description: `Moving ${directionString}...`, status: "info" });
      await tx.wait();

      toast({ title: "Move successful", description: `You moved ${directionString}`, status: "success" });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setMovementError(errorMessage);
      toast({ title: "Movement failed", description: errorMessage, status: "error" });
      if (errorMessage.includes("session key has expired")) {
        toast({
          title: "Session key expired",
          description: "Your session key has expired. Click 'Fix Session Key' to update it.",
          status: "warning",
          duration: 10000,
          isClosable: true,
        });
      }
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
          isDisabled={isMoving || isUpdatingSessionKey}
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
            isDisabled={isMoving || isUpdatingSessionKey || !ownerAddress}
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
                  ownerAddress,
                  gameState: gameState ? 'Available' : 'Not available',
                  isLoading: isGameStateLoading,
                  error: gameStateError,
                  clientAvailable: !!client,
                  injectedWallet: injectedWallet ? { address: injectedWallet.address, type: injectedWallet.walletClientType } : null,
                  embeddedWallet: embeddedWallet ? { address: embeddedWallet.address, type: 'embedded' } : null
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