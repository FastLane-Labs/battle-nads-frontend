import { useCallback, useRef, useState, useEffect } from 'react';
import { nanoid } from 'nanoid';

export type OptimisticUpdateType = 'chat' | 'ability' | 'event';

export type RollbackStrategy = 'timeout' | 'explicit' | 'confirmation';

export interface OptimisticUpdate<T = unknown> {
  id: string;
  type: OptimisticUpdateType;
  data: T;
  timestamp: number;
  rollbackStrategy: RollbackStrategy;
  timeoutDuration?: number;
  onRollback?: () => void;
}

export interface OptimisticUpdateOptions<T> {
  rollbackStrategy?: RollbackStrategy;
  timeoutDuration?: number;
  onRollback?: () => void;
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
  rollback: (id: string) => void;
  rollbackByType: (type: OptimisticUpdateType) => void;
  getUpdatesByType: <T>(type: OptimisticUpdateType) => OptimisticUpdate<T>[];
  hasOptimisticUpdate: (id: string) => boolean;
  clearAll: () => void;
  removeConfirmedUpdates: <T>(
    type: OptimisticUpdateType,
    confirmedItems: T[],
    matcher: (optimisticData: T, confirmedItem: T) => boolean
  ) => void;
}

const DEFAULT_TIMEOUT_DURATION = 30000; // 30 seconds

export function useOptimisticUpdates(): UseOptimisticUpdatesReturn {
  const [updates, setUpdates] = useState<OptimisticUpdate[]>([]);
  const updatesRef = useRef<OptimisticUpdate[]>([]);
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const deduplicationKeys = useRef<Map<string, Set<string>>>(new Map());

  // Keep ref in sync with state
  updatesRef.current = updates;

  const rollback = useCallback((id: string) => {
    setUpdates(prev => {
      const update = prev.find(u => u.id === id);
      if (update) {
        // Call rollback callback if provided
        if (update.onRollback) {
          update.onRollback();
        }
        // Remove the update from state
        return prev.filter(u => u.id !== id);
      }
      return prev;
    });
    
    // Clean up timeout and deduplication separately
    const timeoutId = timeoutRefs.current.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutRefs.current.delete(id);
    }
  }, []);

  const addOptimisticUpdate = useCallback(<T>(
    type: OptimisticUpdateType,
    data: T,
    options: OptimisticUpdateOptions<T> = {}
  ): string => {
    const {
      rollbackStrategy = 'timeout',
      timeoutDuration = DEFAULT_TIMEOUT_DURATION,
      onRollback,
      deduplicationKey
    } = options;

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
      timestamp: Date.now(),
      rollbackStrategy,
      timeoutDuration,
      onRollback
    };

    setUpdates(prev => [...prev, update]);

    // Set up automatic rollback for timeout strategy
    if (rollbackStrategy === 'timeout' && timeoutDuration) {
      const timeoutId = setTimeout(() => {
        rollback(id);
      }, timeoutDuration);
      
      timeoutRefs.current.set(id, timeoutId);
    }

    return id;
  }, [rollback]);

  const removeOptimisticUpdate = useCallback((id: string) => {
    // Clear any pending timeout
    const timeoutId = timeoutRefs.current.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutRefs.current.delete(id);
    }

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

  const rollbackByType = useCallback((type: OptimisticUpdateType) => {
    setUpdates(prev => {
      const updatesOfType = prev.filter(u => u.type === type);
      updatesOfType.forEach(update => {
        if (update.onRollback) {
          update.onRollback();
        }
        // Clean up timeout
        const timeoutId = timeoutRefs.current.get(update.id);
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutRefs.current.delete(update.id);
        }
      });
      return prev.filter(u => u.type !== type);
    });
  }, []);

  const getUpdatesByType = useCallback(<T>(type: OptimisticUpdateType): OptimisticUpdate<T>[] => {
    return updatesRef.current.filter(u => u.type === type) as OptimisticUpdate<T>[];
  }, []);

  const hasOptimisticUpdate = useCallback((id: string): boolean => {
    return updatesRef.current.some(u => u.id === id);
  }, []);

  const clearAll = useCallback(() => {
    // Clear all timeouts
    timeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId));
    timeoutRefs.current.clear();
    deduplicationKeys.current.clear();
    setUpdates([]);
  }, []);

  const removeConfirmedUpdates = useCallback(<T>(
    type: OptimisticUpdateType,
    confirmedItems: T[],
    matcher: (optimisticData: T, confirmedItem: T) => boolean
  ) => {
    const updatesOfType = getUpdatesByType<T>(type);
    
    const toRemove: string[] = [];
    
    updatesOfType.forEach(optimisticUpdate => {
      const hasConfirmedVersion = confirmedItems.some(confirmedItem => 
        matcher(optimisticUpdate.data, confirmedItem)
      );
      
      if (hasConfirmedVersion) {
        toRemove.push(optimisticUpdate.id);
      }
    });
    
    // Remove all confirmed updates
    toRemove.forEach(id => removeOptimisticUpdate(id));
  }, [getUpdatesByType, removeOptimisticUpdate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId));
    };
  }, []);

  return {
    updates,
    addOptimisticUpdate,
    removeOptimisticUpdate,
    rollback,
    rollbackByType,
    getUpdatesByType,
    hasOptimisticUpdate,
    clearAll,
    removeConfirmedUpdates
  };
}