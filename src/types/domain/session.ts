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
  balance: string; // Representing bigint as string
  targetBalance: string; // Representing bigint as string
  ownerCommittedAmount: string; // Representing bigint as string
  ownerCommittedShares: string; // Representing bigint as string
  expiry: string; // Representing block number as string
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

// Default object for uninitialized SessionKeyData
export const DEFAULT_SESSION_KEY_DATA: SessionKeyData = {
  owner: '0x0000000000000000000000000000000000000000',
  key: '0x0000000000000000000000000000000000000000',
  balance: '0',
  targetBalance: '0',
  ownerCommittedAmount: '0',
  ownerCommittedShares: '0',
  expiry: '0'
}; 