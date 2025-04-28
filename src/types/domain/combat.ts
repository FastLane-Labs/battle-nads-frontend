/**
 * Domain types for combat-related concepts
 * These types represent game logic and are independent of UI or contract specifics
 */

import { LogType } from './enums';

export interface MovementOptions {
  canMoveNorth: boolean;
  canMoveSouth: boolean;
  canMoveEast: boolean;
  canMoveWest: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

export interface EventMessage {
  message: string;
  timestamp: number;
  type: LogType;
}

export interface ChatMessage {
  characterName: string;
  message: string;
  timestamp: number;
}

export interface CombatLog {
  logType: LogType;
  index: number;
  mainPlayerIndex: number;
  otherPlayerIndex: number;
  hit: boolean;
  critical: boolean;
  damageDone: number;
  healthHealed: number;
  targetDied: boolean;
  lootedWeaponID: number;
  lootedArmorID: number;
  experience: number;
  value: number;
}

export interface DataFeed {
  blockNumber: number;
  logs: CombatLog[];
  chatLogs: string[];
} 