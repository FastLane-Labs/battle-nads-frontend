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
  timestamp: string; // Storing block number as string
  senderId: string;   // Added
  senderName: string; // Added
}

// Interface for the data stored in Dexie table
export interface StoredDataBlock {
  // Compound primary key: [ownerAddress, blockNumberAsString]
  owner: string;        // Owner's address (part of primary key)
  block: string;        // Block number as string (part of primary key)
  ts: number;           // Timestamp (milliseconds) when stored (for TTL)
  chats: SerializedChatLog[];
  events: SerializedEventLog[];
}

// Define the Dexie database instance
// We use casting to provide type safety for our table
const db = new Dexie('BattleNadsFeedCache') as Dexie & {
  dataBlocks: EntityTable<
    StoredDataBlock,
    'owner' // Use 'owner' or 'block' as the key *type* hint for TS
  >;
};

// Define schema version 3 (Incremented from 2)
db.version(3).stores({
  // Table name: dataBlocks
  // Primary key: [owner+block] (compound key)
  // Indexed properties: owner (for querying by user), ts (for TTL cleanup)
  dataBlocks: '&[owner+block], owner, ts, [owner+ts]',
  // Store character metadata keyed by owner address
  // Currently stores last known character ID for an owner
  characters: '&owner, characterId',
});

export { db }; 