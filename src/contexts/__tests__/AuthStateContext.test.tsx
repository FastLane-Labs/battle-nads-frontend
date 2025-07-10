import React from 'react';
import { render, renderHook } from '@testing-library/react';
import { AuthStateProvider, useAuthState } from '../AuthStateContext';
import { AuthState } from '@/types/auth';
import { useAppInitializerMachine } from '@/hooks/useAppInitializerMachine';

// Mock the state machine hook
jest.mock('@/hooks/useAppInitializerMachine');

const mockUseAppInitializerMachine = useAppInitializerMachine as jest.MockedFunction<typeof useAppInitializerMachine>;

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
      mockUseAppInitializerMachine.mockReturnValue({
        state: AuthState.CONTRACT_CHECKING,
        error: null,
        isInitialized: false,
        hasWallet: false,
        hasCharacter: false,
        hasValidSessionKey: false,
        isLoading: true,
        characterId: null,
        walletAddress: null,
        sessionKeyAddress: null,
      });

      const { result } = renderHook(() => useAuthState(), { 
        wrapper: createWrapper(true) 
      });

      expect(result.current.state).toBe(AuthState.CONTRACT_CHECKING);
      expect(result.current.isLoading).toBe(true);
    });

    it('should return INITIALIZING when wallet is not initialized', () => {
      mockUseAppInitializerMachine.mockReturnValue({
        state: AuthState.INITIALIZING,
        error: null,
        isInitialized: false,
        hasWallet: false,
        hasCharacter: false,
        hasValidSessionKey: false,
        isLoading: true,
        characterId: null,
        walletAddress: null,
        sessionKeyAddress: null,
      });

      const { result } = renderHook(() => useAuthState(), { 
        wrapper: createWrapper(false) 
      });

      expect(result.current.state).toBe(AuthState.INITIALIZING);
      expect(result.current.isInitialized).toBe(false);
    });

    // Removed WALLET_LOCKED test - wallet lock detection is no longer supported

    it('should return NO_WALLET when no wallet is connected', () => {
      mockUseAppInitializerMachine.mockReturnValue({
        state: AuthState.NO_WALLET,
        error: null,
        isInitialized: true,
        hasWallet: false,
        hasCharacter: false,
        hasValidSessionKey: false,
        isLoading: false,
        characterId: null,
        walletAddress: null,
        sessionKeyAddress: null,
      });

      const { result } = renderHook(() => useAuthState(), { 
        wrapper: createWrapper(false) 
      });

      expect(result.current.state).toBe(AuthState.NO_WALLET);
      expect(result.current.hasWallet).toBe(false);
    });

    it('should return LOADING_GAME_DATA when loading game data', () => {
      mockUseAppInitializerMachine.mockReturnValue({
        state: AuthState.LOADING_GAME_DATA,
        error: null,
        isInitialized: true,
        hasWallet: true,
        hasCharacter: false,
        hasValidSessionKey: false,
        isLoading: true,
        characterId: null,
        walletAddress: '0x123',
        sessionKeyAddress: null,
      });

      const { result } = renderHook(() => useAuthState(), { 
        wrapper: createWrapper(false) 
      });

      expect(result.current.state).toBe(AuthState.LOADING_GAME_DATA);
      expect(result.current.isLoading).toBe(true);
    });

    it('should return NO_CHARACTER when no character exists after onboarding', () => {
      mockUseAppInitializerMachine.mockReturnValue({
        state: AuthState.NO_CHARACTER,
        error: null,
        isInitialized: true,
        hasWallet: true,
        hasCharacter: false,
        hasValidSessionKey: false,
        isLoading: false,
        characterId: "0x0000000000000000000000000000000000000000000000000000000000000000",
        walletAddress: '0x123',
        sessionKeyAddress: null,
      });

      const { result } = renderHook(() => useAuthState(), { 
        wrapper: createWrapper(false) 
      });

      expect(result.current.state).toBe(AuthState.NO_CHARACTER);
      expect(result.current.hasCharacter).toBe(false);
    });

    it('should return CHARACTER_DEAD when character is dead', () => {
      mockUseAppInitializerMachine.mockReturnValue({
        state: AuthState.CHARACTER_DEAD,
        error: null,
        isInitialized: true,
        hasWallet: true,
        hasCharacter: true,
        hasValidSessionKey: false,
        isLoading: false,
        characterId: "0x1234567890",
        walletAddress: '0x123',
        sessionKeyAddress: null,
      });

      const { result } = renderHook(() => useAuthState(), { 
        wrapper: createWrapper(false) 
      });

      expect(result.current.state).toBe(AuthState.CHARACTER_DEAD);
      expect(result.current.hasCharacter).toBe(true);
    });

    it('should return SESSION_KEY_EXPIRED when session key is expired', () => {
      mockUseAppInitializerMachine.mockReturnValue({
        state: AuthState.SESSION_KEY_EXPIRED,
        error: null,
        isInitialized: true,
        hasWallet: true,
        hasCharacter: true,
        hasValidSessionKey: false,
        isLoading: false,
        characterId: "0x1234567890",
        walletAddress: '0x123',
        sessionKeyAddress: null,
      });

      const { result } = renderHook(() => useAuthState(), { 
        wrapper: createWrapper(false) 
      });

      expect(result.current.state).toBe(AuthState.SESSION_KEY_EXPIRED);
      expect(result.current.hasValidSessionKey).toBe(false);
    });

    it('should return READY when all conditions are met', () => {
      mockUseAppInitializerMachine.mockReturnValue({
        state: AuthState.READY,
        error: null,
        isInitialized: true,
        hasWallet: true,
        hasCharacter: true,
        hasValidSessionKey: true,
        isLoading: false,
        characterId: "0x1234567890",
        walletAddress: '0x123',
        sessionKeyAddress: '0xabc',
      });

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