// Game hooks - Simplified 2-layer state architecture
export * from './game/useSimplifiedGameState'; // Unified interface
export * from './game/useContractPolling'; // Layer 1: Pure contract data
export * from './game/useGameData'; // Layer 2: Business logic data
export * from './game/useGameActions'; // Layer 2: Business logic actions
export * from './game/useGameMutations'; // Layer 1: Pure mutations
export * from './game/useEquipment';

// Session hooks
export * from './session/useSessionKey';
export * from './session/useSessionFunding';

// Contract hooks
export * from './contracts/useBattleNadsClient';

// App initialization hooks
export * from './useAppInitializerMachine';

// Other hooks
// ... any other hooks you might add later 