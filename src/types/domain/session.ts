/**
 * Domain types for session-related concepts
 * These types represent authentication and session management
 */

/**
 * Session key validation states
 */
export enum SessionKeyState {
  VALID = 'valid',
  EXPIRED = 'expired',
  INVALID = 'invalid',
  MISMATCHED = 'mismatched',
}

/**
 * Structure of the session key data
 */
export interface SessionKeyData {
  key: string;
  signature: string;
  expiry: number;
  owner: string;
}

/**
 * Result of session key validation
 */
export interface SessionKeyValidation {
  state: SessionKeyState;
  message?: string;
  data?: SessionKeyData;
}

export interface WorldSnapshot {
  characterID: string;
  sessionKeyData: SessionKeyData;
  character: any; // Will reference Character from ./character
  combatants: any[]; // Will reference CharacterLite[] from ./character
  noncombatants: any[]; // Will reference CharacterLite[] from ./character
  movementOptions: any; // Will reference MovementOptions from ./combat
  eventLogs: any[]; // Will reference EventMessage[] from ./combat
  chatLogs: any[]; // Will reference ChatMessage[] from ./combat
  balanceShortfall: number;
  unallocatedAttributePoints: number;
  lastBlock: number;
} 