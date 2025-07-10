import { createMachine, assign } from 'xstate';
import { AuthState } from '@/types/auth';
import { SessionKeyState } from '@/types/domain/session';

// Define the machine context type
interface AppInitializerContext {
  error?: Error | null;
  characterId?: string | null;
  walletAddress?: string | null;
  sessionKeyAddress?: string | null;
  sessionKeyState?: SessionKeyState;
  hasSeenWelcome?: boolean;
}

// Define the machine events
type AppInitializerEvent =
  | { type: 'CONTRACT_CHECK_COMPLETE' }
  | { type: 'WALLET_INITIALIZED' }
  | { type: 'WALLET_CONNECTED'; walletAddress: string }
  | { type: 'WALLET_DISCONNECTED' }
  | { type: 'GAME_DATA_LOADED'; characterId: string }
  | { type: 'GAME_DATA_ERROR'; error: Error }
  | { type: 'CHARACTER_CREATED'; characterId: string }
  | { type: 'CHARACTER_DIED' }
  | { type: 'CHARACTER_REVIVED' }
  | { type: 'SESSION_KEY_UPDATED'; sessionKeyAddress: string }
  | { type: 'SESSION_KEY_INVALID'; sessionKeyState: SessionKeyState }
  | { type: 'SESSION_KEY_VALID' }
  | { type: 'ONBOARDING_COMPLETE' }
  | { type: 'RETRY' };

// Create the state machine
export const appInitializerMachine = createMachine({
  id: 'appInitializer',
  initial: 'contractChecking',
  types: {} as {
    context: AppInitializerContext;
    events: AppInitializerEvent;
    input: Partial<AppInitializerContext>;
  },
  context: ({ input }) => ({
    error: null,
    characterId: null,
    walletAddress: input?.walletAddress || null,
    sessionKeyAddress: null,
    hasSeenWelcome: input?.hasSeenWelcome || false,
    sessionKeyState: input?.sessionKeyState,
  }),
  states: {
    contractChecking: {
      on: {
        CONTRACT_CHECK_COMPLETE: 'initializing',
      },
    },
    
    initializing: {
      on: {
        WALLET_INITIALIZED: [
          {
            target: 'noWallet',
            guard: ({ context }) => !context.walletAddress,
          },
          {
            target: 'loadingGameData',
            guard: ({ context }) => !!context.walletAddress,
          },
        ],
        WALLET_CONNECTED: {
          target: 'loadingGameData',
          actions: assign(({ event }) => ({
            walletAddress: event.walletAddress,
          })),
        },
      },
    },
    
    noWallet: {
      on: {
        WALLET_CONNECTED: {
          target: 'loadingGameData',
          actions: assign(({ event }) => ({
            walletAddress: event.walletAddress,
          })),
        },
      },
    },
    
    loadingGameData: {
      on: {
        GAME_DATA_LOADED: [
          {
            target: 'noCharacter',
            guard: ({ context, event }) => 
              event.characterId === '0x0000000000000000000000000000000000000000000000000000000000000000' &&
              context.hasSeenWelcome === true,
          },
          {
            target: 'checkingCharacterStatus',
            actions: assign(({ event }) => ({
              characterId: event.characterId,
            })),
          },
        ],
        GAME_DATA_ERROR: {
          target: 'error',
          actions: assign(({ event }) => ({
            error: event.error,
          })),
        },
        WALLET_DISCONNECTED: {
          target: 'noWallet',
          actions: assign(() => ({
            walletAddress: null,
            characterId: null,
            sessionKeyAddress: null,
          })),
        },
        ONBOARDING_COMPLETE: {
          actions: assign(() => ({
            hasSeenWelcome: true,
          })),
        },
      },
    },
    
    error: {
      on: {
        RETRY: 'loadingGameData',
        WALLET_DISCONNECTED: {
          target: 'noWallet',
          actions: assign(() => ({
            walletAddress: null,
            characterId: null,
            sessionKeyAddress: null,
            error: null,
          })),
        },
      },
    },
    
    noCharacter: {
      on: {
        CHARACTER_CREATED: {
          target: 'checkingCharacterStatus',
          actions: assign(({ event }) => ({
            characterId: event.characterId,
          })),
        },
        WALLET_DISCONNECTED: {
          target: 'noWallet',
          actions: assign(() => ({
            walletAddress: null,
            characterId: null,
            sessionKeyAddress: null,
          })),
        },
      },
    },
    
    checkingCharacterStatus: {
      on: {
        CHARACTER_DIED: 'characterDead',
      },
      always: [
        {
          target: 'checkingSessionKey',
        },
      ],
    },
    
    characterDead: {
      on: {
        CHARACTER_REVIVED: 'checkingSessionKey',
        CHARACTER_CREATED: {
          target: 'checkingCharacterStatus',
          actions: assign(({ event }) => ({
            characterId: event.characterId,
          })),
        },
        WALLET_DISCONNECTED: {
          target: 'noWallet',
          actions: assign(() => ({
            walletAddress: null,
            characterId: null,
            sessionKeyAddress: null,
          })),
        },
      },
    },
    
    checkingSessionKey: {
      always: [
        {
          target: 'sessionKeyMissing',
          guard: ({ context }) => context.sessionKeyState === SessionKeyState.MISSING,
        },
        {
          target: 'sessionKeyExpired',
          guard: ({ context }) => context.sessionKeyState === SessionKeyState.EXPIRED,
        },
        {
          target: 'sessionKeyInvalid',
          guard: ({ context }) => context.sessionKeyState === SessionKeyState.MISMATCHED,
        },
        {
          target: 'ready',
          guard: ({ context }) => context.sessionKeyState === SessionKeyState.VALID,
        },
      ],
      on: {
        SESSION_KEY_INVALID: [
          {
            target: 'sessionKeyMissing',
            guard: ({ event }) => event.sessionKeyState === SessionKeyState.MISSING,
            actions: assign(({ event }) => ({
              sessionKeyState: event.sessionKeyState,
            })),
          },
          {
            target: 'sessionKeyExpired',
            guard: ({ event }) => event.sessionKeyState === SessionKeyState.EXPIRED,
            actions: assign(({ event }) => ({
              sessionKeyState: event.sessionKeyState,
            })),
          },
          {
            target: 'sessionKeyInvalid',
            actions: assign(({ event }) => ({
              sessionKeyState: event.sessionKeyState,
            })),
          },
        ],
        SESSION_KEY_VALID: 'ready',
      },
    },
    
    sessionKeyMissing: {
      on: {
        SESSION_KEY_UPDATED: {
          target: 'sessionKeyUpdating',
          actions: assign(({ event }) => ({
            sessionKeyAddress: event.sessionKeyAddress,
          })),
        },
        WALLET_DISCONNECTED: {
          target: 'noWallet',
          actions: assign(() => ({
            walletAddress: null,
            characterId: null,
            sessionKeyAddress: null,
          })),
        },
      },
    },
    
    sessionKeyInvalid: {
      on: {
        SESSION_KEY_UPDATED: {
          target: 'sessionKeyUpdating',
          actions: assign(({ event }) => ({
            sessionKeyAddress: event.sessionKeyAddress,
          })),
        },
        WALLET_DISCONNECTED: {
          target: 'noWallet',
          actions: assign(() => ({
            walletAddress: null,
            characterId: null,
            sessionKeyAddress: null,
          })),
        },
      },
    },
    
    sessionKeyExpired: {
      on: {
        SESSION_KEY_UPDATED: {
          target: 'sessionKeyUpdating',
          actions: assign(({ event }) => ({
            sessionKeyAddress: event.sessionKeyAddress,
          })),
        },
        WALLET_DISCONNECTED: {
          target: 'noWallet',
          actions: assign(() => ({
            walletAddress: null,
            characterId: null,
            sessionKeyAddress: null,
          })),
        },
      },
    },
    
    sessionKeyUpdating: {
      on: {
        SESSION_KEY_VALID: {
          target: 'ready',
          actions: assign(() => ({
            sessionKeyState: SessionKeyState.VALID,
          })),
        },
        SESSION_KEY_INVALID: {
          target: 'sessionKeyInvalid',
          actions: assign(({ event }) => ({
            sessionKeyState: event.sessionKeyState,
          })),
        },
        WALLET_DISCONNECTED: {
          target: 'noWallet',
          actions: assign(() => ({
            walletAddress: null,
            characterId: null,
            sessionKeyAddress: null,
          })),
        },
      },
    },
    
    ready: {
      on: {
        CHARACTER_DIED: 'characterDead',
        SESSION_KEY_INVALID: {
          target: 'checkingSessionKey',
          actions: assign(({ event }) => ({
            sessionKeyState: event.sessionKeyState,
          })),
        },
        WALLET_DISCONNECTED: {
          target: 'noWallet',
          actions: assign(() => ({
            walletAddress: null,
            characterId: null,
            sessionKeyAddress: null,
          })),
        },
      },
    },
  },
});

// Map states to AuthState enum for compatibility
export const stateToAuthState: Record<string, AuthState> = {
  contractChecking: AuthState.CONTRACT_CHECKING,
  initializing: AuthState.INITIALIZING,
  noWallet: AuthState.NO_WALLET,
  loadingGameData: AuthState.LOADING_GAME_DATA,
  error: AuthState.ERROR,
  noCharacter: AuthState.NO_CHARACTER,
  characterDead: AuthState.CHARACTER_DEAD,
  sessionKeyMissing: AuthState.SESSION_KEY_MISSING,
  sessionKeyInvalid: AuthState.SESSION_KEY_INVALID,
  sessionKeyExpired: AuthState.SESSION_KEY_EXPIRED,
  sessionKeyUpdating: AuthState.SESSION_KEY_UPDATING,
  ready: AuthState.READY,
  checkingCharacterStatus: AuthState.LOADING_GAME_DATA,
  checkingSessionKey: AuthState.LOADING_GAME_DATA,
};