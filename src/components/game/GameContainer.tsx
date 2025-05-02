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

import WalletBalances from '../WalletBalances';
import DebugPanel from '../DebugPanel';
import GameView from './layout/GameView';
import { domain } from '../../types';

// Use the result from useGame as the props type
interface GameContainerProps {
  character: domain.Character;
  characterId: string;
  position: { x: number; y: number; z: number };
  gameState: domain.WorldSnapshot | null;
  moveCharacter: (direction: domain.Direction) => Promise<void>;
  attack: (targetIndex: number) => Promise<void>;
  sendChatMessage: (message: string) => Promise<void>;
  isMoving: boolean;
  isAttacking: boolean;
  isSendingChat: boolean;
  isInCombat: boolean;
}

const GameContainer: React.FC<GameContainerProps> = (props) => {
  const {
    character,
    characterId,
    position,
    gameState,
    moveCharacter,
    attack,
    sendChatMessage,
    isMoving,
    isAttacking,
    isSendingChat,
    isInCombat
  } = props;

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

  const addToCombatLog = useCallback((message: string) => {
    console.log("[Combat Log]:", message);
  }, []);

  const handleMovement = useCallback(async (directionString: 'north' | 'south' | 'east' | 'west' | 'up' | 'down') => {
    if (!isMoving) {
      const directionEnum = directionMap[directionString];
      if (directionEnum === undefined) {
        console.error(`Invalid direction string: ${directionString}`);
        return;
      }
      addToCombatLog(`Attempting move: ${directionString}`);
      try {
        await moveCharacter(directionEnum);
        toast({ title: `Moved ${directionString}`, status: "success", duration: 1500 });
      } catch (err: any) {
        toast({ title: "Movement Failed", description: err.message, status: "error", duration: 3000 });
        addToCombatLog(`Failed move ${directionString}: ${err.message}`);
      }
    }
  }, [moveCharacter, isMoving, addToCombatLog, toast, directionMap]);
  
  const handleAttack = useCallback(async (targetIndex: number) => {
    if (!isAttacking) {
      addToCombatLog(`Attempting attack on index: ${targetIndex}`);
      try {
        await attack(targetIndex);
        toast({ title: `Attacked target ${targetIndex}`, status: "success", duration: 1500 });
      } catch (err: any) {
        toast({ title: "Attack Failed", description: err.message, status: "error", duration: 3000 });
        addToCombatLog(`Failed attack on ${targetIndex}: ${err.message}`);
      }
    }
  }, [attack, isAttacking, addToCombatLog, toast]);

  const handleSendChatMessage = useCallback(async (message: string) => {
    if (!isSendingChat && message.trim()) {
      try {
        await sendChatMessage(message);
      } catch (err: any) {
         toast({ title: "Send Failed", description: err.message, status: "error", duration: 3000 });
      }
    }
  }, [sendChatMessage, isSendingChat, toast]);

  return (
    <Box height="calc(100vh - 60px)" position="relative">
      {/* Combat State Banner - REMOVED */}
      {/* <InCombatBanner isVisible={isInCombat} /> */}

      {/* Debug Button */}
      <Box position="fixed" right="20px" bottom="20px" zIndex={1000}>
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

      <Flex height="100%" flexDirection="column">
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
          characterId={characterId}
          onSendChatMessage={handleSendChatMessage}
          isInCombat={isInCombat}
        />

        {/* Wallet Balances */}
        <Box borderTop="1px" borderColor="gray.700">
          <WalletBalances />
        </Box>
      </Flex>
    </Box>
  );
};

export default GameContainer; 