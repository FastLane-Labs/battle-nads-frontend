import { renderHook, act, waitFor } from '@testing-library/react';
import { useGameActions } from '../useGameActions';
import { useGameMutations } from '../useGameMutations';
import { useGameData } from '../useGameData';
import { useWallet } from '../../../providers/WalletProvider';
import { useOptimisticChat } from '../../optimistic/useOptimisticChat';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChakraProvider } from '@chakra-ui/react';
import React from 'react';
import { domain } from '../../../types';

// Mock dependencies
jest.mock('../useGameMutations');
jest.mock('../useGameData');
jest.mock('../../../providers/WalletProvider');
jest.mock('../../optimistic/useOptimisticChat');

const mockUseGameMutations = useGameMutations as jest.MockedFunction<typeof useGameMutations>;
const mockUseGameData = useGameData as jest.MockedFunction<typeof useGameData>;
const mockUseWallet = useWallet as jest.MockedFunction<typeof useWallet>;
const mockUseOptimisticChat = useOptimisticChat as jest.MockedFunction<typeof useOptimisticChat>;

describe('useGameActions', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ChakraProvider>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </ChakraProvider>
    );
    return wrapper;
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        mutations: {
          retry: false,
        },
        queries: {
          retry: false,
          refetchOnWindowFocus: false,
        },
      },
    });
    jest.clearAllMocks();
  });

  const mockOwner = '0x1234567890123456789012345678901234567890';
  const mockCharacterId = 'char123';
  const mockEmbeddedWallet = {
    address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
  };
  const mockInjectedWallet = {
    address: mockOwner
  };

  const mockMutations = {
    moveCharacter: jest.fn(),
    attack: jest.fn(),
    allocatePoints: jest.fn(),
    sendChatMessage: jest.fn(),
    updateSessionKey: jest.fn(),
    isMoving: false,
    isAttacking: false,
    isAllocatingPoints: false,
    isSendingChat: false,
    isUpdatingSessionKey: false,
    moveError: null,
    attackError: null,
    allocatePointsError: null,
    chatError: null,
    sessionKeyError: null,
  };

  const mockOptimisticChat = {
    optimisticChatMessages: [],
    addOptimisticChatMessage: jest.fn(),
    removeOptimisticChatMessage: jest.fn(),
    isMessageOptimistic: jest.fn().mockReturnValue(false),
  };

  beforeEach(() => {
    mockUseGameMutations.mockReturnValue(mockMutations);
    mockUseWallet.mockReturnValue({
      injectedWallet: mockInjectedWallet,
      embeddedWallet: mockEmbeddedWallet,
      connectMetamask: jest.fn(),
      isInitialized: true,
      isWalletInitialized: true,
    } as any);
    mockUseOptimisticChat.mockReturnValue(mockOptimisticChat as any);
    
    // Mock useGameData to return the required fields for useGameActions
    mockUseGameData.mockReturnValue({
      characterId: mockCharacterId,
      owner: mockOwner,
      rawEndBlock: 1000n,
      addOptimisticChatMessage: mockOptimisticChat.addOptimisticChatMessage,
    } as any);
  });

  describe('normal operation', () => {
    it('should return all action functions', () => {
      const { result } = renderHook(() => useGameActions({ includeWallet: true, readOnly: false }), {
        wrapper: createWrapper(),
      });

      expect(result.current.hasWallet).toBe(true);
      expect(result.current.connectWallet).toBeDefined();
      expect(result.current.moveCharacter).toBeDefined();
      expect(result.current.attack).toBeDefined();
      expect(result.current.allocatePoints).toBeDefined();
      expect(result.current.sendChatMessage).toBeDefined();
      expect(result.current.updateSessionKey).toBeDefined();
      expect(result.current.addOptimisticChatMessage).toBeDefined();
    });

    it('should pass through mutation states correctly', () => {
      const mutationsWithState = {
        ...mockMutations,
        isMoving: true,
        isAttacking: false,
        moveError: new Error('Move failed'),
      };
      mockUseGameMutations.mockReturnValue(mutationsWithState);

      const { result } = renderHook(() => useGameActions({ includeWallet: true, readOnly: false }), {
        wrapper: createWrapper(),
      });

      expect(result.current.isMoving).toBe(true);
      expect(result.current.isAttacking).toBe(false);
      expect(result.current.moveError).toEqual(new Error('Move failed'));
    });

    it('should call mutation functions correctly', () => {
      const { result } = renderHook(() => useGameActions({ includeWallet: true, readOnly: false }), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.moveCharacter(domain.Direction.North);
      });

      expect(mockMutations.moveCharacter).toHaveBeenCalledWith(domain.Direction.North);

      act(() => {
        result.current.attack(5);
      });

      expect(mockMutations.attack).toHaveBeenCalledWith(5);

      act(() => {
        result.current.allocatePoints(1n, 2n, 3n, 4n, 5n, 6n);
      });

      expect(mockMutations.allocatePoints).toHaveBeenCalledWith(1n, 2n, 3n, 4n, 5n, 6n);
    });
  });

  describe('enhanced chat functionality', () => {
    it('should add optimistic message before sending', () => {
      const { result } = renderHook(() => useGameActions({ includeWallet: true, readOnly: false }), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.sendChatMessage('Hello world');
      });

      expect(mockOptimisticChat.addOptimisticChatMessage).toHaveBeenCalledWith('Hello world');
      expect(mockMutations.sendChatMessage).toHaveBeenCalledWith('Hello world');
    });

    it('should provide direct access to addOptimisticChatMessage', () => {
      const { result } = renderHook(() => useGameActions({ includeWallet: true, readOnly: false }), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.addOptimisticChatMessage('Direct optimistic');
      });

      expect(mockOptimisticChat.addOptimisticChatMessage).toHaveBeenCalledWith('Direct optimistic');
    });
  });

  describe('enhanced session key functionality', () => {
    it('should call updateSessionKey with rawEndBlock plus MAX_SESSION_KEY_VALIDITY_BLOCKS', () => {
      const rawEndBlock = 1000n;
      const expectedEndBlock = rawEndBlock + BigInt(10_000); // MAX_SESSION_KEY_VALIDITY_BLOCKS
      const { result } = renderHook(() => useGameActions({ 
        includeWallet: true, 
        readOnly: false
      }), {
        wrapper: createWrapper(),
      });

      result.current.updateSessionKey();

      expect(mockMutations.updateSessionKey).toHaveBeenCalledWith(expectedEndBlock);
    });

    it('should handle missing rawEndBlock gracefully', () => {
      // Mock useGameData to return null rawEndBlock
      mockUseGameData.mockReturnValue({
        characterId: mockCharacterId,
        owner: mockOwner,
        rawEndBlock: undefined,
        addOptimisticChatMessage: mockOptimisticChat.addOptimisticChatMessage,
      } as any);
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const { result } = renderHook(() => useGameActions({ 
        includeWallet: true, 
        readOnly: false
      }), {
        wrapper: createWrapper(),
      });

      result.current.updateSessionKey();

      expect(consoleSpy).toHaveBeenCalledWith('[useGameActions] Cannot update session key: no end block available');
      expect(mockMutations.updateSessionKey).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('read-only mode', () => {
    it('should return disabled functions in read-only mode', () => {
      const { result } = renderHook(() => useGameActions({ includeWallet: true, readOnly: true }), {
        wrapper: createWrapper(),
      });

      expect(result.current.hasWallet).toBe(false);
      expect(result.current.isMoving).toBe(false);
      expect(result.current.isAttacking).toBe(false);
      expect(result.current.isAllocatingPoints).toBe(false);
      expect(result.current.isSendingChat).toBe(false);
      expect(result.current.isUpdatingSessionKey).toBe(false);

      // All error states should be null
      expect(result.current.moveError).toBe(null);
      expect(result.current.attackError).toBe(null);
      expect(result.current.allocatePointsError).toBe(null);
      expect(result.current.chatError).toBe(null);
      expect(result.current.sessionKeyError).toBe(null);
    });

    it('should provide no-op functions in read-only mode', () => {
      const { result } = renderHook(() => useGameActions({ includeWallet: true, readOnly: true }), {
        wrapper: createWrapper(),
      });

      // These should not throw and should not call actual mutations
      act(() => {
        result.current.moveCharacter(domain.Direction.North);
        result.current.attack(5);
        result.current.sendChatMessage('test');
        result.current.updateSessionKey();
        result.current.addOptimisticChatMessage('test');
      });

      expect(mockMutations.moveCharacter).not.toHaveBeenCalled();
      expect(mockMutations.attack).not.toHaveBeenCalled();
      expect(mockMutations.sendChatMessage).not.toHaveBeenCalled();
      expect(mockMutations.updateSessionKey).not.toHaveBeenCalled();
    });

    it('should provide allocatePoints with correct signature in read-only mode', async () => {
      const { result } = renderHook(() => useGameActions({ includeWallet: true, readOnly: true }), {
        wrapper: createWrapper(),
      });

      // Should not throw with bigint parameters
      await act(async () => {
        await result.current.allocatePoints(1n, 2n, 3n, 4n, 5n, 6n);
      });

      expect(mockMutations.allocatePoints).not.toHaveBeenCalled();
    });
  });

  describe('wallet integration', () => {
    it('should detect wallet presence correctly', () => {
      const { result } = renderHook(() => useGameActions({ includeWallet: true, readOnly: false }), {
        wrapper: createWrapper(),
      });

      expect(result.current.hasWallet).toBe(true);
    });

    it('should handle missing wallet', () => {
      mockUseWallet.mockReturnValue({
        injectedWallet: null,
        embeddedWallet: mockEmbeddedWallet,
        connectMetamask: jest.fn(),
        isWalletInitialized: false,
      } as any);
      
      // Mock useGameData to return no owner (which determines hasWallet)
      mockUseGameData.mockReturnValue({
        characterId: mockCharacterId,
        owner: null, // No owner = no wallet
        rawEndBlock: 1000n,
        addOptimisticChatMessage: mockOptimisticChat.addOptimisticChatMessage,
      } as any);

      const { result } = renderHook(() => useGameActions({ includeWallet: true, readOnly: false }), {
        wrapper: createWrapper(),
      });

      expect(result.current.hasWallet).toBe(false);
    });

    it('should provide connect function when includeWallet is true', () => {
      const mockConnect = jest.fn();
      mockUseWallet.mockReturnValue({
        injectedWallet: mockInjectedWallet,
        embeddedWallet: mockEmbeddedWallet,
        connectMetamask: mockConnect,
        isWalletInitialized: true,
      } as any);

      const { result } = renderHook(() => useGameActions({ includeWallet: true, readOnly: false }), {
        wrapper: createWrapper(),
      });

      expect(result.current.connectWallet).toBe(mockConnect);
    });

    it('should provide no-op connect function when includeWallet is false', () => {
      const { result } = renderHook(() => useGameActions({ includeWallet: false, readOnly: false }), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.connectWallet();
      });

      // Should not throw
      expect(typeof result.current.connectWallet).toBe('function');
    });

    it('should report wallet initialization state correctly', () => {
      const { result } = renderHook(() => useGameActions({ includeWallet: true, readOnly: false }), {
        wrapper: createWrapper(),
      });

      expect(result.current.isInitialized).toBe(true);
      expect(result.current.isWalletInitialized).toBe(true);
    });
  });

  describe('dependency management', () => {
    it('should handle missing mutations gracefully', () => {
      mockUseGameMutations.mockReturnValue({
        ...mockMutations,
        moveCharacter: undefined as any,
        attack: undefined as any,
      });

      const { result } = renderHook(() => useGameActions({ includeWallet: true, readOnly: false }), {
        wrapper: createWrapper(),
      });

      // Should still provide the functions (even if undefined)
      expect(result.current.moveCharacter).toBeUndefined();
      expect(result.current.attack).toBeUndefined();
    });

    it('should handle missing optimistic chat', () => {
      mockUseOptimisticChat.mockReturnValue({
        optimisticChatMessages: [],
        addOptimisticChatMessage: undefined as any,
        removeOptimisticChatMessage: jest.fn(),
        isMessageOptimistic: jest.fn().mockReturnValue(false),
      } as any);

      const { result } = renderHook(() => useGameActions({ includeWallet: true, readOnly: false }), {
        wrapper: createWrapper(),
      });

      // Should handle gracefully when optimistic chat is not available
      act(() => {
        result.current.sendChatMessage('test');
      });

      expect(mockMutations.sendChatMessage).toHaveBeenCalledWith('test');
    });
  });

  describe('error propagation', () => {
    it('should propagate all mutation errors correctly', () => {
      const errors = {
        moveError: new Error('Move failed'),
        attackError: new Error('Attack failed'),
        allocatePointsError: new Error('Allocation failed'),
        chatError: new Error('Chat failed'),
        sessionKeyError: new Error('Session key failed'),
      };

      mockUseGameMutations.mockReturnValue({
        ...mockMutations,
        ...errors,
      });

      const { result } = renderHook(() => useGameActions({ includeWallet: true, readOnly: false }), {
        wrapper: createWrapper(),
      });

      expect(result.current.moveError).toBe(errors.moveError);
      expect(result.current.attackError).toBe(errors.attackError);
      expect(result.current.allocatePointsError).toBe(errors.allocatePointsError);
      expect(result.current.chatError).toBe(errors.chatError);
      expect(result.current.sessionKeyError).toBe(errors.sessionKeyError);
    });
  });
});