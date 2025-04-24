/**
 * Game data types for Battle Nads
 * Single source of truth for all game-related type definitions
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

export interface PollResponse {
  characterID: string;
  sessionKeyData: SessionKeyData;
  character: BattleNadUnformatted; // Raw data for BattleNad
  combatants: BattleNadLiteUnformatted[]; // Raw data for BattleNadLite[]
  noncombatants: BattleNadLiteUnformatted[]; // Raw data for BattleNadLite[]
  equipableWeaponIDs: number[];
  equipableWeaponNames: string[];
  equipableArmorIDs: number[];
  equipableArmorNames: string[];
  dataFeeds: DataFeed[];
  balanceShortfall: bigint;
  unallocatedAttributePoints: bigint;
  endBlock: bigint;
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

export interface CharacterStatsUnformatted {
  class: CharacterClass; // Added to match contract's BattleNadStats
  buffs: number; // bitmap
  debuffs: number; // bitmap
  level: number;
  unspentAttributePoints: number; // Frontend-specific, not in contract
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
  index: number; // Matches index in contract BattleNadStats
  weaponID: number; // Added to match contract's BattleNadStats
  armorID: number; // Added to match contract's BattleNadStats
  health: number; // Corresponds to uint16 health in the contract
  sumOfCombatantLevels: number;
  combatants: number;
  nextTargetIndex: number;
  combatantBitMap: number;
}

export interface CharacterStats {
  unspentAttributePoints: number; // Frontend-specific, not in contract
  buffs: number; // bitmap
  debuffs: number; // bitmap
  experience: number;
  strength: number;
  vitality: number;
  dexterity: number;
  quickness: number;
  sturdiness: number;
  luck: number;
}

export interface Weapon {
  id: string;
  name: string;
  baseDamage: number;
  bonusDamage: number;
  accuracy: number;
  speed: number;
}

export interface Armor {
  id: string;
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
}

export interface Position {
  x: number;
  y: number;
  depth: number;
}

export interface AbilityTracker {
  ability: Ability;
  stage: number;
  targetIndex: number;
  taskAddress: string; // address in contract
  targetBlock: number; // uint64 in contract
}

export interface StorageTracker {
  updateStats: boolean;
  updateInventory: boolean;
  updateActiveTask: boolean;
  updateActiveAbility: boolean;
  updateOwner: boolean;
  classStatsAdded: boolean;
  died: boolean;
}

export interface BattleNadUnformatted {
  id: string; // corresponds to bytes32 id in contract
  stats: CharacterStatsUnformatted;
  maxHealth: number; // corresponds to maxHealth in contract
  weapon: Weapon;
  armor: Armor;
  inventory: Inventory;
  tracker: StorageTracker;
  activeTask: string; // corresponds to address activeTask in contract
  activeAbility: AbilityTracker; // corresponds to AbilityTracker in contract
  owner: string; // corresponds to address owner in contract
  name: string; // corresponds to name in contract
}

export interface BattleNad {
  id: string; // corresponds to bytes32 id in contract
  index: number;
  name: string; // corresponds to name in contract
  class: CharacterClass;
  level: number; 
  health: number;
  maxHealth: number; 
  buffs: StatusEffect[];
  debuffs: StatusEffect[];
  stats: CharacterStats;
  weapon: Weapon;
  armor: Armor;
  availableWeapons: string[];
  availableArmors: string[];
  position: Position; // Note: position is derived from stats in the contract
  owner: string; // corresponds to address owner in contract
  activeTask: string; // corresponds to address activeTask in contract
  ability: AbilityTracker; // corresponds to AbilityTracker in contract
  inventory: Inventory;
  unspentAttributePoints: number;
  isInCombat: boolean;
  isDead: boolean;
}

// Match the contract's BattleNadLite struct
export interface BattleNadLiteUnformatted {
  id: string; // bytes32 in contract
  class: CharacterClass;
  health: number;
  maxHealth: number;
  buffs: number;
  debuffs: number;
  level: number;
  index: number; // location index
  combatantBitMap: number;
  ability: Ability;
  abilityStage: number;
  abilityTargetBlock: number;
  name: string;
  weaponName: string;
  armorName: string;
  isDead: boolean;
}

export interface BattleNadLite {
  id: string; // bytes32 in contract
  index: number; // location index
  name: string;
  class: CharacterClass;
  level: number; 
  health: number;
  maxHealth: number;
  buffs: StatusEffect[];
  debuffs: StatusEffect[];
  ability: AbilityTracker
  weaponName: string;
  armorName: string;
  isMonster: boolean;
  isHostile: boolean;
  isDead: boolean;// corresponds to AbilityTracker in contract// corresponds to maxHealth in contract
}

export interface MovementOptions {
  canMoveNorth: boolean;
  canMoveSouth: boolean;
  canMoveEast: boolean;
  canMoveWest: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

export interface ParticleEffect {
  id: number;
  x: number;
  y: number;
  type: 'damage' | 'heal';
  value: number;
}

export type GameState = { 
  owner: string | null; 
  character: BattleNad | null;
  others: BattleNadLite[]; // Should be 64-length array of BattleNadLite - responds to battleNad.index
  position: Position;
  movementOptions: MovementOptions;
  eventLogs: EventMessage[];
  chatLogs: ChatMessage[];
  updates: GameUpdates;
  sessionKey: SessionKeyData;
  lastBlock: number;
  loading?: boolean;
  error?: string | null;
}

export type GameUpdates = {
  owner: boolean;
  character: boolean;
  sessionKey: boolean;
  others: boolean[]; // Should be 64-length array of boolean - responds to battleNad.index
  position: boolean;
  combat: boolean;
  movementOptions: boolean;
  eventLogs: boolean;
  chatLogs: boolean;
  lastBlock: boolean;
  error: boolean;
}

// New UI state type to centralize all UI states
export type GameUIState = 
  | 'loading'           // General loading state
  | 'error'             // Unrecoverable error
  | 'need-wallet'       // No wallet connected
  | 'need-embedded-wallet' // No embedded wallet
  | 'need-character'    // No character found
  | 'session-key-warning' // Session key needs updating
  | 'ready';            // Game is ready to play

// Match the contract's SessionKey struct
export interface SessionKey {
  owner: string; // address in contract
  expiration: number; // uint64 in contract
}

// Match the contract's SessionKeyData struct
export interface SessionKeyData {
  owner: string; // address in contract
  key: string; // address in contract
  balance: bigint; // In MON
  targetBalance: bigint; // In MON
  ownerCommittedAmount: bigint; // In MON
  ownerCommittedShares: bigint; // In shMON
  expiration: number; // uint64 in contract (block number)
}

// Match the contract's LogType enum
export enum LogType {
  Combat = 0,
  InstigatedCombat = 1,
  EnteredArea = 2,
  LeftArea = 3,
  Chat = 4,
  Ability = 5,
  Sepukku = 6
}

// Match the contract's Log struct
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
  value: number;
}

// Match the contract's DataFeed struct
export interface DataFeed {
  blockNumber: number; // uint256 in contract
  logs: Log[]; // Log[] in contract
  chatLogs: string[]; // string[] in contract
}

export interface ChatMessage {
  characterName: string;
  message: string;
  timestamp?: number;
}

export interface EventMessage {
  message: string;
  timestamp?: number;
}