import { ethers } from 'ethers';

/**
 * Generates a unique localStorage key for a character ID based on the owner address and contract address.
 * This ensures that character IDs are stored per wallet address, preventing cross-wallet contamination.
 * 
 * @param ownerAddress - The owner's wallet address.
 * @returns The localStorage key string or null if the address is invalid.
 */
export const getCharacterLocalStorageKey = (ownerAddress: string | null | undefined): string | null => {
  if (!ownerAddress) {
    console.warn("[getCharacterLocalStorageKey] Invalid or missing owner address provided.");
    return null;
  }
  
  // For this specific wallet address, generate a unique storage key
  return `battleNads:character:${ownerAddress.toLowerCase()}`;
};

// Add a new helper function to validate character IDs
export const isValidCharacterId = (characterId: string | null | undefined): boolean => {
  if (!characterId) return false;
  
  // Check if the character ID is the zero address (bytes32(0))
  const zeroAddress = "0x0000000000000000000000000000000000000000000000000000000000000000";
  return characterId !== zeroAddress;
};