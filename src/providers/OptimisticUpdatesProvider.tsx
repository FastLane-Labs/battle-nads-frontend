'use client';

import React, { createContext, useContext } from 'react';
import { useOptimisticUpdates, UseOptimisticUpdatesReturn } from '@/hooks/optimistic/useOptimisticUpdates';

const OptimisticUpdatesContext = createContext<UseOptimisticUpdatesReturn | null>(null);

interface OptimisticUpdatesProviderProps {
  children: React.ReactNode;
}

export function OptimisticUpdatesProvider({ children }: OptimisticUpdatesProviderProps) {
  const optimisticUpdates = useOptimisticUpdates();

  return (
    <OptimisticUpdatesContext.Provider value={optimisticUpdates}>
      {children}
    </OptimisticUpdatesContext.Provider>
  );
}

export function useOptimisticUpdatesContext(): UseOptimisticUpdatesReturn {
  const context = useContext(OptimisticUpdatesContext);
  if (!context) {
    throw new Error('useOptimisticUpdatesContext must be used within OptimisticUpdatesProvider');
  }
  return context;
}