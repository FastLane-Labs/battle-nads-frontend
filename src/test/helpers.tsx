import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FC, ReactNode } from 'react';

/**
 * Creates a test QueryClient with settings optimized for testing
 */
export const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

/**
 * Creates a wrapper component with QueryClientProvider for testing hooks
 */
export const createTestWrapper = (client = createTestQueryClient()): FC<{children: ReactNode}> => {
  return ({ children }: {children: ReactNode}) => (
    <QueryClientProvider client={client}>
      {children}
    </QueryClientProvider>
  );
};

/**
 * Mock session key data with configurable expiration
 */
export const mockSessionKeyData = (expired = false) => ({
  owner: '0x0000000000000000000000000000000000000001',
  key: '0x0000000000000000000000000000000000000002',
  balance: 1000000000000000000n,
  targetBalance: 2000000000000000000n,
  ownerCommittedAmount: 10000000000000000000n,
  ownerCommittedShares: 9500000000000000000n,
  expiration: expired ? 100n : 9999999n
});

/**
 * Mock character data for testing
 */
export const mockCharacterData = (customProps = {}) => ({
  id: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  name: 'TestCharacter',
  stats: {
    class: 1,
    buffs: 0,
    debuffs: 0,
    level: 5,
    health: 85,
    maxHealth: 100,
    ...customProps
  }
});

/**
 * Mock client for BattleNadsClient with configurable methods
 */
export const createMockClient = (overrides = {}) => ({
  getUiSnapshot: jest.fn().mockResolvedValue({}),
  getCurrentSessionKeyData: jest.fn().mockResolvedValue(mockSessionKeyData()),
  updateSessionKey: jest.fn().mockResolvedValue({
    wait: jest.fn().mockResolvedValue({})
  }),
  replenishGasBalance: jest.fn().mockResolvedValue({
    wait: jest.fn().mockResolvedValue({})
  }),
  ...overrides
}); 