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
  const { isInitialized: walletInitialized, currentWallet, injectedWallet, embeddedWallet } = useWallet();
  const game = useSimplifiedGameState();
  const { hasSeenWelcome } = useWelcomeScreen(currentWallet !== 'none' ? currentWallet : undefined);
  
  const [state, send] = useMachine(appInitializerMachine, {
    input: {
      walletAddress: injectedWallet?.address || null,
      hasSeenWelcome,
      sessionKeyState: game.sessionKeyState || undefined, // Use undefined if not available yet
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
    if (state.value === 'initializing') {
      // If wallet is initialized but we have no wallets, transition to noWallet state
      if (walletInitialized && game.isInitialized && !injectedWallet?.address) {
        send({ type: 'WALLET_INITIALIZED', hasEmbeddedWallet: false });
      }
      // If we have both wallets, proceed to load game data
      else if (walletInitialized && 
               game.isInitialized && 
               embeddedWallet?.address && 
               injectedWallet?.address) {
        send({ type: 'WALLET_INITIALIZED', hasEmbeddedWallet: true });
      }
    }
  }, [walletInitialized, game.isInitialized, state.value, embeddedWallet?.address, injectedWallet?.address, send]);
  
  // Update context when it changes
  useEffect(() => {
    if (state.context.hasSeenWelcome !== hasSeenWelcome) {
      send({ type: 'ONBOARDING_COMPLETE' });
    }
  }, [hasSeenWelcome, state.context.hasSeenWelcome, send]);

  // Handle wallet connection/disconnection
  useEffect(() => {
    // If we had a wallet address in context but now injectedWallet is null,
    // it means the wallet was cleared (possibly due to wallet switch)
    if (state.context.walletAddress && !injectedWallet?.address && 
        state.value !== 'noWallet' && state.value !== 'initializing') {
      send({ type: 'WALLET_DISCONNECTED' });
      return;
    }
    
    // Only handle wallet connection after we have embedded wallet
    if (game.hasWallet && injectedWallet?.address && embeddedWallet?.address &&
        state.value === 'noWallet') {
      send({ type: 'WALLET_CONNECTED', walletAddress: injectedWallet.address });
    } else if (!game.hasWallet && state.value !== 'noWallet' && state.value !== 'initializing') {
      send({ type: 'WALLET_DISCONNECTED' });
    }
  }, [game.hasWallet, injectedWallet?.address, embeddedWallet?.address, state.value, state.context.walletAddress, send]);

  // Handle game data loading
  useEffect(() => {
    if (state.value === 'loadingGameData') {
      if (game.error) {
        send({ type: 'GAME_DATA_ERROR', error: game.error });
      } else if (!game.isLoading && game.characterId) {
        // Also update session key state when game data is loaded
        if (game.sessionKeyState && state.context.sessionKeyState !== game.sessionKeyState) {
          // Send appropriate event based on session key state
          if (game.sessionKeyState === SessionKeyState.VALID) {
            send({ type: 'SESSION_KEY_VALID' });
          } else {
            send({ type: 'SESSION_KEY_INVALID', sessionKeyState: game.sessionKeyState });
          }
        }
        send({ type: 'GAME_DATA_LOADED', characterId: game.characterId, sessionKeyState: game.sessionKeyState });
      }
    }
  }, [game.isLoading, game.error, game.characterId, game.sessionKeyState, state.value, state.context.sessionKeyState, send]);

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
    // If we're in a session key prompt state and update is in progress, transition to updating
    if ((state.value === 'sessionKeyMissing' || 
         state.value === 'sessionKeyInvalid' ||
         state.value === 'sessionKeyExpired') && 
        game.isUpdatingSessionKey) {
      send({ type: 'SESSION_KEY_UPDATED', sessionKeyAddress: game.sessionKeyData?.key || '' });
      return;
    }
    
    // If we're in updating state and session key becomes valid, transition to ready
    if (state.value === 'sessionKeyUpdating' && 
        !game.needsSessionKeyUpdate && 
        game.sessionKeyState === SessionKeyState.VALID) {
      send({ type: 'SESSION_KEY_VALID' });
      return;
    }
    
    // If we're in any session key prompt state and the session key is now valid, transition to ready
    if ((state.value === 'sessionKeyMissing' || 
         state.value === 'sessionKeyInvalid' ||
         state.value === 'sessionKeyExpired') && 
        game.sessionKeyState === SessionKeyState.VALID &&
        state.context.sessionKeyState !== SessionKeyState.VALID) {
      send({ type: 'SESSION_KEY_VALID' });
      return;
    }
    
    // If we're in checkingSessionKey state and have a valid session key, send the valid event
    if (state.value === 'checkingSessionKey' && 
        game.sessionKeyState === SessionKeyState.VALID) {
      send({ type: 'SESSION_KEY_VALID' });
      return;
    }
    
    // If we're in checkingSessionKey state but don't have session key state yet, wait
    if (state.value === 'checkingSessionKey' && !game.sessionKeyState && embeddedWallet?.address) {
      // Session key state is being determined, just wait
      return;
    }
    
    // Update context when session key state changes (only for invalid states)
    if (state.context.sessionKeyState !== game.sessionKeyState && 
        game.sessionKeyState && 
        game.sessionKeyState !== SessionKeyState.VALID) {
      send({ type: 'SESSION_KEY_INVALID', sessionKeyState: game.sessionKeyState });
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