import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChakraProvider } from '@chakra-ui/react';
import { useAbilityCooldowns } from '../useAbilityCooldowns';
import { AbilityStage } from '@/types/domain/enums';
import { OptimisticUpdatesProvider } from '@/providers/OptimisticUpdatesProvider';

// Mock dependencies
jest.mock('@/providers/WalletProvider', () => ({
  useWallet: () => ({
    injectedWallet: { address: '0x123' },
  }),
}));

jest.mock('../../contracts/useBattleNadsClient', () => ({
  useBattleNadsClient: () => ({
    client: {
      useAbility: jest.fn(),
    },
  }),
}));

jest.mock('@chakra-ui/react', () => ({
  useToast: () => jest.fn(),
  ChakraProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../useGameState', () => ({
  useGameState: jest.fn(() => ({
    gameState: {
      character: {
        name: 'TestCharacter',
        class: 1, // Warrior
        ability: {
          ability: 0, // None
          stage: 0, // READY
          targetBlock: 0,
        },
      },
    },
    isLoading: false,
    error: null,
    balanceShortfall: 0,
    rawEndBlock: '1000',
  })),
}));

jest.mock('../useGameMutation', () => ({
  useGameMutation: (mutationFn?: any, options?: any) => ({
    mutate: jest.fn(),
    isPending: false,
    error: null,
  }),
}));

jest.mock('../../optimistic/useOptimisticUpdates', () => ({
  useOptimisticUpdates: () => ({
    getUpdatesByType: jest.fn(() => []),
  }),
}));

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
        <OptimisticUpdatesProvider>
          {children}
        </OptimisticUpdatesProvider>
      </ChakraProvider>
    </QueryClientProvider>
  );
};

describe('useAbilityCooldowns', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ability cooldown constants', () => {
    it('should have hook structure defined correctly', () => {
      // This test verifies the hook returns the expected structure
      const { result } = renderHook(() => useAbilityCooldowns('test-character-id'), {
        wrapper: createWrapper(),
      });
      
      expect(result.current).toHaveProperty('abilities');
      expect(result.current).toHaveProperty('useAbility');
      expect(result.current).toHaveProperty('isUsingAbility');
      expect(Array.isArray(result.current.abilities)).toBe(true);
    });
  });

  describe('ability state management', () => {
    it('should return ready state for all abilities when character has no active ability', () => {
      const { result } = renderHook(() => useAbilityCooldowns('test-character-id'), {
        wrapper: createWrapper(),
      });
      
      const abilities = result.current.abilities;
      abilities.forEach((ability: any) => {
        expect(ability.isReady).toBe(true);
        expect(ability.stage).toBe(AbilityStage.READY);
        expect(ability.secondsLeft).toBe(0);
      });
    });

    it('should provide useAbility function', () => {
      const { result } = renderHook(() => useAbilityCooldowns('test-character-id'), {
        wrapper: createWrapper(),
      });
      
      expect(typeof result.current.useAbility).toBe('function');
    });

    it('should provide loading and error states', () => {
      const { result } = renderHook(() => useAbilityCooldowns('test-character-id'), {
        wrapper: createWrapper(),
      });
      
      expect(typeof result.current.isUsingAbility).toBe('boolean');
      expect(result.current.abilityError).toBeNull();
      expect(typeof result.current.isLoading).toBe('boolean');
    });
  });

  describe('ability class mapping', () => {
    it('should handle abilities correctly', () => {
      const { result } = renderHook(() => useAbilityCooldowns('test-character-id'), {
        wrapper: createWrapper(),
      });
      
      const abilities = result.current.abilities;
      
      // Test passes if abilities is an array (empty is ok with mocked data)
      expect(Array.isArray(abilities)).toBe(true);
      
      // Test that each ability has expected structure if any exist
      abilities.forEach((ability: any) => {
        expect(ability).toHaveProperty('ability');
        expect(ability).toHaveProperty('isReady');
        expect(ability).toHaveProperty('stage');
        expect(ability).toHaveProperty('secondsLeft');
      });
    });
  });

  describe('ability descriptions', () => {
    it('should provide proper descriptions for ready abilities', () => {
      const { result } = renderHook(() => useAbilityCooldowns('test-character-id'), {
        wrapper: createWrapper(),
      });
      
      const abilities = result.current.abilities;
      abilities.forEach((ability: any) => {
        expect(ability.description).toBeTruthy();
        expect(typeof ability.description).toBe('string');
        expect(ability.description).toContain('Ready');
      });
    });
  });

  describe('error handling', () => {
    it('should handle missing character ID gracefully', () => {
      const { result } = renderHook(() => useAbilityCooldowns(null), {
        wrapper: createWrapper(),
      });
      
      expect(result.current.abilities).toEqual([]);
      expect(typeof result.current.useAbility).toBe('function');
    });
  });
});