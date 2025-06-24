import { domain } from '../../types';

/**
 * Interface for game action functions
 * Ensures consistent Promise return types for all mutations
 */
export interface GameActionFunctions {
  // Core actions
  moveCharacter: (direction: domain.Direction) => Promise<any>;
  attack: (targetCharacterIndex: number) => Promise<any>;
  allocatePoints: (strength: bigint, vitality: bigint, dexterity: bigint, quickness: bigint, sturdiness: bigint, luck: bigint) => Promise<any>;
  sendChatMessage: (message: string) => Promise<any>;
  updateSessionKey: () => Promise<any>;
  
  // Optimistic actions
  addOptimisticChatMessage: (message: string) => void;
}

/**
 * Interface for game action states
 */
export interface GameActionStates {
  // Loading states
  isMoving: boolean;
  isAttacking: boolean;
  isAllocatingPoints: boolean;
  isSendingChat: boolean;
  isUpdatingSessionKey: boolean;
  
  // Error states
  moveError: Error | null;
  attackError: Error | null;
  allocatePointsError: Error | null;
  chatError: Error | null;
  sessionKeyError: Error | null;
}

/**
 * Interface for wallet-related functionality
 */
export interface WalletFunctions {
  hasWallet: boolean;
  connectWallet: () => void;
  isInitialized: boolean;
  isWalletInitialized: boolean;
}

/**
 * Complete game actions interface
 */
export interface GameActions extends GameActionFunctions, GameActionStates, WalletFunctions {}