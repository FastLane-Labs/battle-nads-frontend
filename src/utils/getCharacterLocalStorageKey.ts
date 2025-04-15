import { ENTRYPOINT_ADDRESS, STORAGE_KEY_PREFIX } from '../config/config';

/**
 * Generates a unique localStorage key for a character ID based on the owner address and contract address.
 * This ensures that character IDs are stored per wallet address and contract address, allowing for game upgrades.
 * 
 * @param ownerAddress - The owner's wallet address.
 * @param contractAddress - Contract address to create a contract-specific storage key. Defaults to ENTRYPOINT_ADDRESS from config.
 * @returns The localStorage key string or null if the address is invalid.
 */
export const getCharacterLocalStorageKey = (ownerAddress: string | null | undefined, contractAddress: string = ENTRYPOINT_ADDRESS): string | null => {
  if (!ownerAddress) {
    console.warn("[getCharacterLocalStorageKey] Invalid or missing owner address provided.");
    return null;
  }

  if (!contractAddress) {
    console.warn("[getCharacterLocalStorageKey] Invalid or missing contract address provided.");
    return null;
  }
  
  // Create a consistent format using the storage key prefix and addresses
  return `${STORAGE_KEY_PREFIX}_${contractAddress.toLowerCase()}_${ownerAddress.toLowerCase()}`;
};

// Add a new helper function to validate character IDs
export const isValidCharacterId = (characterId: string | null | undefined): boolean => {
  if (!characterId) return false;
  
  // Check if the character ID is the zero address (bytes32(0))
  const zeroAddress = "0x0000000000000000000000000000000000000000000000000000000000000000";
  return characterId !== zeroAddress;
};