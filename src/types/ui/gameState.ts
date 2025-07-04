/**
 * UI-specific types for game state
 * These types represent UI concerns and are built on top of domain types
 */

import { Character, CharacterLite, EventMessage, ChatMessage, SessionKeyData, AbilityState } from '../domain';

// UI-specific game state updates tracker
export interface GameUpdates {
  owner: boolean;
  character: boolean;
  sessionKey: boolean;
  others: boolean[]; // Should be 64-length array of boolean - responds to battleNad.index
  position: boolean;
  combat: boolean;
  eventLogs: boolean;
  chatLogs: boolean;
  lastBlock: boolean;
  error: boolean;
}

// UI-specific particle effect for animations (damage numbers, healing, status effects)
export interface ParticleEffect {
  id: number;
  x: number;
  y: number;
  type: 'damage' | 'heal' | 'buff' | 'debuff';
  value: number;
  duration?: number; // Optional animation duration
}

// UI state type to centralize all UI states
export type GameUIState = 
  | 'loading'           // General loading state
  | 'error'             // Unrecoverable error
  | 'need-wallet'       // No wallet connected
  | 'need-embedded-wallet' // No embedded wallet
  | 'need-character'    // No character found
  | 'session-key-warning' // Session key needs updating
  | 'ready';            // Game is ready to play

// Full UI game state combining domain data with UI-specific flags
export interface GameState {
  // Domain data
  owner: string | null;
  character: Character | null;
  others: CharacterLite[]; // Should be 64-length array of CharacterLite
  position: { x: number; y: number; depth: number };
  eventLogs: EventMessage[];
  chatLogs: ChatMessage[];
  sessionKey: SessionKeyData;
  lastBlock: number;
  characterID: string;
  combatants: CharacterLite[];
  noncombatants: CharacterLite[];
  equipableWeaponIDs: number[];
  equipableWeaponNames: string[];
  equipableArmorIDs: number[];
  equipableArmorNames: string[];
  unallocatedAttributePoints: number;
  balanceShortfall: number;
  
  // UI-specific flags
  updates: GameUpdates;
  loading?: boolean;
  error?: string | null;
}

/**
 * Interface for game action functions
 * Ensures consistent Promise return types for all mutations
 */
export interface GameActionFunctions {
  // Core actions
  moveCharacter: (direction: import('../domain').Direction) => Promise<any>;
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