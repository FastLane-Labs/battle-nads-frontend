/**
 * Generates a unique localStorage key for a character ID based on the owner address and contract address.
 * This ensures that character IDs are stored per wallet address, preventing cross-wallet contamination.
 * 
 * @param ownerAddress - The owner's wallet address.
 * @returns The localStorage key string or null if the address is invalid.
 */
import { ENTRYPOINT_ADDRESS } from '../config/env';

export const getCharacterLocalStorageKey = (ownerAddress: string | null | undefined): string | null => {
  if (!ownerAddress) {
    console.warn("[getCharacterLocalStorageKey] Invalid or missing owner address provided.");
    return null;
  }
  
  // Create a combined key using both contract address and owner address
  // This ensures localStorage is invalidated if the contract address changes
  return `battleNads:character:${ENTRYPOINT_ADDRESS.toLowerCase()}:${ownerAddress.toLowerCase()}`;
};

// Add a new helper function to validate character IDs
export const isValidCharacterId = (characterId?: string | null): boolean => {
  if (!characterId) return false;
  
  // Must be a string
  if (typeof characterId !== 'string') return false;
  
  // Must be 66 characters (0x + 64 hex chars)
  if (characterId.length !== 66) return false;
  
  // Must start with 0x
  if (!characterId.startsWith('0x')) return false;
  
  // Must not be the zero address
  if (characterId === '0x0000000000000000000000000000000000000000000000000000000000000000') return false;
  
  // Should be a valid hex string
  const hexRegex = /^0x[0-9a-fA-F]{64}$/;
  return hexRegex.test(characterId);
};