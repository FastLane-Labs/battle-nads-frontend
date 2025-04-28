# Battle-Nads Frontend Development Rules

## Purpose

These rules provide guidance for working with the Battle-Nads frontend codebase, ensuring consistent implementation of architecture patterns and proper integration with the blockchain contracts.

## Key Architecture Principles

1. **Data Flow Pattern**
   - Always follow the established data flow pattern:
     - Data reads: Smart Contract → `useBattleNadsClient` → `useUiSnapshot` → React-Query Cache → Gameplay Hooks → UI Components
     - Data writes: UI Components → Gameplay Hooks → `useBattleNadsClient` → Smart Contract → Invalidate Cache

2. **Single Source of Truth**
   - Use `useUiSnapshot` as the single polling source of truth
   - Never create additional polling mechanisms
   - All gameplay hooks must read from the React-Query cache established by `useUiSnapshot`

3. **XState Integration**
   - Game flow state must use the XState machine in `machines/gameStateMachine.ts`
   - Leverage `useGameMachine` for connecting UI components to the state machine
   - Follow the established state transitions: checkingWallet → checkingCharacter → checkingSessionKey → ready

4. **Client Adapter Pattern**
   - Always use the appropriate client adapter for different access levels:
     - `read` adapter for public data
     - `owner` adapter for owner-authenticated actions
     - `session` adapter for session key operations
   - Never bypass the adapters to call blockchain directly

## Contract Integration Guidelines

1. **Character Management**
   - For character creation, use the `createCharacter` function with proper stat distribution
   - Poll `getFrontendData(characterID)` to get character state, never implement duplicate polling
   - Handle character state through the domain model, not raw contract data

2. **Game Actions**
   - Movement must be implemented using the directional methods (`moveNorth`, etc.)
   - Combat actions must use the `attack` method with proper target index
   - Equipment changes require checking availability first with `getEquippableWeapons/Armor`

3. **Session Key Handling**
   - Always check session key status with `useSessionKey` before operations
   - Implement proper error handling for session key expiration or insufficient balance
   - Use `useSessionFunding` for monitoring and managing session key funding

## Error Handling & Performance

1. **Error Boundaries**
   - Implement error boundaries around game components
   - Handle contract errors gracefully with user-friendly messages
   - Provide clear recovery paths for common failure scenarios

2. **Optimistic Updates**
   - Implement optimistic updates for movement and chat actions
   - Always invalidate the appropriate cache keys after mutations
   - Follow the pattern: mutate → optimistic update → invalidate cache

3. **Query Optimization**
   - Use query selectors to avoid unnecessary re-renders
   - Leverage React-Query's stale time and cache time configurations
   - Implement proper dependencies in query/mutation hooks

## Code Organization

1. **Feature Grouping**
   - Group related hooks and components by feature
   - Follow the established directory structure
   - Place new blockchain adapters in `blockchain/adapters`

2. **Naming Conventions**
   - Prefix hooks with `use`
   - Prefix state machine hooks with `useMachine`
   - Name client adapters with camelCase and suffix with `Adapter`

3. **Type Safety**
   - Always use the proper type imports from `types` directory
   - Maintain separation between contract, domain, and UI types
   - Use mappers to transform between type domains

## Development Process

1. **Testing Requirements**
   - Write tests for all blockchain interactions
   - Mock the `BattleNadsClient` for component testing
   - Use the testing utilities in the `test` directory

2. **Documentation**
   - Document all hooks with JSDoc comments
   - Update architecture documentation when making structural changes
   - Document all public APIs and component props 