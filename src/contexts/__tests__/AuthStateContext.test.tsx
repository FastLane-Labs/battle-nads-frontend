import React from 'react';
import { render, renderHook } from '@testing-library/react';
import { AuthStateProvider, useAuthState } from '../AuthStateContext';
import { AuthState } from '@/types/auth';
import { useWallet } from '@/providers/WalletProvider';
import { useSimplifiedGameState } from '@/hooks/game/useSimplifiedGameState';
import { useWelcomeScreen } from '@/components/onboarding/WelcomeScreen';
import { SessionKeyState } from '@/types/domain/session';

// Mock dependencies
jest.mock('@/providers/WalletProvider');
jest.mock('@/hooks/game/useSimplifiedGameState');
jest.mock('@/components/onboarding/WelcomeScreen');
jest.mock('@/utils/getCharacterLocalStorageKey', () => ({
  isValidCharacterId: (id: string | null) => id !== null && id !== "0x0000000000000000000000000000000000000000000000000000000000000000"
}));

const mockUseWallet = useWallet as jest.MockedFunction<typeof useWallet>;
const mockUseSimplifiedGameState = useSimplifiedGameState as jest.MockedFunction<typeof useSimplifiedGameState>;
const mockUseWelcomeScreen = useWelcomeScreen as jest.MockedFunction<typeof useWelcomeScreen>;

describe('AuthStateContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createWrapper = (isCheckingContract = false) => {
    return ({ children }: { children: React.ReactNode }) => (
      <AuthStateProvider isCheckingContract={isCheckingContract}>
        {children}
      </AuthStateProvider>
    );
  };

  describe('State Transitions', () => {
    it('should return CONTRACT_CHECKING when contract is being checked', () => {
      mockUseWallet.mockReturnValue({
        isInitialized: true,
        currentWallet: 'none',
        isWalletLocked: false,
        injectedWallet: null,
      } as any);
      mockUseSimplifiedGameState.mockReturnValue({
        isInitialized: true,
        hasWallet: false,
      } as any);
      mockUseWelcomeScreen.mockReturnValue({ hasSeenWelcome: true } as any);

      const { result } = renderHook(() => useAuthState(), { 
        wrapper: createWrapper(true) 
      });

      expect(result.current.state).toBe(AuthState.CONTRACT_CHECKING);
      expect(result.current.isLoading).toBe(true);
    });

    it('should return INITIALIZING when wallet is not initialized', () => {
      mockUseWallet.mockReturnValue({
        isInitialized: false,
        currentWallet: 'none',
        isWalletLocked: false,
        injectedWallet: null,
      } as any);
      mockUseSimplifiedGameState.mockReturnValue({
        isInitialized: false,
        hasWallet: false,
      } as any);
      mockUseWelcomeScreen.mockReturnValue({ hasSeenWelcome: true } as any);

      const { result } = renderHook(() => useAuthState(), { 
        wrapper: createWrapper(false) 
      });

      expect(result.current.state).toBe(AuthState.INITIALIZING);
      expect(result.current.isInitialized).toBe(false);
    });

    it('should return WALLET_LOCKED when wallet is locked', () => {
      mockUseWallet.mockReturnValue({
        isInitialized: true,
        currentWallet: 'injected',
        isWalletLocked: true,
        injectedWallet: { address: '0x123' },
      } as any);
      mockUseSimplifiedGameState.mockReturnValue({
        isInitialized: true,
        hasWallet: false,
      } as any);
      mockUseWelcomeScreen.mockReturnValue({ hasSeenWelcome: true } as any);

      const { result } = renderHook(() => useAuthState(), { 
        wrapper: createWrapper(false) 
      });

      expect(result.current.state).toBe(AuthState.WALLET_LOCKED);
      expect(result.current.hasWallet).toBe(false);
      expect(result.current.walletAddress).toBe('0x123');
    });

    it('should return NO_WALLET when no wallet is connected', () => {
      mockUseWallet.mockReturnValue({
        isInitialized: true,
        currentWallet: 'none',
        isWalletLocked: false,
        injectedWallet: null,
      } as any);
      mockUseSimplifiedGameState.mockReturnValue({
        isInitialized: true,
        hasWallet: false,
      } as any);
      mockUseWelcomeScreen.mockReturnValue({ hasSeenWelcome: true } as any);

      const { result } = renderHook(() => useAuthState(), { 
        wrapper: createWrapper(false) 
      });

      expect(result.current.state).toBe(AuthState.NO_WALLET);
      expect(result.current.hasWallet).toBe(false);
    });

    it('should return LOADING_GAME_DATA when loading game data', () => {
      mockUseWallet.mockReturnValue({
        isInitialized: true,
        currentWallet: 'injected',
        isWalletLocked: false,
        injectedWallet: { address: '0x123' },
      } as any);
      mockUseSimplifiedGameState.mockReturnValue({
        isInitialized: true,
        hasWallet: true,
        isLoading: true,
      } as any);
      mockUseWelcomeScreen.mockReturnValue({ hasSeenWelcome: true } as any);

      const { result } = renderHook(() => useAuthState(), { 
        wrapper: createWrapper(false) 
      });

      expect(result.current.state).toBe(AuthState.LOADING_GAME_DATA);
      expect(result.current.isLoading).toBe(true);
    });

    it('should return NO_CHARACTER when no character exists after onboarding', () => {
      mockUseWallet.mockReturnValue({
        isInitialized: true,
        currentWallet: 'injected',
        isWalletLocked: false,
        injectedWallet: { address: '0x123' },
      } as any);
      mockUseSimplifiedGameState.mockReturnValue({
        isInitialized: true,
        hasWallet: true,
        isLoading: false,
        characterId: "0x0000000000000000000000000000000000000000000000000000000000000000",
      } as any);
      mockUseWelcomeScreen.mockReturnValue({ hasSeenWelcome: true } as any);

      const { result } = renderHook(() => useAuthState(), { 
        wrapper: createWrapper(false) 
      });

      expect(result.current.state).toBe(AuthState.NO_CHARACTER);
      expect(result.current.hasCharacter).toBe(false);
    });

    it('should return CHARACTER_DEAD when character is dead', () => {
      mockUseWallet.mockReturnValue({
        isInitialized: true,
        currentWallet: 'injected',
        isWalletLocked: false,
        injectedWallet: { address: '0x123' },
      } as any);
      mockUseSimplifiedGameState.mockReturnValue({
        isInitialized: true,
        hasWallet: true,
        isLoading: false,
        characterId: "0x1234567890",
        character: { isDead: true },
      } as any);
      mockUseWelcomeScreen.mockReturnValue({ hasSeenWelcome: true } as any);

      const { result } = renderHook(() => useAuthState(), { 
        wrapper: createWrapper(false) 
      });

      expect(result.current.state).toBe(AuthState.CHARACTER_DEAD);
      expect(result.current.hasCharacter).toBe(true);
    });

    it('should return SESSION_KEY_EXPIRED when session key is expired', () => {
      mockUseWallet.mockReturnValue({
        isInitialized: true,
        currentWallet: 'injected',
        isWalletLocked: false,
        injectedWallet: { address: '0x123' },
      } as any);
      mockUseSimplifiedGameState.mockReturnValue({
        isInitialized: true,
        hasWallet: true,
        isLoading: false,
        characterId: "0x1234567890",
        character: { isDead: false },
        needsSessionKeyUpdate: true,
        sessionKeyState: SessionKeyState.EXPIRED,
      } as any);
      mockUseWelcomeScreen.mockReturnValue({ hasSeenWelcome: true } as any);

      const { result } = renderHook(() => useAuthState(), { 
        wrapper: createWrapper(false) 
      });

      expect(result.current.state).toBe(AuthState.SESSION_KEY_EXPIRED);
      expect(result.current.hasValidSessionKey).toBe(false);
    });

    it('should return READY when all conditions are met', () => {
      mockUseWallet.mockReturnValue({
        isInitialized: true,
        currentWallet: 'injected',
        isWalletLocked: false,
        injectedWallet: { address: '0x123' },
      } as any);
      mockUseSimplifiedGameState.mockReturnValue({
        isInitialized: true,
        hasWallet: true,
        isLoading: false,
        characterId: "0x1234567890",
        character: { isDead: false },
        worldSnapshot: { version: 1 },
        needsSessionKeyUpdate: false,
        sessionKeyData: { key: '0xabc' },
      } as any);
      mockUseWelcomeScreen.mockReturnValue({ hasSeenWelcome: true } as any);

      const { result } = renderHook(() => useAuthState(), { 
        wrapper: createWrapper(false) 
      });

      expect(result.current.state).toBe(AuthState.READY);
      expect(result.current.hasWallet).toBe(true);
      expect(result.current.hasCharacter).toBe(true);
      expect(result.current.hasValidSessionKey).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing context', () => {
      // Test that useAuthState throws when used outside provider
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      
      expect(() => {
        renderHook(() => useAuthState());
      }).toThrow('useAuthState must be used within AuthStateProvider');
      
      consoleError.mockRestore();
    });
  });
});