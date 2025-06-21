import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChakraProvider } from '@chakra-ui/react';
import { useGameState } from '../useGameState';
import { useWallet } from '../../../providers/WalletProvider';
import { useBattleNadsClient } from '../../contracts/useBattleNadsClient';
import { useUiSnapshot } from '../useUiSnapshot';
import { useCachedDataFeed } from '../useCachedDataFeed';
import { useSessionKey } from '../../session/useSessionKey';

// Mock dependencies
jest.mock('../../../providers/WalletProvider');
jest.mock('../../contracts/useBattleNadsClient');
jest.mock('../useUiSnapshot');
jest.mock('../useCachedDataFeed');
jest.mock('../../session/useSessionKey');

const mockUseWallet = useWallet as jest.Mock;
const mockUseBattleNadsClient = useBattleNadsClient as jest.Mock;
const mockUseUiSnapshot = useUiSnapshot as jest.Mock;
const mockUseCachedDataFeed = useCachedDataFeed as jest.Mock;
const mockUseSessionKey = useSessionKey as jest.Mock;

// Test wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ChakraProvider>
        {children}
      </ChakraProvider>
    </QueryClientProvider>
  );
};

// Mock data
const mockWalletData = {
  injectedWallet: { address: '0x123' },
  embeddedWallet: { address: '0x456' },
  connectMetamask: jest.fn(),
  isInitialized: true,
};

const mockClient = {
  moveCharacter: jest.fn(),
  attack: jest.fn(),
  allocatePoints: jest.fn(),
  chat: jest.fn(),
  updateSessionKey: jest.fn(),
};

const mockUiData = {
  character: {
    id: 'char1',
    name: 'Test Character',
    stats: { 
      index: 1n, 
      x: 10n, 
      y: 10n, 
      depth: 1n,
      health: 100n,
      level: 5n,
      strength: 10n,
      vitality: 10n,
      dexterity: 10n,
      quickness: 10n,
      sturdiness: 10n,
      luck: 10n,
      experience: 100n,
      unspentAttributePoints: 0n,
      weaponID: 1n,
      armorID: 1n,
      class: 0n,
      buffs: 0n,
      debuffs: 0n,
      combatantBitMap: 0n,
    },
    weapon: {
      name: 'Test Weapon',
      baseDamage: 10n,
      bonusDamage: 2n,
      accuracy: 85n,
      speed: 90n,
    },
    armor: {
      name: 'Test Armor',
      armorFactor: 5n,
      armorQuality: 80n,
      flexibility: 70n,
      weight: 15n,
    },
    maxHealth: 120n,
    inventory: [100n, 200n, 1000n], // weaponBitmap, armorBitmap, balance
    owner: '0x123',
    activeTask: '0x000',
    activeAbility: {
      ability: 0n,
      stage: 0n,
      targetIndex: 0n,
      taskAddress: '0x000',
      targetBlock: 0n,
    },
    tracker: {
      died: false,
    },
  },
  combatants: [],
  noncombatants: [],
  dataFeeds: [],
  endBlock: 1000n,
  fetchTimestamp: Date.now(),
  characterID: 'char1',
  sessionKeyData: null,
  balanceShortfall: 0n,
  unallocatedAttributePoints: 0n,
  equipableWeaponIDs: [],
  equipableWeaponNames: [],
  equipableArmorIDs: [],
  equipableArmorNames: [],
};

const mockCachedData = {
  historicalBlocks: [],
  processedBlocks: new Set(),
  isHistoryLoading: false,
  getAllCharactersForOwner: jest.fn(),
  getDataSummaryForOwner: jest.fn(),
  addNewEvents: jest.fn(),
};

const mockSessionData = {
  sessionKeyData: null,
  sessionKeyState: null,
  needsUpdate: false,
};

describe('useGameState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseWallet.mockReturnValue(mockWalletData);
    mockUseBattleNadsClient.mockReturnValue({ client: mockClient });
    mockUseUiSnapshot.mockReturnValue({
      data: mockUiData,
      isLoading: false,
      error: null,
    });
    mockUseCachedDataFeed.mockReturnValue(mockCachedData);
    mockUseSessionKey.mockReturnValue(mockSessionData);
  });

  it('should return basic game state data', () => {
    const { result } = renderHook(() => useGameState(), {
      wrapper: createWrapper(),
    });

    expect(result.current.character).toBeDefined();
    expect(result.current.characterId).toBe('char1');
    expect(result.current.owner).toBe('0x123');
    expect(result.current.hasWallet).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it('should include actions when includeActions is true (default)', () => {
    const { result } = renderHook(() => useGameState({ includeActions: true }), {
      wrapper: createWrapper(),
    });

    expect(result.current.moveCharacter).toBeDefined();
    expect(result.current.attack).toBeDefined();
    expect(result.current.allocatePoints).toBeDefined();
    expect(result.current.sendChatMessage).toBeDefined();
    expect(result.current.isMoving).toBe(false);
    expect(result.current.isAttacking).toBe(false);
  });

  it('should exclude actions when includeActions is false', () => {
    const { result } = renderHook(() => useGameState({ includeActions: false }), {
      wrapper: createWrapper(),
    });

    expect(result.current.moveCharacter).toBeUndefined();
    expect(result.current.attack).toBeUndefined();
    expect(result.current.allocatePoints).toBeUndefined();
    expect(result.current.sendChatMessage).toBeUndefined();
  });

  it('should include historical data when includeHistory is true (default)', () => {
    const { result } = renderHook(() => useGameState({ includeHistory: true }), {
      wrapper: createWrapper(),
    });

    expect(result.current.getAllCharactersForOwner).toBeDefined();
    expect(result.current.getDataSummaryForOwner).toBeDefined();
    expect(result.current.historicalBlocks).toBeDefined();
    expect(result.current.isCacheLoading).toBe(false);
  });

  it('should exclude historical data when includeHistory is false', () => {
    const { result } = renderHook(() => useGameState({ includeHistory: false }), {
      wrapper: createWrapper(),
    });

    expect(result.current.getAllCharactersForOwner).toBeUndefined();
    expect(result.current.getDataSummaryForOwner).toBeUndefined();
    expect(result.current.historicalBlocks).toBeUndefined();
    expect(result.current.isCacheLoading).toBe(false);
  });

  it('should include session key data when includeSessionKey is true (default)', () => {
    const sessionData = {
      sessionKeyData: { key: '0x789', owner: '0x123' },
      sessionKeyState: 'valid',
      needsUpdate: false,
    };
    mockUseSessionKey.mockReturnValue(sessionData);

    const { result } = renderHook(() => useGameState({ includeSessionKey: true }), {
      wrapper: createWrapper(),
    });

    expect(result.current.sessionKeyData).toBeDefined();
    expect(result.current.sessionKeyState).toBe('valid');
    expect(result.current.needsSessionKeyUpdate).toBe(false);
  });

  it('should exclude session key data when includeSessionKey is false', () => {
    const { result } = renderHook(() => useGameState({ includeSessionKey: false }), {
      wrapper: createWrapper(),
    });

    expect(result.current.sessionKeyData).toBeUndefined();
    expect(result.current.sessionKeyState).toBeUndefined();
    expect(result.current.needsSessionKeyUpdate).toBeUndefined();
  });

  it('should work in readOnly mode', () => {
    const { result } = renderHook(() => useGameState({ readOnly: true }), {
      wrapper: createWrapper(),
    });

    // Should have data but no actions
    expect(result.current.character).toBeDefined();
    expect(result.current.moveCharacter).toBeUndefined();
    expect(result.current.attack).toBeUndefined();
  });

  it('should handle loading states correctly', () => {
    mockUseUiSnapshot.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });
    mockUseCachedDataFeed.mockReturnValue({
      ...mockCachedData,
      isHistoryLoading: true,
    });

    const { result } = renderHook(() => useGameState(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isSnapshotLoading).toBe(true);
    expect(result.current.isCacheLoading).toBe(true);
  });

  it('should handle error states correctly', () => {
    const testError = new Error('Test error');
    mockUseUiSnapshot.mockReturnValue({
      data: null,
      isLoading: false,
      error: testError,
    });

    const { result } = renderHook(() => useGameState(), {
      wrapper: createWrapper(),
    });

    expect(result.current.error).toBe(testError);
  });

  it('should handle missing wallet', () => {
    mockUseWallet.mockReturnValue({
      injectedWallet: null,
      embeddedWallet: null,
      connectMetamask: jest.fn(),
      isInitialized: true,
    });

    const { result } = renderHook(() => useGameState(), {
      wrapper: createWrapper(),
    });

    expect(result.current.owner).toBe(null);
    expect(result.current.hasWallet).toBe(false);
  });

  it('should calculate position correctly from character data', () => {
    const { result } = renderHook(() => useGameState(), {
      wrapper: createWrapper(),
    });

    expect(result.current.position).toEqual({
      x: 10n,
      y: 10n,
      depth: 1n,
    });
  });

  it('should filter combatants correctly for others', () => {
    const mockDataWithCombatants = {
      ...mockUiData,
      combatants: [
        { 
          id: 'char1', 
          name: 'Test Character',
          index: 1n,
          level: 5n,
          health: 100n,
          maxHealth: 120n,
          class: 0n,
          buffs: 0n,
          debuffs: 0n,
          ability: 0n,
          abilityStage: 0n,
          abilityTargetBlock: 0n,
          weaponName: 'Test Weapon',
          armorName: 'Test Armor',
          isDead: false,
        }, // This is the main character
        { 
          id: 'char2', 
          name: 'Other Character',
          index: 2n,
          level: 3n,
          health: 80n,
          maxHealth: 100n,
          class: 1n,
          buffs: 0n,
          debuffs: 0n,
          ability: 0n,
          abilityStage: 0n,
          abilityTargetBlock: 0n,
          weaponName: 'Other Weapon',
          armorName: 'Other Armor',
          isDead: false,
        },
      ],
    };
    mockUseUiSnapshot.mockReturnValue({
      data: mockDataWithCombatants,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useGameState(), {
      wrapper: createWrapper(),
    });

    expect(result.current.others).toHaveLength(1);
    expect(result.current.others[0].id).toBe('char2');
  });
});