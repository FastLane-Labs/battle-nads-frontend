import { ReactNode, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { bigintSerializer } from '../utils/bigintSerializer';

// Create a client with custom serialization handling for BigInt values
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

interface ReactQueryProviderProps {
  children: ReactNode;
}

/**
 * Provider for React Query
 * Replaces the GameDataProvider with a more efficient, standardized approach
 */
export const ReactQueryProvider = ({ children }: ReactQueryProviderProps) => {
  // Apply BigInt serializer when the provider mounts
  useEffect(() => {
    // Initialize BigInt serialization
    console.log("[ReactQueryProvider] Initializing BigInt serializer...");
    const cleanup = bigintSerializer();
    
    // Cleanup on unmount
    return () => {
      console.log("[ReactQueryProvider] Cleaning up BigInt serializer...");
      cleanup();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}; 