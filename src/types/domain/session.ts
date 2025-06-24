/**
 * Domain types for session-related concepts
 * These types represent authentication and session management
 */

import { BaseSessionKeyData } from '@/types/base';

/**
 * Session key validation states
 */
export enum SessionKeyState {
  IDLE = 'idle',
  VALID = 'valid',
  EXPIRED = 'expired',
  MISMATCHED = 'mismatched',
  MISSING = 'missing'
}

/**
 * Structure of the session key data
 */
export interface SessionKeyData extends BaseSessionKeyData<string, string> {
  balance: string; // Representing bigint as string
  targetBalance: string; // Representing bigint as string
  ownerCommittedAmount: string; // Representing bigint as string
  ownerCommittedShares: string; // Representing bigint as string
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
  expiration: '0'
}; 