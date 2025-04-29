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

// Poll frontend data return structure
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
  movementOptions: MovementOptions;
  eventLogs: EventLog[];
  chatLogs: ChatLog[];
  startBlock: bigint;
} 