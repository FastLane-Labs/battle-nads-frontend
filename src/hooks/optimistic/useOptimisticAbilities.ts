import { useCallback, useMemo } from 'react';
import { useOptimisticUpdatesContext } from '@/providers/OptimisticUpdatesProvider';
import * as domain from '@/types/domain';

interface OptimisticAbilityData {
  abilityIndex: domain.Ability;
  blockUsed: bigint;
  characterId: string;
}

export function useOptimisticAbilities() {
  const { 
    addOptimisticUpdate, 
    removeOptimisticUpdate, 
    getUpdatesByType,
    updates
  } = useOptimisticUpdatesContext();

  // Get all optimistic ability uses
  const optimisticAbilityUses = useMemo(() => {
    const updates = getUpdatesByType<OptimisticAbilityData>('ability');
    return updates.map(update => update.data);
  }, [getUpdatesByType, updates]);

  // Add an optimistic ability use
  const addOptimisticAbilityUse = useCallback((
    abilityIndex: domain.Ability,
    blockUsed: bigint,
    characterId: string
  ): string => {
    const optimisticData: OptimisticAbilityData = {
      abilityIndex,
      blockUsed,
      characterId
    };

    // Add with deduplication to prevent duplicate ability uses
    return addOptimisticUpdate('ability', optimisticData, {
      deduplicationKey: (data) => `${data.characterId}-${data.abilityIndex}`
    });
  }, [addOptimisticUpdate]);

  // Get optimistic ability use for a specific character and ability
  const getOptimisticAbilityUse = useCallback((
    characterId: string,
    abilityIndex: domain.Ability
  ): OptimisticAbilityData | null => {
    const updates = getUpdatesByType<OptimisticAbilityData>('ability');
    const update = updates.find(u => 
      u.data.characterId === characterId && 
      u.data.abilityIndex === abilityIndex
    );
    return update?.data || null;
  }, [getUpdatesByType, updates]);

  // Remove a specific optimistic ability use
  const removeOptimisticAbilityUse = useCallback((updateId: string) => {
    removeOptimisticUpdate(updateId);
  }, [removeOptimisticUpdate]);

  // Clear optimistic ability use when confirmed by blockchain
  const confirmAbilityUse = useCallback((
    characterId: string,
    abilityIndex: domain.Ability
  ) => {
    const updates = getUpdatesByType<OptimisticAbilityData>('ability');
    const update = updates.find(u => 
      u.data.characterId === characterId && 
      u.data.abilityIndex === abilityIndex
    );
    
    if (update) {
      removeOptimisticUpdate(update.id);
    }
  }, [getUpdatesByType, removeOptimisticUpdate, updates]);

  // Clear all ability uses (useful for error recovery)
  const clearAllAbilityUses = useCallback(() => {
    const updates = getUpdatesByType<OptimisticAbilityData>('ability');
    updates.forEach(update => {
      removeOptimisticUpdate(update.id);
    });
  }, [getUpdatesByType, removeOptimisticUpdate]);

  // Check if a specific ability has an optimistic update
  const hasOptimisticAbilityUse = useCallback((
    characterId: string,
    abilityIndex: domain.Ability
  ): boolean => {
    return !!getOptimisticAbilityUse(characterId, abilityIndex);
  }, [getOptimisticAbilityUse]);

  return {
    optimisticAbilityUses,
    addOptimisticAbilityUse,
    getOptimisticAbilityUse,
    removeOptimisticAbilityUse,
    confirmAbilityUse,
    clearAllAbilityUses,
    hasOptimisticAbilityUse
  };
}