import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ZeroAddress } from 'ethers';
import { useSessionKey } from '../useSessionKey';
import { useWallet } from '../../../providers/WalletProvider';
import { createTestWrapper } from '../../../test/helpers';
import { sessionKeyMachine, SessionKeyState } from '../../../machines/sessionKeyMachine';
import { contract } from '../../../types';
import { useBattleNads } from '../../game/useBattleNads';
import { mockSessionKeyData } from '@/test/helpers';

// Mock dependencies
jest.mock('../../game/useBattleNads');
jest.mock('../../../providers/WalletProvider');
jest.mock('../../../machines/sessionKeyMachine');

// Define default values
const ownerAddress = '0xOwnerAddress123';
const embeddedAddress = '0xEmbeddedAddress456';
const otherKeyAddress = '0xOtherKeyAddress789';

// --- Mock useBattleNads --- 
const mockUseBattleNads = useBattleNads as jest.Mock;
// -------------------------

// Type safety for mocks
const mockUseWallet = useWallet as jest.Mock; 

// Default mock return values (can be overridden in tests)
const defaultUseBattleNadsReturn = {
  rawSessionKeyData: undefined,
  rawEndBlock: 0n,
  isLoading: false, 
  error: null,
  refetch: jest.fn(),
};

const defaultUseWalletReturn = {
  injectedWallet: null,
  embeddedWallet: null,
  connectMetamask: jest.fn(),
  isInitialized: true
};

describe('useSessionKey', () => {
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: React.ReactNode }) => JSX.Element;
  let mockValidate: jest.Mock;

  const characterId = 'char1';
  const sessionKeyAddress = '0xSessionKey';

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

  // -------------------------
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } }, 
    });
    wrapper = createTestWrapper(queryClient);

    jest.clearAllMocks();
    queryClient.clear();
    
    mockUseBattleNads.mockReset();
    mockUseBattleNads.mockReturnValue(defaultUseBattleNadsReturn);

    (useWallet as jest.Mock).mockReturnValue(defaultUseWalletReturn);

    mockValidate = sessionKeyMachine.validate as jest.Mock;
    mockValidate.mockReturnValue(SessionKeyState.IDLE);
  });
  
  it('should return IDLE state initially when loading', () => {
    mockUseBattleNads.mockReturnValueOnce({ ...defaultUseBattleNadsReturn, isLoading: true });
    const { result } = renderHook(() => useSessionKey(characterId), { wrapper });
    expect(result.current.sessionKeyState).toBe(SessionKeyState.IDLE);
    expect(result.current.isLoading).toBe(true);
  });

  it('should show loading state initially and transition to MISSING', async () => {
    mockUseBattleNads.mockReturnValue({ 
      ...defaultUseBattleNadsReturn, 
      isLoading: false, 
      error: new Error('Snapshot Fetch Failed'), 
      rawSessionKeyData: undefined, 
      rawEndBlock: 0n,
    });
    mockUseWallet.mockReturnValue({
      injectedWallet: { address: '0xOwner' },
      embeddedWallet: { address: '0xEmbedded' },
      isInitialized: true,
    });
    mockValidate.mockReturnValue(SessionKeyState.IDLE);

    const { result } = renderHook(() => useSessionKey('char1'), { wrapper });

    await waitFor(() => {
        expect(result.current.sessionKeyState).toBe(SessionKeyState.MISSING);
    });
    
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Snapshot Fetch Failed');
  });

  it('should return valid state and data when queries succeed', async () => {
    const ownerAddress = '0xValidOwner';
    const embeddedAddress = '0xValidSessionKey';
    const validKeyDataContract = mockSessionKeyData(false);

    mockUseBattleNads.mockReturnValue({
      ...defaultUseBattleNadsReturn,
      rawSessionKeyData: validKeyDataContract,
      rawEndBlock: 500n, 
      isLoading: false,
      error: null,
    });
    mockUseWallet.mockReturnValue({
        injectedWallet: { address: ownerAddress }, 
        embeddedWallet: { address: embeddedAddress }, 
        isInitialized: true,
    });
    mockValidate.mockReturnValue(SessionKeyState.VALID);

    const { result } = renderHook(() => useSessionKey('char1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.sessionKeyState).toBe(SessionKeyState.VALID);
    });
    
    expect(result.current.sessionKeyData).toEqual(validKeyDataContract); 
    expect(result.current.needsUpdate).toBe(false);
    expect(result.current.error).toBe(null);
  });
  
  it('correctly identifies expired session key', async () => {
    const expiredKeyData = mockSessionKeyData(true); 
    const localSessionKeyAddress = expiredKeyData.key; 
    mockUseBattleNads.mockReturnValue({
      ...defaultUseBattleNadsReturn,
      rawSessionKeyData: expiredKeyData,
      rawEndBlock: 500n, 
      isLoading: false,
      error: null,
    });
    mockUseWallet.mockReturnValue({
        injectedWallet: { address: ownerAddress }, 
        embeddedWallet: { address: localSessionKeyAddress }, 
        isInitialized: true,
    });
    mockValidate.mockReturnValue(SessionKeyState.EXPIRED);

    const { result } = renderHook(() => useSessionKey(characterId), { wrapper });

    await waitFor(() => {
        expect(result.current.sessionKeyState).toBe(SessionKeyState.EXPIRED);
    });

    expect(result.current.needsUpdate).toBe(true);
  });
  
  it('correctly identifies missing session key (zero address key)', async () => {
    const zeroKeyData = { ...mockSessionKeyData(false), key: ZeroAddress };
    mockUseBattleNads.mockReturnValue({
      ...defaultUseBattleNadsReturn,
      rawSessionKeyData: zeroKeyData,
      rawEndBlock: 500n,
      isLoading: false,
      error: null,
    });
     mockUseWallet.mockReturnValue({
        injectedWallet: { address: ownerAddress }, 
        embeddedWallet: { address: embeddedAddress }, 
        isInitialized: true,
    });
    mockValidate.mockReturnValue(SessionKeyState.MISSING);

    const { result } = renderHook(() => useSessionKey(characterId), { wrapper });

    await waitFor(() => {
      expect(result.current.sessionKeyState).toBe(SessionKeyState.MISSING);
    });
    
    expect(result.current.isLoading).toBe(false); 
    expect(result.current.needsUpdate).toBe(true);
  });

  it('correctly identifies missing session key (hook returns null/undefined data)', async () => {
    mockUseBattleNads.mockReturnValueOnce({
      ...defaultUseBattleNadsReturn,
      rawSessionKeyData: undefined,
      rawEndBlock: 500n,
      isLoading: false,
      error: null,
    });
    mockUseWallet.mockReturnValueOnce({
        injectedWallet: { address: ownerAddress }, 
        embeddedWallet: { address: embeddedAddress },
        isInitialized: true,
    });

    const { result } = renderHook(() => useSessionKey(characterId), { wrapper });

    await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.sessionKeyState).toBe(SessionKeyState.IDLE);
    });
    
    expect(result.current.isLoading).toBe(false); 
    expect(result.current.needsUpdate).toBe(false);
  });
  
  it('correctly identifies mismatched session key', async () => {
    const mismatchKeyData = mockSessionKeyData(false);
    mockUseBattleNads.mockReturnValue({
      ...defaultUseBattleNadsReturn,
      rawSessionKeyData: mismatchKeyData,
      rawEndBlock: 500n,
      isLoading: false,
      error: null,
    });
    mockUseWallet.mockReturnValue({
      injectedWallet: { address: ownerAddress }, 
      embeddedWallet: { address: '0xDifferentEmbeddedAddress' },
      isInitialized: true,
    });
    mockValidate.mockReturnValue(SessionKeyState.MISMATCH);

    const { result } = renderHook(() => useSessionKey(characterId), { wrapper });

    await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.sessionKeyState).toBe(SessionKeyState.MISMATCH);
    });
    expect(result.current.sessionKeyState).toBe(SessionKeyState.MISMATCH);
    expect(result.current.needsUpdate).toBe(true);
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
  });

}); 