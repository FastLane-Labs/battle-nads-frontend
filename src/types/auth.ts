// Authentication state types for centralized state management

/**
 * Comprehensive authentication state enum representing all possible states
 * in the user authentication and game initialization flow
 */
export enum AuthState {
  // Initial states
  INITIALIZING = 'INITIALIZING',              // Wallet provider initializing
  CONTRACT_CHECKING = 'CONTRACT_CHECKING',    // Checking for contract changes
  
  // Wallet states
  NO_WALLET = 'NO_WALLET',                    // No wallet connected
  WALLET_LOCKED = 'WALLET_LOCKED',            // Wallet is locked and needs unlocking
  
  // Character states
  LOADING_GAME_DATA = 'LOADING_GAME_DATA',    // Loading character/game data
  NO_CHARACTER = 'NO_CHARACTER',              // Wallet connected but no character
  CHARACTER_DEAD = 'CHARACTER_DEAD',          // Character exists but is dead
  
  // Session key states
  SESSION_KEY_MISSING = 'SESSION_KEY_MISSING',        // No session key
  SESSION_KEY_INVALID = 'SESSION_KEY_INVALID',        // Session key exists but invalid
  SESSION_KEY_EXPIRED = 'SESSION_KEY_EXPIRED',        // Session key expired
  SESSION_KEY_UPDATING = 'SESSION_KEY_UPDATING',      // Updating session key
  
  // Error states
  ERROR = 'ERROR',                            // Generic error state
  
  // Ready state
  READY = 'READY',                            // All checks passed, ready to play
}

/**
 * Context for the current authentication state
 */
export interface AuthStateContext {
  state: AuthState;
  error?: Error | null;
  
  // Derived boolean flags for convenience
  isInitialized: boolean;
  hasWallet: boolean;
  hasCharacter: boolean;
  hasValidSessionKey: boolean;
  isLoading: boolean;
  
  // Additional metadata
  characterId?: string | null;
  walletAddress?: string | null;
  sessionKeyAddress?: string | null;
}

/**
 * Helper to determine if a state requires showing the NavBar
 */
export function shouldShowNavBar(state: AuthState): boolean {
  const statesWithoutNavBar = [
    AuthState.NO_WALLET,
    AuthState.WALLET_LOCKED,
  ];
  return !statesWithoutNavBar.includes(state);
}

/**
 * Helper to determine if a state is a loading state
 */
export function isLoadingState(state: AuthState): boolean {
  const loadingStates = [
    AuthState.INITIALIZING,
    AuthState.CONTRACT_CHECKING,
    AuthState.LOADING_GAME_DATA,
    AuthState.SESSION_KEY_UPDATING,
  ];
  return loadingStates.includes(state);
}

/**
 * Helper to determine if a state is an error state
 */
export function isErrorState(state: AuthState): boolean {
  return state === AuthState.ERROR;
}

/**
 * Helper to determine if user can play the game
 */
export function canPlayGame(state: AuthState): boolean {
  return state === AuthState.READY;
}