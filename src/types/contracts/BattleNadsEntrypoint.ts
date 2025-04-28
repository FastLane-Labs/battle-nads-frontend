// Hand-rolled TypeScript interfaces for BattleNads contract types
// These represent the Solidity structs and function signatures

// Session key data structure
export interface SessionKeyData {
  key: string;
  expiration: bigint;
  isValid: boolean;
}

// Character stats structure
export interface CharacterStats {
  index: number;
  class: number;
  level: number;
  experience: bigint;
  health: bigint;
  maxHealth: bigint;
  strength: bigint;
  vitality: bigint;
  dexterity: bigint;
  quickness: bigint;
  sturdiness: bigint;
  luck: bigint;
  unspentAttributePoints: bigint;
  x: number;
  y: number;
  depth: number;
  combatantBitMap: bigint;
  buffs: number[];
  debuffs: number[];
}

// Ability state structure
export interface AbilityState {
  ability: number;
  stage: number;
  targetIndex: number;
  taskAddress: string;
  targetBlock: bigint;
}

// Character structure
export interface Character {
  id: string;
  name: string;
  owner: string;
  stats: CharacterStats;
  weapon: number;
  armor: number;
  activeTask: string;
  activeAbility: AbilityState;
  inventory: number[];
  tracker: {
    died: boolean;
  };
}

// Lite character structure (for others in the zone)
export interface CharacterLite {
  id: string;
  index: number;
  name: string;
  class: number;
  level: number;
  health: bigint;
  maxHealth: bigint;
  ability: number;
  abilityStage: number;
  abilityTargetBlock: bigint;
  weaponName: string;
  armorName: string;
  isDead: boolean;
}

// Movement options structure
export interface MovementOptions {
  canMoveNorth: boolean;
  canMoveSouth: boolean;
  canMoveEast: boolean;
  canMoveWest: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

// Event log structure
export interface EventLog {
  timestamp: bigint;
  eventType: number;
  content: string;
}

// Chat log structure
export interface ChatLog {
  timestamp: bigint;
  sender: string;
  content: string;
}

// Poll frontend data return structure
export interface PollFrontendDataReturn {
  character: Character;
  combatants: CharacterLite[];
  noncombatants: CharacterLite[];
  movementOptions: MovementOptions;
  eventLogs: EventLog[];
  chatLogs: ChatLog[];
  sessionKeyData: SessionKeyData;
  startBlock: bigint;
  endBlock: bigint;
}

// Direction enum for movement
export enum Direction {
  NORTH = 'north',
  SOUTH = 'south',
  EAST = 'east',
  WEST = 'west',
  UP = 'up',
  DOWN = 'down'
}

// Character class enum
export enum CharacterClass {
  WARRIOR = 0,
  MAGE = 1,
  ROGUE = 2,
  CLERIC = 3
}

// Ability enum
export enum Ability {
  NONE = 0,
  SLASH = 1,
  FIREBALL = 2,
  BACKSTAB = 3,
  HEAL = 4
}

// Status effect enum
export enum StatusEffect {
  NONE = 0,
  BURN = 1,
  STUN = 2,
  BLEED = 3,
  REGEN = 4
} 