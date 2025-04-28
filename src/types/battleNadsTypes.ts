/**
 * Type definitions for Battle Nads game
 * Based on the contracts documentation
 */

// Enums
export enum CharacterClass {
  WARRIOR = 0,
  RANGER = 1,
  MAGE = 2,
  ROGUE = 3
}

export enum StatusEffect {
  STUNNED = 0,
  POISONED = 1,
  BLEEDING = 2,
  BURNING = 3,
  CONFUSED = 4,
  FROZEN = 5,
  STRENGTHENED = 6,
  WEAKENED = 7
}

export enum Ability {
  NONE = 0,
  WARRIOR_BERSERK = 1,
  WARRIOR_SHIELD_BASH = 2,
  RANGER_RAPID_SHOT = 3,
  RANGER_SNARE = 4,
  MAGE_FIREBALL = 5,
  MAGE_FREEZE = 6,
  ROGUE_BACKSTAB = 7,
  ROGUE_POISON = 8
}

export enum LogType {
  COMBAT_START = 0,
  ATTACK = 1,
  ABILITY_USE = 2,
  COMBAT_END = 3,
  LOOT = 4,
  LEVEL_UP = 5,
  MOVEMENT = 6,
  SPAWN = 7,
  EQUIP = 8
}

export enum Direction {
  NORTH = 0,
  SOUTH = 1,
  EAST = 2,
  WEST = 3,
  UP = 4,
  DOWN = 5
}

// Log structure
export interface Log {
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
  value: bigint;
}

// Character related structures
export interface BattleNadStats {
  class: CharacterClass;
  buffs: number;
  debuffs: number;
  level: number;
  unspentAttributePoints: number;
  experience: number;
  strength: number;
  vitality: number;
  dexterity: number;
  quickness: number;
  sturdiness: number;
  luck: number;
  depth: number;
  x: number;
  y: number;
  index: number;
  weaponID: number;
  armorID: number;
  health: number;
  sumOfCombatantLevels: number;
  combatants: number;
  nextTargetIndex: number;
  combatantBitMap: bigint;
}

export interface Weapon {
  name: string;
  baseDamage: number;
  bonusDamage: number;
  accuracy: number;
  speed: number;
}

export interface Armor {
  name: string;
  armorFactor: number;
  armorQuality: number;
  flexibility: number;
  weight: number;
}

export interface Inventory {
  weaponBitmap: bigint;
  armorBitmap: bigint;
  balance: bigint;
}

export interface AbilityTracker {
  ability: Ability;
  stage: number;
  targetIndex: number;
  taskAddress: string;
  targetBlock: bigint;
}

// Main character structures
export interface BattleNad {
  id: string;
  stats: BattleNadStats;
  maxHealth: number;
  weapon: Weapon;
  armor: Armor;
  inventory: Inventory;
  activeTask: string;
  activeAbility: AbilityTracker;
  owner: string;
  name: string;
}

export interface BattleNadLite {
  id: string;
  class: CharacterClass;
  health: number;
  maxHealth: number;
  buffs: number;
  debuffs: number;
  level: number;
  index: number;
  combatantBitMap: bigint;
  ability: Ability;
  abilityStage: number;
  abilityTargetBlock: bigint;
  name: string;
  weaponName: string;
  armorName: string;
  isDead: boolean;
}

// Session key data
export interface SessionKeyData {
  owner: string;
  key: string;
  balance: bigint;
  targetBalance: bigint;
  ownerCommittedAmount: bigint;
  ownerCommittedShares: bigint;
  expiration: bigint;
}

// Data feed structure
export interface DataFeed {
  blockNumber: bigint;
  logs: Log[];
  chatLogs: string[];
}

// UI snapshot data
export interface PollFrontendDataReturn {
  characterID: string;
  sessionKeyData: SessionKeyData;
  character: BattleNad;
  combatants: BattleNadLite[];
  noncombatants: BattleNadLite[];
  equipableWeaponIDs: number[];
  equipableWeaponNames: string[];
  equipableArmorIDs: number[];
  equipableArmorNames: string[];
  dataFeeds: DataFeed[];
  balanceShortfall: bigint;
  unallocatedAttributePoints: number;
  endBlock: bigint;
} 