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
import { renderHook } from '@testing-library/react';
import { useUiSnapshot } from '../useUiSnapshot';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useBattleNadsClient } from '../../contracts/useBattleNadsClient';
import { act } from 'react';

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

const mockUseBattleNadsClient = useBattleNadsClient as jest.Mock;
const mockGetUiSnapshot = jest.fn();

// Create a wrapper for the React Query provider
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useUiSnapshot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the contract hook
    mockUseBattleNadsClient.mockReturnValue({
      client: {
        getUiSnapshot: mockGetUiSnapshot
      },
      error: null,
    });
    
    // Mock the getUiSnapshot function
    mockGetUiSnapshot.mockResolvedValue({
      characterID: '0x123',
      character: { name: 'Test Character' },
      combatants: [],
      noncombatants: [],
      endBlock: "100"
    });
  });
  
  it('should return data with raw and mapped structure', async () => {
    const mockRawData = {
      characterID: '0x123',
      character: { name: 'Test Character' },
      combatants: [{ id: '1' }],
      noncombatants: [],
      endBlock: "100"
    };
    mockGetUiSnapshot.mockResolvedValue(mockRawData);
    
    const { result } = renderHook(
      () => useUiSnapshot('0xowner'), 
      { wrapper: createWrapper() }
    );
    
    // Immediately after rendering, the query should be in loading state
    expect(result.current.isLoading).toBe(true);
    
    // Wait for the promise to resolve
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    // Now the data should be available
    expect(result.current.data).toBeDefined();
    expect(result.current.data?.raw).toEqual(mockRawData);
    expect(result.current.data?.data).toBeDefined();
    expect(result.current.data?.data.__ts).toBeDefined(); // Should have timestamp
    
    expect(mockGetUiSnapshot).toHaveBeenCalledWith('0xowner', BigInt(0));
  });
  
  it('should handle error when client is not initialized', async () => {
    mockUseBattleNadsClient.mockReturnValue({
      client: null,
      error: null,
    });
    
    const { result } = renderHook(
      () => useUiSnapshot('0xowner'), 
      { wrapper: createWrapper() }
    );
    
    // Query should not be enabled when client is null
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isFetching).toBe(false);
    expect(mockGetUiSnapshot).not.toHaveBeenCalled();
  });
  
  it('should handle error when owner is not provided', async () => {
    const { result } = renderHook(
      () => useUiSnapshot(null), 
      { wrapper: createWrapper() }
    );
    
    // Query should not be enabled when owner is null
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isFetching).toBe(false);
    expect(mockGetUiSnapshot).not.toHaveBeenCalled();
  });
  
  it('should handle service errors', async () => {
    mockGetUiSnapshot.mockRejectedValue(new Error('Service error'));
    
    const { result } = renderHook(
      () => useUiSnapshot('0xowner'), 
      { wrapper: createWrapper() }
    );
    
    // Initially in loading state
    expect(result.current.isLoading).toBe(true);
    
    // Wait for the promise to reject
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    // Now we should have an error
    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBeDefined();
  });
}); 