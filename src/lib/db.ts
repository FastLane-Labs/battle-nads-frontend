import Dexie, { type EntityTable } from 'dexie';

// Define the structure for storing serialized log data
// Match the structure previously used for localforage/CachedDataBlock but ensure types are Dexie-compatible

interface SerializedEventLog {
  logType: number;
  index: number;
  mainPlayerIndex: number;
  otherPlayerIndex: number;
  areaId: string;
  hit: boolean;
  critical: boolean;
  damageDone: number;
  healthHealed: number;
  targetDied: boolean;
  lootedWeaponID: number;
  lootedArmorID: number;
  experience: number;
  value: string;
}

interface SerializedChatLog {
  logIndex: number;
  content: string;
  timestamp: string;
  senderId: string;
  senderName: string;
}

// Interface for the data stored in Dexie table
export interface StoredDataBlock {
  // Enhanced compound primary key: [ownerAddress, contractAddress, characterId, blockNumberAsString]
  owner: string;        // Owner's address (part of primary key)
  contract: string;     // Contract address (part of primary key)
  characterId: string;  // Character ID (part of primary key) - allows character-specific data
  block: string;        // Block number as string (part of primary key)
  ts: number;           // Timestamp (milliseconds) when stored (for TTL)
  chats: SerializedChatLog[];
  events: SerializedEventLog[];
}

// Interface for character metadata storage
export interface StoredCharacterMetadata {
  owner: string;        // Owner's address (primary key)
  characterId: string;  // Character ID for this owner
  lastActive: number;   // Timestamp of last activity (for switching back to recent character)
}

// Define the Dexie database instance
// We use casting to provide type safety for our tables
// Changed database name to force fresh start with character-specific schema
const db = new Dexie('BattleNadsFeedCache_v2') as Dexie & {
  dataBlocks: EntityTable<
    StoredDataBlock,
    'owner' // Use 'owner' as the key *type* hint for TS
  >;
  characters: EntityTable<
    StoredCharacterMetadata,
    'owner' // Use 'owner' as the key *type* hint for TS
  >;
};

// Define schema version 1 for the new database (fresh start)
// Character-specific data support from the beginning
db.version(1).stores({
  // Table name: dataBlocks
  // Primary key: [owner+contract+characterId+block] (4-part compound key)
  // Additional indexes for efficient queries:
  // - [owner+contract+characterId] for character-specific data
  // - [owner+characterId] for cross-contract character data
  // - ts for TTL cleanup
  dataBlocks: '&[owner+contract+characterId+block], owner, contract, characterId, ts, [owner+contract+characterId], [owner+characterId], [owner+contract], [owner+ts]',
  // Store character metadata with lastActive timestamp
  characters: '&[owner+characterId], owner, characterId, lastActive',
});

export { db }; 