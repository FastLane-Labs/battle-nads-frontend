import { useMemo, useState, useEffect, useRef } from 'react';
import { JsonRpcProvider, WebSocketProvider } from 'ethers';
import { useWallet } from '@/providers/WalletProvider';
import { BattleNadsAdapter } from '@/blockchain/adapters/BattleNadsAdapter';
import { BattleNadsClient } from '@/blockchain/clients/BattleNadsClient';
import { ENTRYPOINT_ADDRESS, RPC_URLS, ENABLE_WEBSOCKET } from '@/config/env';
import { createWebSocketProvider } from '@/utils/websocketProvider';

/**
 * Hook for accessing the BattleNadsClient
 * Provides a client instance that manages access to all contract functionality
 */
export const useBattleNadsClient = () => {
  const { injectedWallet, embeddedWallet } = useWallet();
  const [error, setError] = useState<string | null>(null);
  const [wsProvider, setWsProvider] = useState<WebSocketProvider | JsonRpcProvider | null>(null);

  // Initialize WebSocket provider manager (if enabled)
  useEffect(() => {
    if (!ENABLE_WEBSOCKET) {
      // WebSocket disabled, use HTTP directly
      console.log('📡 [BattleNads] WebSocket disabled by feature flag - Using HTTP polling');
      setWsProvider(new JsonRpcProvider(RPC_URLS.PRIMARY_HTTP));
      return;
    }

    // Initialize WebSocket connection for polling (using singleton)
    const initializeProvider = async () => {
      try {
        const wsManager = createWebSocketProvider({
          reconnectAttempts: 1, // Reduce to prevent connection spam
          reconnectDelay: 5000, // Longer delay to respect rate limits
          fallbackToHttp: true,
        });
        
        const provider = await wsManager.getProvider();
        setWsProvider(provider);
        setError(null);
        
        // Log provider type for debugging
        const providerType = provider.constructor.name;
        if (providerType === 'WebSocketProvider') {
          console.log('🔌 [BattleNads] Using WebSocket for contract polling - Real-time updates enabled');
        } else {
          console.log('📡 [BattleNads] Using HTTP fallback for contract polling');
        }
      } catch (err) {
        console.warn('❌ [BattleNads] WebSocket initialization failed, using HTTP fallback:', (err as Error)?.message || 'Unknown error');
        // Fallback to HTTP provider
        setWsProvider(new JsonRpcProvider(RPC_URLS.PRIMARY_HTTP));
        setError(null);
      }
    };

    initializeProvider();

    // No cleanup needed - singleton manages its own lifecycle
  }, []);

  // Create a read-only provider that prefers WebSocket for polling
  const readProvider = useMemo(() => {
    try {
      // Try to use an existing wallet provider first to save costs
      if (injectedWallet?.provider) {
        return injectedWallet.provider;
      }
      
      if (embeddedWallet?.provider) {
        return embeddedWallet.provider;
      }
      
      // Use WebSocket provider if available, otherwise fallback to HTTP
      if (wsProvider) {
        return wsProvider;
      }
      
      // Final fallback to HTTP JsonRpcProvider
      return new JsonRpcProvider(RPC_URLS.PRIMARY_HTTP);
    } catch (err) {
      setError(`Provider creation failed: ${(err as Error)?.message || "Unknown error"}`);
      return new JsonRpcProvider(RPC_URLS.PRIMARY_HTTP);
    }
  }, [injectedWallet?.provider, embeddedWallet?.provider, wsProvider]);

  // Create the client with all three adapter types
  const client = useMemo(() => {
    try {
      // Create the adapters
      const readAdapter = new BattleNadsAdapter(ENTRYPOINT_ADDRESS, readProvider);
      
      // Owner adapter (for character creation and session key management)
      const ownerAdapter = injectedWallet?.signer 
        ? new BattleNadsAdapter(ENTRYPOINT_ADDRESS, injectedWallet.signer)
        : null;
      
      // Session adapter (for game actions using the session key)
      const sessionAdapter = embeddedWallet?.signer
        ? new BattleNadsAdapter(ENTRYPOINT_ADDRESS, embeddedWallet.signer)
        : null;
      
      // Create the client with all adapters
      return new BattleNadsClient({
        read: readAdapter,
        owner: ownerAdapter,
        session: sessionAdapter
      });
    } catch (err) {
      setError(`Client creation failed: ${(err as Error)?.message || "Unknown error"}`);
      return null;
    }
  }, [readProvider, injectedWallet?.signer, embeddedWallet?.signer]);

  return { client, error };
};

// Export a new index file that will replace the old contracts hooks
export * from './useBattleNadsClient'; 