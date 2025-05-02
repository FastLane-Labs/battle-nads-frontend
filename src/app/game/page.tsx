'use client';

import { useRouter, redirect } from 'next/navigation';
import { useGame } from '@/hooks/game/useGame';
import LoadingScreen from '@/components/game/screens/LoadingScreen';
import ErrorScreen from '@/components/game/screens/ErrorScreen';
import SessionKeyPrompt from '@/components/game/screens/SessionKeyPrompt';
import GameContainer from '@/components/game/GameContainer';
import NavBar from '@/components/NavBar';
import { Box } from '@chakra-ui/react';
import { isValidCharacterId } from '@/utils/getCharacterLocalStorageKey';

export default function GameV2Page() {
  const router = useRouter();
  const game = useGame();
  const zeroCharacterId = "0x0000000000000000000000000000000000000000000000000000000000000000";

  if (game.isLoading || (game.hasWallet && game.characterId === null && !game.error)) {
    return (
      <>
        <NavBar />
        <LoadingScreen message="Initializing Game Data..." />
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
    redirect('/');
  }

  if (game.hasWallet && !game.isLoading && game.characterId === zeroCharacterId) {
    redirect('/create');
  }

  const isValidChar = isValidCharacterId(game.characterId);
  if (game.hasWallet && isValidChar && game.needsSessionKeyUpdate && !game.isLoading && game.character) {
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
              console.error("Failed to update session key:", error);
              return Promise.reject(error);
            }
          }}
          isUpdating={game.isUpdatingSessionKey}
        />
      </>
    );
  }

  if (game.hasWallet && isValidChar && !game.needsSessionKeyUpdate && game.character && game.worldSnapshot && !game.isLoading) {
    const position = game.position ? {
      x: game.position.x,
      y: game.position.y,
      z: game.position.depth
    } : { x: 0, y: 0, z: 0 };
    
    const moveCharacter = async (direction: any) => { await game.moveCharacter(direction); };
    const attack = async (targetIndex: number) => { await game.attack(targetIndex); };
    const sendChatMessage = async (message: string) => { await game.sendChatMessage(message); };

    return (
      <>
        <NavBar />
        <Box pt="64px">
          <GameContainer 
            character={game.character}
            characterId={game.characterId as string}
            position={position}
            gameState={game.worldSnapshot}
            moveCharacter={moveCharacter}
            attack={attack}
            sendChatMessage={sendChatMessage}
            isMoving={game.isMoving}
            isAttacking={game.isAttacking}
            isSendingChat={game.isSendingChat}
            isInCombat={game.isInCombat}
          />
        </Box>
      </>
    );
  }

  console.warn("[GameV2Page] Reached Fallback state. Rendering Loading.");
  return (
    <>
      <NavBar />
      <LoadingScreen message="Verifying state..." />
    </>
  );
} 