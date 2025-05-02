import React, { useEffect } from 'react';
import { useRouter, redirect } from 'next/navigation';
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
  const game = useGame();
  const zeroCharacterId = "0x0000000000000000000000000000000000000000000000000000000000000000";

  const renderWithNav = (content: React.ReactNode, label?: string) => {
    return (
      <>
        <NavBar />
        <Box pt="64px">{content}</Box>
      </>
    );
  };

  // --- State Rendering Logic (Corrected Order) --- 

  // 1. Loading State
  if (game.isLoading || (game.hasWallet && game.characterId === null && !game.error)) { 
    return renderWithNav(<LoadingScreen message="Initializing Game Data..." />, "Loading Screen");
  }

  // 2. Error State
  if (game.error) {
    return renderWithNav(
      <ErrorScreen error={game.error} retry={game.refetch} onGoToLogin={() => window.location.reload()} />,
      "Error Screen"
    );
  }

  // 3. No Wallet Connected State
  if (!game.hasWallet) {
    return <Login />;
  }

  // --- Wallet IS Connected States --- 

  // 4. PRIORITY: No Character Found State 
  if (game.hasWallet && !game.isLoading && game.characterId === zeroCharacterId) {
    redirect('/create'); 
  }

  // 5. Session Key Needs Update State (Only checked if a valid character exists AND data is loaded)
  const isValidChar = isValidCharacterId(game.characterId);
  if (game.hasWallet && 
      isValidChar && 
      game.needsSessionKeyUpdate && 
      !game.isLoading && 
      game.character)   
  {
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
      />,
      "Session Key Prompt"
    );
  }

  // 6. Ready State (Wallet, Valid Character, Valid Session Key)
  if (game.hasWallet && 
      isValidChar && 
      !game.needsSessionKeyUpdate && 
      game.character && 
      game.worldSnapshot &&
      !game.isLoading)
  {
      const position = game.position ? { x: game.position.x, y: game.position.y, z: game.position.depth } : { x: 0, y: 0, z: 0 };
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
           isInCombat={game.isInCombat}
         />,
         "Game Container"
      );
  }
  
  // Fallback:
  console.warn("[AppInit] Reached Fallback. Rendering Loading.", safeStringify(game)); 
  return renderWithNav(<LoadingScreen message="Verifying state..." />, "Fallback Loading Screen"); 
};

export default AppInitializer; 