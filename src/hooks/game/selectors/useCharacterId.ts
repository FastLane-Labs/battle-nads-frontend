import { useGameData } from '../useGameData';

/**
 * Focused selector hook for character ID.
 * Used by components that only need to know the current character ID.
 */
export const useCharacterId = () => {
  const { characterId } = useGameData({
    includeHistory: false,
    includeSessionKey: false
  });

  return characterId;
};