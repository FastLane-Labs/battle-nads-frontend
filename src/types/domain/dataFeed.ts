/**
 * Domain types for combat-related concepts
 * These types represent game logic and are independent of UI or contract specifics
 */

import { LogType } from './enums';

// Represents a character involved in an event (sender, attacker, defender)
export interface EventParticipant {
  id: string; // bytes32
  name: string;
  index: number; // uint8 - Location index
}

// Represents a structured event log entry for UI/domain logic
export interface EventMessage {
  logIndex: number; // uint16 - Original index from contract Log
  blocknumber: bigint; // Add blocknumber field
  timestamp: number; // blockNumber
  type: LogType;
  attacker?: EventParticipant;
  defender?: EventParticipant;
  isPlayerInitiated: boolean; // Flag if the player character initiated
  details: {
    // Raw details from contract.Log, mapped appropriately
    hit?: boolean;
    critical?: boolean;
    damageDone?: number; // uint16
    healthHealed?: number; // uint16
    targetDied?: boolean;
    lootedWeaponID?: number; // uint8
    lootedArmorID?: number; // uint8
    experience?: number; // uint16
    value?: bigint | string; // uint128 (keep as bigint or string?)
    // Add other potential details for non-combat events if needed
  };
  displayMessage: string; // Pre-formatted message for simple display
  count?: number; // Optional: For coalescing identical sequential events
}

// Represents a structured chat log entry
export interface ChatMessage {
  logIndex: number; // uint16 - Original index from contract Log
  blocknumber: bigint; // blockNumber
  timestamp: number; // timestamp
  sender: EventParticipant;
  message: string;
  isOptimistic?: boolean; // Flag for locally added messages
}