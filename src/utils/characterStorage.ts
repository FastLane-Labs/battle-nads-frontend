import { getCharacterLocalStorageKey, isValidCharacterId } from './getCharacterLocalStorageKey';
import { ENTRYPOINT_ADDRESS } from '../config/config';

/**
 * Saves a character ID to localStorage with proper key format
 * @param ownerAddress - The owner's wallet address
 * @param characterId - The character ID to save
 * @param contractAddress - Optional contract address (defaults to ENTRYPOINT_ADDRESS)
 * @returns true if save was successful, false otherwise
 */
export const saveCharacterId = (
  ownerAddress: string | null | undefined, 
  characterId: string,
  contractAddress: string = ENTRYPOINT_ADDRESS
): boolean => {
  if (!ownerAddress || !characterId) {
    console.warn('[saveCharacterId] Missing owner address or character ID');
    return false;
  }

  try {
    const storageKey = getCharacterLocalStorageKey(ownerAddress, contractAddress);
    if (!storageKey) {
      console.warn('[saveCharacterId] Could not generate storage key');
      return false;
    }

    localStorage.setItem(storageKey, characterId);
    console.log(`[saveCharacterId] Saved character ID to localStorage using key: ${storageKey}`);
    return true;
  } catch (error) {
    console.error('[saveCharacterId] Error saving character ID:', error);
    return false;
  }
};

/**
 * Reads a character ID from localStorage
 * @param ownerAddress - The owner's wallet address
 * @param contractAddress - Optional contract address (defaults to ENTRYPOINT_ADDRESS)
 * @returns The character ID if found and valid, null otherwise
 */
export const getStoredCharacterId = (
  ownerAddress: string | null | undefined,
  contractAddress: string = ENTRYPOINT_ADDRESS
): string | null => {
  if (!ownerAddress) {
    return null;
  }

  try {
    const storageKey = getCharacterLocalStorageKey(ownerAddress, contractAddress);
    if (!storageKey) {
      return null;
    }

    const storedCharacterId = localStorage.getItem(storageKey);
    
    if (storedCharacterId && isValidCharacterId(storedCharacterId)) {
      return storedCharacterId;
    } 
    
    if (storedCharacterId) {
      // Found an invalid ID, remove it
      console.log(`[getStoredCharacterId] Found invalid character ID, removing: ${storedCharacterId}`);
      localStorage.removeItem(storageKey);
    }
    
    return null;
  } catch (error) {
    console.error('[getStoredCharacterId] Error reading character ID:', error);
    return null;
  }
};

/**
 * Removes a character ID from localStorage
 * @param ownerAddress - The owner's wallet address
 * @param contractAddress - Optional contract address (defaults to ENTRYPOINT_ADDRESS)
 * @returns true if removal was successful, false otherwise
 */
export const removeCharacterId = (
  ownerAddress: string | null | undefined,
  contractAddress: string = ENTRYPOINT_ADDRESS
): boolean => {
  if (!ownerAddress) {
    return false;
  }

  try {
    const storageKey = getCharacterLocalStorageKey(ownerAddress, contractAddress);
    if (!storageKey) {
      return false;
    }

    localStorage.removeItem(storageKey);
    console.log(`[removeCharacterId] Removed character ID from localStorage with key: ${storageKey}`);
    return true;
  } catch (error) {
    console.error('[removeCharacterId] Error removing character ID:', error);
    return false;
  }
}; 