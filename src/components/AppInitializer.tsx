import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from '../hooks/game/useGame';
import { useBattleNads } from '../hooks/game/useBattleNads';
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

  // Also get equipment names data from useBattleNads
  const { 
    rawEquipableWeaponIDs,
    rawEquipableWeaponNames,
    rawEquipableArmorIDs,
    rawEquipableArmorNames 
  } = useBattleNads(game.owner);

  const renderWithNav = (content: React.ReactNode, label?: string) => {
    return (
      <div className='h-screen'>
        <NavBar />
        <Box pt="64px" className='h-full'>{content}</Box>
      </div>
    );
  };

  // Effect for redirection when no character exists
  useEffect(() => {
    // Only redirect if wallet is connected, initialized, not loading, no error, and character ID is zero
    if (game.isInitialized && game.hasWallet && !game.isLoading && !game.error && game.characterId === zeroCharacterId) {
      router.push('/create');
    }
    // Dependencies: Watch for changes in these state variables to trigger the effect
  }, [game.isInitialized, game.hasWallet, game.isLoading, game.error, game.characterId, zeroCharacterId, router]);

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
    return renderWithNav(<LoadingScreen message="Redirecting to character creation..." />, "Redirecting");
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
           gameState={{
             ...game.worldSnapshot,
             // Filter out dead combatants to prevent issues with "Unnamed the Initiate"
             combatants: game.worldSnapshot.combatants.filter(combatant => !combatant.isDead)
           }}
           moveCharacter={moveCharacter}
           attack={attack}
           sendChatMessage={sendChatMessage}
           addOptimisticChatMessage={addOptimisticChatMessage}
           isMoving={game.isMoving}
           isAttacking={game.isAttacking}
           isSendingChat={game.isSendingChat}
           isInCombat={game.isInCombat}
           isCacheLoading={game.isCacheLoading}
           // Add equipment names data
           equipableWeaponIDs={rawEquipableWeaponIDs}
           equipableWeaponNames={rawEquipableWeaponNames}
           equipableArmorIDs={rawEquipableArmorIDs}
           equipableArmorNames={rawEquipableArmorNames}
         />,
         "Game Container"
      );
  }
  
  // Fallback:
  return renderWithNav(<LoadingScreen message="Verifying state..." />, "Fallback Loading Screen"); 
};

export default AppInitializer; 