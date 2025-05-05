import { MAX_SESSION_KEY_VALIDITY_BLOCKS } from '../config/env';

// Session key states
export enum SessionKeyState {
  IDLE = 'idle',
  CHECKING = 'checking',
  VALID = 'valid',
  EXPIRED = 'expired',
  MISMATCH = 'mismatch',
  MISSING = 'missing'
}

// Session key events
export enum SessionKeyEvent {
  CHECK = 'check',
  VALID = 'valid',
  EXPIRED = 'expired',
  MISMATCH = 'mismatch',
  MISSING = 'missing',
  RESET = 'reset'
}

// Session key data type
export interface SessionKeyValidationData {
  sessionKey: string;
  embeddedAddress: string;
  expiration: number;
  currentBlock: number;
}

// State machine for session key validation
export class SessionKeyMachine {
  private state: SessionKeyState = SessionKeyState.IDLE;
  private sessionKey: string | null = null;
  private embeddedAddress: string | null = null;
  private expiration: number = 0;
  private currentBlock: number = 0;
  private eventListeners: Map<SessionKeyEvent, Array<(data?: any) => void>> = new Map();

  constructor() {
    // Initialize event listener arrays
    Object.values(SessionKeyEvent).forEach(event => {
      this.eventListeners.set(event, []);
    });
  }

  // Get current state
  getState(): SessionKeyState {
    return this.state;
  }

  // Register event listener
  on(event: SessionKeyEvent, callback: (data?: any) => void): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.push(callback);
    this.eventListeners.set(event, listeners);
  }

  // Emit event
  private emit(event: SessionKeyEvent, data?: any): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(callback => callback(data));
  }

  // Transition to a new state
  private transition(newState: SessionKeyState, event: SessionKeyEvent, data?: any): void {
    this.state = newState;
    this.emit(event, data);
  }

  // Check if session key is missing (zero address)
  private isZeroAddress(address: string): boolean {
    return !address || address === '0x0000000000000000000000000000000000000000';
  }

  // Validate session key
  validate(sessionKey: string, embeddedAddress: string, expiration: number, currentBlock: number): SessionKeyState {
    // Store values
    this.sessionKey = sessionKey;
    this.embeddedAddress = embeddedAddress;
    this.expiration = expiration;
    this.currentBlock = currentBlock;

    // Transition to checking state
    this.transition(SessionKeyState.CHECKING, SessionKeyEvent.CHECK);

    // If session key or embedded address is missing/zero address
    if (this.isZeroAddress(sessionKey)) {
      this.transition(SessionKeyState.MISSING, SessionKeyEvent.MISSING);
      return this.state;
    }

    // Check for address mismatch
    if (sessionKey.toLowerCase() !== embeddedAddress.toLowerCase()) {
      this.transition(SessionKeyState.MISMATCH, SessionKeyEvent.MISMATCH, {
        sessionKey,
        embeddedAddress
      });
      return this.state;
    }

    // Check if expired
    if (expiration < currentBlock) {
      this.transition(SessionKeyState.EXPIRED, SessionKeyEvent.EXPIRED, {
        expiration,
        currentBlock
      });
      return this.state;
    }

    // Check if renewal needed soon (within 5 minutes = 600 blocks)
    const RENEWAL_BUFFER_BLOCKS = 600; // 5 mins * 60 secs/min * 2 blocks/sec
    const blocksRemaining = expiration - currentBlock;
    const renewalNeededSoon = blocksRemaining < RENEWAL_BUFFER_BLOCKS;

    // Key is valid
    this.transition(SessionKeyState.VALID, SessionKeyEvent.VALID, { 
      sessionKey, 
      embeddedAddress,
      expiration,
      currentBlock,
      renewalNeededSoon
    });
    
    return this.state;
  }

  // Reset the state machine
  reset(): void {
    this.state = SessionKeyState.IDLE;
    this.sessionKey = null;
    this.embeddedAddress = null;
    this.expiration = 0;
    this.currentBlock = 0;
    this.emit(SessionKeyEvent.RESET);
  }
}

// Export a singleton instance for app-wide use
export const sessionKeyMachine = new SessionKeyMachine(); 