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

// New event-level storage interface
export interface StoredEvent {
  // Compound primary key: [owner, contract, characterId, eventKey]
  owner: string;
  contract: string; 
  characterId: string;
  eventKey: string; // Format: "${absoluteBlock}-${logIndex}"
  blockNumber: string; // Absolute block number as string
  logIndex: number;
  logType: number;
  mainPlayerIndex: number;
  otherPlayerIndex: number;
  attackerName: string;
  defenderName: string;
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
  isNameResolved: boolean; // Track if names are properly resolved
  timestamp: number; // Block timestamp
  storeTimestamp: number; // When we stored this event
}

// New chat message storage interface
export interface StoredChatMessage {
  // Compound primary key: [owner, contract, characterId, messageKey]
  owner: string;
  contract: string;
  characterId: string;
  messageKey: string; // Format: "${absoluteBlock}-${logIndex}"
  blockNumber: string;
  logIndex: number;
  content: string;
  senderId: string;
  senderName: string;
  timestamp: number; // Block timestamp
  storeTimestamp: number; // When we stored this message
  isConfirmed: boolean; // true for confirmed, false for optimistic
}

// Legacy interface for backward compatibility (will be migrated)
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
// Changed database name to force fresh start with event-level schema
const db = new Dexie('BattleNadsFeedCache_v3') as Dexie & {
  events: EntityTable<
    StoredEvent,
    'owner'
  >;
  chatMessages: EntityTable<
    StoredChatMessage,
    'owner'
  >;
  dataBlocks: EntityTable<
    StoredDataBlock,
    'owner' // Legacy table for migration
  >;
  characters: EntityTable<
    StoredCharacterMetadata,
    'owner'
  >;
};

// Define schema version 1 for the new database (fresh start)
// Event-level storage with proper indexes
db.version(1).stores({
  // Event-level storage table
  // Primary key: [owner+contract+characterId+eventKey] (4-part compound key)
  // Additional indexes for efficient queries and filtering
  events: '&[owner+contract+characterId+eventKey], owner, contract, characterId, eventKey, blockNumber, logIndex, logType, isNameResolved, timestamp, storeTimestamp, [owner+contract+characterId], [owner+characterId], [blockNumber+logIndex]',
  
  // Chat message storage table  
  // Primary key: [owner+contract+characterId+messageKey] (4-part compound key)
  chatMessages: '&[owner+contract+characterId+messageKey], owner, contract, characterId, messageKey, blockNumber, logIndex, timestamp, storeTimestamp, isConfirmed, [owner+contract+characterId], [owner+characterId], [blockNumber+logIndex]',
  
  // Legacy table for migration (will be removed after migration)
  dataBlocks: '&[owner+contract+characterId+block], owner, contract, characterId, ts, [owner+contract+characterId], [owner+characterId], [owner+contract], [owner+ts]',
  
  // Store character metadata with lastActive timestamp
  characters: '&[owner+characterId], owner, characterId, lastActive',
});

export { db }; 