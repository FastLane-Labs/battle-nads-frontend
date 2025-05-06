/**
 * Domain level enums for Battle Nads game
 * These enums represent game concepts, not necessarily matching exactly with contract values
 */

// Match the contract's CharacterClass enum
export enum CharacterClass {
  // Null value
  Bard = 0,
  // Monsters
  Basic = 1,
  Elite = 2,
  Boss = 3,
  // Player Classes
  Warrior = 4,
  Rogue = 5,
  Monk = 6,
  Sorcerer = 7
}

// Match the contract's StatusEffect enum
export enum StatusEffect {
  None = 0,
  ShieldWall = 1,
  Evasion = 2,
  Praying = 3,
  ChargingUp = 4,
  ChargedUp = 5,
  Poisoned = 6,
  Cursed = 7,
  Stunned = 8
}

// Match the contract's Ability enum
export enum Ability {
  None = 0,
  SingSong = 1,
  DoDance = 2,
  ShieldBash = 3,
  ShieldWall = 4,
  EvasiveManeuvers = 5,
  ApplyPoison = 6,
  Pray = 7,
  Smite = 8,
  Fireball = 9,
  ChargeUp = 10
}

// Match the contract's LogType enum
export enum LogType {
  Combat = 0,
  InstigatedCombat = 1,
  EnteredArea = 2,
  LeftArea = 3,
  Chat = 4,
  Ability = 5,
  Ascend = 6,
  Unknown = 99 // Added for handling undefined or unknown log types
}

// Direction enum for movement
export enum Direction {
  North = 0,
  South = 1,
  East = 2,
  West = 3,
  Up = 4,
  Down = 5
}

export enum EquipmentSlot {
  WEAPON = 0,
  ARMOR = 1,
}

// Ability stage constants reflecting contract states
export enum AbilityStage {
  READY = 0,
  CHARGING = 1, // e.g., Monk\'s Pray, Sorcerer\'s ChargeUp
  ACTION = 2,   // e.g., Multi-turn effects
  COOLDOWN = 3, // Standard cooldown period after use
}