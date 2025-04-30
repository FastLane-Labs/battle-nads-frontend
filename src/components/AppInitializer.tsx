import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from '../hooks/game/useGame';
import Login from './auth/Login';
import LoadingScreen from './game/screens/LoadingScreen';
import ErrorScreen from './game/screens/ErrorScreen';
import SessionKeyPrompt from './game/screens/SessionKeyPrompt';
import GameContainer from './game/GameContainer';
import { safeStringify } from '../utils/bigintSerializer';
import { isValidCharacterId } from '../utils/getCharacterLocalStorageKey';
import NavBar from './NavBar';
import { Box } from '@chakra-ui/react';

const AppInitializer: React.FC = () => {
  const router = useRouter();
  const game = useGame();

  // Log current game state for debugging
  useEffect(() => {
    console.log("AppInitializer State:", safeStringify({
      isLoading: game.isLoading,
      error: game.error,
      hasWallet: game.hasWallet,
      owner: game.owner,
      characterId: game.characterId,
      needsSessionKeyUpdate: game.needsSessionKeyUpdate,
      sessionKeyState: game.sessionKeyState,
      isUpdatingSessionKey: game.isUpdatingSessionKey,
      character: game.character,
      worldSnapshot: game.worldSnapshot,
    }));
  }, [game]);

  // --- State Rendering Logic --- 

  // Function to wrap content with NavBar and padding
  const renderWithNav = (content: React.ReactNode) => (
    <>
      <NavBar />
      <Box pt="64px">
        {content}
      </Box>
    </>
  );

  // 1. Loading State (Primary)
  if (game.isLoading && !game.error) {
    return renderWithNav(<LoadingScreen message="Initializing Game Data..." />);
  }
  if (game.hasWallet && !game.isLoading && game.characterId === null && !game.error) {
    return renderWithNav(<LoadingScreen message="Checking for Character..." />);
  }

  // 2. Error State
  if (game.error) {
    return renderWithNav(
      <ErrorScreen error={game.error} retry={game.refetch} onGoToLogin={() => window.location.reload()} />
    );
  }

  // 3. No Wallet Connected State
  if (!game.hasWallet) {
    return <Login />;
  }

  // --- Wallet IS Connected States (NavBar should be visible) --- 

  // 4. No Character Found State
  if (game.hasWallet && !game.isLoading && game.characterId === "0x0000000000000000000000000000000000000000000000000000000000000000") {
    useEffect(() => {
      console.log("AppInitializer: No character found, redirecting to /create...");
      router.push('/create');
    }, [router]);
    return renderWithNav(<LoadingScreen message="Redirecting to character creation..." />);
  }

  // 5. Session Key Needs Update State
  if (game.hasWallet && game.needsSessionKeyUpdate) {
    return renderWithNav(
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
    );
  }

  // 6. Ready State
  if (game.hasWallet && 
      isValidCharacterId(game.characterId) && 
      !game.needsSessionKeyUpdate && 
      game.character && 
      game.worldSnapshot &&
      !game.isLoading)
  {
      const position = game.position ? {
        x: game.position.x,
        y: game.position.y,
        z: game.position.depth
      } : { x: 0, y: 0, z: 0 };
      const moveCharacter = async (direction: any) => { await game.moveCharacter(direction); };
      const attack = async (targetIndex: number) => { await game.attack(targetIndex); };
      const sendChatMessage = async (message: string) => { await game.sendChatMessage(message); };

      return renderWithNav(
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
         />
      );
  }

  // Fallback / Catch-all:
  console.warn("AppInitializer reached fallback state. Rendering Login.", safeStringify(game));
  return <Login />;
};

export default AppInitializer; 