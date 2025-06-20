import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ZeroAddress } from 'ethers';
import { useSessionKey } from '../useSessionKey';
import { useWallet } from '../../../providers/WalletProvider';
import { createTestWrapper } from '../../../test/helpers';
import { sessionKeyMachine, SessionKeyState } from '../../../machines/sessionKeyMachine';
import { contract } from '../../../types';
import { useUiSnapshot } from '../../game/useUiSnapshot';
import { mockSessionKeyData } from '@/test/helpers';

// Mock dependencies
jest.mock('../../game/useUiSnapshot');
jest.mock('../../../providers/WalletProvider');

// Define default values
const ownerAddress = '0xOwnerAddress123';
const embeddedAddress = '0xEmbeddedAddress456';
const otherKeyAddress = '0xOtherKeyAddress789';

// --- Mock useUiSnapshot --- 
const mockUseUiSnapshot = useUiSnapshot as jest.Mock;
// -------------------------

// Type safety for mocks
const mockUseWallet = useWallet as jest.Mock; 

// Default mock return values (can be overridden in tests)
const defaultUiSnapshotReturn = {
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
  let originalValidate: typeof sessionKeyMachine.validate;

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

  // Helper to create mock snapshot data
  const createMockSnapshotData = (sessionKeyData?: contract.SessionKeyData, endBlock: bigint = 500n): contract.PollFrontendDataReturn => ({
    characterID: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    sessionKeyData: sessionKeyData as any, // Cast to any to handle undefined case
    character: {
      id: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      name: 'TestCharacter',
      stats: {
        class: 1,
        buffs: 0,
        debuffs: 0,
        maxHealth: 100,
        level: 5,
        health: 85,
        unspentAttributePoints: 0,
        experience: 0,
        strength: 10,
        vitality: 10,
        dexterity: 10,
        quickness: 10,
        sturdiness: 10,
        luck: 10,
        depth: 1,
        x: 0,
        y: 0,
        index: 0,
        weaponID: 0,
        armorID: 0,
        sumOfCombatantLevels: 0,
        combatants: 0,
        nextTargetIndex: 0,
        combatantBitMap: 0n,
      } as any
    } as any,
    combatants: [],
    noncombatants: [],
    equipableWeaponIDs: [],
    equipableWeaponNames: [],
    equipableArmorIDs: [],
    equipableArmorNames: [],
    dataFeeds: [],
    balanceShortfall: 0n,
    unallocatedAttributePoints: 0n,
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
    
    mockUseUiSnapshot.mockReset();
    mockUseUiSnapshot.mockReturnValue(defaultUiSnapshotReturn);

    (useWallet as jest.Mock).mockReturnValue(defaultUseWalletReturn);

    // Store original validate function
    originalValidate = sessionKeyMachine.validate.bind(sessionKeyMachine);
    
    // Mock the validate function with proper logic
    jest.spyOn(sessionKeyMachine, 'validate').mockImplementation((sessionKey, embeddedAddress, expiration, currentBlock) => {
      // Mock the validation logic based on test scenarios
      if (!sessionKey || sessionKey === ZeroAddress) {
        return SessionKeyState.MISSING;
      }
      if (sessionKey.toLowerCase() !== embeddedAddress.toLowerCase()) {
        return SessionKeyState.MISMATCH;
      }
      if (expiration < currentBlock) {
        return SessionKeyState.EXPIRED;
      }
      return SessionKeyState.VALID;
    });
  });

  afterEach(() => {
    // Restore original validate function
    if (originalValidate) {
      sessionKeyMachine.validate = originalValidate;
    }
  });
  
  it('should return IDLE state initially when loading', () => {
    mockUseUiSnapshot.mockReturnValueOnce({ ...defaultUiSnapshotReturn, isLoading: true });
    const { result } = renderHook(() => useSessionKey(characterId), { wrapper });
    expect(result.current.sessionKeyState).toBe(SessionKeyState.IDLE);
    expect(result.current.isLoading).toBe(true);
  });

  it('should show loading state initially and transition to MISSING', async () => {
    mockUseUiSnapshot.mockReturnValue({ 
      ...defaultUiSnapshotReturn, 
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

    mockUseUiSnapshot.mockReturnValue({
      ...defaultUiSnapshotReturn,
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
    mockUseUiSnapshot.mockReturnValue({
      ...defaultUiSnapshotReturn,
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
    mockUseUiSnapshot.mockReturnValue({
      ...defaultUiSnapshotReturn,
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
    mockUseUiSnapshot.mockReturnValueOnce({
      ...defaultUiSnapshotReturn,
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
    mockUseUiSnapshot.mockReturnValue({
      ...defaultUiSnapshotReturn,
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
    // Mock useUiSnapshot to reflect its state when owner is null (likely idle/no data)
    mockUseUiSnapshot.mockReturnValue({
        data: undefined,
        isLoading: false, // Assume it doesn't load if owner is null
        error: null,
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
    // Mock useUiSnapshot to simulate an error state (e.g., client missing upstream)
    const mockError = new Error("Client unavailable in useGameState");
    mockUseUiSnapshot.mockReturnValue({
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
    mockUseUiSnapshot.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: mockError,
    });

    const { result } = renderHook(() => useSessionKey(characterId), { wrapper });

    await waitFor(() => {
      expect(result.current.error).toBe(mockError);
      expect(result.current.sessionKeyState).toBe(SessionKeyState.MISSING);
    });

    expect(result.current.isLoading).toBe(false); 
    expect(result.current.sessionKeyData).toBeUndefined();
    expect(result.current.error).toBe(mockError);
    expect(result.current.sessionKeyState).toBe(SessionKeyState.MISSING); 
    expect(result.current.needsUpdate).toBe(true);
  });

}); 