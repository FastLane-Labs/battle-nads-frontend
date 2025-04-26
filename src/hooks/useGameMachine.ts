import { useEffect } from 'react';
import { useMachine } from '@xstate/react';
import { useWallet } from '@/providers/WalletProvider';
import { useContracts } from './useContracts';
import { gameMachine, logStateTransition } from '@/machines/gameStateMachine';
import { getCharacterLocalStorageKey, isValidCharacterId } from '@/utils/getCharacterLocalStorageKey';
import { logger } from '@/utils/logger';
import * as battleNadsService from '@services/battleNadsService';

/**
 * Hook that uses the game state machine to manage the application state
 */
export const useGameMachine = () => {
  const [state, send] = useMachine(gameMachine);
  const { injectedWallet, embeddedWallet } = useWallet();
  const { readContract, embeddedContract } = useContracts();
  
  // Log all state transitions
  useEffect(() => {
    logStateTransition(state);
  }, [state]);
  
  // Check wallet connection
  useEffect(() => {
    if (state.matches('checkingWallet')) {
      if (injectedWallet?.address) {
        send({ type: 'WALLET_CONNECTED', owner: injectedWallet.address });
      } else {
        send({ type: 'WALLET_DISCONNECTED' });
      }
    }
  }, [injectedWallet?.address, send, state]);
  
  // Check character when wallet is connected
  useEffect(() => {
    if (state.matches('checkingCharacter') && state.context.owner) {
      const loadCharacterId = async () => {
        try {
          const storageKey = getCharacterLocalStorageKey(state.context.owner!);
          if (storageKey) {
            const storedId = localStorage.getItem(storageKey);
            if (storedId && isValidCharacterId(storedId)) {
              send({ type: 'CHARACTER_SELECTED', characterId: storedId });
            } else {
              send({ type: 'NO_CHARACTER_FOUND' });
            }
          } else {
            send({ type: 'NO_CHARACTER_FOUND' });
          }
        } catch (error) {
          logger.error('[useGameMachine] Error loading character ID', error);
          send({ 
            type: 'ERROR', 
            message: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      };
      
      loadCharacterId();
    }
  }, [state.matches, state.context.owner, send]);
  
  // Check session key when character is selected
  useEffect(() => {
    if (state.matches('checkingSessionKey') && state.context.characterId && embeddedContract) {
      const checkSessionKey = async () => {
        try {
          const isExpired = await battleNadsService.isSessionKeyExpired(
            embeddedContract,
            state.context.characterId!
          );
          
          if (isExpired) {
            send({ 
              type: 'SESSION_KEY_INVALID', 
              warning: 'Session key is expired or not set. Please update it.'
            });
          } else {
            send({ type: 'SESSION_KEY_VALID' });
          }
        } catch (error) {
          logger.error('[useGameMachine] Error checking session key', error);
          send({ 
            type: 'ERROR', 
            message: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      };
      
      checkSessionKey();
    }
  }, [state.matches, state.context.characterId, embeddedContract, send]);
  
  // Create a character
  const createCharacter = async (characterClass: number, name: string) => {
    if (!embeddedContract) {
      throw new Error('Embedded contract not initialized');
    }
    
    try {
      const characterId = await battleNadsService.createCharacter(
        embeddedContract,
        characterClass,
        name
      );
      
      // Save to localStorage
      if (state.context.owner) {
        const storageKey = getCharacterLocalStorageKey(state.context.owner);
        if (storageKey) {
          localStorage.setItem(storageKey, characterId);
        }
      }
      
      send({ type: 'CHARACTER_CREATED', characterId });
      return characterId;
    } catch (error) {
      logger.error('[useGameMachine] Error creating character', error);
      send({ 
        type: 'ERROR', 
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  };
  
  // Update session key
  const updateSessionKey = async (sessionKey: string) => {
    if (!embeddedContract || !state.context.characterId) {
      throw new Error('Embedded contract not initialized or character ID not available');
    }
    
    try {
      await battleNadsService.updateSessionKey(
        embeddedContract,
        state.context.characterId,
        sessionKey
      );
      
      send({ type: 'SESSION_KEY_FIXED' });
      return true;
    } catch (error) {
      logger.error('[useGameMachine] Error updating session key', error);
      send({ 
        type: 'ERROR', 
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  };
  
  // Fix session key
  const fixSessionKey = () => {
    send({ type: 'FIX_KEY' });
  };
  
  // Retry after error
  const retry = () => {
    send({ type: 'RETRY' });
  };
  
  return {
    state,
    send,
    createCharacter,
    updateSessionKey,
    fixSessionKey,
    retry,
    isCheckingWallet: state.matches('checkingWallet'),
    isNoWallet: state.matches('noOwnerWallet'),
    isCheckingCharacter: state.matches('checkingCharacter'),
    isNoCharacter: state.matches('noCharacter'),
    isCheckingSessionKey: state.matches('checkingSessionKey'),
    isSessionKeyWarning: state.matches('sessionKeyWarning'),
    isReady: state.matches('ready'),
    isError: state.matches('error'),
    owner: state.context.owner,
    characterId: state.context.characterId,
    warning: state.context.warning,
    errorMessage: state.context.errorMessage,
  };
}; 