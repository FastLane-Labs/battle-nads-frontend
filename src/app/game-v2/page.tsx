'use client';

import { useRouter } from 'next/navigation';
import { useGame } from '../../hooks/game/useGame';
import LoadingScreen from '@/components/game/screens/LoadingScreen';
import ErrorScreen from '@/components/game/screens/ErrorScreen';
import DisconnectedScreen from '@/components/game/screens/DisconnectedScreen';
import SessionKeyPrompt from '@/components/game/screens/SessionKeyPrompt';
import GameContainer from '@/components/game/GameContainer';
import NavBar from '@/components/NavBar';
import { Box } from '@chakra-ui/react';

export default function GameV2Page() {
  const router = useRouter();
  const game = useGame();

  if (game.isLoading && !game.character) {
    return (
      <>
        <NavBar />
        <LoadingScreen />
      </>
    );
  }
  
  if (game.error) {
    return (
      <>
        <NavBar />
        <ErrorScreen error={game.error} retry={game.refetch} onGoToLogin={() => router.push('/')} />
      </>
    );
  }
  
  if (!game.hasWallet) {
    return (
      <>
        <NavBar />
        <DisconnectedScreen onReturn={() => router.push('/')} />
      </>
    );
  }
  
  if (!game.isLoading && !game.characterId) {
    return (
      <>
        <NavBar />
        <DisconnectedScreen 
          message="Character Not Found"
          description={`We couldn't find a character associated with your wallet (${game.owner?.slice(0, 6)}...).`}
          primaryAction={{
            label: "Create Character",
            onClick: () => router.push('/create')
          }}
          secondaryAction={{
            label: "Change Wallet",
            onClick: () => router.push('/')
          }}
        />
      </>
    );
  }
  
  if (game.needsSessionKeyUpdate) {
    return (
      <>
        <NavBar />
        <SessionKeyPrompt 
          sessionKeyState={game.sessionKeyState}
          onUpdate={async () => {
            try {
              await game.updateSessionKey();
              return Promise.resolve();
            } catch (error) {
              return Promise.reject(error);
            }
          }}
          isUpdating={game.isUpdatingSessionKey}
        />
      </>
    );
  }

  // Extract only the props we need and transform position to match expected type
  const { 
    character, 
    characterId, 
    worldSnapshot,
    isAttacking, 
    isSendingChat, 
    isMoving 
  } = game;
  
  // Transform position from {x, y, depth} to {x, y, z}
  const position = game.position ? {
    x: game.position.x,
    y: game.position.y,
    z: game.position.depth
  } : { x: 0, y: 0, z: 0 };
  
  // Create wrappers for callback functions to ensure they return Promises
  const moveCharacter = async (direction: any) => {
    await game.moveCharacter(direction);
    return Promise.resolve();
  };
  
  const attack = async (targetIndex: number) => {
    await game.attack(targetIndex);
    return Promise.resolve();
  };
  
  const sendChatMessage = async (message: string) => {
    await game.sendChatMessage(message);
    return Promise.resolve();
  };

  return (
    <>
      <NavBar />
      <Box pt="64px"> {/* Add padding top to account for fixed navbar height */}
        <GameContainer 
          character={character!}
          characterId={characterId!}
          position={position}
          gameState={worldSnapshot}
          moveCharacter={moveCharacter}
          attack={attack}
          sendChatMessage={sendChatMessage}
          isMoving={isMoving}
          isAttacking={isAttacking}
          isSendingChat={isSendingChat}
        />
      </Box>
    </>
  );
} 