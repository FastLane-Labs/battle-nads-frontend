import { renderHook, act, waitFor } from '@testing-library/react';
import { useGame } from '../useGame';
import { useBattleNads } from '../useBattleNads';
import { useSessionKey } from '../../session/useSessionKey';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { isValidCharacterId } from '../../../utils/getCharacterLocalStorageKey';
import { SessionKeyState } from '@/types/domain/session';

// Mock dependencies
jest.mock('../useBattleNads');
jest.mock('../../session/useSessionKey');
jest.mock('../../../providers/WalletProvider', () => ({
  useWallet: jest.fn().mockReturnValue({
    injectedWallet: { address: '0x0000000000000000000000000000000000000001' },
    embeddedWallet: { address: '0x0000000000000000000000000000000000000002' },
    connectMetamask: jest.fn(),
    isInitialized: true
  }),
}));

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
  const mockCharacter = { id: mockCharacterId, name: 'TestCharacter', position: { x: 1, y: 1, depth: 1 } };
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
    
    (useBattleNads as jest.Mock).mockReturnValue({
      gameState: mockBaseGameState,
      isLoading: false,
      error: null,
      refetch: jest.fn()
    });
    
    (useSessionKey as jest.Mock).mockReturnValue({
      sessionKeyState: SessionKeyState.VALID,
      sessionKey: { key: mockSessionKeyAddress, expiration: '9999999', owner: mockOwner },
      needsUpdate: false,
      isLoading: false,
      refreshSessionKey: jest.fn()
    });

    (jest.requireMock('../../../providers/WalletProvider').useWallet as jest.Mock).mockReturnValue({
      injectedWallet: { address: mockOwner },
      embeddedWallet: { address: mockSessionKeyAddress },
      connectMetamask: jest.fn(),
      isInitialized: true
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
      gameState: { ...mockBaseGameState, character: { id: zeroAddress, name: '', position: {x:0, y:0, depth:0} } },
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
      sessionKey: { key: mockSessionKeyAddress, expiration: '10', owner: mockOwner },
      needsUpdate: true,
      isLoading: false,
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
    // Session key also loading initially, state is undetermined (null)
    (useSessionKey as jest.Mock).mockReturnValue({
      sessionKeyState: null, // State is null while loading
      sessionKey: null,
      needsUpdate: false,
      isLoading: true,
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
      sessionKey: { key: mockSessionKeyAddress, expiration: '9999999', owner: mockOwner },
      needsUpdate: false,
      isLoading: false,
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