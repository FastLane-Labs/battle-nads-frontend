import Dexie, { type EntityTable } from 'dexie';

// Define the structure for storing serialized log data
// Match the structure previously used for localforage/CachedDataBlock but ensure types are Dexie-compatible

interface SerializedEventLog {
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
  value: string; // Storing BigInt as string
}

interface SerializedChatLog {
  content: string;
  timestamp: string;
  senderId: string;   // Added
  senderName: string; // Added
}

// Interface for the data stored in Dexie table
export interface StoredDataBlock {
  // Compound primary key: [ownerAddress, contractAddress, blockNumberAsString]
  owner: string;        // Owner's address (part of primary key)
  contract: string;     // Contract address (part of primary key)
  block: string;        // Block number as string (part of primary key)
  ts: number;           // Timestamp (milliseconds) when stored (for TTL)
  chats: SerializedChatLog[];
  events: SerializedEventLog[];
}

// Interface for character metadata storage
export interface StoredCharacterMetadata {
  owner: string;        // Owner's address (primary key)
  characterId: string;  // Character ID for this owner
}

// Define the Dexie database instance
// We use casting to provide type safety for our tables
const db = new Dexie('BattleNadsFeedCache') as Dexie & {
  dataBlocks: EntityTable<
    StoredDataBlock,
    'owner' // Use 'owner' as the key *type* hint for TS
  >;
  characters: EntityTable<
    StoredCharacterMetadata,
    'owner' // Use 'owner' as the key *type* hint for TS
  >;
};

// Define schema version 4 (Incremented to include contract address)
db.version(4).stores({
  // Table name: dataBlocks
  // Primary key: [owner+contract+block] (compound key with contract address)
  // Indexed properties: owner (for querying by user), contract (for contract-specific queries), ts (for TTL cleanup)
  dataBlocks: '&[owner+contract+block], owner, contract, ts, [owner+contract], [owner+ts]',
  // Store character metadata keyed by owner address
  // Currently stores last known character ID for an owner
  characters: '&owner, characterId',
});

export { db }; 