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

// Mock viem
jest.mock('viem', () => ({
  createPublicClient: jest.fn(() => ({
    readContract: jest.fn(),
  })),
  http: jest.fn(),
  parseAbi: jest.fn(),
  toHex: jest.fn(),
  fromHex: jest.fn(),
  encodeFunctionData: jest.fn(),
  decodeFunctionResult: jest.fn(),
}));

// Now import the actual test dependencies
import { renderHook, waitFor } from '@testing-library/react';
import { useFrontendData } from '../useFrontendData';
import * as battleNadsService from '@services/battleNadsService';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useContracts } from '../contracts/useContracts';

// Mock dependencies
jest.mock('@services/battleNadsService');
jest.mock('../useContracts');

const mockPollFrontendData = battleNadsService.pollFrontendData as jest.Mock;
const mockUseContracts = useContracts as jest.Mock;

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

describe('useFrontendData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the contract hook
    mockUseContracts.mockReturnValue({
      readContract: { address: '0xcontract' },
      injectedContract: null,
      embeddedContract: null,
      error: null,
    });
    
    // Mock the service function
    mockPollFrontendData.mockResolvedValue({
      characterID: '0x123',
      character: { name: 'Test Character' },
      combatants: [],
      noncombatants: [],
    });
  });
  
  it('should return data from battleNadsService', async () => {
    const mockData = {
      characterID: '0x123',
      character: { name: 'Test Character' },
      combatants: [{ id: '1' }],
      noncombatants: [],
    };
    mockPollFrontendData.mockResolvedValue(mockData);
    
    const { result } = renderHook(
      () => useFrontendData('0xowner', { 
        refetchInterval: 0, 
        staleTime: 0,
        enabled: true 
      }), 
      { wrapper: createWrapper() }
    );
    
    // Initially in loading state
    expect(result.current.isLoading).toBe(true);
    
    // Wait for the query to resolve
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    
    // Check the data
    expect(result.current.data).toEqual(mockData);
    expect(mockPollFrontendData).toHaveBeenCalledWith(
      expect.anything(),
      { owner: '0xowner', startBlock: 0 }
    );
  });
  
  it('should handle error when contract is not initialized', async () => {
    mockUseContracts.mockReturnValue({
      readContract: null,
      injectedContract: null,
      embeddedContract: null,
      error: null,
    });
    
    const { result } = renderHook(
      () => useFrontendData('0xowner', { 
        refetchInterval: 0, 
        staleTime: 0,
        enabled: true 
      }), 
      { wrapper: createWrapper() }
    );
    
    // Query should not be enabled when contract is null
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isFetching).toBe(false);
    expect(mockPollFrontendData).not.toHaveBeenCalled();
  });
  
  it('should handle error when owner is not provided', async () => {
    const { result } = renderHook(
      () => useFrontendData(null, { 
        refetchInterval: 0, 
        staleTime: 0, 
        enabled: true 
      }), 
      { wrapper: createWrapper() }
    );
    
    // Query should not be enabled when owner is null
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isFetching).toBe(false);
    expect(mockPollFrontendData).not.toHaveBeenCalled();
  });
  
  it('should have polling disabled when enabled is false', async () => {
    const { result } = renderHook(
      () => useFrontendData('0xowner', { 
        refetchInterval: 1000, 
        staleTime: 500, 
        enabled: false 
      }), 
      { wrapper: createWrapper() }
    );
    
    // Query should not be enabled when enabled is false
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isFetching).toBe(false);
    expect(mockPollFrontendData).not.toHaveBeenCalled();
  });
  
  it('should handle service errors', async () => {
    mockPollFrontendData.mockRejectedValue(new Error('Service error'));
    
    const { result } = renderHook(
      () => useFrontendData('0xowner', { 
        refetchInterval: 0, 
        staleTime: 0, 
        enabled: true 
      }), 
      { wrapper: createWrapper() }
    );
    
    // Wait for the query to fail
    await waitFor(() => expect(result.current.isError).toBe(true));
    
    expect(result.current.error).toEqual(new Error('Service error'));
  });
}); 