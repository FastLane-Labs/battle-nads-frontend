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
import { AuthStateProvider, useAuthState } from '@/contexts/AuthStateContext';
import { AuthState, shouldShowNavBar } from '@/types/auth';

const AppInitializerContent: React.FC = () => {
  const authState = useAuthState();
  const game = useSimplifiedGameState();
  const router = useRouter();
  const toast = useToast();
  const { currentWallet, promptWalletUnlock } = useWallet();
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
        {shouldShowNavBar(authState.state) && <NavBar />}
        <Box pt={shouldShowNavBar(authState.state) ? "64px" : "0"} className='h-full'>{content}</Box>
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
    // Redirect to character creation when in NO_CHARACTER state
    if (authState.state === AuthState.NO_CHARACTER) {
      router.push('/create');
    }
  }, [authState.state, router]);

  // --- State Rendering Logic Based on Centralized Auth State --- 

  switch (authState.state) {
    case AuthState.CONTRACT_CHECKING:
      return renderWithNav(<LoadingScreen message="Checking contract version..." />, "Contract Check Loading");
      
    case AuthState.INITIALIZING:
      return renderWithNav(<LoadingScreen message="Initializing Wallet..." />, "Wallet Init Loading");
      
    case AuthState.WALLET_LOCKED:
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
      
    case AuthState.NO_WALLET:
      return (
        <>
          <Login />
          <OnboardingManager />
        </>
      );

    case AuthState.LOADING_GAME_DATA:
      return renderWithNav(<LoadingScreen message="Initializing Game Data..." />, "Loading Screen");
      
    case AuthState.ERROR:
      return renderWithNav(
        <ErrorScreen 
          error={authState.error?.message || 'An unknown error occurred'} 
          retry={() => window.location.reload()} 
          onGoToLogin={() => window.location.reload()} 
        />,
        "Error Screen"
      );
      
    case AuthState.NO_CHARACTER:
      return renderWithNav(<LoadingScreen message="Redirecting to character creation..." />, "Redirecting");
      
    case AuthState.CHARACTER_DEAD:
      return renderWithNav(
        <DeathModal
          isOpen={true}
          characterName={game.character?.name || 'Unknown'}
        />,
        "Death Modal"
      );
      
    case AuthState.SESSION_KEY_MISSING:
    case AuthState.SESSION_KEY_INVALID:
    case AuthState.SESSION_KEY_EXPIRED:
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
      
    case AuthState.SESSION_KEY_UPDATING:
      return renderWithNav(
        <LoadingScreen message="Updating session key..." />,
        "Session Key Updating"
      );

    case AuthState.READY:
      if (!game.character || !game.worldSnapshot) {
        return renderWithNav(<LoadingScreen message="Loading game data..." />, "Loading Game Data");
      }
      
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
      
    default:
      // Fallback for any unexpected states
      return renderWithNav(<LoadingScreen message="Verifying state..." />, "Fallback Loading Screen");
  }
};

const AppInitializer: React.FC = () => {
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
  
  const toast = useToast();
  
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
  
  return (
    <AuthStateProvider isCheckingContract={contractChangeState.isChecking}>
      <AppInitializerContent />
    </AuthStateProvider>
  );
};

export default AppInitializer; 