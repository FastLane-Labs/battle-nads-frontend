import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBattleNadsClient } from '../contracts/useBattleNadsClient';
import { useWallet } from '../../providers/WalletProvider';
import { useBattleNads } from './useBattleNads';

/**
 * Hook for equipment management
 * Provides functions to equip weapons and armor
 */
export const useEquipment = () => {
  const { injectedWallet } = useWallet();
  const { client } = useBattleNadsClient();
  const queryClient = useQueryClient();
  
  // Owner address
  const owner = injectedWallet?.address || null;
  
  // Get game state for character and equipment data
  const { gameState } = useBattleNads(owner);
  
  // Character ID
  const characterId = gameState?.character?.id || null;
  
  // Current equipment
  const currentWeapon = useMemo(() => gameState?.character?.weapon || null, [gameState]);
  const currentArmor = useMemo(() => gameState?.character?.armor || null, [gameState]);
  
  // Available equipment
  const weaponOptions = useMemo(() => {
    if (!gameState) return [];
    
    return gameState.equipableWeaponIDs?.map((id, index) => ({
      id,
      name: gameState.equipableWeaponNames?.[index] || `Weapon ${id}`
    })) || [];
  }, [gameState]);
  
  const armorOptions = useMemo(() => {
    if (!gameState) return [];
    
    return gameState.equipableArmorIDs?.map((id, index) => ({
      id,
      name: gameState.equipableArmorNames?.[index] || `Armor ${id}`
    })) || [];
  }, [gameState]);

  // Combat state check
  const isInCombat = useMemo(() => {
    return Boolean(gameState?.character?.isInCombat);
  }, [gameState]);
  
  // Mutation for equipping a weapon
  const equipWeaponMutation = useMutation({
    mutationFn: async (weaponId: number) => {
      if (!client || !characterId) {
        throw new Error('Client or character ID missing');
      }
      
      return client.equipWeapon(characterId, weaponId);
    },
    onSuccess: () => {
      // Invalidate and refetch game state
      queryClient.invalidateQueries({ queryKey: ['uiSnapshot', owner] });
    }
  });
  
  // Mutation for equipping armor
  const equipArmorMutation = useMutation({
    mutationFn: async (armorId: number) => {
      if (!client || !characterId) {
        throw new Error('Client or character ID missing');
      }
      
      return client.equipArmor(characterId, armorId);
    },
    onSuccess: () => {
      // Invalidate and refetch game state
      queryClient.invalidateQueries({ queryKey: ['uiSnapshot', owner] });
    }
  });
  
  // Get weapon name
  const getWeaponName = async (weaponId: number): Promise<string> => {
    if (!client) {
      throw new Error('Client missing');
    }
    return client.getWeaponName(weaponId);
  };
  
  // Get armor name
  const getArmorName = async (armorId: number): Promise<string> => {
    if (!client) {
      throw new Error('Client missing');
    }
    return client.getArmorName(armorId);
  };

  // Get stat differences for tooltips (nice-to-have)
  const getEquipmentStatDiff = (itemType: 'weapon' | 'armor', itemId: number) => {
    // Implementation to compare stats between current and selected equipment
    if (!gameState?.character) return null;
    
    const currentStats = itemType === 'weapon' 
      ? currentWeapon 
      : currentArmor;
      
    // Get stats for the selected item
    const selectedItem = itemType === 'weapon'
      ? weaponOptions.find(weapon => weapon.id === itemId)
      : armorOptions.find(armor => armor.id === itemId);
    
    if (!selectedItem || !currentStats) return null;
    
    // This is a placeholder implementation since we don't have access to item stats yet
    // In a real implementation, we would fetch the item stats from the backend
    // Return difference object for tooltip display
    return [
      { 
        statName: 'Power', 
        currentValue: 0, 
        newValue: 0, 
        difference: 0 
      }
    ];
  };
  
  return {
    // Current equipment
    currentWeapon,
    currentArmor,
    
    // Available equipment
    weaponOptions,
    armorOptions,
    
    // Equipment actions
    equipWeapon: (weaponId: number) => equipWeaponMutation.mutate(weaponId),
    isEquippingWeapon: equipWeaponMutation.isPending,
    weaponError: equipWeaponMutation.error ? (equipWeaponMutation.error as Error).message : null,
    
    equipArmor: (armorId: number) => equipArmorMutation.mutate(armorId),
    isEquippingArmor: equipArmorMutation.isPending,
    armorError: equipArmorMutation.error ? (equipArmorMutation.error as Error).message : null,
    
    // Utility functions
    getWeaponName,
    getArmorName,
    
    // New properties
    isInCombat,
    getEquipmentStatDiff
  };
}; 