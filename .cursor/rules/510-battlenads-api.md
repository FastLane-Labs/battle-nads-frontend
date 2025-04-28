# Battle-Nads Blockchain API Integration Rules

## Purpose

These rules provide guidance for integrating with the Battle-Nads blockchain contracts, ensuring proper understanding and usage of the game's core API functions.

## Contract Architecture Overview

1. **Core Contracts**
   - `BattleNadsEntrypoint`: Primary user-facing contract for game interactions
   - `Getters`: Contract for read-only queries (inherited by BattleNadsEntrypoint)
   - `TaskHandler`: Internal contract for automated task execution

2. **Integration Flow**
   - All user interactions go through `BattleNadsEntrypoint`
   - Data reading is done through aggregated getter functions
   - Automated game logic happens through tasks that call `TaskHandler` methods

## Primary Data Source

1. **Using `getFrontendData` as Main Data Source**
   - Always use `getFrontendData(characterID)` as the primary data source when possible
   - This returns a comprehensive snapshot containing:
     - Character data
     - Combatants in the area
     - Non-combatants in the area
     - 5x5 minimap around character
     - Equipable items
     - Unallocated attribute points
   - Hook implementation should use TanStack Query to cache this data

2. **Specialized Data Functions**
   - For more focused data needs, use the appropriate getter:
     - `getAreaInfo(depth, x, y)` for specific area details
     - `getMovementOptions(characterID)` for valid movement directions
     - `getEquippableWeapons(characterID)` / `getEquippableArmor(characterID)` for inventory
     - `getAreaCombatState(characterID)` for detailed combat state

## Action Implementation

1. **Movement Actions**
   - Implement movement using the specific direction functions:
     - `moveNorth(characterID)`
     - `moveSouth(characterID)`
     - `moveEast(characterID)`
     - `moveWest(characterID)`
     - `moveUp(characterID)`
     - `moveDown(characterID)`
   - Handle potential errors:
     - Character in combat
     - Movement outside boundaries
     - Insufficient gas

2. **Combat Actions**
   - Use `attack(characterID, targetIndex)` for initiating combat
   - Get valid targets from `getFrontendData` or `getAreaCombatState`
   - Remember that combat is turn-based and continues via automated tasks

3. **Equipment Management**
   - Use `equipWeapon(characterID, weaponID)` and `equipArmor(characterID, armorID)`
   - Always check equipment availability first through `getEquippableWeapons/Armor`
   - Equipment changes are not valid during combat

4. **Character Functions**
   - For character creation, use `createCharacter(...)` with appropriate stats
   - For leveling, use `allocatePoints(...)` for assigning new attribute points
   - Character creation requires proper funding for gas and task execution

## Session Key Management

1. **Session Key Implementation**
   - Use `updateSessionKey(sessionKey, sessionKeyDeadline)` to manage session keys
   - Monitor session key balance with `shortfallToRecommendedBalanceInMON/ShMON`
   - Top up session keys using `replenishGasBalance()`

2. **Session Key Validation**
   - Always check if a session key is active with `getCurrentSessionKey(characterID)`
   - Implement expiration logic to refresh keys before deadline
   - Ensure sufficient balance for gas before operations

## Error Handling Guidelines

1. **Common Error Cases**
   - Handle these specific errors in UI with appropriate messages:
     - Character in combat trying to move/equip
     - Insufficient gas for operations
     - Invalid movement direction
     - Non-existent target for attack
     - Session key expired or underfunded

2. **Transaction Monitoring**
   - Implement proper transaction tracking for all write operations
   - Provide UI feedback during transaction confirmation
   - Handle transaction failures with retry options

## Testing Contract Interactions

1. **Mock Contract Testing**
   - Create mock implementations of contract functions for testing
   - Simulate various error conditions from contracts
   - Test both happy paths and error cases

2. **Contract Event Handling**
   - Listen for and handle relevant contract events:
     - `ChatMessage` events for area chat
     - Task-related events for combat updates
     - Character state change events 