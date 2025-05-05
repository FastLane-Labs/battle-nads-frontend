import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useGame } from '../useGame';
import { useBattleNads } from '../useBattleNads';
import { useSessionKey } from '@/hooks/session/useSessionKey';
import { useWallet } from '@/providers/WalletProvider';
import { usePrivy } from '@privy-io/react-auth';
import { useBattleNadsClient } from '@/hooks/contracts/useBattleNadsClient';
import { SessionKeyState } from '@/machines/sessionKeyMachine';
import { mockCharacterData, mockSessionKeyData } from '@/test/helpers';
import { domain } from '@/types';
import { db } from '@/lib/db'; // Import db for mocking
import { isValidCharacterId } from '@/utils/getCharacterLocalStorageKey';
import { DEFAULT_SESSION_KEY_DATA } from '@/types/domain/session';

// Mock dependencies using Jest
jest.mock('../useBattleNads');
jest.mock('@/hooks/session/useSessionKey');
jest.mock('@/providers/WalletProvider');
jest.mock('@/hooks/contracts/useBattleNadsClient');
jest.mock('@privy-io/react-auth');

// Mock Dexie db operations used by useCachedDataFeed (indirect dependency)
jest.mock('@/lib/db', () => ({
  db: {
    dataBlocks: {
      where: jest.fn().mockReturnThis(),
      equals: jest.fn().mockReturnThis(),
      and: jest.fn().mockReturnThis(),
      reverse: jest.fn().mockReturnThis(),
      sortBy: jest.fn().mockResolvedValue([]),
      toArray: jest.fn().mockResolvedValue([]),
      below: jest.fn().mockReturnThis(),
      delete: jest.fn().mockResolvedValue(0),
      bulkPut: jest.fn().mockResolvedValue(undefined),
    },
    transaction: jest.fn((mode: any, tables: any, fn: any) => fn()),
  }
}));

// Type safety for mocks
const mockUseBattleNads = useBattleNads as jest.Mock;
const mockUseSessionKey = useSessionKey as jest.Mock;
const mockUseWallet = useWallet as jest.Mock;
const mockUsePrivy = usePrivy as jest.Mock;
const mockUseBattleNadsClient = useBattleNadsClient as jest.Mock; // Added type casting for client mock

// Create a simple wrapper function manually instead of using the helper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useGame', () => {
  const mockOwner = '0x0000000000000000000000000000000000000001';
  const mockCharacterId = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  const zeroAddress = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const mockSessionKeyAddress = '0x0000000000000000000000000000000000000002';
  // const mockCharacter = { id: mockCharacterId, name: 'TestCharacter', position: { x: 1, y: 1, depth: 1 } };
  // Use the helper function to create a typed mock
  // Cast to domain.Character as the helper might return a partial type initially
  const mockCharacter = mockCharacterData({ id: mockCharacterId }) as unknown as domain.Character;
  const mockBaseGameState = { 
    character: mockCharacter,
    combatants: [],
    noncombatants: [],
    eventLogs: [],
    chatLogs: [],
    balanceShortfall: 0,
    unallocatedAttributePoints: 0,
    movementOptions: { canMoveNorth: true },
    lastBlock: 100,
    position: { x: 1, y: 1, depth: 1 },
    id: mockCharacterId
  };
  const wrapper = createWrapper();
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseBattleNads.mockReturnValue({
      gameState: mockBaseGameState,
      isLoading: false,
      error: null,
      refetch: jest.fn()
    });
    
    mockUseSessionKey.mockReturnValue({
      sessionKeyState: SessionKeyState.VALID,
      sessionKeyData: mockSessionKeyData(false),
      needsUpdate: false,
      isLoading: false,
      error: null,
      currentBlock: 500,
      refreshSessionKey: jest.fn()
    });

    mockUseWallet.mockReturnValue({
      injectedWallet: { address: mockOwner },
      embeddedWallet: { address: mockSessionKeyAddress },
      connectMetamask: jest.fn(),
      isInitialized: true
    });
    
    // Add default mock for useBattleNadsClient
    mockUseBattleNadsClient.mockReturnValue({
       client: {
          moveCharacter: jest.fn().mockResolvedValue({ wait: jest.fn().mockResolvedValue({}) }),
          attack: jest.fn().mockResolvedValue({ wait: jest.fn().mockResolvedValue({}) }),
          sendChatMessage: jest.fn().mockResolvedValue({ wait: jest.fn().mockResolvedValue({}) }),
          updateSessionKey: jest.fn().mockResolvedValue({ wait: jest.fn().mockResolvedValue({}) }),
       }
    });

    mockUsePrivy.mockReturnValue({
      authenticated: true,
      user: { wallet: { address: mockOwner } },
    });
  });
  
  it('resolves to ready state when all conditions met', async () => {
    const { result } = renderHook(() => useGame(), { wrapper });
    
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.hasWallet).toBe(true);
    expect(result.current.characterId).toBe(mockCharacterId);
    expect(isValidCharacterId(result.current.characterId)).toBe(true);
    expect(result.current.needsSessionKeyUpdate).toBe(false);
    expect(result.current.character).toEqual(mockCharacter);
    expect(result.current.worldSnapshot).toBeDefined();
    expect(result.current.worldSnapshot?.characterID).toBe(mockCharacterId);
    expect(result.current.worldSnapshot?.sessionKeyData?.key).toBe(mockSessionKeyAddress);
  });
  
  it('detects missing character', async () => {
    (useBattleNads as jest.Mock).mockReturnValue({
      // Use mockCharacterData for the missing character state, ensuring type compatibility
      gameState: { ...mockBaseGameState, character: { ...(mockCharacterData({ id: zeroAddress }) as unknown as domain.Character), id: zeroAddress, name: '' } },
      isLoading: false,
      error: null,
      refetch: jest.fn()
    });
    
    const { result } = renderHook(() => useGame(), { wrapper });
    
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.hasWallet).toBe(true);
    expect(result.current.characterId).toBe(zeroAddress);
    expect(isValidCharacterId(result.current.characterId)).toBe(false);
    expect(result.current.character?.id).toBe(zeroAddress);
    expect(result.current.needsSessionKeyUpdate).toBe(false);
  });
  
  it('detects invalid session key', async () => {
    (useSessionKey as jest.Mock).mockReturnValue({
      sessionKeyState: SessionKeyState.EXPIRED,
      sessionKeyData: mockSessionKeyData(true),
      needsUpdate: true,
      isLoading: false,
      error: null,
      currentBlock: 100,
      refreshSessionKey: jest.fn()
    });
        
    const { result } = renderHook(() => useGame(), { wrapper });
    
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await waitFor(() => expect(result.current.needsSessionKeyUpdate).toBe(true));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.hasWallet).toBe(true);
    expect(result.current.characterId).toBe(mockCharacterId);
    expect(result.current.needsSessionKeyUpdate).toBe(true);
    expect(result.current.sessionKeyState).toBe(SessionKeyState.EXPIRED);
  });
  
  it('handles loading states correctly', async () => {
    // Simulate initial loading state from useBattleNads
    (useBattleNads as jest.Mock).mockReturnValue({
      gameState: null,
      isLoading: true,
      error: null,
      refetch: jest.fn()
    });
    // Session key also loading initially
    (useSessionKey as jest.Mock).mockReturnValue({
      sessionKeyState: SessionKeyState.MISSING,
      sessionKeyData: undefined,
      needsUpdate: true,
      isLoading: true,
      error: null,
      currentBlock: 0,
      refreshSessionKey: jest.fn()
    });

    const { result, rerender } = renderHook(() => useGame(), { wrapper });

    // Check initial loading state
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBe(null);
    expect(result.current.characterId).toBe(null);
    expect(result.current.worldSnapshot).toBe(null);

    (useBattleNads as jest.Mock).mockReturnValue({
      gameState: mockBaseGameState,
      isLoading: false,
      error: null,
      refetch: jest.fn()
    });
    (useSessionKey as jest.Mock).mockReturnValue({
      sessionKeyState: SessionKeyState.VALID,
      sessionKeyData: mockSessionKeyData(false),
      needsUpdate: false,
      isLoading: false,
      error: null,
      currentBlock: 500,
      refreshSessionKey: jest.fn()
    });

    rerender();

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.hasWallet).toBe(true);
    expect(result.current.characterId).toBe(mockCharacterId);
    expect(result.current.needsSessionKeyUpdate).toBe(false);
    expect(result.current.character).toEqual(mockCharacter);
    expect(result.current.worldSnapshot).toBeDefined();
  });
  
  it('handles game actions correctly', async () => {
    const { result } = renderHook(() => useGame(), { wrapper });
    
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    
    expect(typeof result.current.moveCharacter).toBe('function');
    expect(typeof result.current.attack).toBe('function');
    expect(typeof result.current.sendChatMessage).toBe('function');
    expect(typeof result.current.updateSessionKey).toBe('function');
  });
  
  it('handles error states', async () => {
    const mockError = 'Failed to load game data';
    (useBattleNads as jest.Mock).mockReturnValue({
      gameState: null,
      isLoading: false,
      error: mockError,
      refetch: jest.fn()
    });
    
    const { result } = renderHook(() => useGame(), { wrapper });
    
    await waitFor(() => expect(result.current.error).toBe(mockError));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(mockError);
    expect(result.current.hasWallet).toBe(true);
    expect(result.current.characterId).toBe(null);
    expect(result.current.worldSnapshot).toBe(null);
  });

  // --- NEW Test Cases for isInCombat --- 

  it('should return isInCombat: false when combatants array is empty', async () => {
    (useBattleNads as jest.Mock).mockReturnValue({
      gameState: {
        ...mockBaseGameState,
        combatants: [], // Ensure empty array
      },
      isLoading: false,
      error: null,
      refetch: jest.fn()
    });
    
    const { result } = renderHook(() => useGame(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isInCombat).toBe(false);
  });

  it('should return isInCombat: true when combatants array has items', async () => {
    const mockCombatant = { id: 'combatant1', name: 'Goblin' }; 
    (useBattleNads as jest.Mock).mockReturnValue({
      gameState: {
        ...mockBaseGameState,
        combatants: [mockCombatant], // Ensure non-empty array
      },
      isLoading: false,
      error: null,
      refetch: jest.fn()
    });
    
    const { result } = renderHook(() => useGame(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isInCombat).toBe(true);
  });
  // --- END NEW Test Cases --- 
}); 