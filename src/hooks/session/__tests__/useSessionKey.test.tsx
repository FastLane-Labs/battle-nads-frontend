import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { ZeroAddress } from 'ethers';
import { useSessionKey } from '../useSessionKey';
import { useWallet } from '../../../providers/WalletProvider';
import { createTestWrapper } from '../../../test/helpers';
import { sessionKeyMachine, SessionKeyState } from '../../../machines/sessionKeyMachine';
import { contract } from '../../../types';
import { useBattleNads } from '../../game/useBattleNads';

// Mock dependencies
jest.mock('../../../providers/WalletProvider');
jest.mock('../../../machines/sessionKeyMachine');
jest.mock('../../game/useBattleNads');

// Define default values
const ownerAddress = '0xOwnerAddress123';
const embeddedAddress = '0xEmbeddedAddress456';
const otherKeyAddress = '0xOtherKeyAddress789';

// --- Mock useBattleNads --- 
const mockUseBattleNads = useBattleNads as jest.Mock;
// -------------------------

describe('useSessionKey', () => {
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: React.ReactNode }) => JSX.Element;
  let mockValidate: jest.Mock;

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
  const missingKeyDataContract = createMockContractKeyData(ZeroAddress, 0n);
  const mismatchedKeyDataContract = createMockContractKeyData(otherKeyAddress, 9999n);
  // -------------------------
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } }, 
    });
    wrapper = createTestWrapper(queryClient);

    jest.clearAllMocks();
    queryClient.clear();
    
    mockValidate = sessionKeyMachine.validate as jest.Mock;
    mockValidate.mockReset();

    mockUseBattleNads.mockReset();
    mockUseBattleNads.mockReturnValue({
        rawSessionKeyData: validKeyDataContract,
        rawEndBlock: 500n,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
    });

    (useWallet as jest.Mock).mockReturnValue({
      injectedWallet: { address: ownerAddress }, 
      embeddedWallet: { address: embeddedAddress }
    });
  });
  
  it('should show loading state initially and transition to MISSING', async () => { 
    mockUseBattleNads.mockReturnValue({
        rawSessionKeyData: undefined,
        rawEndBlock: undefined,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
    });

    const { result } = renderHook(() => useSessionKey(characterId), { wrapper }); 
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
        expect(result.current.sessionKeyState).toBe(SessionKeyState.MISSING);
    });
    expect(result.current.isLoading).toBe(true);
  });

  it('should return valid state and data when queries succeed', async () => { 
    mockValidate.mockReturnValue(SessionKeyState.VALID);

    const { result } = renderHook(() => useSessionKey(characterId), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.sessionKeyState).toBe(SessionKeyState.VALID);
    });

    expect(result.current.sessionKeyData).toEqual(validKeyDataContract); 
    expect(result.current.currentBlock).toEqual(500);
    expect(result.current.error).toBeNull();
    expect(result.current.needsUpdate).toBe(false); 
    expect(mockValidate).toHaveBeenCalledWith(embeddedAddress, embeddedAddress, 9999, 500);
  });
  
  it('correctly identifies expired session key', async () => { 
    mockUseBattleNads.mockReturnValue({
        rawSessionKeyData: expiredKeyDataContract,
        rawEndBlock: 600n,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
    });
    mockValidate.mockReturnValue(SessionKeyState.EXPIRED);

    const { result } = renderHook(() => useSessionKey(characterId), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.sessionKeyState).toBe(SessionKeyState.EXPIRED);
    });

    expect(result.current.needsUpdate).toBe(true);
    expect(mockValidate).toHaveBeenCalledWith(embeddedAddress, embeddedAddress, 50, 600);
  });
  
  it('correctly identifies missing session key (zero address key)', async () => { 
    mockUseBattleNads.mockReturnValue({
        rawSessionKeyData: missingKeyDataContract,
        rawEndBlock: 500n,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
    });

    const { result } = renderHook(() => useSessionKey(characterId), { wrapper });

    await waitFor(() => {
      expect(result.current.sessionKeyState).toBe(SessionKeyState.MISSING);
    });
    
    expect(result.current.isLoading).toBe(false); 
    expect(result.current.sessionKeyData).toEqual(missingKeyDataContract); 
    expect(result.current.sessionKeyState).toBe(SessionKeyState.MISSING); 
    expect(result.current.needsUpdate).toBe(true);
    expect(mockValidate).not.toHaveBeenCalled();
  });

  it('correctly identifies missing session key (hook returns null/undefined data)', async () => { 
    mockUseBattleNads.mockReturnValue({
        rawSessionKeyData: null,
        rawEndBlock: 500n,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
    });

    const { result } = renderHook(() => useSessionKey(characterId), { wrapper });

    await waitFor(() => {
        expect(result.current.sessionKeyState).toBe(SessionKeyState.MISSING);
    });
    
    expect(result.current.isLoading).toBe(false); 
    expect(result.current.sessionKeyData).toBeNull(); 
    expect(result.current.sessionKeyState).toBe(SessionKeyState.MISSING); 
    expect(result.current.needsUpdate).toBe(true); 
    expect(mockValidate).not.toHaveBeenCalled();
  });
  
  it('correctly identifies mismatched session key', async () => { 
    mockUseBattleNads.mockReturnValue({
        rawSessionKeyData: mismatchedKeyDataContract,
        rawEndBlock: 500n,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
    });
    mockValidate.mockReturnValue(SessionKeyState.MISMATCH);

    const { result } = renderHook(() => useSessionKey(characterId), { wrapper });

    await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.sessionKeyState).toBe(SessionKeyState.MISMATCH);
    });

    expect(result.current.needsUpdate).toBe(true);
    expect(mockValidate).toHaveBeenCalledWith(otherKeyAddress, embeddedAddress, 9999, 500);
  });
  
  it('handles missing injected wallet address', async () => {
    // Mock useWallet to return null injectedWallet
    (useWallet as jest.Mock).mockReturnValue({
        injectedWallet: null, 
        embeddedWallet: { address: embeddedAddress }
    });
    // Mock useBattleNads to reflect its state when owner is null (likely idle/no data)
    mockUseBattleNads.mockReturnValue({
        rawSessionKeyData: undefined,
        rawEndBlock: undefined,
        isLoading: false, // Assume it doesn't load if owner is null
        error: null,
        refetch: jest.fn(),
    });

    const { result } = renderHook(() => useSessionKey(characterId), { wrapper });

    // Effect should determine hook is disabled and set state to IDLE
    await waitFor(() => {
      expect(result.current.sessionKeyState).toBe(SessionKeyState.IDLE); // Expect IDLE
    });

    expect(result.current.sessionKeyData).toBeUndefined();
    expect(result.current.isLoading).toBe(false); 
    expect(result.current.needsUpdate).toBe(false); // Needs update should be false for IDLE
    expect(mockValidate).not.toHaveBeenCalled();
  });
  
  it('handles missing client', async () => {
    // Mock useBattleNads to simulate an error state (e.g., client missing upstream)
    const mockError = new Error("Client unavailable in useBattleNads");
    mockUseBattleNads.mockReturnValue({
        rawSessionKeyData: undefined,
        rawEndBlock: undefined,
        isLoading: false, // Finished loading (with error)
        error: mockError.message, // Set error state
        refetch: jest.fn(),
    });

    // Mock useWallet to provide valid addresses
    (useWallet as jest.Mock).mockReturnValue({
      injectedWallet: { address: ownerAddress }, 
      embeddedWallet: { address: embeddedAddress }
    });

    const { result } = renderHook(() => useSessionKey(characterId), { wrapper });
    
    // State should transition to MISSING because the underlying snapshot hook has an error
    await waitFor(() => {
        expect(result.current.sessionKeyState).toBe(SessionKeyState.MISSING); // Expect MISSING
    });

    expect(result.current.sessionKeyData).toBeUndefined();
    expect(result.current.isLoading).toBe(false); 
    expect(result.current.error).toBe(mockError.message); // Check error is passed through
    expect(result.current.needsUpdate).toBe(true); // Needs update because state is MISSING
    expect(mockValidate).not.toHaveBeenCalled();
  });

  it('handles underlying snapshot error', async () => { 
    const mockError = new Error("Snapshot Fetch Failed");
    mockUseBattleNads.mockReturnValue({
        rawSessionKeyData: undefined,
        rawEndBlock: undefined,
        isLoading: false,
        error: mockError.message,
        refetch: jest.fn(),
    });

    const { result } = renderHook(() => useSessionKey(characterId), { wrapper });

    await waitFor(() => {
      expect(result.current.error).toBe(mockError.message);
      expect(result.current.sessionKeyState).toBe(SessionKeyState.MISSING);
    });

    expect(result.current.isLoading).toBe(false); 
    expect(result.current.sessionKeyData).toBeUndefined();
    expect(result.current.error).toBe(mockError.message);
    expect(result.current.sessionKeyState).toBe(SessionKeyState.MISSING); 
    expect(result.current.needsUpdate).toBe(true);
    expect(mockValidate).not.toHaveBeenCalled();
  });

}); 