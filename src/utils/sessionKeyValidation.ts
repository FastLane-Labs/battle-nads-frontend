/**
 * Session Key Validation Utility
 * Extracted from gameStateMachine.ts to remove XState dependency
 */

import { SessionKeyData, SessionKeyState, SessionKeyValidation } from '@/types/domain/session';

/**
 * Validates session key data against current state
 */
export const validateSessionKey = (
  sessionKeyData: SessionKeyData | undefined,
  ownerAddress: string,
  currentBlock: number
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
  
  // Check if session key is expired - convert to number for comparison
  if (sessionKeyData.expiry && currentBlock >= Number(sessionKeyData.expiry)) {
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
};