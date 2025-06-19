/**
 * Domain types for character-related concepts
 * These types represent game logic and are independent of UI or contract specifics
 */

import { CharacterClass, StatusEffect, Ability } from './enums';

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

export interface Weapon {
  id: number;
  name: string;
  baseDamage: number;
  bonusDamage: number;
  accuracy: number;
  speed: number;
}

export interface Armor {
  id: number;
  name: string;
  armorFactor: number;
  armorQuality: number;
  flexibility: number;
  weight: number;
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

export interface Character {
  id: string;
  index: number;
  name: string;
  class: CharacterClass;
  level: number;
  health: number;
  maxHealth: number;
  buffs: StatusEffect[];
  debuffs: StatusEffect[];
  stats: CharacterStats;
  weapon: Weapon;
  armor: Armor;
  position: Position;
  areaId: bigint;
  owner: string;
  activeTask: string;
  ability: AbilityState;
  inventory: Inventory;
  isInCombat: boolean;
  isDead: boolean;
  movementOptions: MovementOptions;
}

export interface CharacterLite {
  id: string;
  index: number;
  name: string;
  class: CharacterClass;
  level: number;
  health: number;
  maxHealth: number;
  buffs: StatusEffect[];
  debuffs: StatusEffect[];
  ability: AbilityState;
  weaponName: string;
  armorName: string;
  areaId: bigint;
  isDead: boolean;
} 