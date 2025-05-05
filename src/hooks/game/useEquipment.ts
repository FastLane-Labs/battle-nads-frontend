import { useMemo, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBattleNadsClient } from '../contracts/useBattleNadsClient';
import { useWallet } from '../../providers/WalletProvider';
import { useBattleNads } from './useBattleNads';
import type { Weapon, Armor } from '@/types/domain';
import { useToast } from '@chakra-ui/react';
import { EquipmentSlot } from '@/types/domain';

/**
 * Hook for equipment management
 * Provides functions to equip weapons and armor
 */
export const useEquipment = (characterId: string | null) => {
  const { injectedWallet } = useWallet();
  const { client } = useBattleNadsClient();
  const queryClient = useQueryClient();
  const toast = useToast();
  
  // Owner address
  const owner = injectedWallet?.address || null;
  
  // Get game state for character and equipment data
  const {
    gameState,
    isLoading: isGameLoading, 
    error: gameError,
    rawEquipableWeaponIDs,
    rawEquipableWeaponNames,
    rawEquipableArmorIDs,
    rawEquipableArmorNames,
  } = useBattleNads(owner); 
  
  // Character ID from state
  const currentCharacterIdFromState = gameState?.character?.id || null;
  
  // Current equipment
  const currentWeapon = useMemo((): Weapon | null => gameState?.character?.weapon || null, [gameState]);
  const currentArmor = useMemo((): Armor | null => gameState?.character?.armor || null, [gameState]);
  
  // Determine combat status
  const isInCombat = useMemo(() => {
    // Define combat based on presence of combatants
    return (gameState?.combatants?.length ?? 0) > 0;
  }, [gameState]);
  
  // Available equipment
  const equipableWeapons = useMemo(() => {
    if (!rawEquipableWeaponIDs) return [];
    return rawEquipableWeaponIDs.map((id, index) => ({
      id: Number(id), // Ensure ID is number
      name: rawEquipableWeaponNames?.[index] || `Weapon ${id}`
    })) || [];
  }, [rawEquipableWeaponIDs, rawEquipableWeaponNames]);
  
  const equipableArmors = useMemo(() => {
    if (!rawEquipableArmorIDs) return [];
    return rawEquipableArmorIDs.map((id, index) => ({
      id: Number(id), // Ensure ID is number
      name: rawEquipableArmorNames?.[index] || `Armor ${id}`
    })) || [];
  }, [rawEquipableArmorIDs, rawEquipableArmorNames]);
  
  // Mutation for equipping items
  const mutation = useMutation<void, Error, { slot: EquipmentSlot; itemId: number }>({
    mutationFn: async ({ slot, itemId }: { slot: EquipmentSlot; itemId: number }) => {
      if (!client || !characterId) {
        throw new Error('Client or Character ID not available for equipping.');
      }
      // Call the correct client method based on the slot
      if (slot === EquipmentSlot.WEAPON) {
        await client.equipWeapon(characterId, itemId); 
      } else if (slot === EquipmentSlot.ARMOR) {
        await client.equipArmor(characterId, itemId); 
      } else {
        throw new Error(`Invalid equipment slot: ${slot}`);
      }
    },
    onSuccess: (_, variables) => {
      toast({
        title: 'Success',
        description: `${variables.slot} equipped successfully.`,
        status: 'success',
        duration: 3000,
      });
      // Invalidate queries to refetch game state
      queryClient.invalidateQueries({ queryKey: ['uiSnapshot', owner] });
    },
    onError: (error: Error, variables) => {
      toast({
        title: `Error equipping ${variables.slot}`,
        description: error.message || 'An unknown error occurred',
        status: 'error',
        duration: 5000,
      });
    },
  });
  
  // Specific equip functions using the mutation
  const equipWeapon = useCallback((itemId: number) => {
    if (!characterId) return;
    mutation.mutate({ slot: EquipmentSlot.WEAPON, itemId });
  }, [characterId, mutation]);
  
  const equipArmor = useCallback((itemId: number) => {
    if (!characterId) return;
    mutation.mutate({ slot: EquipmentSlot.ARMOR, itemId });
  }, [characterId, mutation]);
  
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
  
  return {
    // Current equipment
    currentWeapon,
    currentArmor,
    
    // Available equipment
    equipableWeapons,
    equipableArmors,
    
    // Equipment actions
    equipWeapon,
    equipArmor,
    isEquippingWeapon: mutation.isPending && mutation.variables?.slot === EquipmentSlot.WEAPON,
    isEquippingArmor: mutation.isPending && mutation.variables?.slot === EquipmentSlot.ARMOR,
    weaponError: mutation.error && mutation.variables?.slot === EquipmentSlot.WEAPON ? mutation.error : null,
    armorError: mutation.error && mutation.variables?.slot === EquipmentSlot.ARMOR ? mutation.error : null,
    
    // Utility functions
    getWeaponName,
    getArmorName,
    
    // Combat state
    isInCombat
  };
}; 