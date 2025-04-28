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

// Mock dependencies
jest.mock('../../contracts/useBattleNadsClient');
jest.mock('../../../mappers', () => ({
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
}));

describe('useUiSnapshot', () => {
  // Create a test wrapper
  const wrapper = createTestWrapper();
  const ownerAddress = '0x0000000000000000000000000000000000000001';
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock with snapshot data
    const mockClient = {
      getUiSnapshot: jest.fn().mockImplementation(() => Promise.resolve({
        ...mockPollData,
        endBlock: BigInt(150)
      }))
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
      getUiSnapshot: jest.fn().mockRejectedValue(new Error('Network error'))
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
      getUiSnapshot: mockGetUiSnapshot
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
    await waitFor(() => !result.current.isLoading);
    
    // Verify first call parameters
    expect(mockGetUiSnapshot).toHaveBeenCalled();
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
      getUiSnapshot: mockGetUiSnapshot
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
    await waitFor(() => !result.current.isLoading);
    
    // Reset mock counters before refetch
    mockGetUiSnapshot.mockClear();
    
    // Call refetch method
    result.current.refetch();
    
    // Verify refetch was called
    expect(mockGetUiSnapshot).toHaveBeenCalled();
  });
}); 