import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSimplifiedGameState } from '../hooks/game/useSimplifiedGameState';
import { useAuthState } from '@/contexts/AuthStateContext';
import { AuthState } from '@/types/auth';
import { AppInitializerStateRenderer, stateToComponentMap } from './AppInitializerStateRenderer';

const AppInitializer: React.FC = () => {
  const authState = useAuthState();
  const game = useSimplifiedGameState();
  const router = useRouter();
  const pathname = usePathname();

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

  // Render content based on current auth state using the declarative mapping
  const renderContent = (state: AuthState): React.ReactNode => {
    const componentRenderer = stateToComponentMap[state];
    
    if (!componentRenderer) {
      // Fallback for any unexpected states
      return stateToComponentMap[AuthState.LOADING_GAME_DATA]({});
    }

    // Prepare props based on the state
    switch (state) {
      case AuthState.ERROR:
        return componentRenderer({
          error: authState.error?.message,
          retry: () => window.location.reload(),
        });
        
      case AuthState.NO_CHARACTER:
      case AuthState.CHARACTER_DEAD:
        return componentRenderer({
          pathname,
          characterName: game.character?.name || 'Unknown',
          onCharacterCreated: () => {
            // Character creation will update the state automatically
            // The auth state will change and redirect will happen
          },
        });
        
      case AuthState.SESSION_KEY_MISSING:
      case AuthState.SESSION_KEY_INVALID:
      case AuthState.SESSION_KEY_EXPIRED:
        return componentRenderer({
          sessionKeyState: game.sessionKeyState || 'missing',
          onUpdate: async () => {
            try {
              // The state machine will detect isUpdatingSessionKey and transition to updating state
              await game.updateSessionKey?.();
              return Promise.resolve();
            } catch (error) {
              console.error("Failed to update session key:", error);
              return Promise.reject(error);
            }
          },
          isUpdating: false, // Always false here since clicking will transition to SESSION_KEY_UPDATING state
        });
        
      case AuthState.READY:
        if (!game.character || !game.worldSnapshot) {
          return stateToComponentMap[AuthState.LOADING_GAME_DATA]({});
        }
        
        const position = game.position ? { x: game.position.x, y: game.position.y, z: game.position.depth } : { x: 0, y: 0, z: 0 };
        const moveCharacter = async (direction: any) => { await game.moveCharacter?.(direction); };
        const attack = async (targetIndex: number) => { await game.attack?.(targetIndex); };
        const sendChatMessage = async (message: string) => { await game.sendChatMessage?.(message); };
        const addOptimisticChatMessage = (message: string) => { game.addOptimisticChatMessage?.(message); };
        
        return componentRenderer({
          gameProps: {
            character: game.character,
            position,
            gameState: {
              ...game.worldSnapshot,
              // Filter out dead combatants to prevent issues with "Unnamed the Initiate"
              combatants: game.worldSnapshot.combatants.filter((combatant: any) => !combatant.isDead)
            },
            moveCharacter,
            attack,
            sendChatMessage,
            addOptimisticChatMessage,
            isMoving: game.isMoving || false,
            isAttacking: game.isAttacking || false,
            isSendingChat: game.isSendingChat || false,
            isInCombat: game.isInCombat || false,
            isCacheLoading: game.isCacheLoading || false,
            // Add equipment names data
            equipableWeaponIDs: game.rawEquipableWeaponIDs,
            equipableWeaponNames: game.rawEquipableWeaponNames,
            equipableArmorIDs: game.rawEquipableArmorIDs,
            equipableArmorNames: game.rawEquipableArmorNames,
            fogOfWar: game.fogOfWar,
            rawEndBlock: game.rawEndBlock,
          },
        });
        
      default:
        return componentRenderer({});
    }
  };

  return (
    <AppInitializerStateRenderer
      authState={authState.state}
      pathname={pathname}
      renderContent={renderContent}
    />
  );
};

export default AppInitializer; 