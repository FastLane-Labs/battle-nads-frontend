import { useCallback } from 'react';
import { useWallet } from '../../providers/WalletProvider';
import { domain } from '@/types';
import { useGameMutations } from './useGameMutations';
import { useGameData } from './useGameData';
import { GameActions } from './types';

export interface UseGameActionsOptions {
  /** Whether to include wallet integration (default: true) */
  includeWallet?: boolean;
  /** Read-only mode for debug panels (default: false) */
  readOnly?: boolean;
}

/**
 * Layer 2: Game actions business logic
 * Combines mutations with optimistic updates and coordination
 */
export const useGameActions = (options: UseGameActionsOptions = {}): GameActions => {
  const {
    includeWallet = true,
    readOnly = false
  } = options;

  const { connectMetamask, isInitialized: isWalletInitialized } = useWallet();
  
  // Get game data (but only the minimal parts we need for actions)
  const { 
    characterId, 
    owner, 
    rawEndBlock,
    addOptimisticChatMessage 
  } = useGameData({ 
    includeHistory: false, // Actions don't need historical data
    includeSessionKey: true 
  });

  // Get pure mutations
  const mutations = useGameMutations(characterId, owner);

  // Enhanced action functions with optimistic updates
  const enhancedSendChatMessage = useCallback(async (message: string) => {
    // Add optimistic message immediately
    addOptimisticChatMessage(message);
    
    // Then send the actual transaction
    return await mutations.sendChatMessage(message);
  }, [addOptimisticChatMessage, mutations.sendChatMessage]);

  const enhancedUpdateSessionKey = useCallback(async () => {
    if (!rawEndBlock) {
      console.error('[useGameActions] Cannot update session key: no end block available');
      return;
    }
    return await mutations.updateSessionKey(rawEndBlock);
  }, [mutations.updateSessionKey, rawEndBlock]);

  // Return nothing if in read-only mode
  if (readOnly) {
    return {
      // Wallet info
      hasWallet: false,
      connectWallet: () => {},
      isInitialized: isWalletInitialized,
      isWalletInitialized,

      // Action functions (disabled)
      moveCharacter: async (_direction: any) => {},
      attack: async (_targetCharacterIndex: number) => {},
      allocatePoints: async (_strength: bigint, _vitality: bigint, _dexterity: bigint, _quickness: bigint, _sturdiness: bigint, _luck: bigint) => {},
      sendChatMessage: async (_message: string) => {},
      updateSessionKey: async () => {},

      // Action states (all false)
      isMoving: false,
      isAttacking: false,
      isAllocatingPoints: false,
      isSendingChat: false,
      isUpdatingSessionKey: false,

      // Action errors (all null)
      moveError: null,
      attackError: null,
      allocatePointsError: null,
      chatError: null,
      sessionKeyError: null,
      
      // Additional required functions
      addOptimisticChatMessage: (_message: string) => {},
    };
  }

  return {
    // Wallet info
    hasWallet: Boolean(owner),
    connectWallet: includeWallet ? connectMetamask : () => {},
    isInitialized: isWalletInitialized,
    isWalletInitialized,

    // Enhanced action functions
    moveCharacter: mutations.moveCharacter,
    attack: mutations.attack,
    allocatePoints: mutations.allocatePoints,
    sendChatMessage: enhancedSendChatMessage,
    updateSessionKey: enhancedUpdateSessionKey,

    // Action states
    isMoving: mutations.isMoving,
    isAttacking: mutations.isAttacking,
    isAllocatingPoints: mutations.isAllocatingPoints,
    isSendingChat: mutations.isSendingChat,
    isUpdatingSessionKey: mutations.isUpdatingSessionKey,

    // Action errors
    moveError: mutations.moveError,
    attackError: mutations.attackError,
    allocatePointsError: mutations.allocatePointsError,
    chatError: mutations.chatError,
    sessionKeyError: mutations.sessionKeyError,
    
    // Additional required functions  
    addOptimisticChatMessage,
  };
};