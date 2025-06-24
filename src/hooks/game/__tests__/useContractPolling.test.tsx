import { renderHook, waitFor } from '@testing-library/react';
import { useContractPolling } from '../useContractPolling';
import { useBattleNadsClient } from '../../contracts/useBattleNadsClient';
import { useWallet } from '../../../providers/WalletProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock dependencies
jest.mock('../../contracts/useBattleNadsClient');
jest.mock('../../../providers/WalletProvider');

const mockUseBattleNadsClient = useBattleNadsClient as jest.MockedFunction<typeof useBattleNadsClient>;
const mockUseWallet = useWallet as jest.MockedFunction<typeof useWallet>;

describe('useContractPolling', () => {
  let queryClient: QueryClient;
  
  const createWrapper = () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return wrapper;
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          refetchOnWindowFocus: false,
        },
      },
    });
    jest.clearAllMocks();
  });

  const mockOwner = '0x1234567890123456789012345678901234567890';
  const mockEmbeddedWallet = {
    address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
  };

  const mockSnapshotData = [
    'char1', // characterID
    { key: '0xsessionkey', expiration: 1000n }, // sessionKeyData
    { id: 'char1', name: 'TestChar' }, // character
    [], // combatants
    [], // noncombatants
    [], // equipableWeaponIDs
    [], // equipableWeaponNames
    [], // equipableArmorIDs
    [], // equipableArmorNames
    [], // dataFeeds
    0n, // balanceShortfall
    5, // unallocatedAttributePoints
    500n, // endBlock
  ];

  const mockClient = {
    getUiSnapshot: jest.fn(),
  } as any;

  it('should not fetch when owner is null', () => {
    mockUseBattleNadsClient.mockReturnValue({ client: mockClient, error: null });
    mockUseWallet.mockReturnValue({ embeddedWallet: mockEmbeddedWallet } as any);

    const { result } = renderHook(() => useContractPolling(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(mockClient.getUiSnapshot).not.toHaveBeenCalled();
  });

  it('should not fetch when client is null', () => {
    mockUseBattleNadsClient.mockReturnValue({ client: null, error: 'No client' });
    mockUseWallet.mockReturnValue({ embeddedWallet: mockEmbeddedWallet } as any);

    const { result } = renderHook(() => useContractPolling(mockOwner), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(mockClient.getUiSnapshot).not.toHaveBeenCalled();
  });

  it('should fetch data successfully when owner and client are available', async () => {
    mockClient.getUiSnapshot.mockResolvedValue(mockSnapshotData);
    mockUseBattleNadsClient.mockReturnValue({ client: mockClient, error: null });
    mockUseWallet.mockReturnValue({ embeddedWallet: mockEmbeddedWallet } as any);

    const { result } = renderHook(() => useContractPolling(mockOwner), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockClient.getUiSnapshot).toHaveBeenCalledWith(mockOwner, expect.any(BigInt));
    expect(result.current.data).toEqual({
      characterID: 'char1',
      sessionKeyData: { key: '0xsessionkey', expiration: 1000n },
      character: { id: 'char1', name: 'TestChar' },
      combatants: [],
      noncombatants: [],
      equipableWeaponIDs: [],
      equipableWeaponNames: [],
      equipableArmorIDs: [],
      equipableArmorNames: [],
      dataFeeds: [],
      balanceShortfall: 0n,
      unallocatedAttributePoints: 5,
      endBlock: 500n,
      fetchTimestamp: expect.any(Number),
    });
  });

  it('should handle invalid data structure from contract', async () => {
    // Return incomplete data structure
    mockClient.getUiSnapshot.mockResolvedValue([]);
    mockUseBattleNadsClient.mockReturnValue({ client: mockClient, error: null });
    mockUseWallet.mockReturnValue({ embeddedWallet: mockEmbeddedWallet } as any);

    const { result } = renderHook(() => useContractPolling(mockOwner), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.error?.message).toBe('Invalid data structure received from getUiSnapshot');
  });

  it('should handle contract call errors', async () => {
    const contractError = new Error('Contract call failed');
    mockClient.getUiSnapshot.mockRejectedValue(contractError);
    mockUseBattleNadsClient.mockReturnValue({ client: mockClient, error: null });
    mockUseWallet.mockReturnValue({ embeddedWallet: mockEmbeddedWallet } as any);

    const { result } = renderHook(() => useContractPolling(mockOwner), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.error).toBe(contractError);
  });

  it('should increment request counter on each call', async () => {
    mockClient.getUiSnapshot.mockResolvedValue(mockSnapshotData);
    mockUseBattleNadsClient.mockReturnValue({ client: mockClient, error: null });
    mockUseWallet.mockReturnValue({ embeddedWallet: mockEmbeddedWallet } as any);

    const { result, rerender } = renderHook(() => useContractPolling(mockOwner), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Force a refetch
    result.current.refetch();

    await waitFor(() => {
      expect(mockClient.getUiSnapshot).toHaveBeenCalledTimes(2);
    });

    // Check that the startBlock parameter increments
    expect(mockClient.getUiSnapshot).toHaveBeenNthCalledWith(1, mockOwner, BigInt(1));
    expect(mockClient.getUiSnapshot).toHaveBeenNthCalledWith(2, mockOwner, BigInt(2));
  });

  it('should use correct query key with owner and embedded wallet address', () => {
    mockUseBattleNadsClient.mockReturnValue({ client: mockClient, error: null });
    mockUseWallet.mockReturnValue({ embeddedWallet: mockEmbeddedWallet } as any);

    renderHook(() => useContractPolling(mockOwner), {
      wrapper: createWrapper(),
    });

    // Check that query was created with correct key
    const query = queryClient.getQueryCache().find({
      queryKey: ['contractPolling', mockOwner, mockEmbeddedWallet.address]
    });
    
    expect(query).toBeDefined();
  });

  it('should handle missing dataFeeds gracefully', async () => {
    const dataWithoutFeeds = [...mockSnapshotData];
    dataWithoutFeeds[9] = undefined as any; // dataFeeds index
    
    mockClient.getUiSnapshot.mockResolvedValue(dataWithoutFeeds);
    mockUseBattleNadsClient.mockReturnValue({ client: mockClient, error: null });
    mockUseWallet.mockReturnValue({ embeddedWallet: mockEmbeddedWallet } as any);

    const { result } = renderHook(() => useContractPolling(mockOwner), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.dataFeeds).toEqual([]);
  });

  it('should have correct query configuration', () => {
    mockUseBattleNadsClient.mockReturnValue({ client: mockClient, error: null });
    mockUseWallet.mockReturnValue({ embeddedWallet: mockEmbeddedWallet } as any);

    renderHook(() => useContractPolling(mockOwner), {
      wrapper: createWrapper(),
    });

    const query = queryClient.getQueryCache().find({
      queryKey: ['contractPolling', mockOwner, mockEmbeddedWallet.address]
    });

    expect((query?.options as any).staleTime).toBe(0);
    expect((query?.options as any).gcTime).toBe(0);
    expect((query?.options as any).refetchOnWindowFocus).toBe(true);
    expect((query?.options as any).refetchOnMount).toBe('always');
    expect((query?.options as any).structuralSharing).toBe(false);
  });
});