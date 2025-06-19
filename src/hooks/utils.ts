import { QueryClient } from '@tanstack/react-query';

/**
 * Helper function to invalidate UI snapshot queries
 * Centralizes the query key to prevent typos and inconsistencies
 * Updated to invalidate all uiSnapshot queries for the owner regardless of embedded wallet
 */
export const invalidateSnapshot = (queryClient: QueryClient, owner: string | null, embeddedWalletAddress?: string | null) => {
  if (embeddedWalletAddress) {
    // Invalidate specific query with embedded wallet address
    queryClient.invalidateQueries({ queryKey: ['uiSnapshot', owner, embeddedWalletAddress] });
  }
  // Also invalidate all uiSnapshot queries for this owner (covers both old and new formats)
  return queryClient.invalidateQueries({ queryKey: ['uiSnapshot', owner] });
};

/**
 * Helper function to invalidate session key queries
 */
export const invalidateSessionKey = (
  queryClient: QueryClient, 
  ownerAddress: string | null | undefined,
  characterId: string | null
) => {
  return queryClient.invalidateQueries({ queryKey: ['sessionKey', ownerAddress, characterId] });
};

/**
 * Helper function to invalidate current block queries
 */
export const invalidateCurrentBlock = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({ queryKey: ['currentBlock'] });
}; 