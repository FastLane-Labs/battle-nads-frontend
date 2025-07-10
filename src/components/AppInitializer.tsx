import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSimplifiedGameState } from '../hooks/game/useSimplifiedGameState';
import Login from './auth/Login';
import LoadingScreen from './game/screens/LoadingScreen';
import ErrorScreen from './game/screens/ErrorScreen';
import SessionKeyPrompt from './game/screens/SessionKeyPrompt';
import GameContainer from './game/GameContainer';
import DeathModal from './game/modals/DeathModal';
import { isValidCharacterId } from '../utils/getCharacterLocalStorageKey';
import NavBar from './NavBar';
import { Box } from '@chakra-ui/react';
import { OnboardingManager } from './onboarding';
import { useWelcomeScreen } from './onboarding/WelcomeScreen';
import { useWallet } from '../providers/WalletProvider';
import { GameButton } from './ui';
import { useAuthState } from '@/contexts/AuthStateContext';
import { AuthState, shouldShowNavBar } from '@/types/auth';
import CharacterCreation from './characters/CharacterCreation';

const AppInitializer: React.FC = () => {
  const authState = useAuthState();
  const game = useSimplifiedGameState();
  const router = useRouter();
  const pathname = usePathname();
  const { currentWallet, promptWalletUnlock } = useWallet();
  const zeroCharacterId = "0x0000000000000000000000000000000000000000000000000000000000000000";
  
  // Check onboarding status for current wallet
  const { hasSeenWelcome } = useWelcomeScreen(currentWallet !== 'none' ? currentWallet : undefined);

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

  // Effect for redirection based on auth state and pathname
  useEffect(() => {
    // Redirect to character creation when in NO_CHARACTER state
    if (authState.state === AuthState.NO_CHARACTER && pathname !== '/create') {
      router.push('/create');
    }
    
    // Redirect to home if user has a character but is on create page
    if (authState.state === AuthState.READY && pathname === '/create') {
      router.push('/');
    }
  }, [authState.state, pathname, router]);

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
      if (pathname === '/create') {
        return renderWithNav(
          <CharacterCreation 
            onCharacterCreated={() => {
              // Character creation will update the state automatically
              // The auth state will change and redirect will happen
            }} 
          />, 
          "Character Creation"
        );
      }
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

export default AppInitializer; 