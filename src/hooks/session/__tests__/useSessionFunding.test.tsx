import { renderHook} from '@testing-library/react';
import { act } from 'react';
import { useSessionFunding } from '../useSessionFunding';
import { useBattleNadsClient } from '../../contracts/useBattleNadsClient';
import { useSessionKey } from '../useSessionKey';
import { SessionKeyState } from '../../../session/sessionKeyMachine';

// Mock dependencies
jest.mock('../../contracts/useBattleNadsClient');
jest.mock('../useSessionKey');

// --- Mock TanStack Query ---
const mockQueryResults: Record<string, any> = {};
const mockMutationStates: Record<string, { isPending: boolean, error: Error | null, mutate?: jest.Mock }> = {}; // Keyed by JSON string

// Helper to set query mock results
const setMockQueryResult = (queryKey: Array<string | any>, result: any) => {
  mockQueryResults[JSON.stringify(queryKey)] = result;
};

// Helper to initialize/get mutation mock state and function
const getOrInitializeMutationMock = (mutationKey: Array<string | any>) => {
  const key = JSON.stringify(mutationKey);
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
  const key = JSON.stringify(mutationKey);
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
      const key = JSON.stringify(queryKey);
      return mockQueryResults[key] || {
        data: undefined, isLoading: true, error: null, refetch: jest.fn(),
      };
    }),
    useMutation: jest.fn(({ mutationKey }) => {
      // Use the mutationKey provided by the hook
      if (!mutationKey) {
        // Fallback or error if key is unexpectedly missing
        console.warn('useMutation called without mutationKey in test environment');
        return { isPending: false, error: null, mutate: jest.fn() }; 
      }
      // Return the state object associated with this key
      return getOrInitializeMutationMock(mutationKey);
    }),
    useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn() })),
    __esModule: true,
  };
});
// --- End Mock TanStack Query ---

describe('useSessionFunding', () => {
  const ownerAddress = '0x0000000000000000000000000000000000000001';
  const characterId = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  const balanceShortfallQueryKey = ['balanceShortfall', characterId];
  const replenishMutationKey = ['replenishBalance', characterId];
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

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear query mocks
    Object.keys(mockQueryResults).forEach(key => delete mockQueryResults[key]);
    // Clear mutation mocks
    Object.keys(mockMutationStates).forEach(key => delete mockMutationStates[key]);

    // Set default hook mocks
    (useBattleNadsClient as jest.Mock).mockReturnValue({ client: mockClient, error: null });
    (useSessionKey as jest.Mock).mockReturnValue(mockUseSessionKeyResult);
    
    // No need to pre-initialize mutation mocks, getOrInitializeMutationMock handles it
  });

  // --- Test Implementations (Adjusted for key-based mock access) ---
  it('reports sufficient funding when shortfall is zero', () => {
    setMockQueryResult(balanceShortfallQueryKey, { isLoading: false, data: 0n, error: null, refetch: jest.fn() });
    const { result } = renderHook(() => useSessionFunding(characterId));
    expect(result.current.needsFunding).toBe(false);
    expect(result.current.balanceShortfall).toBe(0n);
  });

  it('reports funding needed when shortfall is positive', () => {
    const mockShortfall = 1000000000000000000n;
    setMockQueryResult(balanceShortfallQueryKey, { isLoading: false, data: mockShortfall, error: null, refetch: jest.fn() });
    const { result } = renderHook(() => useSessionFunding(characterId));
    expect(result.current.needsFunding).toBe(true);
    expect(result.current.balanceShortfall).toBe(mockShortfall);
  });

  it('successfully calls replenishBalance mutation', () => {
    const mockShortfall = 1000000000000000000n;
    setMockQueryResult(balanceShortfallQueryKey, { isLoading: false, data: mockShortfall, error: null, refetch: jest.fn() });
    
    const { result } = renderHook(() => useSessionFunding(characterId));
    // Get the mock function *after* the first render ensures it's initialized via the key
    const mutationMock = getOrInitializeMutationMock(replenishMutationKey);
    const replenishMutateMock = mutationMock.mutate!;

    expect(result.current.needsFunding).toBe(true);
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
    
    // Initial render (mutation state starts clean)
    const { result, rerender } = renderHook(() => useSessionFunding(characterId));
    // Get the mock mutate function after render ensures it exists
    const mutationMock = getOrInitializeMutationMock(replenishMutationKey);
    const replenishMutateMock = mutationMock.mutate!;

    // Override the mock mutate implementation for this test
    replenishMutateMock.mockImplementation(() => {
      // Simulate failure by updating the external state record via key
      setMockMutationStateByKey(replenishMutationKey, { error: mockError, isPending: false });
    });

    expect(result.current.needsFunding).toBe(true);
    expect(result.current.replenishError).toBeNull(); // Check initial state

    // Act: Call replenishBalance, triggering the mockImplementation above
    act(() => {
      result.current.replenishBalance(mockShortfall);
    });

    // Rerender: useMutation mock runs again, reads updated state via key, returns new object
    rerender();

    // Assertions...
    expect(replenishMutateMock).toHaveBeenCalledWith(mockShortfall);
    expect(result.current.replenishError).toBe(mockError.message); // Check error appeared
    expect(result.current.needsFunding).toBe(true);
  });

  it('handles client error state from useBattleNadsClient', () => {
    const clientError = 'Client creation failed';
    (useBattleNadsClient as jest.Mock).mockReturnValue({ client: null, error: clientError });
    setMockQueryResult(balanceShortfallQueryKey, { isLoading: false, data: 0n, error: null, refetch: jest.fn() });

    const { result } = renderHook(() => useSessionFunding(characterId));
    expect(result.current.balanceShortfall).toBe(0n); 
    expect(result.current.needsFunding).toBe(false);
    expect(result.current.replenishError).toBeNull();
    expect(result.current.deactivateError).toBeNull();
  });
}); 