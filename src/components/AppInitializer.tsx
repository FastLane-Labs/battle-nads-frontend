import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSimplifiedGameState } from '../hooks/game/useSimplifiedGameState';
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
import { useWelcomeScreen } from './onboarding/WelcomeScreen';
import { useWallet } from '../providers/WalletProvider';
import { GameButton } from './ui';
import { safeFormatEther } from '@/utils/safeNumberConversion';

const AppInitializer: React.FC = () => {
  const game = useSimplifiedGameState();
  const router = useRouter();
  const toast = useToast();
  const { currentWallet, isWalletLocked, promptWalletUnlock } = useWallet();
  const zeroCharacterId = "0x0000000000000000000000000000000000000000000000000000000000000000";
  
  // Check onboarding status for current wallet
  const { hasSeenWelcome } = useWelcomeScreen(currentWallet !== 'none' ? currentWallet : undefined);
  
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
    // Only redirect if wallet is connected, initialized, not loading, no error, character ID is zero, AND onboarding is completed
    if (game.isInitialized && 
        game.hasWallet && 
        !game.isLoading && 
        !game.error && 
        game.characterId === zeroCharacterId &&
        hasSeenWelcome) {
      router.push('/create');
    }
    // Dependencies: Watch for changes in these state variables to trigger the effect
  }, [game.isInitialized, game.hasWallet, game.isLoading, game.error, game.characterId, zeroCharacterId, hasSeenWelcome, router]);

  // --- State Rendering Logic (Corrected Order) --- 

  // 0. Wait for Contract Change Check (highest priority)
  if (contractChangeState.isChecking) {
    return renderWithNav(<LoadingScreen message="Checking contract version..." />, "Contract Check Loading");
  }

  // 1. Wait for Wallet Initialization
  if (!game.isInitialized) {
    return renderWithNav(<LoadingScreen message="Initializing Wallet..." />, "Wallet Init Loading");
  }
  
  // 2. Wallet Locked State (PRIORITY over no wallet) - check even during gameplay
  if (isWalletLocked) {
    return (
      <>
        <div 
          className="min-h-screen w-full bg-cover bg-center bg-no-repeat flex items-center justify-center py-10"
          style={{ backgroundImage: "url('/assets/bg/dark-smoky-bg.webp')" }}
        >
          <div className="max-w-[600px] w-full mx-auto px-4">
            <div className="flex flex-col items-center space-y-8">
              <img 
                src="/BattleNadsLogo.webp" 
                alt="Battle Nads Logo"
                className="max-w-[300px] md:max-w-[335px] mx-auto"
              />
              
              <h2 className="text-center text-2xl md:text-3xl font-semibold uppercase mb-4 gold-text tracking-wider leading-10">
                Wallet Locked
              </h2>
              
              <div className="flex flex-col items-center space-y-4">
                <GameButton
                  variant="primary"
                  onClick={promptWalletUnlock}
                  withAnimation={true}
                  hasGlow={true}
                  className="mt-4"
                >
                  Unlock Wallet
                </GameButton>
              </div>
            </div>
          </div>
        </div>
        <OnboardingManager />
      </>
    );
  }
  
  // 3. No Wallet Connected State (HIGHEST PRIORITY after init and lock check)
  if (!game.hasWallet) {
    return (
      <>
        <Login />
        <OnboardingManager />
      </>
    );
  }

  // --- Wallet IS Connected States --- 

  // 4. Loading State (Only relevant if wallet IS connected)
  if (game.isLoading) { 
    return renderWithNav(<LoadingScreen message="Initializing Game Data..." />, "Loading Screen");
  }

  // 5. Error State
  if (game.error) {
    return renderWithNav(
      <ErrorScreen error={game.error?.message || 'An unknown error occurred'} retry={() => window.location.reload()} onGoToLogin={() => window.location.reload()} />,
      "Error Screen"
    );
  }

  // 6. PRIORITY: No Character Found State (Wallet connected, not loading, no error)
  // Only show redirect screen if onboarding is completed
  if (game.hasWallet && game.characterId === zeroCharacterId && hasSeenWelcome) { 
    return renderWithNav(<LoadingScreen message="Redirecting to character creation..." />, "Redirecting");
  }

  // 7. Character Death State (Check if character is dead)
  const isValidChar = isValidCharacterId(game.characterId);
  if (game.hasWallet && 
      isValidChar && 
      !game.isLoading &&
      game.character && 
      game.character.isDead) 
  {
    return renderWithNav(
      <DeathModal
        isOpen={true}
        characterName={game.character.name}
      />,
      "Death Modal"
    );
  }

  // 8. Session Key Needs Update State (Only checked if a valid character exists AND data is loaded)
  if (game.hasWallet && 
      isValidChar && 
      game.needsSessionKeyUpdate && 
      !game.isLoading &&
      game.character)   
  {
    return renderWithNav(
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
      />,
      "Session Key Prompt"
    );
  }

  // 9. Ready State (Wallet, Valid Character, Valid Session Key)
  if (game.hasWallet && 
      isValidChar && 
      !game.needsSessionKeyUpdate && 
      game.character && 
      game.worldSnapshot &&
      !game.isLoading)
  {
      const position = game.position ? { x: game.position.x, y: game.position.y, z: game.position.depth } : { x: 0, y: 0, z: 0 };
      const moveCharacter = async (direction: any) => { await game.moveCharacter?.(direction); };
      const attack = async (targetIndex: number) => { await game.attack?.(targetIndex); };
      const sendChatMessage = async (message: string) => { await game.sendChatMessage?.(message); };
      const addOptimisticChatMessage = (message: string) => { game.addOptimisticChatMessage?.(message); };
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
           isMoving={game.isMoving || false}
           isAttacking={game.isAttacking || false}
           isSendingChat={game.isSendingChat || false}
           isInCombat={game.isInCombat || false}
           isCacheLoading={game.isCacheLoading || false}
           // Add equipment names data
           equipableWeaponIDs={rawEquipableWeaponIDs}
           equipableWeaponNames={rawEquipableWeaponNames}
           equipableArmorIDs={rawEquipableArmorIDs}
           equipableArmorNames={rawEquipableArmorNames}
           fogOfWar={game.fogOfWar}
           rawEndBlock={game.rawEndBlock}
         />,
         "Game Container"
      );
  }
  
  // Fallback:
  return renderWithNav(<LoadingScreen message="Verifying state..." />, "Fallback Loading Screen");
};

export default AppInitializer; 