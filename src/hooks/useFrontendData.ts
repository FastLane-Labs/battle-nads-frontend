import { useQuery } from '@tanstack/react-query';
import { useBattleNadsClient } from './contracts/useBattleNadsClient';
import { PollResponse } from '@/types/gameTypes';
import { PollFrontendDataReturn, Direction } from '@/types/contracts/BattleNadsEntrypoint';

/**
 * React Query hook for fetching frontend data
 * This will replace the manual polling implementation
 */
export const useFrontendData = (owner: string | null, options = {
  refetchInterval: 1000, // 1 second polling interval
  staleTime: 500,        // allows optimistic UI updates
  enabled: true,         // whether polling is enabled
}) => {
  const { client } = useBattleNadsClient();
  const { refetchInterval, staleTime, enabled } = options;
  
  return useQuery<PollFrontendDataReturn>({
    queryKey: ['frontendData', owner],
    queryFn: async () => {
      if (!owner) {
        throw new Error('Owner address is required');
      }
      
      if (!client) {
        throw new Error('Client not initialized');
      }
      
      return client.getUiSnapshot(owner, BigInt(0)); // TODO: Optimize by tracking the highest seen block
    },
    refetchInterval: enabled ? refetchInterval : false,
    staleTime,
    enabled: Boolean(owner && client && enabled),
  });
};

/**
 * Hook for creating a character
 */
export const useCreateCharacter = () => {
  const { client } = useBattleNadsClient();
  
  const createCharacter = async (characterClass: number, name: string) => {
    if (!client) {
      throw new Error('Client not initialized');
    }
    
    return client.createCharacter(characterClass, name);
  };
  
  return { createCharacter };
};

/**
 * Hook for moving a character
 */
export const useMoveCharacter = () => {
  const { client } = useBattleNadsClient();
  
  const moveCharacter = async (characterId: string, direction: Direction) => {
    if (!client) {
      throw new Error('Client not initialized');
    }
    
    return client.moveCharacter(characterId, direction);
  };
  
  return { moveCharacter };
};

/**
 * Hook for sending chat messages
 */
export const useChatMessage = () => {
  const { client } = useBattleNadsClient();
  
  const sendChatMessage = async (characterId: string, message: string) => {
    if (!client) {
      throw new Error('Client not initialized');
    }
    
    return client.chat(characterId, message);
  };
  
  return { sendChatMessage };
};

/**
 * Hook for combat actions
 */
export const useCombatActions = () => {
  const { client } = useBattleNadsClient();
  
  const attackTarget = async (characterId: string, targetIndex: number) => {
    if (!client) {
      throw new Error('Client not initialized');
    }
    
    return client.attack(characterId, targetIndex);
  };
  
  const useAbility = async (characterId: string, ability: number, targetIndex: number) => {
    if (!client) {
      throw new Error('Client not initialized');
    }
    
    return client.useAbility(characterId, ability, targetIndex);
  };
  
  return { attackTarget, useAbility };
};

/**
 * Hook for equipment actions
 */
export const useEquipment = () => {
  const { client } = useBattleNadsClient();
  
  const equipWeapon = async (characterId: string, weaponId: number) => {
    if (!client) {
      throw new Error('Client not initialized');
    }
    
    return client.equipWeapon(characterId, weaponId);
  };
  
  const equipArmor = async (characterId: string, armorId: number) => {
    if (!client) {
      throw new Error('Client not initialized');
    }
    
    return client.equipArmor(characterId, armorId);
  };
  
  return { equipWeapon, equipArmor };
};

/**
 * Hook for character stats
 */
export const useCharacterStats = () => {
  const { client } = useBattleNadsClient();
  
  const allocatePoints = async (
    characterId: string,
    strength: bigint,
    vitality: bigint,
    dexterity: bigint,
    quickness: bigint,
    sturdiness: bigint,
    luck: bigint
  ) => {
    if (!client) {
      throw new Error('Client not initialized');
    }
    
    return client.allocatePoints(
      characterId,
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
  const { client } = useBattleNadsClient();
  
  const updateSessionKey = async (
    characterId: string,
    sessionKey: string,
    expirationBlocks: number = 100000
  ) => {
    if (!client) {
      throw new Error('Client not initialized');
    }
    
    return client.updateSessionKey(
      characterId,
      sessionKey,
      expirationBlocks
    );
  };
  
  const getCurrentSessionKey = async (characterId: string) => {
    if (!client) {
      throw new Error('Client not initialized');
    }
    
    return client.getSessionKey(characterId);
  };
  
  const isSessionKeyExpired = async (characterId: string) => {
    if (!client) {
      throw new Error('Client not initialized');
    }
    
    return client.isSessionKeyExpired(characterId);
  };
  
  return { updateSessionKey, getCurrentSessionKey, isSessionKeyExpired };
}; 