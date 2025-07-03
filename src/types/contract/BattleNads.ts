// Raw Solidity contract types for BattleNads
// These types exactly match the on-chain structures and use appropriate primitive types

import { BaseWeapon, BaseArmor } from '@/types/base';

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

// --- ADDED Contract Struct Definitions ---
// Represents the BattleNadStats struct packed into uint256
// Frontend should ideally receive this unpacked from the contract/client
export interface BattleNadStats {
  class: number; // uint8 (enum CharacterClass)
  buffs: number; // uint8 - bitmap for StatusEffect
  debuffs: number; // uint8 - bitmap for StatusEffect
  level: number; // uint8
  unspentAttributePoints: number; // uint8
  experience: number; // uint16
  strength: number; // uint8
  vitality: number; // uint8
  dexterity: number; // uint8
  quickness: number; // uint8
  sturdiness: number; // uint8
  luck: number; // uint8
  depth: number; // uint8
  x: number; // uint8
  y: number; // uint8
  index: number; // uint8
  weaponID: number; // uint8
  armorID: number; // uint8
  health: number; // uint16
  sumOfCombatantLevels: number; // uint8
  combatants: number; // uint8 - Count of current opponents
  nextTargetIndex: number; // uint8
  combatantBitMap: bigint; // uint64
}

export interface Weapon extends BaseWeapon<bigint> {
  // All fields inherited from BaseWeapon<bigint>
  // Contract uses bigint for all numeric values
}

export interface Armor extends BaseArmor<bigint> {
  // All fields inherited from BaseArmor<bigint>
  // Contract uses bigint for all numeric values
}

export interface Inventory {
  weaponBitmap: bigint; // uint64
  armorBitmap: bigint; // uint64
  balance: bigint; // uint128
}

// Combat tracker structure (Matches CombatTracker struct)
export interface CombatTracker {
  hasTaskError: boolean;
  pending: boolean;
  taskDelay: number; // uint8
  executorDelay: number; // uint8
  taskAddress: string; // address
  targetBlock: bigint; // uint64
}

// Ability state structure (Matches AbilityTracker struct)
export interface AbilityState {
  ability: number; // uint8 (enum Ability)
  stage: number; // uint8
  targetIndex: number; // uint8
  taskAddress: string; // address
  targetBlock: bigint; // uint64
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
  stats: BattleNadStats; // Matches the unpacked BattleNadStats fields
  maxHealth: bigint; // uint256
  weapon: Weapon;
  armor: Armor;
  activeTask: CombatTracker;
  activeAbility: AbilityState;
  inventory: Inventory;
  tracker: StorageTracker; // Not directly used by frontend polling, but part of struct
}

// Lite character structure (Matches BattleNadLite struct)
export interface CharacterLite {
  id: string; // bytes32
  name: string;
  class: number; // uint8 (enum CharacterClass)
  health: bigint; // uint256 - NOTE: Contract returns uint256 here
  maxHealth: bigint; // uint256
  buffs: bigint; // uint256 - bitmap (returned as uint256)
  debuffs: bigint; // uint256 - bitmap (returned as uint256)
  level: bigint; // uint256 - NOTE: Contract returns uint256 here
  index: bigint; // uint256 - NOTE: Contract returns uint256 here
  combatantBitMap: bigint; // uint256 - NOTE: Contract returns uint256 here
  ability: number; // uint8 (enum Ability)
  abilityStage: bigint; // uint256
  abilityTargetBlock: bigint; // uint256
  weaponName: string;
  armorName: string;
  isDead: boolean;
}

// Log structure (Matches Log struct)
export interface Log {
  logType: number; // uint8 (enum LogType)
  index: number; // uint16
  mainPlayerIndex: number; // uint8
  otherPlayerIndex: number; // uint8
  hit: boolean;
  critical: boolean;
  damageDone: number; // uint16
  healthHealed: number; // uint16
  targetDied: boolean;
  lootedWeaponID: number; // uint8
  lootedArmorID: number; // uint8
  experience: number; // uint16
  value: bigint; // uint128
}

// Data feed structure (Matches DataFeed struct)
export interface DataFeed {
  blockNumber: bigint; // uint256
  logs: Log[];
  chatLogs: string[]; // Raw chat strings from contract
}

// Represents the mapped object return type of client.getUiSnapshot()
// as used within the useUiSnapshot hook.
export interface PollFrontendDataReturn {
  characterID: string; // bytes32
  sessionKeyData: SessionKeyData;
  character: Character; // Full BattleNad struct for the player
  combatants: CharacterLite[]; // BattleNadLite[] for enemies
  noncombatants: CharacterLite[]; // BattleNadLite[] for others in area
  equipableWeaponIDs: number[]; // uint8[] from contract
  equipableWeaponNames: string[];
  equipableArmorIDs: number[]; // uint8[] from contract
  equipableArmorNames: string[];
  dataFeeds: DataFeed[]; // Array of per-block data feeds
  balanceShortfall: bigint; // uint256
  endBlock: bigint; // uint256
  fetchTimestamp: number; // Timestamp (ms since epoch) when this data was fetched
} 