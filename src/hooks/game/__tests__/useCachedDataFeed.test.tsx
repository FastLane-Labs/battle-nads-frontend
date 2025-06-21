import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCachedDataFeed, storeFeedData, CachedDataBlock } from '../useCachedDataFeed';
import { db } from '../../../lib/db';

// Mock the database
jest.mock('../../../lib/db', () => ({
  db: {
    dataBlocks: {
      where: jest.fn(),
      bulkPut: jest.fn(),
    },
    characters: {
      put: jest.fn(),
    },
    transaction: jest.fn(),
  },
}));

// Mock config
jest.mock('../../../config/env', () => ({
  ENTRYPOINT_ADDRESS: '0x1234567890abcdef1234567890abcdef12345678',
}));

const mockDb = db as jest.Mocked<typeof db>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useCachedDataFeed', () => {
  const mockOwner = '0x1234567890abcdef1234567890abcdef12345678';
  const mockCharacterId = 'char123';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the database query chain
    const mockWhere = {
      equals: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([]),
        and: jest.fn().mockReturnValue({
          delete: jest.fn().mockResolvedValue(0),
        }),
      }),
    };
    
    mockDb.dataBlocks.where.mockReturnValue(mockWhere as any);
    mockDb.characters.put.mockResolvedValue(undefined as any);
    mockDb.transaction.mockImplementation(async (mode, tables, callback) => {
      return await callback();
    });
  });

  it('should initialize with empty state when no owner or characterId', () => {
    const { result } = renderHook(() => useCachedDataFeed(null, null), {
      wrapper: createWrapper(),
    });

    expect(result.current.historicalBlocks).toEqual([]);
    expect(result.current.isHistoryLoading).toBe(false);
    expect(result.current.processedBlocks.size).toBe(0);
  });

  it('should load initial cached events on mount', async () => {
    const mockStoredBlocks = [
      {
        block: '1000',
        ts: 1640000000000,
        chats: [],
        events: [{ 
          logType: 1, 
          index: 0, 
          mainPlayerIndex: 1, 
          otherPlayerIndex: 2,
          attackerName: 'Player1',
          defenderName: 'Player2',
          areaId: '1234',
          hit: true,
          critical: false,
          damageDone: 10,
          healthHealed: 0,
          targetDied: false,
          lootedWeaponID: 0,
          lootedArmorID: 0,
          experience: 5,
          value: '0'
        }],
      },
      {
        block: '1001',
        ts: 1640000010000,
        chats: [{ 
          logIndex: 0, 
          content: 'Hello', 
          timestamp: '1640000010000', 
          senderId: 'player1', 
          senderName: 'Player1' 
        }],
        events: [],
      },
    ];

    const mockWhere = {
      equals: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue(mockStoredBlocks),
        and: jest.fn().mockReturnValue({
          delete: jest.fn().mockResolvedValue(0),
        }),
      }),
    };
    
    mockDb.dataBlocks.where.mockReturnValue(mockWhere as any);

    const { result } = renderHook(() => useCachedDataFeed(mockOwner, mockCharacterId), {
      wrapper: createWrapper(),
    });

    // Initially loading
    expect(result.current.isHistoryLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isHistoryLoading).toBe(false);
    });

    expect(result.current.historicalBlocks).toHaveLength(2);
    expect(result.current.processedBlocks.has('1000')).toBe(true);
    expect(result.current.processedBlocks.has('1001')).toBe(true);
    
    // Check that blocks are sorted by block number
    expect(result.current.historicalBlocks[0].blockNumber).toBe(1000n);
    expect(result.current.historicalBlocks[1].blockNumber).toBe(1001n);
  });

  it('should add new events to in-memory store', async () => {
    const { result } = renderHook(() => useCachedDataFeed(mockOwner, mockCharacterId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isHistoryLoading).toBe(false);
    });

    const newBlocks: CachedDataBlock[] = [
      {
        blockNumber: 2000n,
        timestamp: 1640001000000,
        chats: [],
        events: [{ 
          logType: 2, 
          index: 0, 
          mainPlayerIndex: 3, 
          otherPlayerIndex: 4,
          attackerName: 'Player3',
          defenderName: 'Player4',
          areaId: '5678',
          hit: false,
          critical: false,
          damageDone: 0,
          healthHealed: 0,
          targetDied: false,
          lootedWeaponID: 0,
          lootedArmorID: 0,
          experience: 0,
          value: '0'
        }],
      },
    ];

    act(() => {
      result.current.addNewEvents(newBlocks);
    });

    expect(result.current.historicalBlocks).toHaveLength(1);
    expect(result.current.processedBlocks.has('2000')).toBe(true);
    expect(result.current.historicalBlocks[0].blockNumber).toBe(2000n);
  });

  it('should not add duplicate blocks', async () => {
    const { result } = renderHook(() => useCachedDataFeed(mockOwner, mockCharacterId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isHistoryLoading).toBe(false);
    });

    const newBlocks: CachedDataBlock[] = [
      {
        blockNumber: 2000n,
        timestamp: 1640001000000,
        chats: [],
        events: [],
      },
    ];

    // Add blocks twice
    act(() => {
      result.current.addNewEvents(newBlocks);
    });

    act(() => {
      result.current.addNewEvents(newBlocks);
    });

    // Should still only have one block
    expect(result.current.historicalBlocks).toHaveLength(1);
    expect(result.current.processedBlocks.has('2000')).toBe(true);
  });

  it('should handle database errors gracefully', async () => {
    const mockWhere = {
      equals: jest.fn().mockReturnValue({
        toArray: jest.fn().mockRejectedValue(new Error('Database error')),
        and: jest.fn().mockReturnValue({
          delete: jest.fn().mockResolvedValue(0),
        }),
      }),
    };
    
    mockDb.dataBlocks.where.mockReturnValue(mockWhere as any);

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    const { result } = renderHook(() => useCachedDataFeed(mockOwner, mockCharacterId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isHistoryLoading).toBe(false);
    });

    expect(result.current.historicalBlocks).toEqual([]);
    expect(result.current.processedBlocks.size).toBe(0);
    expect(consoleSpy).toHaveBeenCalledWith(
      '[CachedDataFeed] Error loading initial blocks from Dexie:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});

describe('storeFeedData', () => {
  const mockOwner = '0x1234567890abcdef1234567890abcdef12345678';
  const mockCharacterId = 'char123';
  const mockDataFeeds = [
    {
      blockNumber: '1000',
      logs: [
        {
          index: 0n,
          logType: 1n,
          mainPlayerIndex: 1n,
          otherPlayerIndex: 2n,
          hit: true,
          critical: false,
          damageDone: 10n,
          healthHealed: 0n,
          targetDied: false,
          lootedWeaponID: 0n,
          lootedArmorID: 0n,
          experience: 5n,
          value: 0n,
        },
      ],
      chatLogs: [],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.dataBlocks.bulkPut.mockResolvedValue(undefined as any);
    mockDb.transaction.mockImplementation(async (mode, tables, callback) => {
      return await callback();
    });
  });

  it('should process and store new feed data', async () => {
    const processedBlocks = new Set<string>();
    const addNewEvents = jest.fn();

    const result = await storeFeedData(
      mockOwner,
      mockCharacterId,
      mockDataFeeds as any,
      [],
      [],
      1000n,
      Date.now(),
      processedBlocks,
      addNewEvents,
      1000n, // endBlock
      123n
    );

    expect(result).toHaveLength(1);
    expect(addNewEvents).toHaveBeenCalledWith(result);
    expect(mockDb.dataBlocks.bulkPut).toHaveBeenCalled();
  });

  it('should skip already processed blocks', async () => {
    const processedBlocks = new Set(['1000']); // Block already processed
    const addNewEvents = jest.fn();

    const result = await storeFeedData(
      mockOwner,
      mockCharacterId,
      mockDataFeeds as any,
      [],
      [],
      1000n,
      Date.now(),
      processedBlocks,
      addNewEvents,
      1000n // endBlock
    );

    expect(result).toHaveLength(0);
    expect(addNewEvents).not.toHaveBeenCalled();
    expect(mockDb.dataBlocks.bulkPut).not.toHaveBeenCalled();
  });

  it('should handle empty data feeds', async () => {
    const processedBlocks = new Set<string>();
    const addNewEvents = jest.fn();

    const result = await storeFeedData(
      mockOwner,
      mockCharacterId,
      [],
      [],
      [],
      1000n,
      Date.now(),
      processedBlocks,
      addNewEvents
    );

    expect(result).toHaveLength(0);
    expect(addNewEvents).not.toHaveBeenCalled();
    expect(mockDb.dataBlocks.bulkPut).not.toHaveBeenCalled();
  });

  it('should handle database storage errors', async () => {
    const processedBlocks = new Set<string>();
    const addNewEvents = jest.fn();
    
    mockDb.dataBlocks.bulkPut.mockRejectedValue(new Error('Storage error'));
    
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    const result = await storeFeedData(
      mockOwner,
      mockCharacterId,
      mockDataFeeds as any,
      [],
      [],
      1000n,
      Date.now(),
      processedBlocks,
      addNewEvents,
      1000n // endBlock
    );

    expect(result).toHaveLength(1);
    expect(addNewEvents).toHaveBeenCalled(); // Still adds to memory
    expect(consoleSpy).toHaveBeenCalledWith(
      '[storeFeedData] Dexie transaction failed:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});