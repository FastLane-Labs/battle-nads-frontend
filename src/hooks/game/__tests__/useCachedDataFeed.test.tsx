import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCachedDataFeed, storeEventData, CachedDataBlock } from '../useCachedDataFeed';
import { db } from '../../../lib/db';

// Mock the database
jest.mock('../../../lib/db', () => ({
  db: {
    events: {
      where: jest.fn(),
      add: jest.fn(),
      put: jest.fn(),
    },
    chatMessages: {
      where: jest.fn(),
      add: jest.fn(),
      put: jest.fn(),
    },
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
    
    // Mock the database query chain for events and chatMessages
    const mockWhere = {
      equals: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([]),
        and: jest.fn().mockReturnValue({
          delete: jest.fn().mockResolvedValue(0),
        }),
      }),
    };
    
    // Mock all database tables
    (mockDb.events.where as jest.Mock).mockReturnValue(mockWhere as any);
    (mockDb.chatMessages.where as jest.Mock).mockReturnValue(mockWhere as any);
    (mockDb.dataBlocks.where as jest.Mock).mockReturnValue(mockWhere as any);
    (mockDb.characters.put as jest.Mock).mockResolvedValue(undefined as any);
    (mockDb.transaction as jest.Mock).mockImplementation(async (mode: any, tables: any, callback: any) => {
      return await callback();
    });
  });

  it('should initialize with empty state when no owner or characterId', () => {
    const { result } = renderHook(() => useCachedDataFeed(null, null), {
      wrapper: createWrapper(),
    });

    expect(result.current.historicalBlocks).toEqual([]);
    expect(result.current.isHistoryLoading).toBe(false);
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
    
    (mockDb.dataBlocks.where as jest.Mock).mockReturnValue(mockWhere as any);

    const { result } = renderHook(() => useCachedDataFeed(mockOwner, mockCharacterId), {
      wrapper: createWrapper(),
    });

    // Initially loading
    expect(result.current.isHistoryLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isHistoryLoading).toBe(false);
    });

    expect(result.current.historicalBlocks).toHaveLength(2);
    
    // Check that blocks are sorted by block number
    expect(result.current.historicalBlocks[0].blockNumber).toBe(1000n);
    expect(result.current.historicalBlocks[1].blockNumber).toBe(1001n);
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
    
    (mockDb.dataBlocks.where as jest.Mock).mockReturnValue(mockWhere as any);

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    const { result } = renderHook(() => useCachedDataFeed(mockOwner, mockCharacterId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isHistoryLoading).toBe(false);
    });

    expect(result.current.historicalBlocks).toEqual([]);
    expect(consoleSpy).toHaveBeenCalledWith(
      '[CachedDataFeed] Error loading initial events from storage:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});

describe('storeEventData', () => {
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
    (mockDb.events.add as jest.Mock).mockResolvedValue(undefined as any);
    (mockDb.chatMessages.add as jest.Mock).mockResolvedValue(undefined as any);
    
    // Mock first() to return null (no existing events)
    const mockWhere = {
      equals: jest.fn().mockReturnValue({
        first: jest.fn().mockResolvedValue(null),
      }),
    };
    (mockDb.events.where as jest.Mock).mockReturnValue(mockWhere as any);
    (mockDb.chatMessages.where as jest.Mock).mockReturnValue(mockWhere as any);
    
    (mockDb.transaction as jest.Mock).mockImplementation(async (mode: any, tables: any, callback: any) => {
      return await callback();
    });
  });

  it('should process and store new event data', async () => {
    const result = await storeEventData(
      mockOwner,
      mockCharacterId,
      mockDataFeeds as any,
      [],
      [],
      1000n,
      Date.now(),
      123n, // playerAreaId
      undefined, // mainPlayerCharacter
      1000n // endBlock
    );

    expect(result.storedEvents).toBe(1);
    expect(result.storedChatMessages).toBe(0);
    expect(mockDb.events.add).toHaveBeenCalled();
  });

  it('should handle empty data feeds', async () => {
    const result = await storeEventData(
      mockOwner,
      mockCharacterId,
      [],
      [],
      [],
      1000n,
      Date.now()
    );

    expect(result.storedEvents).toBe(0);
    expect(result.storedChatMessages).toBe(0);
    expect(mockDb.events.add).not.toHaveBeenCalled();
  });

  it('should handle database storage errors', async () => {
    (mockDb.events.add as jest.Mock).mockRejectedValue(new Error('Storage error'));
    
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    const result = await storeEventData(
      mockOwner,
      mockCharacterId,
      mockDataFeeds as any,
      [],
      [],
      1000n,
      Date.now(),
      123n,
      undefined,
      1000n
    );

    expect(result.storedEvents).toBe(0);
    expect(result.storedChatMessages).toBe(0);
    expect(consoleSpy).toHaveBeenCalledWith(
      '[storeEventData] Error storing event data:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});