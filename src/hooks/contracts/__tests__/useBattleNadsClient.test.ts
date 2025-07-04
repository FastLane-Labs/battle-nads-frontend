import { renderHook } from '@testing-library/react';
import { useBattleNadsClient } from '../useBattleNadsClient';
import { useWallet } from '../../../providers/WalletProvider';
import { JsonRpcProvider, Signer } from 'ethers';
import { BattleNadsAdapter } from '../../../blockchain/adapters/BattleNadsAdapter';
import { BattleNadsClient } from '../../../blockchain/clients/BattleNadsClient';

// Mock dependencies
jest.mock('../../../providers/WalletProvider');
jest.mock('../../../blockchain/adapters/BattleNadsAdapter');
jest.mock('../../../blockchain/clients/BattleNadsClient');
jest.mock('ethers');

// Mock the config to disable WebSocket for consistent tests
jest.mock('../../../config/env', () => ({
  ENABLE_WEBSOCKET: false,
  RPC_URLS: {
    PRIMARY_HTTP: 'http://localhost:8545',
    PRIMARY_WS: 'ws://localhost:8546'
  },
  ENTRYPOINT_ADDRESS: '0x123'
}));

// Mock the WebSocket provider module
jest.mock('../../../utils/websocketProvider', () => ({
  createWebSocketProvider: jest.fn()
}));

describe('useBattleNadsClient', () => {
  // Setup mock implementations
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock JsonRpcProvider
    (JsonRpcProvider as jest.Mock).mockImplementation(() => ({
      send: jest.fn()
    }));
    
    // Mock BattleNadsAdapter
    (BattleNadsAdapter as jest.Mock).mockImplementation(() => ({
      getUiSnapshot: jest.fn(),
      getCurrentSessionKeyData: jest.fn()
    }));
    
    // Mock BattleNadsClient
    (BattleNadsClient as jest.Mock).mockImplementation(() => ({
      getUiSnapshot: jest.fn(),
      getCurrentSessionKeyData: jest.fn()
    }));
    
    // Mock wallet provider with both wallets available
    (useWallet as jest.Mock).mockReturnValue({
      injectedWallet: { 
        provider: { send: jest.fn() }, 
        signer: { provider: { send: jest.fn() } } 
      },
      embeddedWallet: { 
        provider: { send: jest.fn() }, 
        signer: { provider: { send: jest.fn() } } 
      }
    });
  });
  
  it('creates client with all adapters when wallets are available', () => {
    const { result } = renderHook(() => useBattleNadsClient());
    
    expect(result.current.client).not.toBeNull();
    expect(result.current.error).toBeNull();
    
    // Should have created adapters
    expect(BattleNadsAdapter).toHaveBeenCalledTimes(3); // read, owner, session
    expect(BattleNadsClient).toHaveBeenCalledTimes(1);
    
    // Check that client was created with all three adapters
    expect(BattleNadsClient).toHaveBeenCalledWith({
      read: expect.any(Object),
      owner: expect.any(Object),
      session: expect.any(Object)
    });
  });
  
  it('creates client with only read adapter when wallets are unavailable', () => {
    // Mock wallet provider with no wallets
    (useWallet as jest.Mock).mockReturnValue({
      injectedWallet: null,
      embeddedWallet: null
    });
    
    const { result } = renderHook(() => useBattleNadsClient());
    
    expect(result.current.client).not.toBeNull();
    expect(result.current.error).toBeNull();
    
    // Should have created only 1 adapter (read) when WebSocket is disabled
    expect(BattleNadsAdapter).toHaveBeenCalledTimes(1);
    
    // Check that client was created with only read adapter
    expect(BattleNadsClient).toHaveBeenCalledWith({
      read: expect.any(Object),
      owner: null,
      session: null
    });
  });
  
  it('falls back to JsonRpcProvider if both wallet providers are unavailable', () => {
    // Mock wallet provider with provider but no signer
    (useWallet as jest.Mock).mockReturnValue({
      injectedWallet: { provider: null, signer: null },
      embeddedWallet: { provider: null, signer: null }
    });
    
    const { result } = renderHook(() => useBattleNadsClient());
    
    // Should have created a JsonRpcProvider
    expect(JsonRpcProvider).toHaveBeenCalled();
    expect(result.current.client).not.toBeNull();
  });
  
  it('handles errors during client creation', () => {
    // Force an error during client creation
    (BattleNadsClient as jest.Mock).mockImplementation(() => {
      throw new Error('Client creation failed');
    });
    
    const { result } = renderHook(() => useBattleNadsClient());
    
    expect(result.current.client).toBeNull();
    expect(result.current.error).toMatch(/Client creation failed/);
  });
  
  it('handles errors during provider creation', () => {
    // Mock JsonRpcProvider to throw only on the first call
    (JsonRpcProvider as jest.Mock)
      .mockImplementationOnce(() => { // First call throws
        throw new Error('Provider creation failed');
      })
      .mockImplementation(() => { // Subsequent calls succeed (return minimal mock)
        // Return a basic mock object sufficient for BattleNadsAdapter constructor
        return { /* Can add mock methods if adapter uses them */ }; 
      });

    // And remove wallet providers
    (useWallet as jest.Mock).mockReturnValue({
      injectedWallet: null,
      embeddedWallet: null
    });

    const { result } = renderHook(() => useBattleNadsClient());

    // Should have called JsonRpcProvider twice:
    // 1. First call in readProvider useMemo throws error
    // 2. Second call in catch block succeeds
    expect(JsonRpcProvider).toHaveBeenCalledTimes(2);
    expect(result.current.error).toMatch(/Provider creation failed/);
    // Check client is not null because fallback provider succeeded
    expect(result.current.client).not.toBeNull(); 
  });
}); 