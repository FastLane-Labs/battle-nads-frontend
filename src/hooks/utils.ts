import { QueryClient } from '@tanstack/react-query';

/**
 * Helper function to invalidate UI snapshot queries
 * Centralizes the query key to prevent typos and inconsistencies
 * Updated to invalidate both contractPolling and uiSnapshot queries
 */
export const invalidateSnapshot = (queryClient: QueryClient, owner: string | null, embeddedWalletAddress?: string | null) => {
  // Invalidate contractPolling queries (used by useContractPolling)
  if (embeddedWalletAddress) {
    queryClient.invalidateQueries({ queryKey: ['contractPolling', owner, embeddedWalletAddress] });
  }
  queryClient.invalidateQueries({ queryKey: ['contractPolling', owner] });
  
  // Also invalidate uiSnapshot queries for backward compatibility
  if (embeddedWalletAddress) {
    queryClient.invalidateQueries({ queryKey: ['uiSnapshot', owner, embeddedWalletAddress] });
  }
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

/**
 * Helper function to invalidate all wallet-dependent queries
 * Use when wallet address changes or wallet disconnects
 */
export const invalidateWalletQueries = (queryClient: QueryClient, ownerAddress?: string | null) => {
  console.log('[invalidateWalletQueries] Invalidating all wallet-dependent cache');
  
  if (ownerAddress) {
    queryClient.invalidateQueries({ queryKey: ['contractPolling', ownerAddress] });
    queryClient.invalidateQueries({ queryKey: ['uiSnapshot', ownerAddress] });
    queryClient.invalidateQueries({ queryKey: ['characterId', ownerAddress] });
  }
  
  queryClient.invalidateQueries({ queryKey: ['sessionKey'] });
  queryClient.invalidateQueries({ queryKey: ['equipmentDetails'] });
  queryClient.removeQueries({ queryKey: ['battleNads'] });
  queryClient.invalidateQueries({ queryKey: ['currentBlock'] });
};

/**
 * Helper function to clear all character-specific queries
 * Use when character dies or is deleted
 */
export const clearCharacterQueries = (queryClient: QueryClient, ownerAddress?: string | null) => {
  console.log('[clearCharacterQueries] Clearing all character-specific cache');
  
  if (ownerAddress) {
    queryClient.invalidateQueries({ queryKey: ['contractPolling', ownerAddress] });
    queryClient.invalidateQueries({ queryKey: ['uiSnapshot', ownerAddress] });
    queryClient.invalidateQueries({ queryKey: ['characterId', ownerAddress] });
  }
  
  queryClient.invalidateQueries({ queryKey: ['sessionKey'] });
  queryClient.removeQueries({ queryKey: ['equipmentDetails'] });
  queryClient.removeQueries({ queryKey: ['abilityCooldowns'] });
  queryClient.invalidateQueries({ queryKey: ['battleNads'] });
  queryClient.invalidateQueries({ queryKey: ['currentBlock'] });
};

/**
 * Helper function to invalidate session key dependent queries
 * Use when session key expires or becomes invalid
 */
export const invalidateSessionKeyQueries = (queryClient: QueryClient) => {
  console.log('[invalidateSessionKeyQueries] Invalidating session key dependent cache');
  
  queryClient.invalidateQueries({ queryKey: ['contractPolling'] });
  queryClient.invalidateQueries({ queryKey: ['uiSnapshot'] });
  queryClient.invalidateQueries({ queryKey: ['equipmentDetails'] });
  queryClient.invalidateQueries({ queryKey: ['battleNads'] });
  queryClient.invalidateQueries({ queryKey: ['sessionKey'] });
}; 