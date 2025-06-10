import { useMemo, useCallback } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
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
    try {
      const name = await client.getWeaponName(weaponId);
      return name || `Weapon ${weaponId}`;
    } catch (error) {
      console.warn(`Failed to get weapon name for ID ${weaponId}:`, error);
      return `Weapon ${weaponId}`;
    }
  };
  
  // Get armor name
  const getArmorName = async (armorId: number): Promise<string> => {
    if (!client) {
      throw new Error('Client missing');
    }
    try {
      const name = await client.getArmorName(armorId);
      return name || `Armor ${armorId}`;
    } catch (error) {
      console.warn(`Failed to get armor name for ID ${armorId}:`, error);
      return `Armor ${armorId}`;
    }
  };

  // Get weapon details
  const getWeaponDetails = async (weaponId: number): Promise<Weapon> => {
    if (!client) {
      throw new Error('Client missing');
    }
    const contractWeapon = await client.getWeapon(weaponId);
    return {
      id: weaponId,
      name: contractWeapon.name || `Weapon ${weaponId}`,
      baseDamage: Number(contractWeapon.baseDamage) || 0,
      bonusDamage: Number(contractWeapon.bonusDamage) || 0,
      accuracy: Number(contractWeapon.accuracy) || 0,
      speed: Number(contractWeapon.speed) || 0,
    };
  };

  // Get armor details
  const getArmorDetails = async (armorId: number): Promise<Armor> => {
    if (!client) {
      throw new Error('Client missing');
    }
    const contractArmor = await client.getArmor(armorId);
    return {
      id: armorId,
      name: contractArmor.name || `Armor ${armorId}`,
      armorFactor: Number(contractArmor.armorFactor) || 0,
      armorQuality: Number(contractArmor.armorQuality) || 0,
      flexibility: Number(contractArmor.flexibility) || 0,
      weight: Number(contractArmor.weight) || 0,
    };
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
    getWeaponDetails,
    getArmorDetails,
    
    // Combat state
    isInCombat
  };
};

/**
 * Hook for fetching equipment details by ID
 * Uses React-Query for caching
 */
export const useEquipmentDetails = (slot: 'weapon' | 'armor', equipmentId: number | null) => {
  const { client } = useBattleNadsClient();

  return useQuery<Weapon | Armor, Error>({
    queryKey: ['equipmentDetails', slot, equipmentId],
    enabled: !!client && !!equipmentId,
    staleTime: 5 * 60 * 1000, // 5 minutes - equipment stats don't change often
    
    queryFn: async () => {
      if (!client || !equipmentId) throw new Error('Missing client or equipment ID');
      
      if (slot === 'weapon') {
        const contractWeapon = await client.getWeapon(equipmentId);
        return {
          id: equipmentId,
          name: contractWeapon.name || `Weapon ${equipmentId}`,
          baseDamage: Number(contractWeapon.baseDamage) || 0,
          bonusDamage: Number(contractWeapon.bonusDamage) || 0,
          accuracy: Number(contractWeapon.accuracy) || 0,
          speed: Number(contractWeapon.speed) || 0,
        } as Weapon;
      } else {
        const contractArmor = await client.getArmor(equipmentId);
        return {
          id: equipmentId,
          name: contractArmor.name || `Armor ${equipmentId}`,
          armorFactor: Number(contractArmor.armorFactor) || 0,
          armorQuality: Number(contractArmor.armorQuality) || 0,
          flexibility: Number(contractArmor.flexibility) || 0,
          weight: Number(contractArmor.weight) || 0,
        } as Armor;
      }
    },
  });
}; 