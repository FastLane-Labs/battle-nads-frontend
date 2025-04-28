/**
 * Type index for Battle Nads
 * 
 * This file organizes all types by their domain/purpose:
 * 
 * 1. Core contracts - Basic data structures representing on-chain entities
 * 2. Game state - Business logic and game state management
 * 3. UI components - Types for the presentation layer
 */

// ----------------------------------------------------------------------------
// Contract data structures and primitives
// ----------------------------------------------------------------------------

// Import and re-export enums as values since they're used as runtime values
import { Direction, Ability, CharacterClass, StatusEffect, LogType } from './battleNadsTypes';
export { Direction, Ability, CharacterClass, StatusEffect, LogType };

// Export object structures as types
export type {
  // Contract data structures
  Log,
  BattleNadStats,
  Weapon,
  Armor,
  Inventory, 
  AbilityTracker,
  BattleNad,
  BattleNadLite,
  SessionKeyData,
  DataFeed,
  PollFrontendDataReturn
} from './battleNadsTypes';

// Transaction options
export interface TransactionOptions {
  gasLimit?: number | bigint;
  value?: bigint;
  gasPrice?: bigint;
  nonce?: number;
}

// ----------------------------------------------------------------------------
// Game state and business logic
// ----------------------------------------------------------------------------

export type {
  // Game state
  GameState,
  Position,
  MovementOptions,
  ChatMessage,
  EventMessage
} from './gameTypes';

// ----------------------------------------------------------------------------
// UI components and presentation
// ----------------------------------------------------------------------------

export type {
  GameUIState,
  GameUpdates,
  ParticleEffect
} from './gameTypes'; 