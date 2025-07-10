import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ZeroAddress } from 'ethers';
import { useSessionKey } from '../useSessionKey';
import { useWallet } from '../../../providers/WalletProvider';
import { createTestWrapper } from '../../../test/helpers';
import { SessionKeyState } from '@/types/domain/session';
import { contract } from '../../../types';
import { useContractPolling } from '../../game/useContractPolling';
import { mockSessionKeyData } from '@/test/helpers';

// Mock dependencies
jest.mock('../../game/useContractPolling');
jest.mock('../../../providers/WalletProvider');

// Define default values
const ownerAddress = '0xOwnerAddress123';
const embeddedAddress = '0xEmbeddedAddress456';

// --- Mock useContractPolling --- 
const mockUseContractPolling = useContractPolling as jest.Mock;
// -------------------------

// Type safety for mocks
const mockUseWallet = useWallet as jest.Mock; 

// Default mock return values (can be overridden in tests)
const defaultContractPollingReturn = {
  data: undefined,
  isLoading: false, 
  error: null,
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

  const characterId = 'char1';

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

  // Helper to create mock snapshot data
  const createMockSnapshotData = (sessionKeyData?: contract.SessionKeyData, endBlock: bigint = 500n): contract.PollFrontendDataReturn => ({
    characterID: 'char1',
    sessionKeyData: sessionKeyData || {
      owner: '0x0000000000000000000000000000000000000000',
      key: '0x0000000000000000000000000000000000000000',
      balance: 0n,
      targetBalance: 0n,
      ownerCommittedAmount: 0n,
      ownerCommittedShares: 0n,
      expiration: 0n
    },
    character: null as any, // Tests don't use character data
    combatants: [],
    noncombatants: [],
    equipableWeaponIDs: [],
    equipableWeaponNames: [],
    equipableArmorIDs: [],
    equipableArmorNames: [],
    dataFeeds: [],
    balanceShortfall: 0n,
    endBlock,
    fetchTimestamp: Date.now(),
  });

  // -------------------------
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } }, 
    });
    wrapper = createTestWrapper(queryClient);

    jest.clearAllMocks();
    queryClient.clear();
    
    mockUseContractPolling.mockReset();
    mockUseContractPolling.mockReturnValue(defaultContractPollingReturn);

    (useWallet as jest.Mock).mockReturnValue(defaultUseWalletReturn);

  });

  afterEach(() => {
    // Clean up
  });
  
  it('should return IDLE state initially when loading', () => {
    mockUseWallet.mockReturnValue({
      injectedWallet: { address: ownerAddress },
      embeddedWallet: { address: embeddedAddress },
      isInitialized: true,
    });
    mockUseContractPolling.mockReturnValueOnce({ ...defaultContractPollingReturn, isLoading: true });
    const { result } = renderHook(() => useSessionKey(characterId), { wrapper });
    expect(result.current.sessionKeyState).toBe(SessionKeyState.IDLE);
    expect(result.current.isLoading).toBe(true);
  });

  it('should show loading state initially and transition to MISSING', async () => {
    mockUseContractPolling.mockReturnValue({ 
      ...defaultContractPollingReturn, 
      isLoading: false, 
      error: new Error('Snapshot Fetch Failed'), 
      data: undefined,
    });
    mockUseWallet.mockReturnValue({
      injectedWallet: { address: '0xOwner' },
      embeddedWallet: { address: '0xEmbedded' },
      isInitialized: true,
    });

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
    const validKeyDataContract = { ...mockSessionKeyData(false), key: embeddedAddress };

    mockUseContractPolling.mockReturnValue({
      ...defaultContractPollingReturn,
      data: createMockSnapshotData(validKeyDataContract, 500n),
      isLoading: false,
      error: null,
    });
    mockUseWallet.mockReturnValue({
        injectedWallet: { address: ownerAddress }, 
        embeddedWallet: { address: embeddedAddress }, 
        isInitialized: true,
    });

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
    const expiredKeyData = { ...mockSessionKeyData(true), key: embeddedAddress }; 
    mockUseContractPolling.mockReturnValue({
      ...defaultContractPollingReturn,
      data: createMockSnapshotData(expiredKeyData, 500n),
      isLoading: false,
      error: null,
    });
    mockUseWallet.mockReturnValue({
        injectedWallet: { address: ownerAddress }, 
        embeddedWallet: { address: embeddedAddress }, 
        isInitialized: true,
    });

    const { result } = renderHook(() => useSessionKey(characterId), { wrapper });

    await waitFor(() => {
        expect(result.current.sessionKeyState).toBe(SessionKeyState.EXPIRED);
    });

    expect(result.current.needsUpdate).toBe(true);
  });
  
  it('correctly identifies missing session key (zero address key)', async () => {
    const zeroKeyData = { ...mockSessionKeyData(false), key: ZeroAddress };
    mockUseContractPolling.mockReturnValue({
      ...defaultContractPollingReturn,
      data: createMockSnapshotData(zeroKeyData, 500n),
      isLoading: false,
      error: null,
    });
     mockUseWallet.mockReturnValue({
        injectedWallet: { address: ownerAddress }, 
        embeddedWallet: { address: embeddedAddress }, 
        isInitialized: true,
    });

    const { result } = renderHook(() => useSessionKey(characterId), { wrapper });

    await waitFor(() => {
      expect(result.current.sessionKeyState).toBe(SessionKeyState.MISSING);
    });
    
    expect(result.current.isLoading).toBe(false); 
    expect(result.current.needsUpdate).toBe(true);
  });

  it('correctly identifies missing session key (hook returns null/undefined data)', async () => {
    mockUseContractPolling.mockReturnValueOnce({
      ...defaultContractPollingReturn,
      data: createMockSnapshotData(undefined, 500n),
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
    mockUseContractPolling.mockReturnValue({
      ...defaultContractPollingReturn,
      data: createMockSnapshotData(mismatchKeyData, 500n),
      isLoading: false,
      error: null,
    });
    mockUseWallet.mockReturnValue({
      injectedWallet: { address: ownerAddress }, 
      embeddedWallet: { address: '0xDifferentEmbeddedAddress' },
      isInitialized: true,
    });

    const { result } = renderHook(() => useSessionKey(characterId), { wrapper });

    await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.sessionKeyState).toBe(SessionKeyState.MISMATCHED);
    });
    expect(result.current.sessionKeyState).toBe(SessionKeyState.MISMATCHED);
    expect(result.current.needsUpdate).toBe(true);
  });
  
  it('handles missing injected wallet address', async () => {
    // Mock useWallet to return null injectedWallet
    (useWallet as jest.Mock).mockReturnValue({
        injectedWallet: null, 
        embeddedWallet: { address: embeddedAddress }
    });
    // Mock useUiSnapshot to reflect its state when owner is null (likely idle/no data)
    mockUseContractPolling.mockReturnValue({
        data: undefined,
        isLoading: false, // Assume it doesn't load if owner is null
        error: null,
    });

    const { result } = renderHook(() => useSessionKey(characterId), { wrapper });

    // Effect should determine hook is disabled and set state to IDLE
    await waitFor(() => {
      expect(result.current.sessionKeyState).toBe(SessionKeyState.IDLE); // Expect IDLE
    });

    expect(result.current.sessionKeyData).toBe(null);
    expect(result.current.isLoading).toBe(false); 
    expect(result.current.needsUpdate).toBe(false); // Needs update should be false for IDLE
  });
  
  it('handles missing client', async () => {
    // Mock useUiSnapshot to simulate an error state (e.g., client missing upstream)
    const mockError = new Error("Client unavailable in useGameState");
    mockUseContractPolling.mockReturnValue({
        data: undefined,
        isLoading: false, // Finished loading (with error)
        error: mockError, // Set error state
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
    expect(result.current.error).toBe(mockError); // Check error is passed through
    expect(result.current.needsUpdate).toBe(true); // Needs update because state is MISSING
  });

  it('handles underlying snapshot error', async () => { 
    const mockError = new Error("Snapshot Fetch Failed");
    mockUseWallet.mockReturnValue({
      injectedWallet: { address: ownerAddress },
      embeddedWallet: { address: embeddedAddress },
      isInitialized: true,
    });
    mockUseContractPolling.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: mockError,
    });

    const { result } = renderHook(() => useSessionKey(characterId), { wrapper });

    await waitFor(() => {
      expect(result.current.sessionKeyState).toBe(SessionKeyState.MISSING);
    });

    expect(result.current.isLoading).toBe(false); 
    expect(result.current.sessionKeyData).toBeUndefined();
    expect(result.current.error).toBe(mockError);
    expect(result.current.sessionKeyState).toBe(SessionKeyState.MISSING); 
    expect(result.current.needsUpdate).toBe(true);
  });

}); 