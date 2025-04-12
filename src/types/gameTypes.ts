/**
 * Game data types for Battle Nads
 * Single source of truth for all game-related type definitions
 */

export interface CharacterStats {
  level: number;
  health: number; // Corresponds to uint16 health in the contract
  maxHealth: number; // Calculated property, not directly in contract
  strength: number;
  vitality: number;
  dexterity: number;
  quickness: number;
  sturdiness: number;
  luck: number;
  x: number;
  y: number;
  depth: number;
  experience: number;
  unallocatedPoints: number; // Frontend-specific, not in contract
  index?: number; // Matches index in contract BattleNadStats
  isMonster?: boolean;
  sumOfCombatantLevels?: number;
  combatants?: number;
  nextTargetIndex?: number;
  combatantBitMap: number;
  weaponID?: number; // Added to match contract's BattleNadStats
  armorID?: number; // Added to match contract's BattleNadStats
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

export interface BattleNad {
  id: string; // corresponds to bytes32 id in contract
  name: string;
  stats: CharacterStats;
  weapon: Weapon;
  armor: Armor;
  inventory: Inventory;
  position: Position; // Note: position is derived from stats in the contract
  owner: string; // corresponds to address owner in contract
  activeTask?: string; // corresponds to address activeTask in contract
  isMonster?: boolean; // derived from stats.isMonster
  isPlayer?: boolean; // frontend convenience, derived as !isMonster
  tracker?: { // corresponds to StorageTracker in contract
    updateStats: boolean;
    updateInventory: boolean;
    updateActiveTask: boolean;
    updateOwner: boolean;
    died: boolean;
  };
  log?: Log; // corresponds to Log in contract
}

// For backward compatibility
export type Character = BattleNad;

export interface AreaInfo {
  playerCount: number; // corresponds to uint8 playerCount in contract
  monsterCount: number; // corresponds to uint8 monsterCount in contract
  sumOfPlayerLevels?: number; // corresponds to uint32 sumOfPlayerLevels in contract
  sumOfMonsterLevels?: number; // corresponds to uint32 sumOfMonsterLevels in contract
  playerBitMap?: number; // corresponds to uint64 playerBitMap in contract
  monsterBitMap?: number; // corresponds to uint64 monsterBitMap in contract
  depth?: number; // corresponds to uint8 depth in contract
  x?: number; // corresponds to uint8 x in contract
  y?: number; // corresponds to uint8 y in contract
  update?: boolean; // corresponds to bool update in contract
  description?: string; // frontend-only, not in contract
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

export interface Combatant {
  id: string;
  position: Position;
  health: number;
  maxHealth: number;
  isMonster: boolean;
}

export interface GameState {
  character: BattleNad | null;
  combatants: BattleNad[];
  noncombatants: BattleNad[];
  charactersInArea?: BattleNad[];
  areaInfo: AreaInfo | null;
  movementOptions: MovementOptions | null;
  isInCombat: boolean;
  equipmentInfo: any | null;
  loading?: boolean;
  error?: string | null;
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

// Match the contract's LogType enum
export enum LogType {
  Combat = 0,
  InstigatedCombat = 1,
  EnteredArea = 2,
  LeftArea = 3,
  Chat = 4,
  Sepukku = 5
}

// Match the contract's SessionKey struct
export interface SessionKey {
  key: string; // address in contract
  expiration: number; // uint64 in contract
}

// Match the contract's SessionKeyTracker struct
export interface SessionKeyTracker {
  usingSessionKey: boolean;
  owner: string; // address in contract
  key: string; // address in contract
  expiration: number; // uint64 in contract
  startingGasLeft: number; // uint256 in contract
  credits: number; // uint256 in contract, in shMON
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