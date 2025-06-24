/**
 * Generic base types for Battle Nads
 * These types provide a foundation for contract, domain, and UI layers
 */

/**
 * Base equipment interface for weapons
 * @template T - Numeric type (bigint for contract, number for domain/UI)
 */
export interface BaseWeapon<T = number> {
  name: string;
  baseDamage: T;
  bonusDamage: T;
  accuracy: T;
  speed: T;
}

/**
 * Base equipment interface for armor
 * @template T - Numeric type (bigint for contract, number for domain/UI)
 */
export interface BaseArmor<T = number> {
  name: string;
  armorFactor: T;
  armorQuality: T;
  flexibility: T;
  weight: T;
}

/**
 * Base character stats interface
 * @template T - Numeric type (bigint for contract, number for domain/UI)
 */
export interface BaseStats<T = number> {
  attack: T;
  defense: T;
  speed: T;
  luck: T;
}

/**
 * Base session key data interface
 * Standardizes field names across layers
 * @template TAddress - Address type (string)
 * @template TExpiration - Expiration type (bigint for contract, string for domain)
 */
export interface BaseSessionKeyData<TAddress = string, TExpiration = string> {
  key: TAddress;
  owner: TAddress;
  expiration: TExpiration;
}

/**
 * Base character lite interface (for enemies/NPCs in combat)
 * Contains minimal data needed for combat display and interaction
 * @template TNumeric - Numeric type (bigint for contract, number for domain)
 * @template TStatus - Status type (bigint bitmap for contract, StatusEffect[] for domain)
 */
export interface BaseCharacterLite<TNumeric = number, TStatus = any> {
  id: string;
  index: TNumeric;
  name: string;
  class: TNumeric; // Raw class value, typed by layer
  level: TNumeric;
  health: TNumeric;
  maxHealth: TNumeric;
  buffs: TStatus;
  debuffs: TStatus;
  weaponName: string;
  armorName: string;
  isDead: boolean;
}

/**
 * Base character interface (for main player data)
 * Extends CharacterLite with full player information
 * @template TNumeric - Numeric type for stats
 * @template TStatus - Status type (bigint for contract, StatusEffect[] for domain)
 * @template TAddress - Address type for owner
 */
export interface BaseCharacter<TNumeric = number, TStatus = any, TAddress = string> extends BaseCharacterLite<TNumeric, TStatus> {
  owner: TAddress;
  experience: TNumeric;
  // Note: stats, weapon and armor objects, inventory, position etc. are added by specific layers
}

/**
 * Base position interface for game board
 */
export interface BasePosition {
  x: number;
  y: number;
}

/**
 * Base game state interface
 * @template TStatus - Status type for game state
 * @template TBlock - Block number type
 */
export interface BaseGameState<TStatus = string, TBlock = number> {
  status: TStatus;
  currentTurn: number;
  turnStartBlock: TBlock;
  lastActionBlock: TBlock;
}