/**
 * Contract Change Detection Utility
 * 
 * Detects when the ENTRYPOINT_ADDRESS has changed and manages cleanup of 
 * outdated storage data from previous contract deployments.
 */

import { ENTRYPOINT_ADDRESS } from '../config/env';
import { db } from '../lib/db';
import { logger } from './logger';

// Storage key for tracking the current contract address
const CONTRACT_VERSION_KEY = 'battleNads:currentContract';

/**
 * Checks if the contract address has changed since the last app initialization
 * @returns true if the contract has changed, false otherwise
 */
export const hasContractChanged = (): boolean => {
  try {
    const storedContract = localStorage.getItem(CONTRACT_VERSION_KEY);
    const currentContract = ENTRYPOINT_ADDRESS.toLowerCase();
    
    // If no stored contract, this is first run - not a change
    if (!storedContract) {
      logger.info('[contractChangeDetection] No previous contract stored, treating as first run');
      return false;
    }
    
    const hasChanged = storedContract.toLowerCase() !== currentContract;
    
    if (hasChanged) {
      logger.warn('[contractChangeDetection] Contract address changed', {
        previous: storedContract,
        current: currentContract
      });
    } else {
      logger.debug('[contractChangeDetection] Contract address unchanged', {
        current: currentContract
      });
    }
    
    return hasChanged;
  } catch (error) {
    logger.error('[contractChangeDetection] Error checking contract change', error);
    // On error, assume no change to avoid unnecessary cleanup
    return false;
  }
};

/**
 * Updates the stored contract address to the current one
 */
export const updateStoredContractAddress = (): void => {
  try {
    const currentContract = ENTRYPOINT_ADDRESS.toLowerCase();
    localStorage.setItem(CONTRACT_VERSION_KEY, currentContract);
    logger.info('[contractChangeDetection] Updated stored contract address', {
      contract: currentContract
    });
  } catch (error) {
    logger.error('[contractChangeDetection] Error updating stored contract address', error);
  }
};

/**
 * Clears all storage data related to the previous contract
 * This includes both localStorage character data and IndexedDB event/chat data
 */
export const clearPreviousContractData = async (): Promise<void> => {
  try {
    logger.info('[contractChangeDetection] Starting cleanup of previous contract data');
    
    // Clear character data from localStorage
    // We need to clear all battleNads:character:* keys since they contain the old contract address
    const keysToRemove: string[] = [];
    
    // First, collect all keys to remove (don't modify localStorage during iteration)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('battleNads:character:')) {
        keysToRemove.push(key);
      }
    }
    
    // Then remove all collected keys
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      logger.debug('[contractChangeDetection] Removed localStorage key', { key });
    });
    
    logger.info('[contractChangeDetection] Cleared character data from localStorage', {
      keysRemoved: keysToRemove.length
    });
    
    // Clear all event/chat data from IndexedDB
    // Since we're changing the schema to include contract address, 
    // we should clear all existing data to avoid schema conflicts
    const deletedBlocks = await db.dataBlocks.clear();
    const deletedCharacters = await db.characters.clear();
    
    logger.info('[contractChangeDetection] Cleared IndexedDB data', {
      blocksDeleted: deletedBlocks,
      charactersDeleted: deletedCharacters
    });
    
    logger.info('[contractChangeDetection] Successfully completed cleanup of previous contract data');
  } catch (error) {
    logger.error('[contractChangeDetection] Error clearing previous contract data', error);
    throw error;
  }
};

/**
 * Main function to handle contract change detection and cleanup
 * Should be called during app initialization
 * 
 * @returns true if contract changed and cleanup was performed, false otherwise
 */
export const handleContractChange = async (): Promise<boolean> => {
  const contractChanged = hasContractChanged();
  
  if (contractChanged) {
    logger.info('[contractChangeDetection] Contract change detected, performing cleanup');
    
    try {
      await clearPreviousContractData();
      updateStoredContractAddress();
      
      logger.info('[contractChangeDetection] Contract change handling completed successfully');
      return true;
    } catch (error) {
      logger.error('[contractChangeDetection] Failed to handle contract change', error);
      // Still update the stored contract address to prevent repeated cleanup attempts
      updateStoredContractAddress();
      throw error;
    }
  } else {
    // Always ensure the current contract is stored, even if no change detected
    updateStoredContractAddress();
    return false;
  }
};

/**
 * Force clear all storage data (useful for development/debugging)
 */
export const forceResetStorage = async (): Promise<void> => {
  logger.warn('[contractChangeDetection] Force reset of all storage data requested');
  
  try {
    // Clear all battleNads localStorage keys
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('battleNads:')) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Clear all IndexedDB data
    await db.dataBlocks.clear();
    await db.characters.clear();
    
    logger.info('[contractChangeDetection] Force reset completed', {
      localStorageKeysRemoved: keysToRemove.length
    });
  } catch (error) {
    logger.error('[contractChangeDetection] Error during force reset', error);
    throw error;
  }
};