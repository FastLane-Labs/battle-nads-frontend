import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGameState } from '../hooks/game/useGameState';
import Login from './auth/Login';
import LoadingScreen from './game/screens/LoadingScreen';
import ErrorScreen from './game/screens/ErrorScreen';
import SessionKeyPrompt from './game/screens/SessionKeyPrompt';
import GameContainer from './game/GameContainer';
import DeathModal from './game/modals/DeathModal';
import { isValidCharacterId } from '../utils/getCharacterLocalStorageKey';
import { handleContractChange } from '../utils/contractChangeDetection';
import NavBar from './NavBar';
import { Box, useToast } from '@chakra-ui/react';
import { formatEther } from 'ethers';
import { logger } from '../utils/logger';
import { OnboardingManager } from './onboarding';

const AppInitializer: React.FC = () => {
  const game = useGameState();
  const router = useRouter();
  const toast = useToast();
  const zeroCharacterId = "0x0000000000000000000000000000000000000000000000000000000000000000";
  
  // State for contract change detection
  const [contractChangeState, setContractChangeState] = useState<{
    isChecking: boolean;
    hasChecked: boolean;
    changeDetected: boolean;
    error?: string;
  }>({
    isChecking: false,
    hasChecked: false,
    changeDetected: false
  });

  // Equipment data is already available in the game state
  const { 
    rawEquipableWeaponIDs,
    rawEquipableWeaponNames,
    rawEquipableArmorIDs,
    rawEquipableArmorNames 
  } = game;

  const renderWithNav = (content: React.ReactNode, label?: string) => {
    return (
      <div className='h-screen'>
        <NavBar />
        <Box pt="64px" className='h-full'>{content}</Box>
        <OnboardingManager />
      </div>
    );
  };

  // Effect for contract change detection (runs once on mount)
  useEffect(() => {
    const checkContractChange = async () => {
      if (contractChangeState.hasChecked) return;
      
      setContractChangeState(prev => ({ ...prev, isChecking: true }));
      
      try {
        const changeDetected = await handleContractChange();
        
        if (changeDetected) {
          logger.info('[AppInitializer] Contract change detected and handled');
          toast({
            title: 'Contract Updated',
            description: 'The game contract has been updated. Your previous data has been cleared for a fresh start.',
            status: 'info',
            duration: 8000,
            isClosable: true,
          });
        }
        
        setContractChangeState(prev => ({
          ...prev,
          isChecking: false,
          hasChecked: true,
          changeDetected
        }));
      } catch (error) {
        logger.error('[AppInitializer] Error during contract change detection', error);
        setContractChangeState(prev => ({
          ...prev,
          isChecking: false,
          hasChecked: true,
          error: error instanceof Error ? error.message : 'Unknown error'
        }));
        
        // Show error toast but don't block the app
        toast({
          title: 'Contract Check Warning',
          description: 'Unable to verify contract version. The app will continue normally.',
          status: 'warning',
          duration: 5000,
          isClosable: true,
        });
      }
    };

    checkContractChange();
  }, []); // Run only once on mount

  // Effect for redirection when no character exists
  useEffect(() => {
    // Only redirect if wallet is connected, initialized, not loading, no error, and character ID is zero
    if (game.isInitialized && game.hasWallet && !game.isLoading && !game.error && game.characterId === zeroCharacterId) {
      router.push('/create');
    }
    // Dependencies: Watch for changes in these state variables to trigger the effect
  }, [game.isInitialized, game.hasWallet, game.isLoading, game.error, game.characterId, zeroCharacterId, router]);

  // --- State Rendering Logic (Corrected Order) --- 

  // 0. Wait for Contract Change Check (highest priority)
  if (contractChangeState.isChecking) {
    return renderWithNav(<LoadingScreen message="Checking contract version..." />, "Contract Check Loading");
  }

  // 1. Wait for Wallet Initialization
  if (!game.isInitialized) {
    return renderWithNav(<LoadingScreen message="Initializing Wallet..." />, "Wallet Init Loading");
  }
  
  // 2. No Wallet Connected State (HIGHEST PRIORITY after init)
  if (!game.hasWallet) {
    return (
      <>
        <Login />
        <OnboardingManager />
      </>
    );
  }

  // --- Wallet IS Connected States --- 

  // 3. Loading State (Only relevant if wallet IS connected)
  if (game.isLoading) { 
    return renderWithNav(<LoadingScreen message="Initializing Game Data..." />, "Loading Screen");
  }

  // 4. Error State
  if (game.error) {
    return renderWithNav(
      <ErrorScreen error={game.error?.message || 'An unknown error occurred'} retry={() => window.location.reload()} onGoToLogin={() => window.location.reload()} />,
      "Error Screen"
    );
  }

  // 5. PRIORITY: No Character Found State (Wallet connected, not loading, no error)
  if (game.hasWallet && game.characterId === zeroCharacterId) { 
    return renderWithNav(<LoadingScreen message="Redirecting to character creation..." />, "Redirecting");
  }

  // 6. Character Death State (Check if character is dead)
  const isValidChar = isValidCharacterId(game.characterId);
  if (game.hasWallet && 
      isValidChar && 
      !game.isLoading &&
      game.character && 
      game.character.isDead) 
  {
    // Calculate balance lost (what the player had before death)
    const balanceLost = game.character.inventory.balance 
      ? `${formatEther(game.character.inventory.balance)} MON`
      : undefined;

    return renderWithNav(
      <DeathModal
        isOpen={true}
        characterName={game.character.name}
        balanceLost={balanceLost}
      />,
      "Death Modal"
    );
  }

  // 5. Session Key Needs Update State (Only checked if a valid character exists AND data is loaded)
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
             combatants: game.worldSnapshot.combatants.filter((combatant: any) => !combatant.isDead)
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