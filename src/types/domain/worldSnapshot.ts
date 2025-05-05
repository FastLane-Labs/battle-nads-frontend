/**
 * Domain types for world snapshot
 * Represents the full game state at a given moment
 */

import { Character, CharacterLite } from './character';
import { ChatMessage, EventMessage } from './dataFeed';
import { SessionKeyData } from './session';

/**
 * Complete domain model for the game world state
 * This acts as the central model for game logic
 */
export interface WorldSnapshot {
  characterID: string;
  sessionKeyData: SessionKeyData | null;
  character: Character | null;
  combatants: CharacterLite[]; 
  noncombatants: CharacterLite[];
  eventLogs: EventMessage[];
  chatLogs: ChatMessage[];
  balanceShortfall: number;
  unallocatedAttributePoints: number;
  
  // Tracking
  lastBlock: number;
  
  // Not included but available via mappers or UI layer
  // - Equipment lists (weapons, armor)
}