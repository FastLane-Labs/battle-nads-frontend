import { renderHook, act } from '@testing-library/react';
import { useSimplifiedGameState } from '../useSimplifiedGameState';
import { useGameData } from '../useGameData';
import { useGameActions } from '../useGameActions';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChakraProvider } from '@chakra-ui/react';
import React from 'react';
import { domain } from '../../../types';
import { SessionKeyState } from '@/types/domain/session';

// Mock dependencies
jest.mock('../useGameData');
jest.mock('../useGameActions');

const mockUseGameData = useGameData as jest.MockedFunction<typeof useGameData>;
const mockUseGameActions = useGameActions as jest.MockedFunction<typeof useGameActions>;

describe('useSimplifiedGameState', () => {
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
    // Create a completely new QueryClient for each test
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
    
    // Clear all mock state and return values
    jest.clearAllMocks();
    
    // Reset mock return values to defaults before each test
    mockUseGameData.mockReturnValue(mockGameData as any);
    mockUseGameActions.mockReturnValue(mockGameActions as any);
  });

  const mockGameData = {
    // Core data
    worldSnapshot: {
      characterID: 'char1',
      sessionKeyData: { 
        key: '0xsessionkey', 
        expiry: '1000',
        owner: '0x1234',
        balance: '1000000000000000000',
        targetBalance: '2000000000000000000',
        ownerCommittedAmount: '500000000000000000',
        ownerCommittedShares: '100000000000000000'
      },
      character: {
        id: 'char1',
        name: 'TestChar',
        position: { x: 5, y: 10, depth: 0 }
      },
      combatants: [],
      noncombatants: [],
      eventLogs: [],
      chatLogs: [],
      balanceShortfall: 100n,
      unallocatedAttributePoints: 5n,
      lastBlock: 500n
    },
    gameState: {
      characterID: 'char1',
      character: {
        id: 'char1',
        name: 'TestChar',
        position: { x: 5, y: 10, depth: 0 }
      },
      combatants: [],
      noncombatants: [],
      eventLogs: [],
      chatLogs: []
    },
    rawSessionKeyData: { 
      key: '0xsessionkey', 
      expiration: 1000n,
      owner: '0x1234',
      balance: 1000000000000000000n,
      targetBalance: 2000000000000000000n,
      ownerCommittedAmount: 500000000000000000n,
      ownerCommittedShares: 100000000000000000n
    },
    rawEndBlock: 500n,
    balanceShortfall: 100n,
    character: {
      id: 'char1',
      name: 'TestChar',
      position: { x: 5, y: 10, depth: 0 }
    },
    characterId: 'char1',
    position: { x: 5, y: 10, depth: 0 },
    sessionKeyData: { 
      key: '0xsessionkey', 
      expiration: 1000n,
      owner: '0x1234',
      balance: 1000000000000000000n,
      targetBalance: 2000000000000000000n,
      ownerCommittedAmount: 500000000000000000n,
      ownerCommittedShares: 100000000000000000n
    },
    sessionKeyState: SessionKeyState.VALID,
    needsSessionKeyUpdate: false,
    owner: '0x1234',
    addOptimisticChatMessage: jest.fn(),
    chatLogs: [],
    eventLogs: [],
    others: [],
    isInCombat: false,
    isLoading: false,
    isPollingLoading: false,
    isHistoryLoading: false,
    isCacheLoading: false,
    error: null,
    rawEquipableWeaponIDs: [],
    rawEquipableWeaponNames: [],
    rawEquipableArmorIDs: [],
    rawEquipableArmorNames: [],
    historicalBlocks: [],
    getAllCharactersForOwner: jest.fn(),
    getDataSummaryForOwner: jest.fn(),
  };

  const mockGameActions = {
    hasWallet: true,
    connectWallet: jest.fn(),
    isInitialized: true,
    isWalletInitialized: true,
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
    addOptimisticChatMessage: jest.fn(),
  };


  describe('default behavior', () => {
    it('should combine game data and actions by default', () => {
      const { result } = renderHook(() => useSimplifiedGameState(), {
        wrapper: createWrapper(),
      });

      // Should have data from useGameData
      expect(result.current.character).toBe(mockGameData.character);
      expect(result.current.characterId).toBe(mockGameData.characterId);
      expect(result.current.balanceShortfall).toBe(mockGameData.balanceShortfall);

      // Should have actions from useGameActions
      expect(result.current.hasWallet).toBe(mockGameActions.hasWallet);
      expect(result.current.moveCharacter).toBe(mockGameActions.moveCharacter);
      expect(result.current.attack).toBe(mockGameActions.attack);
      expect(result.current.allocatePoints).toBe(mockGameActions.allocatePoints);
    });

    it('should include session key data by default', () => {
      const { result } = renderHook(() => useSimplifiedGameState(), {
        wrapper: createWrapper(),
      });

      expect(result.current.sessionKeyData).toBe(mockGameData.sessionKeyData);
      expect(result.current.sessionKeyState).toBe(mockGameData.sessionKeyState);
      expect(result.current.needsSessionKeyUpdate).toBe(mockGameData.needsSessionKeyUpdate);
    });

    it('should include historical data by default', () => {
      const { result } = renderHook(() => useSimplifiedGameState(), {
        wrapper: createWrapper(),
      });

      expect(result.current.historicalBlocks).toBe(mockGameData.historicalBlocks);
      expect(result.current.getAllCharactersForOwner).toBe(mockGameData.getAllCharactersForOwner);
      expect(result.current.getDataSummaryForOwner).toBe(mockGameData.getDataSummaryForOwner);
    });
  });

  describe('configuration options', () => {
    it('should exclude actions when includeActions is false', () => {
      const { result } = renderHook(() => useSimplifiedGameState({ includeActions: false }), {
        wrapper: createWrapper(),
      });

      // Should have data
      expect(result.current.character).toBe(mockGameData.character);

      // Should have fallback actions with disabled state
      expect(result.current.hasWallet).toBe(false);
      expect(result.current.isMoving).toBe(false);
      expect(result.current.isAttacking).toBe(false);
      expect(typeof result.current.moveCharacter).toBe('function');
      expect(typeof result.current.attack).toBe('function');
      expect(typeof result.current.allocatePoints).toBe('function');
    });

    it('should exclude history when includeHistory is false', () => {
      const { result } = renderHook(() => useSimplifiedGameState({ includeHistory: false }), {
        wrapper: createWrapper(),
      });

      expect(mockUseGameData).toHaveBeenCalledWith({ 
        includeHistory: false, 
        includeSessionKey: true 
      });
    });

    it('should exclude session key data when includeSessionKey is false', () => {
      const { result } = renderHook(() => useSimplifiedGameState({ includeSessionKey: false }), {
        wrapper: createWrapper(),
      });

      expect(mockUseGameData).toHaveBeenCalledWith({ 
        includeHistory: true, 
        includeSessionKey: false 
      });
    });

    it('should configure actions with correct options', () => {
      renderHook(() => useSimplifiedGameState({ 
        includeActions: true,
        includeWallet: false,
        readOnly: true
      }), {
        wrapper: createWrapper(),
      });

      expect(mockUseGameActions).toHaveBeenCalledWith({ 
        includeWallet: false, 
        readOnly: true 
      });
    });

    it('should set readOnly based on includeActions', () => {
      renderHook(() => useSimplifiedGameState({ includeActions: false }), {
        wrapper: createWrapper(),
      });

      expect(mockUseGameActions).toHaveBeenCalledWith({ 
        includeWallet: false, 
        readOnly: true 
      });
    });
  });

  describe('fallback actions', () => {
    it('should provide proper fallback function signatures', async () => {
      const { result } = renderHook(() => useSimplifiedGameState({ includeActions: false }), {
        wrapper: createWrapper(),
      });

      // These should not throw and should have proper signatures
      act(() => {
        result.current.moveCharacter(domain.Direction.North);
        result.current.attack(5);
        result.current.sendChatMessage('test');
        result.current.updateSessionKey();
        result.current.addOptimisticChatMessage('test');
      });

      // allocatePoints should accept bigint parameters
      await act(async () => {
        await result.current.allocatePoints(1n, 2n, 3n, 4n, 5n, 6n);
      });

      // Should not have called the real actions
      expect(mockGameActions.moveCharacter).not.toHaveBeenCalled();
      expect(mockGameActions.attack).not.toHaveBeenCalled();
      expect(mockGameActions.allocatePoints).not.toHaveBeenCalled();
    });

    it('should provide consistent state when actions are disabled', () => {
      // Ensure mocks are properly set before this test
      mockUseGameData.mockReturnValue(mockGameData as any);
      mockUseGameActions.mockReturnValue(mockGameActions);
      
      const { result } = renderHook(() => useSimplifiedGameState({ includeActions: false }), {
        wrapper: createWrapper(),
      });

      expect(result.current.hasWallet).toBe(false);
      expect(result.current.isInitialized).toBe(false);
      expect(result.current.isWalletInitialized).toBe(false);
      expect(result.current.isMoving).toBe(false);
      expect(result.current.isAttacking).toBe(false);
      expect(result.current.isAllocatingPoints).toBe(false);
      expect(result.current.isSendingChat).toBe(false);
      expect(result.current.isUpdatingSessionKey).toBe(false);

      // All errors should be null
      expect(result.current.moveError).toBe(null);
      expect(result.current.attackError).toBe(null);
      expect(result.current.allocatePointsError).toBe(null);
      expect(result.current.chatError).toBe(null);
      expect(result.current.sessionKeyError).toBe(null);
    });
  });

  describe('data precedence', () => {
    it('should prioritize actions data over game data for overlapping properties', () => {
      // Mock overlapping properties
      const gameDataWithWallet = {
        ...mockGameData,
        hasWallet: false, // This should be overridden by actions
      };
      
      mockUseGameData.mockReturnValue(gameDataWithWallet as any);

      const { result } = renderHook(() => useSimplifiedGameState(), {
        wrapper: createWrapper(),
      });

      // Actions should take precedence
      expect(result.current.hasWallet).toBe(mockGameActions.hasWallet);
    });

    it('should provide addOptimisticChatMessage from actions', () => {
      const { result } = renderHook(() => useSimplifiedGameState(), {
        wrapper: createWrapper(),
      });

      expect(result.current.addOptimisticChatMessage).toBe(mockGameActions.addOptimisticChatMessage);

      act(() => {
        result.current.addOptimisticChatMessage('test');
      });

      expect(mockGameActions.addOptimisticChatMessage).toHaveBeenCalledWith('test');
    });
  });

  describe('error handling', () => {
    it('should handle errors from game data', () => {
      const errorGameData = {
        ...mockGameData,
        error: new Error('Data error'),
        isLoading: false,
      };
      mockUseGameData.mockReturnValue(errorGameData as any);

      const { result } = renderHook(() => useSimplifiedGameState(), {
        wrapper: createWrapper(),
      });

      expect(result.current.error).toEqual(new Error('Data error'));
    });

    it('should handle errors from game actions', () => {
      const errorGameActions = {
        ...mockGameActions,
        moveError: new Error('Move error'),
        attackError: new Error('Attack error'),
      };
      mockUseGameActions.mockReturnValue(errorGameActions);

      const { result } = renderHook(() => useSimplifiedGameState(), {
        wrapper: createWrapper(),
      });

      expect(result.current.moveError).toEqual(new Error('Move error'));
      expect(result.current.attackError).toEqual(new Error('Attack error'));
    });
  });

  describe('loading states', () => {
    it('should propagate loading states from game data', () => {
      const loadingGameData = {
        ...mockGameData,
        isLoading: true,
        isPollingLoading: true,
        isHistoryLoading: true,
      };
      mockUseGameData.mockReturnValue(loadingGameData as any);

      const { result } = renderHook(() => useSimplifiedGameState(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isPollingLoading).toBe(true);
      expect(result.current.isHistoryLoading).toBe(true);
    });

    it('should propagate loading states from game actions', () => {
      const loadingGameActions = {
        ...mockGameActions,
        isMoving: true,
        isAttacking: true,
        isAllocatingPoints: true,
      };
      mockUseGameActions.mockReturnValue(loadingGameActions);

      const { result } = renderHook(() => useSimplifiedGameState(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isMoving).toBe(true);
      expect(result.current.isAttacking).toBe(true);
      expect(result.current.isAllocatingPoints).toBe(true);
    });
  });

  describe('dependency injection', () => {
    it('should pass correct options to useGameData', () => {
      renderHook(() => useSimplifiedGameState({ 
        includeHistory: false, 
        includeSessionKey: false 
      }), {
        wrapper: createWrapper(),
      });

      expect(mockUseGameData).toHaveBeenCalledWith({ 
        includeHistory: false, 
        includeSessionKey: false 
      });
    });

    it('should pass correct options to useGameActions', () => {
      renderHook(() => useSimplifiedGameState({ 
        includeActions: true,
        includeWallet: false,
        readOnly: true 
      }), {
        wrapper: createWrapper(),
      });

      expect(mockUseGameActions).toHaveBeenCalledWith({ 
        includeWallet: false, 
        readOnly: true 
      });
    });

    it('should handle missing dependencies gracefully', () => {
      mockUseGameData.mockReturnValue({} as any);
      mockUseGameActions.mockReturnValue({} as any);

      const { result } = renderHook(() => useSimplifiedGameState(), {
        wrapper: createWrapper(),
      });

      // Should not crash
      expect(result.current).toBeDefined();
    });
  });

  describe('type consistency', () => {
    it('should maintain consistent return type structure', () => {
      const { result } = renderHook(() => useSimplifiedGameState(), {
        wrapper: createWrapper(),
      });

      // Core data properties
      expect(result.current).toHaveProperty('character');
      expect(result.current).toHaveProperty('characterId');
      expect(result.current).toHaveProperty('position');
      expect(result.current).toHaveProperty('owner');

      // Action properties
      expect(result.current).toHaveProperty('moveCharacter');
      expect(result.current).toHaveProperty('attack');
      expect(result.current).toHaveProperty('allocatePoints');
      expect(result.current).toHaveProperty('sendChatMessage');

      // State properties
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('isMoving');
      expect(result.current).toHaveProperty('isAttacking');

      // Error properties
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('moveError');
      expect(result.current).toHaveProperty('attackError');
    });
  });
});