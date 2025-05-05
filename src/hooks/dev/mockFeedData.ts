import { domain } from '@/types';

// --- Development Only: Mock Data ---
export const MOCK_CHAT_DATA_ENABLED = process.env.NODE_ENV === 'development';

// --- Mock Participants ---
const mockPlayerAlice: domain.EventParticipant = { id: '0xPlayerOneBytes32...', name: 'Alice', index: 1 };
const mockPlayerBob: domain.EventParticipant = { id: '0xPlayerTwoBytes32...', name: 'Bob', index: 2 };
const mockPlayerCharlie: domain.EventParticipant = { id: '0xAnotherPlayerBytes32...', name: 'Charlie', index: 3 };

// --- Mock Chat Messages ---
const mockChatMessage1: domain.ChatMessage = {
  logIndex: 101,
  blocknumber: BigInt(12345678),
  timestamp: Date.now() - 10000,
  sender: mockPlayerAlice,
  message: 'DEV: Mock chat message 1.',
  isOptimistic: false
};

const mockChatMessage2: domain.ChatMessage = {
  logIndex: 105,
  blocknumber: BigInt(12345690),
  timestamp: Date.now() - 7000,
  sender: mockPlayerBob,
  message: 'DEV: Another mock chat message!',
  isOptimistic: false
};

// --- Mock Event Messages ---
const mockEventInstigatedCombat: domain.EventMessage = {
  logIndex: 102,
  blocknumber: BigInt(12345680),
  timestamp: Date.now() - 9500,
  type: domain.LogType.InstigatedCombat,
  attacker: mockPlayerAlice,
  defender: mockPlayerBob,
  isPlayerInitiated: true, // Assuming Alice is the player
  details: { value: BigInt(0) },
  displayMessage: 'DEV: Mock Event - Alice initiated combat with Bob'
};

const mockEventCombatHit: domain.EventMessage = {
  logIndex: 103,
  blocknumber: BigInt(12345682),
  timestamp: Date.now() - 9000,
  type: domain.LogType.Combat,
  attacker: mockPlayerAlice,
  defender: mockPlayerBob,
  isPlayerInitiated: true,
  details: { hit: true, critical: false, damageDone: 15, value: BigInt(0) },
  displayMessage: 'DEV: Mock Event - Alice hits Bob for 15 damage.'
};

const mockEventCombatCrit: domain.EventMessage = {
  logIndex: 104,
  blocknumber: BigInt(12345685),
  timestamp: Date.now() - 8000,
  type: domain.LogType.Combat,
  attacker: mockPlayerBob,
  defender: mockPlayerAlice,
  isPlayerInitiated: false,
  details: { hit: true, critical: true, damageDone: 25, value: BigInt(0) },
  displayMessage: 'DEV: Mock Event - Bob crits Alice for 25 damage!'
};

const mockEventEnteredArea: domain.EventMessage = {
    logIndex: 106,
    blocknumber: BigInt(12345692),
    timestamp: Date.now() - 6000,
    type: domain.LogType.EnteredArea,
    attacker: mockPlayerCharlie, // Use 'attacker' for the participant
    defender: undefined,
    isPlayerInitiated: false,
    details: { value: BigInt(0) },
    displayMessage: 'DEV: Mock Event - Charlie entered area.'
};

const mockEventLeftArea: domain.EventMessage = {
    logIndex: 107,
    blocknumber: BigInt(12345695),
    timestamp: Date.now() - 5000,
    type: domain.LogType.LeftArea,
    attacker: mockPlayerAlice, // Use 'attacker' for the participant
    defender: undefined,
    isPlayerInitiated: true,
    details: { value: BigInt(0) },
    displayMessage: 'DEV: Mock Event - Alice left area.'
};

const mockEventAbilityUsed: domain.EventMessage = {
    logIndex: 108,
    blocknumber: BigInt(12345698),
    timestamp: Date.now() - 4000,
    type: domain.LogType.Ability,
    attacker: mockPlayerBob, // Caster
    defender: mockPlayerAlice, // Target
    isPlayerInitiated: false,
    details: { value: BigInt(9) /* Assuming value maps to Ability enum, e.g., Fireball */ },
    displayMessage: 'DEV: Mock Event - Bob used Ability Fireball on Alice.'
};

const mockEventCombatMiss: domain.EventMessage = {
  logIndex: 109,
  blocknumber: BigInt(12345700),
  timestamp: Date.now() - 3000,
  type: domain.LogType.Combat,
  attacker: mockPlayerAlice,
  defender: mockPlayerBob,
  isPlayerInitiated: true,
  details: { hit: false, critical: false, damageDone: 0, value: BigInt(0) },
  displayMessage: 'DEV: Mock Event - Alice missed Bob.'
};

const mockEventAscend: domain.EventMessage = {
    logIndex: 110,
    blocknumber: BigInt(12345705),
    timestamp: Date.now() - 2000,
    type: domain.LogType.Ascend,
    attacker: mockPlayerBob,
    defender: undefined,
    isPlayerInitiated: false,
    details: { targetDied: true, value: BigInt(0) },
    displayMessage: 'DEV: Mock Event - Bob ascended.'
};

// --- Mock Chat Event (Type 4) --- 
const mockEventChat: domain.EventMessage = {
    logIndex: 111, // Ensure unique logIndex
    blocknumber: BigInt(12345710),
    timestamp: Date.now() - 1000, // Make it recent
    type: 4, // Explicitly use 4 as emitted by contract for chat
    attacker: mockPlayerAlice, // Sender of the chat
    defender: undefined, 
    isPlayerInitiated: true, // Assuming Alice is player
    // Simulate value holding the index of the corresponding chat log if applicable
    details: { value: BigInt(101) }, 
    displayMessage: 'DEV: Mock Event - Alice sent a chat message.' // Display message can be simple
};

// --- Exported Arrays ---
export const MOCK_CHAT_LOGS: domain.ChatMessage[] = [
    mockChatMessage1,
    mockChatMessage2
];

export const MOCK_EVENT_LOGS: domain.EventMessage[] = [
    mockEventInstigatedCombat,
    mockEventCombatHit,
    mockEventCombatCrit,
    mockEventEnteredArea,
    mockEventLeftArea,
    mockEventAbilityUsed,
    mockEventCombatMiss,
    mockEventAscend,
    mockEventChat
].sort((a, b) => a.timestamp - b.timestamp); // Sort by timestamp

// --- End Development Only --- 