import { useQuery } from '@tanstack/react-query';
import { useContracts } from './useContracts';
import { PollResponse } from '@/types/gameTypes';
import * as battleNadsService from '@services/battleNadsService';

/**
 * React Query hook for fetching frontend data
 * This will replace the manual polling implementation
 */
export const useFrontendData = (owner: string | null, options = {
  refetchInterval: 1000, // 1 second polling interval
  staleTime: 500,        // allows optimistic UI updates
  enabled: true,         // whether polling is enabled
}) => {
  const { readContract } = useContracts();
  const { refetchInterval, staleTime, enabled } = options;
  
  return useQuery<PollResponse>({
    queryKey: ['frontendData', owner],
    queryFn: async () => {
      if (!owner) {
        throw new Error('Owner address is required');
      }
      
      if (!readContract) {
        throw new Error('Contract not initialized');
      }
      
      return battleNadsService.pollFrontendData(readContract, {
        owner,
        startBlock: 0 // TODO: Optimize by tracking the highest seen block
      });
    },
    refetchInterval: enabled ? refetchInterval : false,
    staleTime,
    enabled: Boolean(owner && readContract && enabled),
  });
};

/**
 * Hook for creating a character
 */
export const useCreateCharacter = () => {
  const { embeddedContract } = useContracts();
  
  const createCharacter = async (characterClass: number, name: string) => {
    if (!embeddedContract) {
      throw new Error('Embedded contract not initialized');
    }
    
    return battleNadsService.createCharacter(embeddedContract, characterClass, name);
  };
  
  return { createCharacter };
};

/**
 * Hook for moving a character
 */
export const useMoveCharacter = () => {
  const { embeddedContract } = useContracts();
  
  const moveCharacter = async (direction: 'north' | 'south' | 'east' | 'west' | 'up' | 'down') => {
    if (!embeddedContract) {
      throw new Error('Embedded contract not initialized');
    }
    
    return battleNadsService.moveCharacter(embeddedContract, direction);
  };
  
  return { moveCharacter };
};

/**
 * Hook for sending chat messages
 */
export const useChatMessage = () => {
  const { embeddedContract } = useContracts();
  
  const sendChatMessage = async (message: string) => {
    if (!embeddedContract) {
      throw new Error('Embedded contract not initialized');
    }
    
    return battleNadsService.sendChatMessage(embeddedContract, message);
  };
  
  return { sendChatMessage };
};

/**
 * Hook for combat actions
 */
export const useCombatActions = () => {
  const { embeddedContract } = useContracts();
  
  const attackTarget = async (targetIndex: number) => {
    if (!embeddedContract) {
      throw new Error('Embedded contract not initialized');
    }
    
    return battleNadsService.attackTarget(embeddedContract, targetIndex);
  };
  
  const useAbility = async (ability: number, targetIndex?: number) => {
    if (!embeddedContract) {
      throw new Error('Embedded contract not initialized');
    }
    
    return battleNadsService.useAbility(embeddedContract, ability, targetIndex);
  };
  
  return { attackTarget, useAbility };
};

/**
 * Hook for equipment actions
 */
export const useEquipment = () => {
  const { embeddedContract } = useContracts();
  
  const equipWeapon = async (weaponId: number) => {
    if (!embeddedContract) {
      throw new Error('Embedded contract not initialized');
    }
    
    return battleNadsService.equipWeapon(embeddedContract, weaponId);
  };
  
  const equipArmor = async (armorId: number) => {
    if (!embeddedContract) {
      throw new Error('Embedded contract not initialized');
    }
    
    return battleNadsService.equipArmor(embeddedContract, armorId);
  };
  
  return { equipWeapon, equipArmor };
};

/**
 * Hook for character stats
 */
export const useCharacterStats = () => {
  const { embeddedContract } = useContracts();
  
  const allocatePoints = async (
    strength: number,
    vitality: number,
    dexterity: number,
    quickness: number,
    sturdiness: number,
    luck: number
  ) => {
    if (!embeddedContract) {
      throw new Error('Embedded contract not initialized');
    }
    
    return battleNadsService.allocatePoints(
      embeddedContract,
      strength,
      vitality,
      dexterity,
      quickness,
      sturdiness,
      luck
    );
  };
  
  return { allocatePoints };
};

/**
 * Hook for session key management
 */
export const useSessionKey = () => {
  const { embeddedContract } = useContracts();
  
  const updateSessionKey = async (
    characterId: string,
    sessionKey: string,
    expirationBlocks: number = 100000
  ) => {
    if (!embeddedContract) {
      throw new Error('Embedded contract not initialized');
    }
    
    return battleNadsService.updateSessionKey(
      embeddedContract,
      characterId,
      sessionKey,
      expirationBlocks
    );
  };
  
  const getCurrentSessionKey = async (characterId: string) => {
    if (!embeddedContract) {
      throw new Error('Embedded contract not initialized');
    }
    
    return battleNadsService.getCurrentSessionKey(embeddedContract, characterId);
  };
  
  const isSessionKeyExpired = async (characterId: string) => {
    if (!embeddedContract) {
      throw new Error('Embedded contract not initialized');
    }
    
    return battleNadsService.isSessionKeyExpired(embeddedContract, characterId);
  };
  
  return { updateSessionKey, getCurrentSessionKey, isSessionKeyExpired };
}; 