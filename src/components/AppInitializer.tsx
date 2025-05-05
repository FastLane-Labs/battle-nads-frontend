import React from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from '../hooks/game/useGame';
import Login from './auth/Login';
import LoadingScreen from './game/screens/LoadingScreen';
import ErrorScreen from './game/screens/ErrorScreen';
import SessionKeyPrompt from './game/screens/SessionKeyPrompt';
import GameContainer from './game/GameContainer';
import { isValidCharacterId } from '../utils/getCharacterLocalStorageKey';
import NavBar from './NavBar';
import { Box } from '@chakra-ui/react';

const AppInitializer: React.FC = () => {
  const game = useGame();
  const router = useRouter();
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

  // 0. Wait for Wallet Initialization
  if (!game.isInitialized) {
    return renderWithNav(<LoadingScreen message="Initializing Wallet..." />, "Wallet Init Loading");
  }
  
  // 1. No Wallet Connected State (HIGHEST PRIORITY after init)
  if (!game.hasWallet) {
    return <Login />; 
  }

  // --- Wallet IS Connected States --- 

  // 2. Loading State (Only relevant if wallet IS connected)
  if (game.isLoading) { 
    return renderWithNav(<LoadingScreen message="Initializing Game Data..." />, "Loading Screen");
  }

  // 3. Error State
  if (game.error) {
    return renderWithNav(
      <ErrorScreen error={game.error?.message || 'An unknown error occurred'} retry={() => window.location.reload()} onGoToLogin={() => window.location.reload()} />,
      "Error Screen"
    );
  }

  // 4. PRIORITY: No Character Found State (Wallet connected, not loading, no error)
  if (game.hasWallet && game.characterId === zeroCharacterId) { 
    router.push('/create'); 
    return renderWithNav(<LoadingScreen message="Redirecting..." />, "Redirecting"); 
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
      const addOptimisticChatMessage = (message: string) => { game.addOptimisticChatMessage(message); };
      const playerIndex = game.character?.index ?? null;

      return renderWithNav(
         <GameContainer
           character={game.character}
           position={position}
           gameState={game.worldSnapshot}
           moveCharacter={moveCharacter}
           attack={attack}
           sendChatMessage={sendChatMessage}
           addOptimisticChatMessage={addOptimisticChatMessage}
           isMoving={game.isMoving}
           isAttacking={game.isAttacking}
           isSendingChat={game.isSendingChat}
           isInCombat={game.isInCombat}
           isCacheLoading={game.isCacheLoading}
         />,
         "Game Container"
      );
  }
  
  // Fallback:
  return renderWithNav(<LoadingScreen message="Verifying state..." />, "Fallback Loading Screen"); 
};

export default AppInitializer; 