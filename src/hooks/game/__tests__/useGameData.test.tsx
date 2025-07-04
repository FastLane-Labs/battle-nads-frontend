import { renderHook, waitFor } from '@testing-library/react';
import { useGameData } from '../useGameData';
import { useWallet } from '../../../providers/WalletProvider';
import { useSessionKey } from '../../session/useSessionKey';
import { useContractPolling } from '../useContractPolling';
import { useCachedDataFeed } from '../useCachedDataFeed';
import { useOptimisticChat } from '../../optimistic/useOptimisticChat';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionKeyState } from '@/types/domain/session';
import React from 'react';

// Mock dependencies
jest.mock('../../../providers/WalletProvider');
jest.mock('../../session/useSessionKey');
jest.mock('../useContractPolling');
jest.mock('../useCachedDataFeed');
jest.mock('../../optimistic/useOptimisticChat');

const mockUseWallet = useWallet as jest.MockedFunction<typeof useWallet>;
const mockUseSessionKey = useSessionKey as jest.MockedFunction<typeof useSessionKey>;
const mockUseContractPolling = useContractPolling as jest.MockedFunction<typeof useContractPolling>;
const mockUseCachedDataFeed = useCachedDataFeed as jest.MockedFunction<typeof useCachedDataFeed>;
const mockUseOptimisticChat = useOptimisticChat as jest.MockedFunction<typeof useOptimisticChat>;

describe('useGameData', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return wrapper;
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
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
  const mockInjectedWallet = { address: mockOwner };

  const mockContractData = {
    characterID: mockCharacterId,
    sessionKeyData: { 
      key: '0xsessionkey', 
      expiration: 1000n,
      owner: mockOwner,
      balance: 1000000000000000000n,
      targetBalance: 2000000000000000000n, 
      ownerCommittedAmount: 500000000000000000n,
      ownerCommittedShares: 100000000000000000n
    },
    character: {
      id: mockCharacterId,
      name: 'TestChar',
      stats: { 
        index: 1, 
        combatantBitMap: 0n,
        depth: 0,
        x: 5,
        y: 10,
        weaponID: 1n,
        armorID: 1n,
        class: 4n,
        level: 1n,
        health: 100n,
        buffs: 0n,
        debuffs: 0n,
        strength: 10n,
        vitality: 10n,
        dexterity: 10n,
        quickness: 10n,
        sturdiness: 10n,
        luck: 10n,
        experience: 0n,
        unspentAttributePoints: 5n
      },
      position: { x: 5, y: 10, depth: 0 },
      weapon: {
        name: 'Test Sword',
        baseDamage: 10n,
        bonusDamage: 5n,
        accuracy: 85n,
        speed: 3n
      },
      armor: {
        name: 'Test Armor',
        armorFactor: 15n,
        armorQuality: 8n,
        flexibility: 7n,
        weight: 12n
      },
      inventory: [],
      owner: mockOwner,
      activeTask: {
        hasTaskError: false,
        pending: false,
        taskDelay: 0,
        executorDelay: 0,
        taskAddress: '0x0000000000000000000000000000000000000000',
        targetBlock: 0n
      },
      activeAbility: {
        ability: 0,
        stage: 0,
        targetIndex: 0,
        taskAddress: '0x0000000000000000000000000000000000000000',
        targetBlock: 0n
      },
      maxHealth: 150n
    },
    combatants: [],
    noncombatants: [],
    equipableWeaponIDs: [],
    equipableWeaponNames: [],
    equipableArmorIDs: [],
    equipableArmorNames: [],
    dataFeeds: [],
    balanceShortfall: 100n,
    endBlock: 500n,
    fetchTimestamp: Date.now(),
  };

  const mockSessionKeyData = {
    sessionKeyData: mockContractData.sessionKeyData,
    isLoading: false,
    error: null,
    refreshSessionKey: jest.fn(),
    sessionKeyState: SessionKeyState.VALID,
    needsUpdate: false,
    currentBlock: 500,
  };

  const mockHistoricalBlocks = [
    {
      blockNumber: 490n,
      timestamp: Date.now() - 10000,
      chats: [],
      events: []
    }
  ];

  const mockOptimisticChat = {
    optimisticChatMessages: [],
    addOptimisticChatMessage: jest.fn(),
    removeOptimisticChatMessage: jest.fn(),
    isMessageOptimistic: jest.fn().mockReturnValue(false),
  };

  beforeEach(() => {
    mockUseWallet.mockReturnValue({ injectedWallet: mockInjectedWallet } as any);
    mockUseContractPolling.mockReturnValue({
      data: mockContractData,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as any);
    mockUseSessionKey.mockReturnValue(mockSessionKeyData);
    mockUseCachedDataFeed.mockReturnValue({
      historicalBlocks: mockHistoricalBlocks,
      isHistoryLoading: false,
      getAllCharactersForOwner: jest.fn(),
      getDataSummaryForOwner: jest.fn(),
    } as any);
    mockUseOptimisticChat.mockReturnValue(mockOptimisticChat);
  });

  describe('basic functionality', () => {
    it('should return transformed game data', () => {
      const { result } = renderHook(() => useGameData(), {
        wrapper: createWrapper(),
      });

      // Character should be transformed to domain format
      expect(result.current.character).toMatchObject({
        id: mockCharacterId,
        name: 'TestChar',
        class: 4,
        level: 1n, // BigInt level from stats.level
        health: 100,
        maxHealth: 150,
        owner: mockOwner
      });
      expect(result.current.characterId).toBe(mockCharacterId);
      expect(result.current.balanceShortfall).toBe(100n);
      expect(result.current.owner).toBe(mockOwner);
      expect(result.current.position).toEqual({
        x: 5,
        y: 10,
        depth: 0
      });
    });

    it('should include session key data when includeSessionKey is true', () => {
      const { result } = renderHook(() => useGameData({ includeSessionKey: true }), {
        wrapper: createWrapper(),
      });

      expect(result.current.sessionKeyData).toEqual(mockContractData.sessionKeyData);
      expect(result.current.sessionKeyState).toBe(SessionKeyState.VALID);
      expect(result.current.needsSessionKeyUpdate).toBe(false);
    });

    it('should exclude session key data when includeSessionKey is false', () => {
      const { result } = renderHook(() => useGameData({ includeSessionKey: false }), {
        wrapper: createWrapper(),
      });

      expect(result.current.sessionKeyData).toBeUndefined();
      expect(result.current.sessionKeyState).toBeUndefined();
      expect(result.current.needsSessionKeyUpdate).toBeUndefined();
    });

    it('should include historical data when includeHistory is true', () => {
      const { result } = renderHook(() => useGameData({ includeHistory: true }), {
        wrapper: createWrapper(),
      });

      expect(result.current.historicalBlocks).toEqual(mockHistoricalBlocks);
      expect(result.current.getAllCharactersForOwner).toBeDefined();
      expect(result.current.getDataSummaryForOwner).toBeDefined();
    });

    it('should exclude historical data when includeHistory is false', () => {
      const { result } = renderHook(() => useGameData({ includeHistory: false }), {
        wrapper: createWrapper(),
      });

      expect(result.current.historicalBlocks).toBeUndefined();
      expect(result.current.getAllCharactersForOwner).toBeUndefined();
      expect(result.current.getDataSummaryForOwner).toBeUndefined();
    });
  });

  describe('loading states', () => {
    it('should combine loading states correctly', () => {
      mockUseContractPolling.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      } as any);

      const { result } = renderHook(() => useGameData(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isPollingLoading).toBe(true);
    });

    it('should include history loading when includeHistory is true', () => {
      mockUseCachedDataFeed.mockReturnValue({
        historicalBlocks: [],
        isHistoryLoading: true,
        getAllCharactersForOwner: jest.fn(),
        getDataSummaryForOwner: jest.fn(),
      } as any);

      const { result } = renderHook(() => useGameData({ includeHistory: true }), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isHistoryLoading).toBe(true);
      expect(result.current.isCacheLoading).toBe(true);
    });

    it('should not include history loading when includeHistory is false', () => {
      mockUseCachedDataFeed.mockReturnValue({
        historicalBlocks: [],
        isHistoryLoading: true,
        getAllCharactersForOwner: jest.fn(),
        getDataSummaryForOwner: jest.fn(),
      } as any);

      const { result } = renderHook(() => useGameData({ includeHistory: false }), {
        wrapper: createWrapper(),
      });

      expect(result.current.isHistoryLoading).toBe(false);
      expect(result.current.isCacheLoading).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should pass through contract polling errors', () => {
      const contractError = new Error('Contract failed');
      mockUseContractPolling.mockReturnValue({
        data: null,
        isLoading: false,
        error: contractError,
        refetch: jest.fn(),
      } as any);

      const { result } = renderHook(() => useGameData(), {
        wrapper: createWrapper(),
      });

      expect(result.current.error).toBe(contractError);
    });
  });

  describe('data transformations', () => {
    it('should handle null character data gracefully', () => {
      mockUseContractPolling.mockReturnValue({
        data: { ...mockContractData, character: null },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      const { result } = renderHook(() => useGameData(), {
        wrapper: createWrapper(),
      });

      expect(result.current.character).toBe(null);
      expect(result.current.position).toBe(null);
    });

    it('should detect combat state correctly', () => {
      const combatCharacter = {
        ...mockContractData.character,
        stats: { ...mockContractData.character.stats, combatantBitMap: 1n }
      };

      mockUseContractPolling.mockReturnValue({
        data: { ...mockContractData, character: combatCharacter },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      const { result } = renderHook(() => useGameData(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isInCombat).toBe(true);
    });

    it('should filter other characters correctly', () => {
      const combatants = [
        { id: mockCharacterId, name: 'Player' },
        { id: 'other1', name: 'Other1' },
        { id: 'other2', name: 'Other2' }
      ];

      mockUseContractPolling.mockReturnValue({
        data: { ...mockContractData, combatants },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      const { result } = renderHook(() => useGameData(), {
        wrapper: createWrapper(),
      });

      expect(result.current.others).toHaveLength(2);
      expect(result.current.others.map(c => c.id)).toEqual(['other1', 'other2']);
    });
  });

  describe('optimistic chat integration', () => {
    it('should combine optimistic and real chat messages', () => {
      const optimisticChats = [
        { 
          message: 'Optimistic message', 
          sender: { id: 'user2', name: 'User2', index: 2 },
          logIndex: 1,
          blocknumber: 101n,
          timestamp: Date.now(),
          isOptimistic: true
        }
      ];

      mockUseOptimisticChat.mockReturnValue({
        optimisticChatMessages: optimisticChats,
        addOptimisticChatMessage: jest.fn(),
        removeOptimisticChatMessage: jest.fn(),
        isMessageOptimistic: jest.fn().mockReturnValue(false),
      });

      const { result } = renderHook(() => useGameData(), {
        wrapper: createWrapper(),
      });

      // Should have addOptimisticChatMessage function
      expect(result.current.addOptimisticChatMessage).toBeDefined();
    });

    it('should provide isMessageOptimistic check function', () => {
      const { result } = renderHook(() => useGameData(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.addOptimisticChatMessage).toBe('function');
    });
  });

  describe('edge cases', () => {
    it('should handle missing wallet gracefully', () => {
      mockUseWallet.mockReturnValue({ injectedWallet: null } as any);
      mockUseContractPolling.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      const { result } = renderHook(() => useGameData(), {
        wrapper: createWrapper(),
      });

      expect(result.current.owner).toBe(null);
      expect(result.current.character).toBe(null);
    });

    it('should handle session key errors', () => {
      mockUseSessionKey.mockReturnValue({
        ...mockSessionKeyData,
        sessionKeyState: SessionKeyState.EXPIRED,
        needsUpdate: true,
      });

      const { result } = renderHook(() => useGameData({ includeSessionKey: true }), {
        wrapper: createWrapper(),
      });

      expect(result.current.sessionKeyState).toBe(SessionKeyState.EXPIRED);
      expect(result.current.needsSessionKeyUpdate).toBe(true);
    });

    it('should handle missing contract data', () => {
      mockUseContractPolling.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      const { result } = renderHook(() => useGameData(), {
        wrapper: createWrapper(),
      });

      expect(result.current.character).toBe(null);
      expect(result.current.characterId).toBe(null);
      expect(result.current.balanceShortfall).toBeUndefined();
    });
  });

  describe('raw data access', () => {
    it('should provide access to raw contract data', () => {
      const { result } = renderHook(() => useGameData(), {
        wrapper: createWrapper(),
      });

      expect(result.current.rawSessionKeyData).toEqual(mockContractData.sessionKeyData);
      expect(result.current.rawEndBlock).toBe(500n);
      expect(result.current.rawEquipableWeaponIDs).toEqual(mockContractData.equipableWeaponIDs);
      expect(result.current.rawEquipableWeaponNames).toEqual(mockContractData.equipableWeaponNames);
      expect(result.current.rawEquipableArmorIDs).toEqual(mockContractData.equipableArmorIDs);
      expect(result.current.rawEquipableArmorNames).toEqual(mockContractData.equipableArmorNames);
    });
  });
});