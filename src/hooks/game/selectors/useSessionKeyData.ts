import { useGameData } from '../useGameData';

/**
 * Focused selector hook for session key data.
 * Used by components that need session key information and state.
 */
export const useSessionKeyData = () => {
  const { 
    sessionKeyData, 
    sessionKeyState,
    needsSessionKeyUpdate 
  } = useGameData({
    includeHistory: false,
    includeSessionKey: true
  });

  return {
    sessionKeyData,
    sessionKeyState,
    needsSessionKeyUpdate
  };
};