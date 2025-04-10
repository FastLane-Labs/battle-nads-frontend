import { ethers } from 'ethers';

/**
 * Generates a unique localStorage key for a character ID based on the owner address and contract address.
 * This ensures that character IDs are stored per wallet address, preventing cross-wallet contamination.
 * 
 * @param ownerAddress - The owner's wallet address.
 * @returns The localStorage key string or null if the address is invalid.
 */
export const getCharacterLocalStorageKey = (ownerAddress: string | null | undefined): string | null => {
  if (!ownerAddress || !ethers.isAddress(ownerAddress)) {
    console.warn("[getCharacterLocalStorageKey] Invalid or missing owner address provided.");
    return null;
  }
  
  // Normalize the owner address (lowercase for consistency in localStorage keys)
  const normalizedAddress = ownerAddress.toLowerCase();
  
  // Get contract address from environment or use default
  const contractAddress = process.env.NEXT_PUBLIC_ENTRYPOINT_ADDRESS || "0xbD4511F188B606e5a74A62b7b0F516d0139d76D5";
  
  // Create key in format: battleNadsCharacterId_[contractAddress]_[walletAddress]
  return `battleNadsCharacterId_${contractAddress}_${normalizedAddress}`;
}; 