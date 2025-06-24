import { renderHook} from '@testing-library/react';
import { act } from 'react';
import { useSessionFunding } from '../useSessionFunding';
import { useBattleNadsClient } from '../../contracts/useBattleNadsClient';
import { useSessionKey } from '../useSessionKey';
import { SessionKeyState } from '../../../machines/sessionKeyMachine';
import { useWallet } from '../../../providers/WalletProvider';
import { useSimplifiedGameState } from '../../game/useSimplifiedGameState';

// Mock dependencies
jest.mock('../../contracts/useBattleNadsClient');
jest.mock('../useSessionKey');
jest.mock('../../../providers/WalletProvider');
jest.mock('../../game/useSimplifiedGameState');

// --- Mock Mutation Helpers (Keep for now, may need adjustment later) ---
const mockMutationStates: Record<string, { isPending: boolean, error: Error | null, mutate?: jest.Mock }> = {};
const replacer = (key: string, value: any) => {
  return typeof value === 'bigint' ? value.toString() : value;
};
const getOrInitializeMutationMock = (mutationKey: Array<string | any>) => {
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
const setMockMutationStateByKey = (mutationKey: Array<string | any>, state: Partial<{ isPending: boolean; error: Error | null }>) => {
  const key = JSON.stringify(mutationKey, replacer);
  if (mockMutationStates[key]) {
    mockMutationStates[key] = { ...mockMutationStates[key], ...state };
  }
};
// --------------------------------------------------------------------

jest.mock('@tanstack/react-query', () => {
  const original = jest.requireActual('@tanstack/react-query');
  return {
    ...original,
    useMutation: jest.fn(({ mutationKey }) => {
      if (!mutationKey) {
        console.warn('useMutation called without mutationKey in test environment');
        return { isPending: false, error: null, mutate: jest.fn() }; 
      }
      return getOrInitializeMutationMock(mutationKey);
    }),
    useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn() })),
    __esModule: true,
  };
});
// --- End Mock TanStack Query ---

// --- Mock useGameState --- 
const mockUseSimplifiedGameState = useSimplifiedGameState as jest.Mock;
// -------------------------

describe('useSessionFunding', () => {
  const ownerAddress = '0x0000000000000000000000000000000000000001';
  const characterId = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  const mockSessionKeyAddress = '0xSessionKey123';
  
  const replenishMutationKey = ['replenishBalance', characterId, ownerAddress];
  const deactivateMutationKey = ['deactivateKey', characterId, mockSessionKeyAddress, ownerAddress];
  
  const mockReplenishGasBalance = jest.fn().mockResolvedValue({});
  const mockDeactivateSessionKey = jest.fn().mockResolvedValue({});
  const mockClient = {
    shortfallToRecommendedBalanceInMON: jest.fn(),
    replenishGasBalance: mockReplenishGasBalance,
    deactivateSessionKey: mockDeactivateSessionKey,
  };

  const mockUseSessionKeyResult = {
    sessionKeyData: {
      key: mockSessionKeyAddress,
      expiration: 9999n,
      owner: ownerAddress,
      balance: 10n**18n,
      targetBalance: 10n**18n,
      ownerCommittedAmount: 5n * 10n**18n,
      ownerCommittedShares: 5n * 10n**18n
    },
    sessionKeyState: SessionKeyState.VALID,
    needsUpdate: false,
    isLoading: false,
    error: null,
    currentBlock: 500,
    refreshSessionKey: jest.fn(),
  };

  const mockUseWalletResult = {
    injectedWallet: { address: ownerAddress },
    embeddedWallet: null,
    connectMetamask: jest.fn(),
    disconnect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockMutationStates).forEach(key => delete mockMutationStates[key]);

    (useBattleNadsClient as jest.Mock).mockReturnValue({ client: mockClient, error: null });
    (useSessionKey as jest.Mock).mockReturnValue(mockUseSessionKeyResult);
    (useWallet as jest.Mock).mockReturnValue(mockUseWalletResult);
    
    mockUseSimplifiedGameState.mockReturnValue({
      balanceShortfall: 0n,
      isLoading: false,
      error: null,
      refetch: jest.fn(), 
    });
  });

  it('reports sufficient funding when shortfall is zero', () => {
    const { result } = renderHook(() => useSessionFunding(characterId));
    expect(result.current.balanceShortfall?.toString()).toBe('0'); 
  });

  it('reports funding needed when shortfall is positive', () => {
    const mockShortfall = 1000000000000000000n;
    mockUseSimplifiedGameState.mockReturnValueOnce({
        balanceShortfall: mockShortfall,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
    });
    const { result } = renderHook(() => useSessionFunding(characterId));
    expect(result.current.balanceShortfall?.toString()).toBe(mockShortfall.toString());
    expect(result.current.balanceShortfall !== undefined && result.current.balanceShortfall > 0n).toBe(true);
  });

  it('successfully calls replenishBalance mutation', () => {
    const mockShortfall = 1000000000000000000n;
    mockUseSimplifiedGameState.mockReturnValueOnce({
        balanceShortfall: mockShortfall,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
    });
    
    const { result } = renderHook(() => useSessionFunding(characterId));
    const mutationMock = getOrInitializeMutationMock(replenishMutationKey);
    const replenishMutateMock = mutationMock.mutate!;

    expect(result.current.balanceShortfall !== undefined && result.current.balanceShortfall > 0n).toBe(true);
    expect(result.current.isReplenishing).toBe(false);

    act(() => { 
      result.current.replenishBalance(mockShortfall);
    });

    expect(replenishMutateMock).toHaveBeenCalledWith(mockShortfall); 
  });

  it('successfully calls deactivateKey mutation', () => {
    const { result } = renderHook(() => useSessionFunding(characterId));
    const mutationMock = getOrInitializeMutationMock(deactivateMutationKey);
    const deactivateMutateMock = mutationMock.mutate!;

    expect(result.current.isDeactivating).toBe(false);
    expect(result.current.sessionKeyAddress).toBe(mockSessionKeyAddress);

    act(() => { 
      result.current.deactivateKey(undefined);
    });

    expect(deactivateMutateMock).toHaveBeenCalled(); 
  });

  it('handles replenishBalance mutation error', () => {
    const mockShortfall = 1000000000000000000n;
    const mockError = new Error('Funding failed');
    
    mockUseSimplifiedGameState.mockReturnValue({
        balanceShortfall: mockShortfall,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
    });
    
    const { result, rerender } = renderHook(() => useSessionFunding(characterId));
    const mutationMock = getOrInitializeMutationMock(replenishMutationKey);
    const replenishMutateMock = mutationMock.mutate!;

    replenishMutateMock.mockImplementation(() => {
      setMockMutationStateByKey(replenishMutationKey, { error: mockError, isPending: false });
    });

    expect(result.current.balanceShortfall !== undefined && result.current.balanceShortfall > 0n).toBe(true);

    act(() => {
      result.current.replenishBalance(mockShortfall);
    });

    rerender();

    expect(replenishMutateMock).toHaveBeenCalledWith(mockShortfall);
    expect(result.current.balanceShortfall !== undefined && result.current.balanceShortfall > 0n).toBe(true);
  });

  it('handles client error state from useBattleNadsClient', () => {
    const clientError = 'Client creation failed';
    (useBattleNadsClient as jest.Mock).mockReturnValue({ client: null, error: clientError });
    mockUseSimplifiedGameState.mockReturnValueOnce({
        balanceShortfall: 0n,
        isLoading: false,
        error: clientError,
        refetch: jest.fn(),
    });

    const { result } = renderHook(() => useSessionFunding(characterId));
    expect(result.current.balanceShortfall?.toString()).toBe('0'); 
  });
}); 