/**
 * BattleNads Service Layer
 * 
 * Contains pure functions for interacting with the BattleNads contract.
 * This layer is separate from React hooks and UI concerns.
 */

import { ethers } from 'ethers';
import { 
  PollResponse, 
  BattleNadUnformatted, 
  BattleNadLiteUnformatted, 
  CharacterClass, 
  Ability,
  StatusEffect
} from '@/types/gameTypes';

// Type for contract interface - will be replaced with TypeChain generated types later
type BattleNadsContract = any;

/**
 * Arguments for polling frontend data
 */
export interface PollArgs { 
  owner: string; 
  startBlock: number;
}

/**
 * Polls the BattleNads contract for frontend data
 * This is a pure wrapper around the contract's pollForFrontendData function
 */
export const pollFrontendData = async (
  contract: BattleNadsContract, 
  args: PollArgs
): Promise<PollResponse> => {
  try {
    const { owner, startBlock } = args;
    
    if (!owner) {
      throw new Error('Owner address is required for polling');
    }
    
    const data = await contract.pollForFrontendData(owner, startBlock);
    return data;
  } catch (error) {
    console.error('[battleNadsService] Error polling frontend data:', error);
    throw error;
  }
};

/**
 * Creates a new character
 */
export const createCharacter = async (
  contract: BattleNadsContract,
  characterClass: CharacterClass,
  name: string
): Promise<string> => {
  try {
    const tx = await contract.createCharacter(characterClass, name);
    const receipt = await tx.wait();
    
    // Extract character ID from event logs
    const event = receipt.logs.find((log: any) => 
      log.fragment && log.fragment.name === 'CharacterCreated'
    );
    
    if (!event) {
      throw new Error('Character created but no ID was returned');
    }
    
    return event.args.characterID;
  } catch (error) {
    console.error('[battleNadsService] Error creating character:', error);
    throw error;
  }
};

/**
 * Moves character in a direction
 */
export const moveCharacter = async (
  contract: BattleNadsContract,
  direction: 'north' | 'south' | 'east' | 'west' | 'up' | 'down'
): Promise<boolean> => {
  try {
    let tx;
    switch (direction) {
      case 'north':
        tx = await contract.moveNorth();
        break;
      case 'south':
        tx = await contract.moveSouth();
        break;
      case 'east':
        tx = await contract.moveEast();
        break;
      case 'west':
        tx = await contract.moveWest();
        break;
      case 'up':
        tx = await contract.moveUp();
        break;
      case 'down':
        tx = await contract.moveDown();
        break;
    }
    
    await tx.wait();
    return true;
  } catch (error) {
    console.error(`[battleNadsService] Error moving ${direction}:`, error);
    throw error;
  }
};

/**
 * Sends a chat message
 */
export const sendChatMessage = async (
  contract: BattleNadsContract,
  message: string
): Promise<boolean> => {
  try {
    const tx = await contract.zoneChat(message);
    await tx.wait();
    return true;
  } catch (error) {
    console.error('[battleNadsService] Error sending chat message:', error);
    throw error;
  }
};

/**
 * Attacks a target
 */
export const attackTarget = async (
  contract: BattleNadsContract,
  targetIndex: number
): Promise<boolean> => {
  try {
    const tx = await contract.attack(targetIndex);
    await tx.wait();
    return true;
  } catch (error) {
    console.error('[battleNadsService] Error attacking target:', error);
    throw error;
  }
};

/**
 * Equips a weapon
 */
export const equipWeapon = async (
  contract: BattleNadsContract,
  weaponId: number
): Promise<boolean> => {
  try {
    const tx = await contract.equipWeapon(weaponId);
    await tx.wait();
    return true;
  } catch (error) {
    console.error('[battleNadsService] Error equipping weapon:', error);
    throw error;
  }
};

/**
 * Equips armor
 */
export const equipArmor = async (
  contract: BattleNadsContract,
  armorId: number
): Promise<boolean> => {
  try {
    const tx = await contract.equipArmor(armorId);
    await tx.wait();
    return true;
  } catch (error) {
    console.error('[battleNadsService] Error equipping armor:', error);
    throw error;
  }
};

/**
 * Allocates attribute points
 */
export const allocatePoints = async (
  contract: BattleNadsContract,
  strength: number,
  vitality: number,
  dexterity: number,
  quickness: number,
  sturdiness: number,
  luck: number
): Promise<boolean> => {
  try {
    const tx = await contract.allocatePoints(
      strength,
      vitality,
      dexterity,
      quickness,
      sturdiness,
      luck
    );
    await tx.wait();
    return true;
  } catch (error) {
    console.error('[battleNadsService] Error allocating points:', error);
    throw error;
  }
};

/**
 * Updates session key
 */
export const updateSessionKey = async (
  contract: BattleNadsContract,
  characterId: string,
  sessionKey: string,
  expirationBlocks: number = 100000
): Promise<boolean> => {
  try {
    const tx = await contract.updateSessionKey(characterId, sessionKey, expirationBlocks);
    await tx.wait();
    return true;
  } catch (error) {
    console.error('[battleNadsService] Error updating session key:', error);
    throw error;
  }
};

/**
 * Gets current session key
 */
export const getCurrentSessionKey = async (
  contract: BattleNadsContract,
  characterId: string
): Promise<{ key: string; expiration: number } | null> => {
  try {
    const sessionKey = await contract.getSessionKey(characterId);
    return {
      key: sessionKey.key,
      expiration: sessionKey.expiration
    };
  } catch (error) {
    console.error('[battleNadsService] Error getting session key:', error);
    return null;
  }
};

/**
 * Checks if a session key is expired
 */
export const isSessionKeyExpired = async (
  contract: BattleNadsContract,
  characterId: string
): Promise<boolean> => {
  try {
    const { expiration } = await getCurrentSessionKey(contract, characterId) || { expiration: 0 };
    if (!expiration) return true;
    
    const provider = contract.runner.provider;
    const currentBlock = await provider.getBlockNumber();
    
    return currentBlock >= expiration;
  } catch (error) {
    console.error('[battleNadsService] Error checking session key expiration:', error);
    return true; // Assume expired on error
  }
};

/**
 * Uses character ability
 */
export const useAbility = async (
  contract: BattleNadsContract,
  ability: Ability,
  targetIndex?: number
): Promise<boolean> => {
  try {
    let tx;
    
    if (targetIndex !== undefined) {
      tx = await contract.useAbility(ability, targetIndex);
    } else {
      tx = await contract.useAbility(ability);
    }
    
    await tx.wait();
    return true;
  } catch (error) {
    console.error('[battleNadsService] Error using ability:', error);
    throw error;
  }
}; 