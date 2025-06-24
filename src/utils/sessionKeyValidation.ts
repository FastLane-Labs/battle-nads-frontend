/**
 * Session Key Validation Utility
 * Consolidated validation logic from both sessionKeyMachine and original utility
 * Provides comprehensive session key validation with all states
 */

import { SessionKeyData, SessionKeyState, SessionKeyValidation } from '@/types/domain/session';

/**
 * Checks if an address is a zero address
 */
const isZeroAddress = (address: string): boolean => {
  return !address || address === '0x0000000000000000000000000000000000000000';
};

/**
 * Validates session key against embedded wallet address and current block
 * This is the main validation function that consolidates all session key logic
 */
export const validateSessionKey = (
  sessionKeyData: SessionKeyData | undefined,
  ownerAddress: string,
  embeddedWalletAddress: string,
  currentBlock: number
): SessionKeyValidation => {
  // Check if session key data exists
  if (!sessionKeyData || !sessionKeyData.key) {
    return {
      state: SessionKeyState.MISSING,
      message: 'No session key found'
    };
  }
  
  // Check if session key is zero address (missing/invalid)
  if (isZeroAddress(sessionKeyData.key)) {
    return {
      state: SessionKeyState.MISSING,
      message: 'Session key is zero address'
    };
  }
  
  // Check if session key owner matches the provided owner address
  if (sessionKeyData.owner.toLowerCase() !== ownerAddress.toLowerCase()) {
    return {
      state: SessionKeyState.MISMATCHED,
      message: 'Session key owner mismatch',
      data: sessionKeyData
    };
  }
  
  // Check if session key matches embedded wallet address (most important check)
  if (sessionKeyData.key.toLowerCase() !== embeddedWalletAddress.toLowerCase()) {
    return {
      state: SessionKeyState.MISMATCHED,
      message: 'Session key does not match embedded wallet',
      data: sessionKeyData
    };
  }
  
  // Check if session key is expired - convert to number for comparison
  if (sessionKeyData.expiration && currentBlock >= Number(sessionKeyData.expiration)) {
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

/**
 * Simplified session key validation for contract data (without embedded wallet check)
 * Used by BattleNadsClient when we only have owner and session key from contract
 */
export const validateSessionKeyData = (
  sessionKeyData: SessionKeyData | undefined,
  ownerAddress: string,
  currentBlock: number
): SessionKeyValidation => {
  // Check if session key data exists
  if (!sessionKeyData || !sessionKeyData.key) {
    return {
      state: SessionKeyState.MISSING,
      message: 'No session key found'
    };
  }
  
  // Check if session key is zero address (missing/invalid)
  if (isZeroAddress(sessionKeyData.key)) {
    return {
      state: SessionKeyState.MISSING,
      message: 'Session key is zero address'
    };
  }
  
  // Check if session key owner matches the provided owner address
  if (sessionKeyData.owner.toLowerCase() !== ownerAddress.toLowerCase()) {
    return {
      state: SessionKeyState.MISMATCHED,
      message: 'Session key owner mismatch',
      data: sessionKeyData
    };
  }
  
  // Check if session key is expired - convert to number for comparison
  if (sessionKeyData.expiration && currentBlock >= Number(sessionKeyData.expiration)) {
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
