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
}

const DEFAULT_TIMEOUT_DURATION = 30000; // 30 seconds

export function useOptimisticUpdates(): UseOptimisticUpdatesReturn {
  const [updates, setUpdates] = useState<OptimisticUpdate[]>([]);
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const deduplicationKeys = useRef<Map<string, Set<string>>>(new Map());

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
  }, []);

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

  const rollback = useCallback((id: string) => {
    const update = updates.find(u => u.id === id);
    if (update) {
      // Call rollback callback if provided
      if (update.onRollback) {
        update.onRollback();
      }
      removeOptimisticUpdate(id);
    }
  }, [updates, removeOptimisticUpdate]);

  const rollbackByType = useCallback((type: OptimisticUpdateType) => {
    const updatesOfType = updates.filter(u => u.type === type);
    updatesOfType.forEach(update => rollback(update.id));
  }, [updates, rollback]);

  const getUpdatesByType = useCallback(<T>(type: OptimisticUpdateType): OptimisticUpdate<T>[] => {
    return updates.filter(u => u.type === type) as OptimisticUpdate<T>[];
  }, [updates]);

  const hasOptimisticUpdate = useCallback((id: string): boolean => {
    return updates.some(u => u.id === id);
  }, [updates]);

  const clearAll = useCallback(() => {
    // Clear all timeouts
    timeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId));
    timeoutRefs.current.clear();
    deduplicationKeys.current.clear();
    setUpdates([]);
  }, []);

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
    clearAll
  };
}