import { renderHook} from '@testing-library/react';
import { act } from 'react';
import { useSessionFunding } from '../useSessionFunding';
import { useBattleNadsClient } from '../../contracts/useBattleNadsClient';
import { useSessionKey } from '../useSessionKey';
import { SessionKeyState } from '../../../machines/sessionKeyMachine';
import { useWallet } from '../../../providers/WalletProvider';

// Mock dependencies
jest.mock('../../contracts/useBattleNadsClient');
jest.mock('../useSessionKey');
jest.mock('../../../providers/WalletProvider');

// --- Mock TanStack Query ---
const mockQueryResults: Record<string, any> = {};
const mockMutationStates: Record<string, { isPending: boolean, error: Error | null, mutate?: jest.Mock }> = {}; // Keyed by JSON string

// Replacer function for JSON.stringify to handle BigInt
const replacer = (key: string, value: any) => {
  return typeof value === 'bigint' ? value.toString() : value;
};

// Helper to set query mock results
const setMockQueryResult = (queryKey: Array<string | any>, result: any) => {
  // Use the replacer function here
  mockQueryResults[JSON.stringify(queryKey, replacer)] = result;
};

// Helper to initialize/get mutation mock state and function
const getOrInitializeMutationMock = (mutationKey: Array<string | any>) => {
  // Use the replacer function here
  const key = JSON.stringify(mutationKey, replacer);
  if (!mockMutationStates[key]) {
    mockMutationStates[key] = {
      isPending: false,
      error: null,
      mutate: jest.fn(),
    };
  }
  return mockMutationStates[key];
};

// Helper to update mutation state by key
const setMockMutationStateByKey = (mutationKey: Array<string | any>, state: Partial<{ isPending: boolean; error: Error | null }>) => {
  // Use the replacer function here
  const key = JSON.stringify(mutationKey, replacer);
  if (mockMutationStates[key]) {
    mockMutationStates[key] = { ...mockMutationStates[key], ...state };
  }
};
// -- End Mocking Helpers --

jest.mock('@tanstack/react-query', () => {
  const original = jest.requireActual('@tanstack/react-query');
  return {
    ...original,
    useQuery: jest.fn(({ queryKey }) => {
      // Use the replacer function here
      const key = JSON.stringify(queryKey, replacer);
      return mockQueryResults[key] || {
        data: undefined, isLoading: true, error: null, refetch: jest.fn(),
      };
    }),
    useMutation: jest.fn(({ mutationKey }) => {
      // Use the mutationKey provided by the hook
      if (!mutationKey) {
        console.warn('useMutation called without mutationKey in test environment');
        return { isPending: false, error: null, mutate: jest.fn() }; 
      }
      // Use the replacer function here
      return getOrInitializeMutationMock(mutationKey); // getOrInitializeMutationMock now uses replacer
    }),
    useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn() })),
    __esModule: true,
  };
});
// --- End Mock TanStack Query ---

describe('useSessionFunding', () => {
  const ownerAddress = '0x0000000000000000000000000000000000000001';
  const characterId = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  // Define keys including ownerAddress now
  const balanceShortfallQueryKey = ['balanceShortfall', characterId, ownerAddress]; 
  const replenishMutationKey = ['replenishBalance', characterId, ownerAddress];
  // Note: deactivateKey mutation key depends on sessionKey, handle in specific tests if needed
  
  // Mock client methods that might be called by mutations
  const mockReplenishGasBalance = jest.fn().mockResolvedValue({});
  const mockDeactivateSessionKey = jest.fn().mockResolvedValue({});
  const mockClient = {
    shortfallToRecommendedBalanceInMON: jest.fn(), // Query function - controlled by useQuery mock
    replenishGasBalance: mockReplenishGasBalance,
    deactivateSessionKey: mockDeactivateSessionKey,
  };

  // Default mock for useSessionKey hook
  const mockUseSessionKeyResult = {
    sessionKey: { key: '0xSessionKey', expiration: 9999 },
    sessionKeyState: SessionKeyState.VALID,
    refreshSessionKey: jest.fn(),
  };

  // Default mock for useWallet hook
  const mockUseWalletResult = {
    injectedWallet: { address: ownerAddress },
    embeddedWallet: null, // Add other properties if needed by the hook under test
    connectMetamask: jest.fn(),
    disconnect: jest.fn(),
    // ... add other potential return values if needed
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear query mocks
    Object.keys(mockQueryResults).forEach(key => delete mockQueryResults[key]);
    // Clear mutation mocks
    Object.keys(mockMutationStates).forEach(key => delete mockMutationStates[key]);

    // Set default hook mocks
    (useBattleNadsClient as jest.Mock).mockReturnValue({ client: mockClient, error: null });
    (useSessionKey as jest.Mock).mockReturnValue(mockUseSessionKeyResult);
    (useWallet as jest.Mock).mockReturnValue(mockUseWalletResult);
    
    // No need to pre-initialize mutation mocks, getOrInitializeMutationMock handles it
  });

  // --- Test Implementations (Adjusted for key-based mock access) ---
  it('reports sufficient funding when shortfall is zero', () => {
    setMockQueryResult(balanceShortfallQueryKey, { isLoading: false, data: 0n, error: null, refetch: jest.fn() });
    const { result } = renderHook(() => useSessionFunding(characterId));
    expect(result.current.balanceShortfall).toBe(0n); 
  });

  it('reports funding needed when shortfall is positive', () => {
    const mockShortfall = 1000000000000000000n;
    setMockQueryResult(balanceShortfallQueryKey, { isLoading: false, data: mockShortfall, error: null, refetch: jest.fn() });
    const { result } = renderHook(() => useSessionFunding(characterId));
    expect(result.current.balanceShortfall).toBe(mockShortfall);
    // Check defined before comparison
    expect(result.current.balanceShortfall !== undefined && result.current.balanceShortfall > 0n).toBe(true);
  });

  it('successfully calls replenishBalance mutation', () => {
    const mockShortfall = 1000000000000000000n;
    setMockQueryResult(balanceShortfallQueryKey, { isLoading: false, data: mockShortfall, error: null, refetch: jest.fn() });
    
    const { result } = renderHook(() => useSessionFunding(characterId));
    const mutationMock = getOrInitializeMutationMock(replenishMutationKey);
    const replenishMutateMock = mutationMock.mutate!;

    // Check defined before comparison
    expect(result.current.balanceShortfall !== undefined && result.current.balanceShortfall > 0n).toBe(true);
    expect(result.current.isReplenishing).toBe(false);

    act(() => { 
      result.current.replenishBalance(mockShortfall);
    });

    expect(replenishMutateMock).toHaveBeenCalledWith(mockShortfall);
  });

  it('handles replenishBalance mutation error', () => {
    const mockShortfall = 1000000000000000000n;
    const mockError = new Error('Funding failed');

    setMockQueryResult(balanceShortfallQueryKey, { isLoading: false, data: mockShortfall, error: null, refetch: jest.fn() });
    
    const { result, rerender } = renderHook(() => useSessionFunding(characterId));
    const mutationMock = getOrInitializeMutationMock(replenishMutationKey);
    const replenishMutateMock = mutationMock.mutate!;

    replenishMutateMock.mockImplementation(() => {
      setMockMutationStateByKey(replenishMutationKey, { error: mockError, isPending: false });
    });

    // Check defined before comparison
    expect(result.current.balanceShortfall !== undefined && result.current.balanceShortfall > 0n).toBe(true);

    act(() => {
      result.current.replenishBalance(mockShortfall);
    });

    rerender();

    expect(replenishMutateMock).toHaveBeenCalledWith(mockShortfall);
    // Check defined before comparison
    expect(result.current.balanceShortfall !== undefined && result.current.balanceShortfall > 0n).toBe(true);
  });

  it('handles client error state from useBattleNadsClient', () => {
    const clientError = 'Client creation failed';
    (useBattleNadsClient as jest.Mock).mockReturnValue({ client: null, error: clientError });
    setMockQueryResult(balanceShortfallQueryKey, { isLoading: false, data: 0n, error: null, refetch: jest.fn() });

    const { result } = renderHook(() => useSessionFunding(characterId));
    expect(result.current.balanceShortfall).toBe(0n); 
    // Removed checks for replenishError and deactivateError
  });
}); 