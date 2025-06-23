import { ReactNode, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { bigintSerializer } from '../utils/bigintSerializer';

// Create a client with optimized settings for Battle Nads
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,        // 30 seconds - balance freshness with performance
      gcTime: 1000 * 60 * 60,  // 1 hour - keep data around longer
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

// Create persister for localStorage (only in browser)
const persister = typeof window !== 'undefined' 
  ? createSyncStoragePersister({
      storage: window.localStorage,
      key: 'battleNads-reactQuery-cache',
      serialize: JSON.stringify,
      deserialize: JSON.parse,
    })
  : undefined;

interface ReactQueryProviderProps {
  children: ReactNode;
}

/**
 * Provider for React Query with persistence
 * Provides caching and persistence alongside the existing IndexedDB cache
 */
export const ReactQueryProvider = ({ children }: ReactQueryProviderProps) => {
  // Apply BigInt serializer when the provider mounts
  useEffect(() => {
    // Initialize BigInt serialization
    console.log("[ReactQueryProvider] Initializing BigInt serializer with persistence...");
    const cleanup = bigintSerializer();
    
    // Cleanup on unmount
    return () => {
      console.log("[ReactQueryProvider] Cleaning up BigInt serializer...");
      cleanup();
    };
  }, []);

  // Use persisted client if available, otherwise fall back to regular provider
  if (persister) {
    return (
      <PersistQueryClientProvider 
        client={queryClient} 
        persistOptions={{ persister }}
      >
        {children}
      </PersistQueryClientProvider>
    );
  }

  // Fallback for server-side rendering
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}; 