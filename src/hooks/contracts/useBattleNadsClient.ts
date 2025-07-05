import { useMemo, useState, useEffect, useRef } from 'react';
import { JsonRpcProvider, WebSocketProvider } from 'ethers';
import { useWallet } from '@/providers/WalletProvider';
import { BattleNadsAdapter } from '@/blockchain/adapters/BattleNadsAdapter';
import { ShMonadAdapter } from '@/blockchain/adapters/ShMonadAdapter';
import { BattleNadsClient } from '@/blockchain/clients/BattleNadsClient';
import { ENTRYPOINT_ADDRESS, SHMONAD_ADDRESS, RPC_URLS, ENABLE_WEBSOCKET } from '@/config/env';
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
      // WebSocket disabled, no need to set state - we'll create HTTP provider directly in useMemo
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
      } catch (err) {
        // Fallback to HTTP provider
        setWsProvider(new JsonRpcProvider(RPC_URLS.PRIMARY_HTTP));
        setError(null);
      }
    };

    initializeProvider();

    // No cleanup needed - singleton manages its own lifecycle
  }, []);

  // Create a read-only provider that uses WebSocket for polling only
  const readProvider = useMemo(() => {
    try {
      // Use WebSocket for read-only polling when enabled and available
      if (ENABLE_WEBSOCKET && wsProvider) {
        return wsProvider;
      }
      
      // When WebSocket is disabled, ALWAYS use dedicated HTTP RPC for polling
      // Never use injected wallet providers for polling as they have rate limits
      return new JsonRpcProvider(RPC_URLS.PRIMARY_HTTP);
    } catch (err) {
      setError(`Provider creation failed: ${(err as Error)?.message || "Unknown error"}`);
      return new JsonRpcProvider(RPC_URLS.PRIMARY_HTTP);
    }
  }, [wsProvider]);

  // Create the client with all three adapter types
  const client = useMemo(() => {
    try {
      // Create the adapters
      const readAdapter = new BattleNadsAdapter(ENTRYPOINT_ADDRESS, readProvider);
      
      // Owner adapter (for character creation and session key management)
      const ownerAdapter = injectedWallet?.signer 
        ? new BattleNadsAdapter(ENTRYPOINT_ADDRESS, injectedWallet.signer)
        : null;

      // Owner adapter (for character creation and session key management)
      const shMonadOwnerAdapter = injectedWallet?.signer 
        ? new ShMonadAdapter(SHMONAD_ADDRESS, injectedWallet.signer)
        : null;
      
      const shMonadReadAdapter = new ShMonadAdapter(SHMONAD_ADDRESS, readProvider);
      
      // Session adapter (for game actions using the session key)
      const sessionAdapter = embeddedWallet?.signer
        ? new BattleNadsAdapter(ENTRYPOINT_ADDRESS, embeddedWallet.signer)
        : null;
      
      // Create the client with all adapters
      return new BattleNadsClient({
        read: readAdapter,
        owner: ownerAdapter,
        session: sessionAdapter,
        shmonadOwner: shMonadOwnerAdapter,
        shmonadRead: shMonadReadAdapter
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