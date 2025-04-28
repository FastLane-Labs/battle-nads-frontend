import { QueryClient } from '@tanstack/react-query';

/**
 * Helper function to invalidate UI snapshot queries
 * Centralizes the query key to prevent typos and inconsistencies
 */
export const invalidateSnapshot = (queryClient: QueryClient, owner: string | null) => {
  return queryClient.invalidateQueries({ queryKey: ['uiSnapshot', owner] });
};

/**
 * Helper function to invalidate session key queries
 */
export const invalidateSessionKey = (queryClient: QueryClient, characterId: string | null) => {
  return queryClient.invalidateQueries({ queryKey: ['sessionKey', characterId] });
};

/**
 * Helper function to invalidate current block queries
 */
export const invalidateCurrentBlock = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({ queryKey: ['currentBlock'] });
}; 