// Raw Solidity contract types for BattleNads
// These types exactly match the on-chain structures and use appropriate primitive types

// Session key data structure (Matches CashierTypes.SessionKeyData)
export interface SessionKeyData {
  owner: string; // address
  key: string; // address
  balance: bigint; // uint256 - Current MON balance of the key
  targetBalance: bigint; // uint256 - Ideal MON balance for the key
  ownerCommittedAmount: bigint; // uint256 - Owner's bonded shMON (estimated MON value)
  ownerCommittedShares: bigint; // uint256 - Owner's bonded shMON (shares)
  expiration: bigint; // uint64 - Block number when the key expires
}

// Character stats structure (Matches BattleNadStats struct)
export interface CharacterStats {
  index: number; // uint8
  class: number; // uint8 (enum CharacterClass)
  level: number; // uint8
  experience: bigint; // uint16 - Use bigint for safety, map to number later
  // health: bigint; // uint16 - Health is separate in BattleNad struct now
  strength: bigint; // uint8 - Use bigint for safety
  vitality: bigint; // uint8
  dexterity: bigint; // uint8
  quickness: bigint; // uint8
  sturdiness: bigint; // uint8
  luck: bigint; // uint8
  unspentAttributePoints: bigint; // uint8
  x: number; // uint8
  y: number; // uint8
  depth: number; // uint8
  combatantBitMap: bigint; // uint64
  buffs: number[]; // uint8[] - Placeholder, actual type might be bitmap or array
  debuffs: number[]; // uint8[] - Placeholder
  weaponID: number; // uint8 - ADDED
  armorID: number; // uint8 - ADDED
  health: number; // uint16 - ADDED from BattleNadStats ABI
  sumOfCombatantLevels: number; // uint8 - ADDED from BattleNadStats ABI
  combatants: number; // uint8 - ADDED from BattleNadStats ABI
  nextTargetIndex: number; // uint8 - ADDED from BattleNadStats ABI
  // maxHealth: bigint; // REMOVED - Belongs on Character struct
}

// Ability state structure (Matches AbilityTracker struct)
export interface AbilityState {
  ability: number;
  stage: number;
  targetIndex: number;
  taskAddress: string;
  targetBlock: bigint;
}

// --- ADDED Contract Struct Definitions ---
export interface Weapon {
  name: string;
  baseDamage: bigint; // uint256
  bonusDamage: bigint; // uint256
  accuracy: bigint; // uint256
  speed: bigint; // uint256
}

export interface Armor {
  name: string;
  armorFactor: bigint; // uint256
  armorQuality: bigint; // uint256
  flexibility: bigint; // uint256
  weight: bigint; // uint256
}

export interface Inventory {
  weaponBitmap: bigint; // uint64
  armorBitmap: bigint; // uint64
  balance: bigint; // uint128
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
// --- END ADDED Struct Definitions ---

// Character structure (Matches BattleNad struct)
export interface Character {
  id: string; // bytes32
  name: string;
  owner: string; // address
  stats: CharacterStats;
  maxHealth: bigint; // uint256 - ADDED
  weapon: Weapon; // UPDATED type
  armor: Armor; // UPDATED type
  activeTask: string; // address
  activeAbility: AbilityState; // Matches AbilityTracker
  inventory: Inventory; // UPDATED type
  tracker: StorageTracker; // UPDATED type
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

// Log structure
export interface Log {
  logType: number;
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

// Data feed structure
export interface DataFeed {
  blockNumber: bigint;
  logs: Log[];
  chatLogs: string[];
}
export interface PollFrontendDataReturn {
  characterID: string;
  sessionKeyData: SessionKeyData;
  character: Character;
  combatants: CharacterLite[];
  noncombatants: CharacterLite[];
  equipableWeaponIDs: number[];
  equipableWeaponNames: string[];
  equipableArmorIDs: number[];
  equipableArmorNames: string[];
  dataFeeds: DataFeed[];
  balanceShortfall: bigint;
  unallocatedAttributePoints: bigint;
  endBlock: bigint;
} 