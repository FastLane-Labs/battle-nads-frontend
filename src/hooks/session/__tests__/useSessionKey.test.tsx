import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { ZeroAddress } from 'ethers';
import { useSessionKey } from '../useSessionKey';
import { useBattleNadsClient } from '../../contracts/useBattleNadsClient';
import { useWallet } from '../../../providers/WalletProvider';
import { createTestWrapper } from '../../../test/helpers';
import { sessionKeyMachine, SessionKeyState } from '../../../machines/sessionKeyMachine';
import { contract } from '../../../types';

// Mock dependencies
jest.mock('../../contracts/useBattleNadsClient');
jest.mock('../../../providers/WalletProvider');
// Mock the entire machine module
jest.mock('../../../machines/sessionKeyMachine');

// Define default values
const ownerAddress = '0xOwnerAddress123';
const embeddedAddress = '0xEmbeddedAddress456';
const otherKeyAddress = '0xOtherKeyAddress789';

// --- Mock client methods --- 
const mockGetCurrentSessionKeyData = jest.fn();
const mockGetLatestBlockNumber = jest.fn();
const mockClient = {
  getCurrentSessionKeyData: mockGetCurrentSessionKeyData,
  getLatestBlockNumber: mockGetLatestBlockNumber,
};
// -------------------------

describe('useSessionKey', () => {
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: React.ReactNode }) => JSX.Element;
  let mockValidate: jest.Mock; // Declare type for the mock function reference

  const characterId = '0xCharId123';

  // Helper to create mock contract session key data
  const createMockContractKeyData = (
    key: string,
    expiration: bigint,
    owner: string = ownerAddress,
    balance: bigint = 10n**18n, // 1 MON
    targetBalance: bigint = 10n**18n,
    ownerCommittedAmount: bigint = 5n * 10n**18n, // 5 MON
    ownerCommittedShares: bigint = 5n * 10n**18n // Assuming 1:1 share for simplicity
  ): contract.SessionKeyData => ({
    owner,
    key,
    balance,
    targetBalance,
    ownerCommittedAmount,
    ownerCommittedShares,
    expiration,
  });

  // --- Test Data Variants ---
  const validKeyDataContract = createMockContractKeyData(embeddedAddress, 9999n);
  const expiredKeyDataContract = createMockContractKeyData(embeddedAddress, 50n);
  const missingKeyDataContract = createMockContractKeyData(ZeroAddress, 0n); // Key is ZeroAddress
  const mismatchedKeyDataContract = createMockContractKeyData(otherKeyAddress, 9999n); // Different key address
  // -------------------------
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } }, 
    });
    wrapper = createTestWrapper(queryClient);

    jest.clearAllMocks();
    queryClient.clear();
    
    // Get a reference to the mocked validate function *after* mocks are set up
    // and cast it correctly.
    mockValidate = sessionKeyMachine.validate as jest.Mock;
    mockValidate.mockReset(); // Reset the mock before each test

    mockGetCurrentSessionKeyData.mockReset();
    mockGetLatestBlockNumber.mockReset();
    
    (useBattleNadsClient as jest.Mock).mockReturnValue({ client: mockClient });
    (useWallet as jest.Mock).mockReturnValue({
      injectedWallet: { address: ownerAddress }, 
      embeddedWallet: { address: embeddedAddress }
    });
    
    // Default mocks for successful resolution
    mockGetCurrentSessionKeyData.mockResolvedValue(validKeyDataContract);
    mockGetLatestBlockNumber.mockResolvedValue(500n); 
  });
  
  it('should show loading state initially and transition to MISSING', async () => { 
    mockGetCurrentSessionKeyData.mockImplementation(() => new Promise(() => {}));
    mockGetLatestBlockNumber.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useSessionKey(characterId), { wrapper }); 
    // Check initial loading flags
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isFetching).toBe(true);
    // Initial state before effect is IDLE, but effect runs quickly

    // Wait for the effect to run and set state to MISSING due to loading
    await waitFor(() => {
        expect(result.current.sessionKeyState).toBe(SessionKeyState.MISSING);
    });
    // Queries are still pending, so loading flags remain true
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isFetching).toBe(true);
  });

  it('should return valid state and data when queries succeed', async () => { 
    mockGetCurrentSessionKeyData.mockResolvedValue(validKeyDataContract);
    mockGetLatestBlockNumber.mockResolvedValue(500n);
    mockValidate.mockReturnValue(SessionKeyState.VALID); // Mock machine result

    const { result } = renderHook(() => useSessionKey(characterId), { wrapper });

    // Wait for loading to finish AND state to become VALID
    await waitFor(() => {
      // Check that *both* loading and fetching are false, and state is VALID
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isFetching).toBe(false);
      expect(result.current.sessionKeyState).toBe(SessionKeyState.VALID);
    });

    // Assert final values now that state is stable
    expect(result.current.sessionKey).toEqual(validKeyDataContract); 
    expect(result.current.currentBlock).toEqual(500);
    expect(result.current.error).toBeNull();
    expect(result.current.needsUpdate).toBe(false); 
    expect(mockValidate).toHaveBeenCalledWith(embeddedAddress, embeddedAddress, 9999, 500);
  });
  
  it('correctly identifies expired session key', async () => { 
    mockGetCurrentSessionKeyData.mockResolvedValue(expiredKeyDataContract);
    mockGetLatestBlockNumber.mockResolvedValue(600n); // Block > expiration
    mockValidate.mockReturnValue(SessionKeyState.EXPIRED);

    const { result } = renderHook(() => useSessionKey(characterId), { wrapper });

    // Wait for loading to finish AND state to become EXPIRED
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isFetching).toBe(false);
      expect(result.current.sessionKeyState).toBe(SessionKeyState.EXPIRED);
    });

    expect(result.current.needsUpdate).toBe(true);
    expect(mockValidate).toHaveBeenCalledWith(embeddedAddress, embeddedAddress, 50, 600);
  });
  
  it('correctly identifies missing session key (zero address key)', async () => { 
    mockGetCurrentSessionKeyData.mockResolvedValue(missingKeyDataContract); 
    mockGetLatestBlockNumber.mockResolvedValue(500n);

    const { result } = renderHook(() => useSessionKey(characterId), { wrapper });

    // Wait for the state to become MISSING 
    await waitFor(() => {
      expect(result.current.sessionKeyState).toBe(SessionKeyState.MISSING);
    });
    
    // Also wait for fetching to complete
    await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
    });

    // Assert final state 
    expect(result.current.isLoading).toBe(false); 
    expect(result.current.sessionKey).toEqual(missingKeyDataContract); 
    expect(result.current.sessionKeyState).toBe(SessionKeyState.MISSING); 
    expect(result.current.needsUpdate).toBe(true);
    expect(mockValidate).not.toHaveBeenCalled(); 
  });

  it('correctly identifies missing session key (client returns null/undefined)', async () => { 
    mockGetCurrentSessionKeyData.mockResolvedValue(null); 
    mockGetLatestBlockNumber.mockResolvedValue(500n);

    const { result } = renderHook(() => useSessionKey(characterId), { wrapper });

    // Wait for state to become MISSING
    await waitFor(() => {
        expect(result.current.sessionKeyState).toBe(SessionKeyState.MISSING);
    });
    
    // Also wait for fetching to complete
     await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
     }, { timeout: 2000 });

    // Assert final state
    expect(result.current.isLoading).toBe(false); 
    expect(result.current.sessionKey).toBeNull(); 
    expect(result.current.sessionKeyState).toBe(SessionKeyState.MISSING); 
    expect(result.current.needsUpdate).toBe(true); 
    expect(mockValidate).not.toHaveBeenCalled();
  });
  
  it('correctly identifies mismatched session key', async () => { 
    mockGetCurrentSessionKeyData.mockResolvedValue(mismatchedKeyDataContract);
    mockGetLatestBlockNumber.mockResolvedValue(500n);
    mockValidate.mockReturnValue(SessionKeyState.MISMATCH);

    const { result } = renderHook(() => useSessionKey(characterId), { wrapper });

    // Wait for loading to finish and state to become MISMATCH
    await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isFetching).toBe(false);
        expect(result.current.sessionKeyState).toBe(SessionKeyState.MISMATCH);
    });

    expect(result.current.needsUpdate).toBe(true);
    expect(mockValidate).toHaveBeenCalledWith(otherKeyAddress, embeddedAddress, 9999, 500);
  });
  
  it('handles missing injected wallet address (query disabled)', async () => {
    (useWallet as jest.Mock).mockReturnValue({
        injectedWallet: null, 
        embeddedWallet: { address: embeddedAddress }
    });
    // Also ensure client mock is present but queries depending on injectedWallet are disabled
    (useBattleNadsClient as jest.Mock).mockReturnValue({ client: mockClient });

    const { result } = renderHook(() => useSessionKey(characterId), { wrapper });

    // State should be IDLE immediately and stay that way
    expect(result.current.sessionKeyState).toBe(SessionKeyState.IDLE); 
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); }); // Tick for effect
    expect(result.current.sessionKeyState).toBe(SessionKeyState.IDLE); 

    expect(result.current.sessionKey).toBeUndefined();
    // isLoading depends on BOTH queries, currentBlock query might still be loading if client exists
    // Let's wait for isFetching to be definitively false
    await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
    });
    expect(result.current.isLoading).toBe(false); // Now loading should also be false
    expect(result.current.needsUpdate).toBe(false);
    expect(mockValidate).not.toHaveBeenCalled();
  });
  
  it('handles missing client (query disabled)', async () => {
    (useBattleNadsClient as jest.Mock).mockReturnValue({ client: null }); // No client
    (useWallet as jest.Mock).mockReturnValue({
        injectedWallet: { address: ownerAddress }, 
        embeddedWallet: { address: embeddedAddress }
    });

    const { result } = renderHook(() => useSessionKey(characterId), { wrapper });
    
    // State should be IDLE immediately and stay that way
    expect(result.current.sessionKeyState).toBe(SessionKeyState.IDLE); 
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); }); // Tick for effect
    expect(result.current.sessionKeyState).toBe(SessionKeyState.IDLE); 

    expect(result.current.sessionKey).toBeUndefined();
    expect(result.current.isLoading).toBe(false); // No client -> queries disabled
    expect(result.current.isFetching).toBe(false); 
    expect(result.current.needsUpdate).toBe(false);
    expect(mockValidate).not.toHaveBeenCalled();
  });
  
  it('handles session key query error', async () => { 
    const mockError = new Error("Session Key Fetch Failed");
    mockGetCurrentSessionKeyData.mockRejectedValue(mockError);
    mockGetLatestBlockNumber.mockResolvedValue(500n); 

    const { result } = renderHook(() => useSessionKey(characterId), { wrapper });

    // Wait until error is set AND state becomes MISSING
    await waitFor(() => {
      expect(result.current.error).toBe(mockError.message);
      expect(result.current.sessionKeyState).toBe(SessionKeyState.MISSING);
    });

    // Assert final state
    expect(result.current.isLoading).toBe(false); 
    expect(result.current.isFetching).toBe(false); // Fetch finished with error
    expect(result.current.sessionKey).toBeUndefined(); // No data because of error
    expect(result.current.error).toBe(mockError.message);
    expect(result.current.sessionKeyState).toBe(SessionKeyState.MISSING); 
    expect(result.current.needsUpdate).toBe(true); 
    expect(mockValidate).not.toHaveBeenCalled();
  });

}); 