/**
 * Game State Machine
 * Manages the complex flow of wallet -> character -> session key states
 */

import { createMachine, assign } from 'xstate';
import { logger } from '@/utils/logger';
import { CharacterClass } from '@/types/domain/enums';
import { SessionKeyData, SessionKeyState, SessionKeyValidation } from '@/types/domain/session';

/**
 * Context for the game state machine
 */
export interface GameContext {
  owner?: string;
  characterId?: string;
  warning?: string;
  errorMessage?: string;
}

/**
 * Events that can be sent to the game state machine
 */
export type GameEvent =
  | { type: 'WALLET_CONNECTED'; owner: string }
  | { type: 'WALLET_DISCONNECTED' }
  | { type: 'CHARACTER_SELECTED'; characterId: string }
  | { type: 'NO_CHARACTER_FOUND' }
  | { type: 'CHARACTER_CREATED'; characterId: string; characterClass?: CharacterClass }
  | { type: 'SESSION_KEY_VALID' }
  | { type: 'SESSION_KEY_INVALID'; warning: string }
  | { type: 'SESSION_KEY_FIXED' }
  | { type: 'ERROR'; message: string }
  | { type: 'FIX_KEY' }
  | { type: 'RETRY' };

/**
 * Game state machine definition
 */
export const gameMachine = createMachine({
  types: {} as {
    context: GameContext;
    events: GameEvent;
  },
  id: 'game',
  initial: 'checkingWallet',
  
  states: {
    checkingWallet: {
      on: {
        WALLET_CONNECTED: {
          target: 'checkingCharacter',
          actions: assign({
            owner: ({ event }) => event.owner,
          }),
        },
        WALLET_DISCONNECTED: {
          target: 'noOwnerWallet',
        },
        ERROR: {
          target: 'error',
          actions: assign({
            errorMessage: ({ event }) => event.message,
          }),
        },
      },
    },
    
    noOwnerWallet: {
      on: {
        WALLET_CONNECTED: {
          target: 'checkingCharacter',
          actions: assign({
            owner: ({ event }) => event.owner,
          }),
        },
        ERROR: {
          target: 'error',
          actions: assign({
            errorMessage: ({ event }) => event.message,
          }),
        },
      },
    },
    
    checkingCharacter: {
      on: {
        CHARACTER_SELECTED: {
          target: 'checkingSessionKey',
          actions: assign({
            characterId: ({ event }) => event.characterId,
          }),
        },
        NO_CHARACTER_FOUND: {
          target: 'noCharacter',
        },
        WALLET_DISCONNECTED: {
          target: 'noOwnerWallet',
          actions: assign({
            owner: () => undefined,
          }),
        },
        ERROR: {
          target: 'error',
          actions: assign({
            errorMessage: ({ event }) => event.message,
          }),
        },
      },
    },
    
    noCharacter: {
      on: {
        CHARACTER_CREATED: {
          target: 'checkingSessionKey',
          actions: assign({
            characterId: ({ event }) => event.characterId,
          }),
        },
        WALLET_DISCONNECTED: {
          target: 'noOwnerWallet',
          actions: assign({
            owner: () => undefined,
          }),
        },
        ERROR: {
          target: 'error',
          actions: assign({
            errorMessage: ({ event }) => event.message,
          }),
        },
      },
    },
    
    checkingSessionKey: {
      on: {
        SESSION_KEY_VALID: {
          target: 'ready',
        },
        SESSION_KEY_INVALID: {
          target: 'sessionKeyWarning',
          actions: assign({
            warning: ({ event }) => event.warning,
          }),
        },
        WALLET_DISCONNECTED: {
          target: 'noOwnerWallet',
          actions: assign({
            owner: () => undefined,
            characterId: () => undefined,
          }),
        },
        ERROR: {
          target: 'error',
          actions: assign({
            errorMessage: ({ event }) => event.message,
          }),
        },
      },
    },
    
    sessionKeyWarning: {
      on: {
        FIX_KEY: {
          target: 'checkingSessionKey',
        },
        SESSION_KEY_FIXED: {
          target: 'ready',
        },
        WALLET_DISCONNECTED: {
          target: 'noOwnerWallet',
          actions: assign({
            owner: () => undefined,
            characterId: () => undefined,
          }),
        },
        ERROR: {
          target: 'error',
          actions: assign({
            errorMessage: ({ event }) => event.message,
          }),
        },
      },
    },
    
    ready: {
      on: {
        SESSION_KEY_INVALID: {
          target: 'sessionKeyWarning',
          actions: assign({
            warning: ({ event }) => event.warning,
          }),
        },
        WALLET_DISCONNECTED: {
          target: 'noOwnerWallet',
          actions: assign({
            owner: () => undefined,
            characterId: () => undefined,
          }),
        },
        ERROR: {
          target: 'error',
          actions: assign({
            errorMessage: ({ event }) => event.message,
          }),
        },
      },
    },
    
    error: {
      on: {
        RETRY: {
          target: 'checkingWallet',
          actions: assign({
            errorMessage: () => undefined,
          }),
        },
      },
    },
  },
});

/**
 * Session key validation logic
 */
export const sessionKeyMachine = {
  validate: (
    sessionKeyData: SessionKeyData | undefined,
    ownerAddress: string,
    currentTimestamp: number
  ): SessionKeyValidation => {
    // Check if session key exists
    if (!sessionKeyData || !sessionKeyData.key) {
      return {
        state: SessionKeyState.INVALID,
        message: 'No session key found'
      };
    }
    
    // Check if session key matches owner
    if (sessionKeyData.owner.toLowerCase() !== ownerAddress.toLowerCase()) {
      return {
        state: SessionKeyState.MISMATCHED,
        message: 'Session key wallet mismatch',
        data: sessionKeyData
      };
    }
    
    // Check if session key is expired
    if (sessionKeyData.expiry && currentTimestamp >= sessionKeyData.expiry) {
      return {
        state: SessionKeyState.EXPIRED,
        message: 'Session key expired',
        data: sessionKeyData
      };
    }
    
    // Session key is valid
    return {
      state: SessionKeyState.VALID,
      data: sessionKeyData
    };
  }
};

/**
 * Log state transitions for debugging
 */
export const logStateTransition = (state: any) => {
  logger.debug(`[GameMachine] State: ${state.value}`, {
    context: state.context,
  });
}; 