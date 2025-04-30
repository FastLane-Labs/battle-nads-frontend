/**
 * Domain types for session-related concepts
 * These types represent authentication and session management
 */

/**
 * Session key validation states
 */
export enum SessionKeyState {
  VALID = 'valid',
  EXPIRED = 'expired',
  INVALID = 'invalid',
  MISMATCHED = 'mismatched',
}

/**
 * Structure of the session key data
 */
export interface SessionKeyData {
  owner: string;
  key: string;
  balance: string | bigint;  // Using string to avoid serialization issues
  targetBalance: string | bigint;
  ownerCommittedAmount: string | bigint;
  ownerCommittedShares: string | bigint;
  expiry: string | bigint;
}

/**
 * Result of session key validation
 */
export interface SessionKeyValidation {
  state: SessionKeyState;
  message?: string;
  data?: SessionKeyData;
}

// WorldSnapshot moved to worldSnapshot.ts 