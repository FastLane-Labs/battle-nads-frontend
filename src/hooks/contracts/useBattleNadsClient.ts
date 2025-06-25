import { useMemo, useState, useEffect, useRef } from 'react';
import { JsonRpcProvider, WebSocketProvider } from 'ethers';
import { useWallet } from '@/providers/WalletProvider';
import { BattleNadsAdapter } from '@/blockchain/adapters/BattleNadsAdapter';
import { BattleNadsClient } from '@/blockchain/clients/BattleNadsClient';
import { ENTRYPOINT_ADDRESS, RPC_URLS } from '@/config/env';
import { WebSocketProviderManager } from '@/utils/websocketProvider';

/**
 * Hook for accessing the BattleNadsClient
 * Provides a client instance that manages access to all contract functionality
 */
export const useBattleNadsClient = () => {
  const { injectedWallet, embeddedWallet } = useWallet();
  const [error, setError] = useState<string | null>(null);
  const wsManagerRef = useRef<WebSocketProviderManager | null>(null);

  // Initialize WebSocket provider manager for future event subscriptions
  useEffect(() => {
    if (!wsManagerRef.current) {
      wsManagerRef.current = new WebSocketProviderManager({
        reconnectAttempts: 3,
        reconnectDelay: 1000,
        fallbackToHttp: true,
      });
    }

    // Initialize WebSocket connection in background for event subscriptions
    const initializeProvider = async () => {
      try {
        await wsManagerRef.current!.getProvider();
        setError(null);
      } catch (err) {
        setError(null); // Don't show error to user, HTTP fallback works
      }
    };

    initializeProvider();

    return () => {
      if (wsManagerRef.current) {
        try {
          wsManagerRef.current.destroy();
        } catch (error) {
          // Ignore cleanup errors
        }
        wsManagerRef.current = null;
      }
    };
  }, []);

  // Create a read-only provider that prioritizes reliability for contract reads
  const readProvider = useMemo(() => {
    try {
      // Try to use an existing wallet provider first to save costs
      if (injectedWallet?.provider) {
        return injectedWallet.provider;
      }
      
      if (embeddedWallet?.provider) {
        return embeddedWallet.provider;
      }
      
      // For read operations, use HTTP provider to ensure compatibility
      // WebSocket is reserved for future event subscriptions
      return new JsonRpcProvider(RPC_URLS.PRIMARY_HTTP);
    } catch (err) {
      setError(`Provider creation failed: ${(err as Error)?.message || "Unknown error"}`);
      return new JsonRpcProvider(RPC_URLS.PRIMARY_HTTP);
    }
  }, [injectedWallet?.provider, embeddedWallet?.provider]);

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