import { renderHook, act, waitFor } from '@testing-library/react';
import { useGameMutations } from '../useGameMutations';
import { useBattleNadsClient } from '../../contracts/useBattleNadsClient';
import { useWallet } from '../../../providers/WalletProvider';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChakraProvider } from '@chakra-ui/react';
import React from 'react';
import { domain } from '../../../types';

// Mock dependencies
jest.mock('../../contracts/useBattleNadsClient');
jest.mock('../../../providers/WalletProvider');
jest.mock('../../utils', () => ({
  invalidateSnapshot: jest.fn(),
}));


// Mock ChakraUI toast to prevent act warnings
jest.mock('@chakra-ui/react', () => ({
  ...jest.requireActual('@chakra-ui/react'),
  useToast: () => {
    const mockToast = jest.fn() as any;
    mockToast.close = jest.fn();
    return mockToast;
  },
}));

const mockUseBattleNadsClient = useBattleNadsClient as jest.MockedFunction<typeof useBattleNadsClient>;
const mockUseWallet = useWallet as jest.MockedFunction<typeof useWallet>;

describe('useGameMutations', () => {
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
  const mockCharacterId = 'char123'; // Valid character ID
  const mockEmbeddedWallet = {
    address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    // Add any other properties that might be needed
    isConnected: true,
  };
  const mockInjectedWallet = {
    address: mockOwner
  };

  const mockClient = {
    moveCharacter: jest.fn(),
    attack: jest.fn(),
    allocatePoints: jest.fn(),
    chat: jest.fn(),
    estimateBuyInAmountInMON: jest.fn(),
    updateSessionKey: jest.fn(),
  } as any;

  beforeEach(() => {
    // Reset all mocks completely
    jest.clearAllMocks();
    jest.resetAllMocks();
    
    // Setup default mock return values
    mockClient.estimateBuyInAmountInMON.mockResolvedValue(1000n);
    mockClient.updateSessionKey.mockResolvedValue({ 
      hash: '0xsessiontx', 
      wait: jest.fn().mockResolvedValue({ status: 1 })
    });
    
    // Always reset to default working state
    mockUseBattleNadsClient.mockReturnValue({ client: mockClient, error: null });
    mockUseWallet.mockReturnValue({ 
      embeddedWallet: mockEmbeddedWallet,
      injectedWallet: mockInjectedWallet,
      connectMetamask: jest.fn(),
      isInitialized: true,
      isWalletInitialized: true,
    } as any);
  });

  describe('moveCharacter', () => {
    it('should call moveCharacter with correct parameters', async () => {
      const mockTransactionResponse = { hash: '0xtxhash', wait: jest.fn() };
      mockClient.moveCharacter.mockResolvedValue(mockTransactionResponse);

      const { result } = renderHook(() => useGameMutations(mockCharacterId, mockOwner), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.moveCharacter(domain.Direction.North);
      });

      expect(mockClient.moveCharacter).toHaveBeenCalledWith(mockCharacterId, domain.Direction.North);
    });

    it('should handle moveCharacter errors', async () => {
      const error = new Error('Move failed');
      mockClient.moveCharacter.mockRejectedValue(error);

      const { result } = renderHook(() => useGameMutations(mockCharacterId, mockOwner), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.moveCharacter(domain.Direction.North);
        } catch (error) {
          // Expected to fail - error will be captured in hook state
        }
      });

      await waitFor(() => {
        expect(result.current.moveError).toBe(error);
      });
    });

    it('should track move loading state', async () => {
      let resolveMove: (value: any) => void;
      const movePromise = new Promise((resolve) => { resolveMove = resolve; });
      mockClient.moveCharacter.mockReturnValue(movePromise);

      const { result } = renderHook(() => useGameMutations(mockCharacterId, mockOwner), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.moveCharacter(domain.Direction.North);
      });

      // Wait for the loading state to be true
      await waitFor(() => {
        expect(result.current.isMoving).toBe(true);
      });

      await act(async () => {
        resolveMove!({ hash: '0xtx', wait: jest.fn() });
        await movePromise;
      });

      // Wait for the loading state to be false
      await waitFor(() => {
        expect(result.current.isMoving).toBe(false);
      });
    });
  });

  describe('attack', () => {
    it('should call attack with correct parameters', async () => {
      const mockTransactionResponse = { hash: '0xtxhash', wait: jest.fn() };
      mockClient.attack.mockResolvedValue(mockTransactionResponse);

      const { result } = renderHook(() => useGameMutations(mockCharacterId, mockOwner), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.attack(5);
      });

      expect(mockClient.attack).toHaveBeenCalledWith(mockCharacterId, 5);
    });

    it('should handle attack errors', async () => {
      const error = new Error('Attack failed');
      mockClient.attack.mockRejectedValue(error);

      const { result } = renderHook(() => useGameMutations(mockCharacterId, mockOwner), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.attack(5);
        } catch (error) {
          // Expected to fail - error will be captured in hook state
        }
      });

      await waitFor(() => {
        expect(result.current.attackError).toBe(error);
      });
    });
  });

  describe('allocatePoints', () => {
    it('should call allocatePoints with correct bigint conversion', async () => {
      const mockTransactionResponse = { hash: '0xtxhash', wait: jest.fn() };
      mockClient.allocatePoints.mockResolvedValue(mockTransactionResponse);

      const { result } = renderHook(() => useGameMutations(mockCharacterId, mockOwner), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.allocatePoints(1n, 2n, 3n, 4n, 5n, 6n);
      });

      expect(mockClient.allocatePoints).toHaveBeenCalledWith(
        mockCharacterId, 
        BigInt(1), BigInt(2), BigInt(3), BigInt(4), BigInt(5), BigInt(6)
      );
    });

    it('should handle allocatePoints errors', async () => {
      const error = new Error('Allocation failed');
      mockClient.allocatePoints.mockRejectedValue(error);

      const { result } = renderHook(() => useGameMutations(mockCharacterId, mockOwner), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.allocatePoints(1n, 2n, 3n, 4n, 5n, 6n);
        } catch (error) {
          // Expected to fail - error will be captured in hook state
        }
      });

      await waitFor(() => {
        expect(result.current.allocatePointsError).toBe(error);
      });
    });

    it('should track allocation loading state', async () => {
      let resolveAllocation: (value: any) => void;
      const allocationPromise = new Promise((resolve) => { resolveAllocation = resolve; });
      mockClient.allocatePoints.mockReturnValue(allocationPromise);

      const { result } = renderHook(() => useGameMutations(mockCharacterId, mockOwner), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.allocatePoints(1n, 2n, 3n, 4n, 5n, 6n);
      });

      // Wait for the loading state to be true
      await waitFor(() => {
        expect(result.current.isAllocatingPoints).toBe(true);
      });

      await act(async () => {
        resolveAllocation!({ hash: '0xtx', wait: jest.fn() });
        await allocationPromise;
      });

      // Wait for the loading state to be false
      await waitFor(() => {
        expect(result.current.isAllocatingPoints).toBe(false);
      });
    });
  });

  describe('sendChatMessage', () => {
    it('should call chat with correct parameters', async () => {
      const mockTransactionResponse = { hash: '0xtxhash', wait: jest.fn() };
      mockClient.chat.mockResolvedValue(mockTransactionResponse);

      const { result } = renderHook(() => useGameMutations(mockCharacterId, mockOwner), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.sendChatMessage('Hello world');
      });

      expect(mockClient.chat).toHaveBeenCalledWith(mockCharacterId, 'Hello world');
    });

    it('should handle chat errors', async () => {
      const error = new Error('Chat failed');
      mockClient.chat.mockRejectedValue(error);

      const { result } = renderHook(() => useGameMutations(mockCharacterId, mockOwner), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.sendChatMessage('Hello world');
        } catch (error) {
          // Expected to fail - error will be captured in hook state
        }
      });

      await waitFor(() => {
        expect(result.current.chatError).toBe(error);
      });
    });
  });

  describe('updateSessionKey', () => {
    it('should call updateSessionKey with correct parameters', async () => {
      const { result } = renderHook(() => useGameMutations(mockCharacterId, mockOwner), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.updateSessionKey(1000n);
      });

      expect(mockClient.estimateBuyInAmountInMON).toHaveBeenCalled();
      expect(mockClient.updateSessionKey).toHaveBeenCalledWith(
        mockEmbeddedWallet.address,
        expect.any(BigInt), // expiration block
        expect.any(BigInt)  // value to send
      );
    });

    it('should handle session key update errors', async () => {
      const error = new Error('Session key update failed');
      mockClient.updateSessionKey.mockRejectedValue(error);

      const { result } = renderHook(() => useGameMutations(mockCharacterId, mockOwner), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.updateSessionKey(1000n);
        } catch (error) {
          // Expected to fail - error will be captured in hook state
        }
      });

      await waitFor(() => {
        expect(result.current.sessionKeyError).toBe(error);
      });
    });
  });

  describe('error conditions', () => {
    it('should throw error when client is missing for moveCharacter', async () => {
      // Temporarily override the client mock
      const originalMock = mockUseBattleNadsClient.getMockImplementation();
      mockUseBattleNadsClient.mockReturnValue({ client: null, error: 'Client missing' });

      const { result } = renderHook(() => useGameMutations(mockCharacterId, mockOwner), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.moveCharacter(domain.Direction.North);
        } catch (error) {
          // Expected to fail - error will be captured in hook state
        }
      });

      await waitFor(() => {
        expect(result.current.moveError?.message).toBe('Client missing');
      });

      // Restore the original mock
      if (originalMock) {
        mockUseBattleNadsClient.mockImplementation(originalMock);
      } else {
        mockUseBattleNadsClient.mockReturnValue({ client: mockClient, error: null });
      }
    });

    it('should throw error when characterId is missing for attack', async () => {
      const { result } = renderHook(() => useGameMutations(null, mockOwner), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.attack(5);
        } catch (error) {
          // Expected to fail - error will be captured in hook state
        }
      });

      await waitFor(() => {
        expect(result.current.attackError?.message).toBe('Client or character ID missing');
      });
    });

    it('should throw error when embedded wallet is missing for session key update', async () => {
      mockUseWallet.mockReturnValue({ 
        embeddedWallet: null,
        injectedWallet: mockInjectedWallet
      } as any);

      const { result } = renderHook(() => useGameMutations(mockCharacterId, mockOwner), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.updateSessionKey(1000n);
        } catch (error) {
          // Expected to fail - error will be captured in hook state
        }
      });

      await waitFor(() => {
        expect(result.current.sessionKeyError?.message).toBe('Client, character ID, or embedded wallet missing');
      });
    });
  });

  describe('mutation keys', () => {
    it('should use correct mutation keys for cache management', () => {
      const { result } = renderHook(() => useGameMutations(mockCharacterId, mockOwner), {
        wrapper: createWrapper(),
      });

      // Trigger mutations to register them in the cache
      act(() => {
        result.current.moveCharacter(domain.Direction.North);
        result.current.attack(5);
        result.current.allocatePoints(1n, 2n, 3n, 4n, 5n, 6n);
        result.current.sendChatMessage('test');
        result.current.updateSessionKey(1000n);
      });

      const mutations = queryClient.getMutationCache().getAll();
      const mutationKeys = mutations.map(m => m.options.mutationKey);

      expect(mutationKeys).toContainEqual(['moveCharacter', mockCharacterId, mockOwner]);
      expect(mutationKeys).toContainEqual(['attack', mockCharacterId, mockOwner]);
      expect(mutationKeys).toContainEqual(['allocatePoints', mockCharacterId, mockOwner]);
      expect(mutationKeys).toContainEqual(['sendChat', mockCharacterId, mockOwner]);
    });
  });
});