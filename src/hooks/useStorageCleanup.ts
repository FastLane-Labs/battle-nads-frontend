/**
 * Hook for managing storage cleanup operations
 * Provides utilities for cleaning up storage data when needed
 */

import { useState, useCallback } from 'react';
import { 
  clearPreviousContractData, 
  forceResetStorage,
  handleContractChange
} from '../utils/contractChangeDetection';
import { logger } from '../utils/logger';

interface StorageCleanupState {
  isClearing: boolean;
  lastClearTime?: number;
  error?: string;
}

export const useStorageCleanup = () => {
  const [state, setState] = useState<StorageCleanupState>({
    isClearing: false
  });

  /**
   * Clears all previous contract data
   */
  const clearContractData = useCallback(async () => {
    if (state.isClearing) return;

    setState(prev => ({ ...prev, isClearing: true, error: undefined }));

    try {
      await clearPreviousContractData();
      setState(prev => ({
        ...prev,
        isClearing: false,
        lastClearTime: Date.now()
      }));
      logger.info('[useStorageCleanup] Successfully cleared contract data');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        isClearing: false,
        error: errorMessage
      }));
      logger.error('[useStorageCleanup] Error clearing contract data', error);
      throw error;
    }
  }, [state.isClearing]);

  /**
   * Forces a complete reset of all storage data
   */
  const forceReset = useCallback(async () => {
    if (state.isClearing) return;

    setState(prev => ({ ...prev, isClearing: true, error: undefined }));

    try {
      await forceResetStorage();
      setState(prev => ({
        ...prev,
        isClearing: false,
        lastClearTime: Date.now()
      }));
      logger.info('[useStorageCleanup] Successfully performed force reset');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        isClearing: false,
        error: errorMessage
      }));
      logger.error('[useStorageCleanup] Error during force reset', error);
      throw error;
    }
  }, [state.isClearing]);

  /**
   * Manually triggers contract change detection and cleanup
   */
  const checkAndHandleContractChange = useCallback(async () => {
    if (state.isClearing) return false;

    setState(prev => ({ ...prev, isClearing: true, error: undefined }));

    try {
      const changeDetected = await handleContractChange();
      setState(prev => ({
        ...prev,
        isClearing: false,
        lastClearTime: changeDetected ? Date.now() : prev.lastClearTime
      }));
      logger.info('[useStorageCleanup] Contract change check completed', { changeDetected });
      return changeDetected;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        isClearing: false,
        error: errorMessage
      }));
      logger.error('[useStorageCleanup] Error during contract change check', error);
      throw error;
    }
  }, [state.isClearing]);

  return {
    // State
    isClearing: state.isClearing,
    lastClearTime: state.lastClearTime,
    error: state.error,
    
    // Actions
    clearContractData,
    forceReset,
    checkAndHandleContractChange,
    
    // Utilities
    canClear: !state.isClearing
  };
};