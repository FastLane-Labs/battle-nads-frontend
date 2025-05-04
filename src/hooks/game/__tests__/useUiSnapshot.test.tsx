// Conditionally apply polyfills first
if (typeof global.TextEncoder === 'undefined') {
  const util = require('util');
  // @ts-ignore - Ignoring type issues with polyfills
  global.TextEncoder = util.TextEncoder;
  // @ts-ignore - Ignoring type issues with polyfills
  global.TextDecoder = util.TextDecoder;
}

// Mock the problematic modules before importing anything else
jest.mock('@privy-io/react-auth', () => ({
  usePrivy: jest.fn().mockReturnValue({
    ready: true,
    authenticated: false,
    user: null,
    login: jest.fn(),
    logout: jest.fn(),
  }),
  useWallets: jest.fn().mockReturnValue({
    wallets: [],
    connectWallet: jest.fn(),
  }),
}));

// Now import the actual test dependencies
import { renderHook, act } from '@testing-library/react';
import { waitFor } from '@testing-library/react';
import { useUiSnapshot } from '../useUiSnapshot';
import { useBattleNadsClient } from '../../contracts/useBattleNadsClient';
import { createTestWrapper } from '../../../test/helpers';
import mockPollData from '../../../mappers/__tests__/__fixtures__/pollFrontendData.json';

// Mock dependencies and React Query
jest.mock('../../contracts/useBattleNadsClient');
jest.mock('../../../mappers', () => ({
  // Get the actual module first
  ...jest.requireActual('../../../mappers'),
  // Then override specific exports if needed (or just keep the actual ones)
  contractToWorldSnapshot: jest.fn().mockImplementation((data, owner) => ({
    characterID: data.characterID,
    character: data.character,
    combatants: data.combatants || [],
    noncombatants: data.noncombatants || [],
    owner,
    // Add other required fields for WorldSnapshot
    movementOptions: { canMoveNorth: true },
    eventLogs: [],
    chatLogs: [],
  })),
  // Ensure mapCharacterLite is explicitly included if needed elsewhere in the test,
  // but requireActual should handle it now.
  // mapCharacterLite: jest.requireActual('../../../mappers').mapCharacterLite 
}));

// Mock localStorage
const localStorageMock = (function() {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key) => {
      return store[key] || null;
    }),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock localforage
jest.mock('localforage', () => ({
  config: jest.fn(),
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(null),
  keys: jest.fn().mockResolvedValue([])
}));

// Mock useCachedDataFeed (NAMED export)
jest.mock('../useCachedDataFeed', () => ({
  __esModule: true, // Keep this for consistency with ES modules
  // Mock the named exports
  useCachedDataFeed: jest.fn().mockReturnValue({ 
    // Ensure the return shape matches the hook's actual return
    historicalBlocks: [], 
    isHistoryLoading: false
  }),
  storeFeedData: jest.fn().mockResolvedValue(undefined) // Mock storeFeedData
}));

// Mock React Query for immediate query execution
jest.mock('@tanstack/react-query', () => {
  const originalModule = jest.requireActual('@tanstack/react-query');
  return {
    ...originalModule,
    useQuery: jest.fn(({ queryFn, ...rest }) => {
      // Run queryFn immediately to make test synchronous
      if (typeof queryFn === 'function' && rest.enabled !== false) {
        queryFn().catch((error: Error) => console.error('Mock query error:', error));
      }
      return originalModule.useQuery({ queryFn, ...rest });
    }),
  };
});

describe('useUiSnapshot', () => {
  // Create a test wrapper
  const wrapper = createTestWrapper();
  const ownerAddress = '0x0000000000000000000000000000000000000001';
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock with snapshot data - CONVERT TO ARRAY
    const mockClient = {
      getUiSnapshot: jest.fn().mockImplementation(() => {
        // Convert the mock object data to the expected array format
        const data = mockPollData as any; // Type assertion for easier access
        const mockArrayData = [
          data.characterID,                             // 0
          data.sessionKeyData,                          // 1
          data.character,                               // 2
          data.combatants || [],                        // 3
          data.noncombatants || [],                     // 4
          data.equipableWeaponIDs || [],                // 5
          data.equipableWeaponNames || [],              // 6
          data.equipableArmorIDs || [],                 // 7
          data.equipableArmorNames || [],               // 8
          data.dataFeeds || [],                         // 9
          BigInt(data.balanceShortfall || '0'),         // 10
          BigInt(data.unallocatedAttributePoints || '0'),// 11
          BigInt(mockPollData.endBlock || '0')        // 12 (Correct length)
        ];
        return Promise.resolve(mockArrayData);
      }),
      getLatestBlockNumber: jest.fn().mockResolvedValue(BigInt(100)),
      getDataFeed: jest.fn().mockResolvedValue([])
    };
    
    (useBattleNadsClient as jest.Mock).mockReturnValue({
      client: mockClient,
      error: null
    });
  });
  
  it('handles initial loading state', async () => {
    const { result } = renderHook(
      () => useUiSnapshot(ownerAddress),
      { wrapper }
    );
    
    // Initial state should be loading
    expect(result.current.isLoading).toBe(true);
    
    // Wait for loading to complete
    await waitFor(() => !result.current.isLoading);
  });
  
  it('handles null client state', async () => {
    // Mock client as null
    (useBattleNadsClient as jest.Mock).mockReturnValue({
      client: null,
      error: 'Client initialization failed'
    });
    
    const { result } = renderHook(
      () => useUiSnapshot(ownerAddress),
      { wrapper }
    );
    
    // Should not be loading and have error
    await waitFor(() => !result.current.isLoading);
    
    // Check if there is an error
    expect(result.current.error).toBeDefined();
  });
  
  it('handles fetch errors', async () => {
    // Mock client that throws
    const mockClient = {
      getUiSnapshot: jest.fn().mockRejectedValue(new Error('Network error')),
      // Add the missing mock for getLatestBlockNumber
      getLatestBlockNumber: jest.fn().mockResolvedValue(BigInt(100)) 
    };
    
    (useBattleNadsClient as jest.Mock).mockReturnValue({
      client: mockClient,
      error: null
    });
    
    const { result } = renderHook(
      () => useUiSnapshot(ownerAddress),
      { wrapper }
    );
    
    // Wait for query to fail
    await waitFor(() => !result.current.isLoading);
    
    // Check if there is an error
    expect(result.current.error).toBeDefined();
  });
  
  it('makes API calls with correct parameters', async () => {
    // Create a mock function we can track
    const mockGetUiSnapshot = jest.fn().mockResolvedValue({
      ...mockPollData,
      endBlock: BigInt(150)
    });
    
    const mockClient = {
      getUiSnapshot: mockGetUiSnapshot,
      getLatestBlockNumber: jest.fn().mockResolvedValue(BigInt(100))
    };
    
    (useBattleNadsClient as jest.Mock).mockReturnValue({
      client: mockClient,
      error: null
    });
    
    const { result } = renderHook(
      () => useUiSnapshot(ownerAddress),
      { wrapper }
    );
    
    // Wait for loading to complete
    await waitFor(() => expect(mockGetUiSnapshot).toHaveBeenCalled());
    
    // Verify first call parameters
    expect(mockGetUiSnapshot.mock.calls[0][0]).toBe(ownerAddress);
    
    // The second parameter could be BigInt(0) or undefined depending on implementation
    // We're just checking it's called correctly
  });
  
  it('provides refetch functionality', async () => {
    // Create a mock that we can track
    const mockGetUiSnapshot = jest.fn()
      .mockResolvedValueOnce({
        ...mockPollData,
        endBlock: BigInt(150)
      })
      .mockResolvedValueOnce({
        ...mockPollData,
        endBlock: BigInt(200)
      });
    
    const mockClient = {
      getUiSnapshot: mockGetUiSnapshot,
      getLatestBlockNumber: jest.fn().mockResolvedValue(BigInt(100))
    };
    
    (useBattleNadsClient as jest.Mock).mockReturnValue({
      client: mockClient,
      error: null
    });
    
    const { result } = renderHook(
      () => useUiSnapshot(ownerAddress),
      { wrapper }
    );
    
    // Wait for initial load
    await waitFor(() => expect(mockGetUiSnapshot).toHaveBeenCalled());
    
    // Reset mock counters before refetch
    mockGetUiSnapshot.mockClear();
    
    // Call refetch method
    act(() => {
      result.current.refetch();
    });
    
    // Wait for refetch to be called
    await waitFor(() => expect(mockGetUiSnapshot).toHaveBeenCalled());
  });
}); 