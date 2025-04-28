/**
 * Typed error classes for Battle Nads
 * These errors provide standardized error types with error codes
 * that can be used for more specific error handling.
 */

// Base error class
export class BattleNadsError extends Error {
  code: string;
  
  constructor(message: string, code: string) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
  }
}

// Wallet errors
export class WalletMissingError extends BattleNadsError {
  constructor(message = 'No wallet connected') {
    super(message, 'WALLET_MISSING');
  }
}

export class WalletConnectionError extends BattleNadsError {
  constructor(message = 'Failed to connect wallet') {
    super(message, 'WALLET_CONNECTION_FAILED');
  }
}

// Contract errors
export class ContractCallError extends BattleNadsError {
  constructor(message = 'Contract call failed') {
    super(message, 'CONTRACT_CALL_FAILED');
  }
}

export class ContractTransactionError extends BattleNadsError {
  constructor(message = 'Transaction failed') {
    super(message, 'CONTRACT_TX_FAILED');
  }
}

// Session key errors
export class SessionWalletMissingError extends BattleNadsError {
  constructor(message = 'Session wallet not connected') {
    super(message, 'SESSION_MISSING');
  }
}

export class SessionKeyMismatchError extends BattleNadsError {
  constructor(message = 'Session key mismatch') {
    super(message, 'SESSION_KEY_MISMATCH');
  }
}

export class SessionKeyExpiredError extends BattleNadsError {
  constructor(message = 'Session key expired') {
    super(message, 'SESSION_KEY_EXPIRED');
  }
}

// Character errors
export class CharacterMissingError extends BattleNadsError {
  constructor(message = 'No character found') {
    super(message, 'CHARACTER_MISSING');
  }
}

export class InvalidMovementError extends BattleNadsError {
  constructor(message = 'Invalid movement direction') {
    super(message, 'INVALID_MOVEMENT');
  }
}

export class CombatError extends BattleNadsError {
  constructor(message = 'Combat action failed') {
    super(message, 'COMBAT_ERROR');
  }
}

// Utility functions
export function isWalletError(error: Error): boolean {
  return error instanceof WalletMissingError || 
         error instanceof WalletConnectionError;
}

export function isSessionError(error: Error): boolean {
  return error instanceof SessionWalletMissingError || 
         error instanceof SessionKeyMismatchError || 
         error instanceof SessionKeyExpiredError;
}

export function isCharacterError(error: Error): boolean {
  return error instanceof CharacterMissingError || 
         error instanceof InvalidMovementError || 
         error instanceof CombatError;
} 