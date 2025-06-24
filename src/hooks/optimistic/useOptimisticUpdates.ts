import { useCallback, useRef, useState, useEffect } from 'react';
import { nanoid } from 'nanoid';

export type OptimisticUpdateType = 'chat' | 'ability' | 'event';

export interface OptimisticUpdate<T = unknown> {
  id: string;
  type: OptimisticUpdateType;
  data: T;
  timestamp: number;
}

export interface OptimisticUpdateOptions<T> {
  deduplicationKey?: (data: T) => string;
}

export interface UseOptimisticUpdatesReturn {
  updates: OptimisticUpdate[];
  addOptimisticUpdate: <T>(
    type: OptimisticUpdateType,
    data: T,
    options?: OptimisticUpdateOptions<T>
  ) => string;
  removeOptimisticUpdate: (id: string) => void;
  getUpdatesByType: <T>(type: OptimisticUpdateType) => OptimisticUpdate<T>[];
  hasOptimisticUpdate: (id: string) => boolean;
  clearAll: () => void;
}


export function useOptimisticUpdates(): UseOptimisticUpdatesReturn {
  const [updates, setUpdates] = useState<OptimisticUpdate[]>([]);
  const updatesRef = useRef<OptimisticUpdate[]>([]);
  const deduplicationKeys = useRef<Map<string, Set<string>>>(new Map());

  // Keep ref in sync with state
  updatesRef.current = updates;


  const addOptimisticUpdate = useCallback(<T>(
    type: OptimisticUpdateType,
    data: T,
    options: OptimisticUpdateOptions<T> = {}
  ): string => {
    const { deduplicationKey } = options;

    // Check for deduplication
    if (deduplicationKey) {
      const key = deduplicationKey(data);
      const typeKeys = deduplicationKeys.current.get(type) || new Set();
      
      if (typeKeys.has(key)) {
        // Update is already present, return empty string to indicate no-op
        return '';
      }
      
      typeKeys.add(key);
      deduplicationKeys.current.set(type, typeKeys);
    }

    const id = nanoid();
    const update: OptimisticUpdate<T> = {
      id,
      type,
      data,
      timestamp: Date.now()
    };

    setUpdates(prev => [...prev, update]);

    return id;
  }, []);

  const removeOptimisticUpdate = useCallback((id: string) => {
    setUpdates(prev => {
      const update = prev.find(u => u.id === id);
      
      // Clean up deduplication key if present
      if (update && update.data && 'deduplicationKey' in update) {
        const typeKeys = deduplicationKeys.current.get(update.type);
        if (typeKeys) {
          // This is a simplified cleanup - in production you'd want to properly track keys
          typeKeys.clear();
        }
      }
      
      return prev.filter(u => u.id !== id);
    });
  }, []);


  const getUpdatesByType = useCallback(<T>(type: OptimisticUpdateType): OptimisticUpdate<T>[] => {
    return updatesRef.current.filter(u => u.type === type) as OptimisticUpdate<T>[];
  }, []);

  const hasOptimisticUpdate = useCallback((id: string): boolean => {
    return updatesRef.current.some(u => u.id === id);
  }, []);

  const clearAll = useCallback(() => {
    deduplicationKeys.current.clear();
    setUpdates([]);
  }, []);



  return {
    updates,
    addOptimisticUpdate,
    removeOptimisticUpdate,
    getUpdatesByType,
    hasOptimisticUpdate,
    clearAll
  };
}