'use client';

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { AuthState, AuthStateContext as AuthStateType } from '@/types/auth';
import { useWallet } from '@/providers/WalletProvider';
import { useSimplifiedGameState } from '@/hooks/game/useSimplifiedGameState';
import { useWelcomeScreen } from '@/components/onboarding/WelcomeScreen';
import { isValidCharacterId } from '@/utils/getCharacterLocalStorageKey';
import { SessionKeyState } from '@/types/domain/session';

interface AuthStateProviderProps {
  children: ReactNode;
  isCheckingContract?: boolean;
}

const AuthStateContext = createContext<AuthStateType | undefined>(undefined);

const ZERO_CHARACTER_ID = "0x0000000000000000000000000000000000000000000000000000000000000000";

/**
 * Derives the current authentication state from multiple sources
 * This is the single source of truth for authentication flow state
 */
export function AuthStateProvider({ children, isCheckingContract = false }: AuthStateProviderProps) {
  const { isInitialized: walletInitialized, currentWallet, isWalletLocked, injectedWallet } = useWallet();
  const game = useSimplifiedGameState();
  const { hasSeenWelcome } = useWelcomeScreen(currentWallet !== 'none' ? currentWallet : undefined);
  
  // Derive the current auth state
  const authState = useMemo((): AuthStateType => {
    // 1. Contract checking (highest priority)
    if (isCheckingContract) {
      return {
        state: AuthState.CONTRACT_CHECKING,
        isInitialized: false,
        hasWallet: false,
        hasCharacter: false,
        hasValidSessionKey: false,
        isLoading: true,
      };
    }
    
    // 2. Wallet initialization
    if (!walletInitialized || !game.isInitialized) {
      return {
        state: AuthState.INITIALIZING,
        isInitialized: false,
        hasWallet: false,
        hasCharacter: false,
        hasValidSessionKey: false,
        isLoading: true,
      };
    }
    
    // 3. Wallet locked
    if (isWalletLocked) {
      return {
        state: AuthState.WALLET_LOCKED,
        isInitialized: true,
        hasWallet: false,
        hasCharacter: false,
        hasValidSessionKey: false,
        isLoading: false,
        walletAddress: injectedWallet?.address || null,
      };
    }
    
    // 4. No wallet connected
    if (!game.hasWallet) {
      return {
        state: AuthState.NO_WALLET,
        isInitialized: true,
        hasWallet: false,
        hasCharacter: false,
        hasValidSessionKey: false,
        isLoading: false,
      };
    }
    
    // 5. Loading game data
    if (game.isLoading) {
      return {
        state: AuthState.LOADING_GAME_DATA,
        isInitialized: true,
        hasWallet: true,
        hasCharacter: false,
        hasValidSessionKey: false,
        isLoading: true,
        walletAddress: injectedWallet?.address || null,
      };
    }
    
    // 6. Error state
    if (game.error) {
      return {
        state: AuthState.ERROR,
        error: game.error,
        isInitialized: true,
        hasWallet: true,
        hasCharacter: false,
        hasValidSessionKey: false,
        isLoading: false,
        walletAddress: injectedWallet?.address || null,
      };
    }
    
    // 7. No character (only after onboarding completed)
    if (game.characterId === ZERO_CHARACTER_ID && hasSeenWelcome) {
      return {
        state: AuthState.NO_CHARACTER,
        isInitialized: true,
        hasWallet: true,
        hasCharacter: false,
        hasValidSessionKey: false,
        isLoading: false,
        walletAddress: injectedWallet?.address || null,
      };
    }
    
    const hasValidCharacter = isValidCharacterId(game.characterId);
    
    // 8. Character dead
    if (hasValidCharacter && game.character?.isDead) {
      return {
        state: AuthState.CHARACTER_DEAD,
        isInitialized: true,
        hasWallet: true,
        hasCharacter: true,
        hasValidSessionKey: false,
        isLoading: false,
        characterId: game.characterId,
        walletAddress: injectedWallet?.address || null,
      };
    }
    
    // 9. Session key states
    if (hasValidCharacter && game.needsSessionKeyUpdate) {
      // Determine specific session key issue
      if (game.isUpdatingSessionKey) {
        return {
          state: AuthState.SESSION_KEY_UPDATING,
          isInitialized: true,
          hasWallet: true,
          hasCharacter: true,
          hasValidSessionKey: false,
          isLoading: true,
          characterId: game.characterId,
          walletAddress: injectedWallet?.address || null,
        };
      }
      
      const sessionKeyState = game.sessionKeyState;
      let state = AuthState.SESSION_KEY_MISSING;
      
      if (sessionKeyState === SessionKeyState.MISMATCHED) {
        state = AuthState.SESSION_KEY_INVALID;
      } else if (sessionKeyState === SessionKeyState.EXPIRED) {
        state = AuthState.SESSION_KEY_EXPIRED;
      } else if (sessionKeyState === SessionKeyState.MISSING) {
        state = AuthState.SESSION_KEY_MISSING;
      }
      
      return {
        state,
        isInitialized: true,
        hasWallet: true,
        hasCharacter: true,
        hasValidSessionKey: false,
        isLoading: false,
        characterId: game.characterId,
        walletAddress: injectedWallet?.address || null,
        sessionKeyAddress: game.sessionKeyData?.key || null,
      };
    }
    
    // 10. Ready to play
    if (hasValidCharacter && !game.needsSessionKeyUpdate && game.character && game.worldSnapshot) {
      return {
        state: AuthState.READY,
        isInitialized: true,
        hasWallet: true,
        hasCharacter: true,
        hasValidSessionKey: true,
        isLoading: false,
        characterId: game.characterId,
        walletAddress: injectedWallet?.address || null,
        sessionKeyAddress: game.sessionKeyData?.key || null,
      };
    }
    
    // Fallback - still loading
    return {
      state: AuthState.LOADING_GAME_DATA,
      isInitialized: true,
      hasWallet: true,
      hasCharacter: false,
      hasValidSessionKey: false,
      isLoading: true,
      walletAddress: injectedWallet?.address || null,
    };
  }, [
    isCheckingContract,
    walletInitialized,
    game.isInitialized,
    isWalletLocked,
    game.hasWallet,
    game.isLoading,
    game.error,
    game.characterId,
    game.character,
    game.needsSessionKeyUpdate,
    game.isUpdatingSessionKey,
    game.sessionKeyState,
    game.worldSnapshot,
    game.sessionKeyData,
    hasSeenWelcome,
    injectedWallet?.address,
  ]);
  
  return (
    <AuthStateContext.Provider value={authState}>
      {children}
    </AuthStateContext.Provider>
  );
}

/**
 * Hook to consume the authentication state
 */
export function useAuthState(): AuthStateType {
  const context = useContext(AuthStateContext);
  if (!context) {
    throw new Error('useAuthState must be used within AuthStateProvider');
  }
  return context;
}