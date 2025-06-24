// I dont think this page is used anymore, but keeping it for now

'use client';

import { useRouter } from 'next/navigation';
import { useSimplifiedGameState } from '@/hooks/game/useSimplifiedGameState';
import LoadingScreen from '@/components/game/screens/LoadingScreen';
import ErrorScreen from '@/components/game/screens/ErrorScreen';
import SessionKeyPrompt from '@/components/game/screens/SessionKeyPrompt';
import GameContainer from '@/components/game/GameContainer';
import NavBar from '@/components/NavBar';
import { Box } from '@chakra-ui/react';
import { isValidCharacterId } from '@/utils/getCharacterLocalStorageKey';
import { useEffect } from 'react';

export default function GameV2Page() {
  const router = useRouter();
  const game = useSimplifiedGameState();
  const zeroCharacterId = "0x0000000000000000000000000000000000000000000000000000000000000000";

  useEffect(() => {
    if (!game.isLoading) {
      if (!game.hasWallet) {
        router.push('/login');
      } else if (game.characterId === zeroCharacterId) {
        router.push('/create');
      } else if (game.needsSessionKeyUpdate) {
        // Consider redirecting to a specific page or showing a modal
        // Handled by AppInitializer for now
      }
    }
  }, [game.isLoading, game.hasWallet, game.characterId, game.needsSessionKeyUpdate, router]);

  if (game.isLoading) return <LoadingScreen message="Loading Game..." />;
  if (game.error) return <ErrorScreen error={game.error?.message || 'An unknown error occurred'} retry={() => window.location.reload()} onGoToLogin={() => router.push('/')} />;
  if (!game.character || !game.worldSnapshot) {
    return <LoadingScreen message="Initializing Player..." />;
  }

  const position = game.position ? { x: game.position.x, y: game.position.y, z: game.position.depth } : { x: 0, y: 0, z: 0 };
  const moveCharacter = game.moveCharacter;
  const attack = game.attack;
  const sendChatMessage = game.sendChatMessage;
  const addOptimisticChatMessage = game.addOptimisticChatMessage;

  const isValidChar = isValidCharacterId(game.characterId);
  if (game.hasWallet && isValidChar && game.needsSessionKeyUpdate && !game.isLoading && game.character) {
    return (
      <>
        <NavBar />
        <SessionKeyPrompt 
          sessionKeyState={game.sessionKeyState || 'missing'}
          onUpdate={async () => {
            try {
              await game.updateSessionKey?.();
              return Promise.resolve();
            } catch (error) {
              console.error("Failed to update session key:", error);
              return Promise.reject(error);
            }
          }}
          isUpdating={game.isUpdatingSessionKey || false}
        />
      </>
    );
  }

  if (game.hasWallet && isValidChar && !game.needsSessionKeyUpdate && game.character && game.worldSnapshot && !game.isLoading) {
    return (
      <>
        <NavBar />
        <Box pt="64px">
          <GameContainer 
            character={game.character}
            position={position}
            gameState={game.worldSnapshot}
            moveCharacter={moveCharacter}
            attack={attack}
            sendChatMessage={sendChatMessage}
            addOptimisticChatMessage={addOptimisticChatMessage}
            isMoving={game.isMoving || false}
            isAttacking={game.isAttacking || false}
            isSendingChat={game.isSendingChat || false}
            isInCombat={game.isInCombat || false}
            isCacheLoading={game.isCacheLoading || false}
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