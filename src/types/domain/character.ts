/**
 * Domain types for character-related concepts
 * These types represent game logic and are independent of UI or contract specifics
 */

import { CharacterClass, StatusEffect, Ability } from './enums';
import { BaseWeapon, BaseArmor, BaseCharacter, BaseCharacterLite } from '@/types/base';
import { CombatTracker as ContractCombatTracker, StorageTracker } from '@/types/contract/BattleNads';

export interface Position {
  x: number;
  y: number;
  depth: number;
}

/**
 * Movement restrictions for all directions
 */
export interface MovementOptions {
  canMoveNorth: boolean;
  canMoveSouth: boolean;
  canMoveEast: boolean;
  canMoveWest: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

export interface CharacterStats {
  strength: number;
  vitality: number;
  dexterity: number;
  quickness: number;
  sturdiness: number;
  luck: number;
  experience: number;
  unspentAttributePoints: number;
}

export interface Weapon extends BaseWeapon<number> {
  id: number;
  // All other fields inherited from BaseWeapon<number>
  // Domain uses number for all numeric values
}

export interface Armor extends BaseArmor<number> {
  id: number;
  // All other fields inherited from BaseArmor<number>
  // Domain uses number for all numeric values
}

export interface Inventory {
  weaponBitmap: number;
  armorBitmap: number;
  balance: number;
  weaponIDs: number[];
  armorIDs: number[];
  weaponNames: string[];
  armorNames: string[];
}

export interface AbilityState {
  ability: Ability;
  stage: number;
  targetIndex: number;
  taskAddress: string;
  targetBlock: number;
}

export interface Character extends BaseCharacter<number, StatusEffect[], string> {
  class: CharacterClass; // Override with typed enum instead of raw number
  stats: CharacterStats;
  weapon: Weapon;
  armor: Armor;
  position: Position;
  areaId: bigint;
  activeTask: CombatTracker; // Uses new CombatTracker type instead of string
  ability: AbilityState; // Character's ability state
  inventory: Inventory;
  tracker: StorageTracker; // Include tracker to access updateActiveAbility boolean
  isInCombat: boolean;
  movementOptions: MovementOptions;
  // Inherited from BaseCharacter: id, index, name, level, health, maxHealth, buffs, debuffs, weaponName, armorName, isDead, owner, experience
}

export interface CharacterLite extends BaseCharacterLite<number, StatusEffect[]> {
  class: CharacterClass; // Override with typed enum instead of raw number
  ability: AbilityState;
  areaId: bigint;
  // All other fields inherited from BaseCharacterLite<number, StatusEffect[]>
}

export type ThreatLevel = 'low' | 'equal' | 'high' | 'extreme';

export interface ThreatInfo {
  level: ThreatLevel;
  levelDifference: number;
}

// Domain-specific CombatTracker that converts bigint fields to numbers for better domain layer compatibility
export interface CombatTracker extends Omit<ContractCombatTracker, 'targetBlock'> {
  targetBlock: number; // Convert from bigint to number for domain layer
} 