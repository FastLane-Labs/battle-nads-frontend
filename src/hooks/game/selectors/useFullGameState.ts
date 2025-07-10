import { useSimplifiedGameState } from '../useSimplifiedGameState';

/**
 * Comprehensive selector hook for components that need full game state.
 * This is primarily used by AppInitializer which passes data to GameContainer.
 * For most other components, use more focused selector hooks.
 */
export const useFullGameState = () => {
  // AppInitializer needs everything, so we use the full hook
  return useSimplifiedGameState({
    includeActions: true,
    includeHistory: true,
    includeSessionKey: true,
    includeWallet: true,
    readOnly: false
  });
};