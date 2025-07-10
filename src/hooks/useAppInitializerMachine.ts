import { useEffect } from 'react';
import { useMachine } from '@xstate/react';
import { appInitializerMachine, stateToAuthState } from '@/machines/appInitializerMachine';
import { useWallet } from '@/providers/WalletProvider';
import { useSimplifiedGameState } from '@/hooks/game/useSimplifiedGameState';
import { useWelcomeScreen } from '@/components/onboarding/WelcomeScreen';
import { isValidCharacterId } from '@/utils/getCharacterLocalStorageKey';
import { SessionKeyState } from '@/types/domain/session';
import { AuthState, AuthStateContext } from '@/types/auth';

export function useAppInitializerMachine(isCheckingContract = false): AuthStateContext {
  const { isInitialized: walletInitialized, currentWallet, injectedWallet } = useWallet();
  const game = useSimplifiedGameState();
  const { hasSeenWelcome } = useWelcomeScreen(currentWallet !== 'none' ? currentWallet : undefined);
  
  const [state, send] = useMachine(appInitializerMachine, {
    input: {
      walletAddress: injectedWallet?.address || null,
      hasSeenWelcome,
      sessionKeyState: game.sessionKeyState,
    },
  });

  // Handle contract checking
  useEffect(() => {
    if (!isCheckingContract && state.value === 'contractChecking') {
      send({ type: 'CONTRACT_CHECK_COMPLETE' });
    }
  }, [isCheckingContract, state.value, send]);

  // Handle wallet initialization
  useEffect(() => {
    if (state.value === 'initializing' && walletInitialized && game.isInitialized) {
      send({ type: 'WALLET_INITIALIZED' });
    }
  }, [walletInitialized, game.isInitialized, state.value, send]);
  
  // Update context when it changes
  useEffect(() => {
    if (state.context.hasSeenWelcome !== hasSeenWelcome) {
      send({ type: 'ONBOARDING_COMPLETE' });
    }
  }, [hasSeenWelcome, state.context.hasSeenWelcome, send]);

  // Handle wallet connection
  useEffect(() => {
    if (game.hasWallet && injectedWallet?.address && 
        (state.value === 'noWallet' || state.value === 'initializing')) {
      send({ type: 'WALLET_CONNECTED', walletAddress: injectedWallet.address });
    } else if (!game.hasWallet && state.value !== 'noWallet' && state.value !== 'initializing') {
      send({ type: 'WALLET_DISCONNECTED' });
    }
  }, [game.hasWallet, injectedWallet?.address, state.value, send]);

  // Handle game data loading
  useEffect(() => {
    if (state.value === 'loadingGameData') {
      if (game.error) {
        send({ type: 'GAME_DATA_ERROR', error: game.error });
      } else if (!game.isLoading && game.characterId) {
        send({ type: 'GAME_DATA_LOADED', characterId: game.characterId });
      }
    }
  }, [game.isLoading, game.error, game.characterId, state.value, send]);

  // Handle character status checks  
  useEffect(() => {
    if (state.value === 'checkingCharacterStatus') {
      if (isValidCharacterId(game.characterId) && game.character?.isDead) {
        send({ type: 'CHARACTER_DIED' });
      }
    } else if (isValidCharacterId(game.characterId)) {
      if (game.character?.isDead && state.value !== 'characterDead') {
        send({ type: 'CHARACTER_DIED' });
      } else if (!game.character?.isDead && state.value === 'characterDead') {
        send({ type: 'CHARACTER_REVIVED' });
      }
    }
  }, [game.characterId, game.character?.isDead, state.value, send]);

  // Handle session key updates
  useEffect(() => {
    // Update context when session key state changes
    if (state.context.sessionKeyState !== game.sessionKeyState && game.sessionKeyState) {
      send({ type: 'SESSION_KEY_INVALID', sessionKeyState: game.sessionKeyState });
    }
    
    if (game.needsSessionKeyUpdate) {
      if (game.isUpdatingSessionKey) {
        send({ type: 'SESSION_KEY_UPDATED', sessionKeyAddress: game.sessionKeyData?.key || '' });
      }
    } else if (!game.needsSessionKeyUpdate && 
               game.sessionKeyState === SessionKeyState.VALID && 
               (state.value === 'checkingSessionKey' || 
                state.value === 'sessionKeyMissing' || 
                state.value === 'sessionKeyInvalid' ||
                state.value === 'sessionKeyExpired')) {
      send({ type: 'SESSION_KEY_VALID' });
    }
  }, [
    game.needsSessionKeyUpdate,
    game.isUpdatingSessionKey,
    game.sessionKeyState,
    game.sessionKeyData?.key,
    state.value,
    state.context.sessionKeyState,
    send,
  ]);

  // Handle character creation
  useEffect(() => {
    if (state.value === 'noCharacter' && isValidCharacterId(game.characterId) && game.characterId) {
      send({ type: 'CHARACTER_CREATED', characterId: game.characterId });
    }
  }, [game.characterId, state.value, send]);

  // Build the auth state context
  const currentAuthState = stateToAuthState[state.value as string] || AuthState.INITIALIZING;
  
  return {
    state: currentAuthState,
    error: state.context.error,
    isInitialized: currentAuthState !== AuthState.INITIALIZING && currentAuthState !== AuthState.CONTRACT_CHECKING,
    hasWallet: !!state.context.walletAddress,
    hasCharacter: isValidCharacterId(state.context.characterId || ''),
    hasValidSessionKey: currentAuthState === AuthState.READY,
    isLoading: [
      AuthState.INITIALIZING,
      AuthState.CONTRACT_CHECKING,
      AuthState.LOADING_GAME_DATA,
      AuthState.SESSION_KEY_UPDATING,
    ].includes(currentAuthState),
    characterId: state.context.characterId,
    walletAddress: state.context.walletAddress,
    sessionKeyAddress: state.context.sessionKeyAddress,
  };
}