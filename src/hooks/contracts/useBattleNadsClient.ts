import { useMemo, useState } from 'react';
import { JsonRpcProvider, Signer } from 'ethers';
import { useWallet } from '../../providers/WalletProvider';
import { BattleNadsAdapter } from '../../blockchain/adapters/BattleNadsAdapter';
import { BattleNadsClient } from '../../blockchain/clients/BattleNadsClient';
import { ENTRYPOINT_ADDRESS, RPC } from '../../config/env';

/**
 * Hook for accessing the BattleNadsClient
 * Provides a client instance that manages access to all contract functionality
 */
export const useBattleNadsClient = () => {
  const { injectedWallet, embeddedWallet } = useWallet();
  const [error, setError] = useState<string | null>(null);

  // Create a read-only provider that falls back to RPC if needed
  const readProvider = useMemo(() => {
    try {
      // Try to use an existing wallet provider first to save RPC costs
      if (injectedWallet?.provider) {
        return injectedWallet.provider;
      }
      
      if (embeddedWallet?.provider) {
        return embeddedWallet.provider;
      }
      
      // Fallback to a JsonRpcProvider
      return new JsonRpcProvider(RPC);
    } catch (err) {
      setError(`Provider creation failed: ${(err as Error)?.message || "Unknown error"}`);
      return new JsonRpcProvider(RPC);
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