import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

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

// Custom serializer that handles BigInt without modifying global JSON
const customSerializer = (data: any): string => {
  return JSON.stringify(data, (key, value) => {
    if (typeof value === 'bigint') {
      return { __type: 'bigint', value: value.toString() };
    }
    return value;
  });
};

// Custom deserializer that restores BigInt values
const customDeserializer = (data: string): any => {
  return JSON.parse(data, (key, value) => {
    if (value && typeof value === 'object' && value.__type === 'bigint') {
      return BigInt(value.value);
    }
    return value;
  });
};

// Create persister for localStorage (only in browser)
const persister = typeof window !== 'undefined' 
  ? createSyncStoragePersister({
      storage: window.localStorage,
      key: 'battleNads-reactQuery-cache',
      serialize: customSerializer,
      deserialize: customDeserializer,
    })
  : undefined;

interface ReactQueryProviderProps {
  children: ReactNode;
}

/**
 * Provider for React Query with persistence
 * This version doesn't modify global JSON methods to avoid conflicts with Privy
 */
export const ReactQueryProvider = ({ children }: ReactQueryProviderProps) => {
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