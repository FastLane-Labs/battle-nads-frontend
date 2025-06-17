import React, { useCallback } from 'react';
import {
  Box,
  IconButton,
  Text,
  useToast,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Flex
} from '@chakra-ui/react';

import DebugPanel from '../DebugPanel';
import GameView from './layout/GameView';
import { domain } from '../../types';

// Use the result from useGame as the props type
interface GameContainerProps {
  character: domain.Character;
  position: { x: number; y: number; z: number };
  gameState: domain.WorldSnapshot | null;
  moveCharacter: (direction: domain.Direction) => Promise<void>;
  attack: (targetIndex: number) => Promise<void>;
  sendChatMessage: (message: string) => Promise<void>;
  isMoving: boolean;
  isAttacking: boolean;
  isSendingChat: boolean;
  isInCombat: boolean;
  addOptimisticChatMessage: (message: string) => void;
  isCacheLoading: boolean;
  // Add equipment names for lookup
  equipableWeaponIDs?: number[];
  equipableWeaponNames?: string[];
  equipableArmorIDs?: number[];
  equipableArmorNames?: string[];
}

const GameContainer: React.FC<GameContainerProps> = (props) => {
  const {
    character,
    position,
    gameState,
    moveCharacter,
    attack,
    sendChatMessage,
    isMoving,
    isAttacking,
    isSendingChat,
    isInCombat,
    addOptimisticChatMessage,
    isCacheLoading,
    equipableWeaponIDs,
    equipableWeaponNames,
    equipableArmorIDs,
    equipableArmorNames
  } = props;

  const isSpawned = !(position.x === 0 && position.y === 0 && position.z === 0);

  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const directionMap: { [key: string]: domain.Direction } = {
    north: domain.Direction.North,
    south: domain.Direction.South,
    east: domain.Direction.East,
    west: domain.Direction.West,
    up: domain.Direction.Up,
    down: domain.Direction.Down,
  };

  const handleMovement = useCallback(async (directionString: 'north' | 'south' | 'east' | 'west' | 'up' | 'down') => {
    if (!isMoving) {
      const directionEnum = directionMap[directionString];
      if (directionEnum === undefined) {
        console.error(`Invalid direction string: ${directionString}`);
        return;
      }
      try {
        await moveCharacter(directionEnum);
        toast({ title: `Moved ${directionString}`, status: "success", duration: 1500 });
      } catch (err: any) {
        toast({ title: "Movement Failed", description: err.message, status: "error", duration: 3000 });
      }
    }
  }, [moveCharacter, isMoving, toast, directionMap]);
  
  const handleAttack = useCallback(async (targetIndex: number) => {
    if (!isAttacking) {
      try {
        await attack(targetIndex);
        
        // Find the target name from combatants array
        const target = gameState?.combatants?.find(combatant => combatant.index === targetIndex);
        const targetName = target?.name || `Position ${targetIndex}`;
        
        toast({ title: `Attacked ${targetName}`, status: "success", duration: 1500 });
      } catch (err: any) {
        toast({ title: "Attack Failed", description: err.message, status: "error", duration: 3000 });
      }
    }
  }, [attack, isAttacking, toast, gameState?.combatants]);

  const handleSendChatMessage = useCallback(async (message: string) => {
    if (!isSendingChat && message.trim()) {
      try {
        await sendChatMessage(message);
      } catch (err: any) {
         toast({ title: "Send Failed", description: err.message, status: "error", duration: 3000 });
      }
    }
  }, [sendChatMessage, isSendingChat, toast]);

  //TODO: Add taskManager execute to allow character to spawn
  return (
    <Box height="100%" position="relative">
      {!isSpawned && (
        <Box
          position="absolute"
          top="0"
          left="0"
          right="0"
          bottom="0"
          bg="rgba(0, 0, 0, 0.7)" // Semi-transparent black background
          display="flex"
          alignItems="center"
          justifyContent="center"
          zIndex={2000} // High z-index to cover everything else
          color="white"
          fontSize="2xl"
          fontWeight="bold"
          textAlign="center"
          p={4}
        >
          Character has not spawned into the world yet.
        </Box>
      )}

      {/* Debug Button */}
      <Box position="fixed" left="20px" bottom="20px" zIndex={1000}>
        <IconButton
          aria-label="Debug Tools"
          icon={<Text fontSize="xs">DEBUG</Text>}
          onClick={onOpen}
          colorScheme="purple"
          size="sm"
        />
      </Box>
      
      {/* Debug Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent bg="gray.900" color="white" maxWidth="90vw">
          <ModalHeader>Debug Panel</ModalHeader>
          <ModalCloseButton />
          <ModalBody><DebugPanel /></ModalBody>
          <ModalFooter><Button colorScheme="gray" mr={3} onClick={onClose}>Close</Button></ModalFooter>
        </ModalContent>
      </Modal>

      {/* Main content area - Overlay will prevent interaction if !isSpawned */}
      <Flex flexDirection="column" className='h-full'>
        {/* Main Game View */}
        <GameView
          character={character}
          position={position}
          combatants={gameState?.combatants || []}
          chatLogs={gameState?.chatLogs || []}
          eventLogs={gameState?.eventLogs || []}
          onMove={handleMovement}
          onAttack={handleAttack}
          isMoving={isMoving}
          isAttacking={isAttacking}
          onSendChatMessage={handleSendChatMessage}
          addOptimisticChatMessage={addOptimisticChatMessage}
          isInCombat={isInCombat}
          isCacheLoading={isCacheLoading}
          equipableWeaponIDs={equipableWeaponIDs}
          equipableWeaponNames={equipableWeaponNames}
          equipableArmorIDs={equipableArmorIDs}
          equipableArmorNames={equipableArmorNames}
        />
      </Flex>
    </Box>
  );
};

export default GameContainer; 