/**
 * UI-specific types for game state
 * These types represent UI concerns and are built on top of domain types
 */

import { Character, CharacterLite, EventMessage, ChatMessage, SessionKeyData } from '../domain';

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

// UI-specific particle effect for animations
export interface ParticleEffect {
  id: number;
  x: number;
  y: number;
  type: 'damage' | 'heal';
  value: number;
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