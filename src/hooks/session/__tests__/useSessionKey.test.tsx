import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { useSessionKey } from '../useSessionKey';
import { useBattleNadsClient } from '../../contracts/useBattleNadsClient';
import { useWallet } from '../../../providers/WalletProvider';
import { createTestWrapper } from '../../../test/helpers';
import { sessionKeyMachine, SessionKeyState } from '../../../machines/sessionKeyMachine';

// Mock dependencies
jest.mock('../../contracts/useBattleNadsClient');
jest.mock('../../../providers/WalletProvider');
jest.mock('../../../machines/sessionKeyMachine');

// Setup mock implementations of the dependencies
const mockValidate = jest.fn();
(sessionKeyMachine.validate as jest.Mock) = mockValidate;

// Define default values
const ownerAddress = '0x0000000000000000000000000000000000000001';
const embeddedAddress = '0x0000000000000000000000000000000000000002'; // Use a different address for clarity

// --- Mock client methods --- 
const mockGetCurrentSessionKeyData = jest.fn();
const mockGetLatestBlockNumber = jest.fn();
const mockClient = {
  getCurrentSessionKeyData: mockGetCurrentSessionKeyData,
  getLatestBlockNumber: mockGetLatestBlockNumber,
  // Add other methods if useSessionKey starts using them
};
// -------------------------

describe('useSessionKey', () => {
  // Use a new QueryClient for each test to avoid interference
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: React.ReactNode }) => JSX.Element;

  const characterId = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

  // Sample session key data for different states
  const validSessionKeyData = { key: embeddedAddress, expiration: BigInt(1000) }; // Match embedded address
  const expiredSessionKeyData = { key: embeddedAddress, expiration: BigInt(50) };
  const missingSessionKeyData = { key: '0x0000000000000000000000000000000000000000', expiration: BigInt(0) };
  const mismatchedSessionKeyData = { key: '0xDifferentKeyAddress123', expiration: BigInt(1000) };
  
  beforeEach(() => {
    // Create new client & wrapper for isolation
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } }, // Keep retry false, gcTime 0 for tests
    });
    wrapper = createTestWrapper(queryClient);

    // Clear mocks and cache
    jest.clearAllMocks();
    queryClient.clear(); // Clear react-query cache
    mockValidate.mockReset();
    mockGetCurrentSessionKeyData.mockReset();
    mockGetLatestBlockNumber.mockReset();
    
    // Set default hook mocks
    (useBattleNadsClient as jest.Mock).mockReturnValue({ client: mockClient });
    (useWallet as jest.Mock).mockReturnValue({
      // Provide both wallets now
      injectedWallet: { address: ownerAddress }, 
      embeddedWallet: { address: embeddedAddress }
    });
    
    // Default mock implementations for client methods (resolve successfully)
    mockGetCurrentSessionKeyData.mockResolvedValue(validSessionKeyData);
    mockGetLatestBlockNumber.mockResolvedValue(BigInt(500)); // Return BigInt
  });
  
  it('should show loading state initially', () => {
    // Don't resolve promises immediately
    mockGetCurrentSessionKeyData.mockImplementation(() => new Promise(() => {})); // Pending promise
    mockGetLatestBlockNumber.mockImplementation(() => new Promise(() => {})); // Pending promise

    const { result } = renderHook(() => useSessionKey(characterId), { wrapper }); 
    expect(result.current.isLoading).toBe(true);
  });

  it('should return correct data and valid state when queries succeed', async () => { 
    mockGetCurrentSessionKeyData.mockResolvedValue(validSessionKeyData);
    mockGetLatestBlockNumber.mockResolvedValue(BigInt(500));
    mockValidate.mockReturnValue(SessionKeyState.VALID);

    const { result } = renderHook(() => useSessionKey(characterId), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.sessionKey).toEqual(validSessionKeyData);
    expect(result.current.currentBlock).toEqual(500);
    expect(result.current.sessionKeyState).toBe(SessionKeyState.VALID);
    expect(result.current.needsUpdate).toBe(false);
    expect(result.current.error).toBeNull();

    // Test refetch - Note: refreshSessionKey comes from useQuery for sessionKey data
    const originalFetchCount = mockGetCurrentSessionKeyData.mock.calls.length;
    result.current.refreshSessionKey();
    await waitFor(() => {
        expect(mockGetCurrentSessionKeyData.mock.calls.length).toBeGreaterThan(originalFetchCount);
    });
  });
  
  it('correctly identifies expired session key', async () => { 
    mockGetCurrentSessionKeyData.mockResolvedValue(expiredSessionKeyData);
    mockGetLatestBlockNumber.mockResolvedValue(BigInt(600)); // Block > expiration
    mockValidate.mockReturnValue(SessionKeyState.EXPIRED);

    const { result } = renderHook(() => useSessionKey(characterId), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.sessionKeyState).toBe(SessionKeyState.EXPIRED);
    expect(result.current.needsUpdate).toBe(true);
  });
  
  it('correctly identifies missing session key (zero address key)', async () => { 
    mockGetCurrentSessionKeyData.mockResolvedValue(missingSessionKeyData);
    mockGetLatestBlockNumber.mockResolvedValue(BigInt(500));
    mockValidate.mockReturnValue(SessionKeyState.MISSING);

    const { result } = renderHook(() => useSessionKey(characterId), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.sessionKeyState).toBe(SessionKeyState.MISSING);
    expect(result.current.needsUpdate).toBe(true);
  });

  it('correctly identifies missing session key (client returns null/undefined)', async () => { 
    // Simulate the client method resolving to null/undefined
    mockGetCurrentSessionKeyData.mockResolvedValue(undefined);
    mockGetLatestBlockNumber.mockResolvedValue(BigInt(500));
    // Validation might not run or might return missing

    const { result } = renderHook(() => useSessionKey(characterId), { wrapper });

    await waitFor(() => {
        // isLoading should become false even if data is undefined
        expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.sessionKey).toBeNull(); // Check for null instead of undefined
    // Determine expected state based on hook logic when sessionKey is null
    expect(result.current.sessionKeyState).toBe(SessionKeyState.MISSING); 
    expect(result.current.needsUpdate).toBe(true); // Missing state implies update needed
  });
  
  it('correctly identifies mismatched session key', async () => { 
    mockGetCurrentSessionKeyData.mockResolvedValue(mismatchedSessionKeyData);
    mockGetLatestBlockNumber.mockResolvedValue(BigInt(500));
    mockValidate.mockReturnValue(SessionKeyState.MISMATCH);

    const { result } = renderHook(() => useSessionKey(characterId), { wrapper });

    await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.sessionKeyState).toBe(SessionKeyState.MISMATCH);
    expect(result.current.needsUpdate).toBe(true);
  });
  
  it('handles missing injected wallet address (query disabled)', async () => {
    // Mock useWallet to return no injected address
    (useWallet as jest.Mock).mockReturnValue({
        injectedWallet: null, // No owner
        embeddedWallet: { address: embeddedAddress }
    });

    const { result } = renderHook(() => useSessionKey(characterId), { wrapper });

    // Give time for potential state changes, though query should be disabled
    await new Promise(resolve => setTimeout(resolve, 50)); 

    expect(result.current.sessionKey).toBeUndefined();
    // Block number query might still run if enabled only by client
    // Assert based on actual hook logic for disabled state
    expect(result.current.isLoading).toBe(false); // Should not be loading if query is disabled
    expect(result.current.sessionKeyState).toBe(SessionKeyState.IDLE);
    expect(result.current.needsUpdate).toBe(false);
  });
  
  it('handles missing client (query disabled)', async () => {
    // Mock useBattleNadsClient to return no client
    (useBattleNadsClient as jest.Mock).mockReturnValue({ client: null });
    (useWallet as jest.Mock).mockReturnValue({
        injectedWallet: { address: ownerAddress }, 
        embeddedWallet: { address: embeddedAddress }
    });

    const { result } = renderHook(() => useSessionKey(characterId), { wrapper });

    await new Promise(resolve => setTimeout(resolve, 50)); 

    expect(result.current.sessionKey).toBeUndefined();
    expect(result.current.isLoading).toBe(false); // Query should be disabled
    expect(result.current.sessionKeyState).toBe(SessionKeyState.IDLE);
    expect(result.current.needsUpdate).toBe(false);
  });
  
  it('handles session key query error', async () => { 
    const mockError = new Error("Session Key Fetch Failed");
    mockGetCurrentSessionKeyData.mockRejectedValue(mockError);
    mockGetLatestBlockNumber.mockResolvedValue(BigInt(500)); // Block query OK

    const { result } = renderHook(() => useSessionKey(characterId), { wrapper });

    await waitFor(() => {
        // isFetching is true during error state initially, isLoading might be false
        // Let's check error state instead
        expect(result.current.error).toBe(mockError.message);
    });

    expect(result.current.isLoading).toBe(false); // Query finished (with error)
    expect(result.current.sessionKey).toBeUndefined();
    expect(result.current.error).toBe(mockError.message);
    // Determine expected state based on hook logic during error
    expect(result.current.sessionKeyState).toBe(SessionKeyState.MISSING); // Or potentially IDLE if error prevents fetch
    expect(result.current.needsUpdate).toBe(true); // Missing implies update needed
  });

}); 