# Frontend Update Plan - Smart Contract ABI Changes

**Date:** July 2, 2025  
**Related:** ABI Changes from commit `8517aa8` - "update abi"  
**Priority:** High - Breaking Changes  
**Estimated Effort:** 2-3 days

## 🎯 Progress Assessment (Current Branch: `fix/combat-tracker-abi-update`)

**Phase 1: Type System Updates**

- [x] ✅ **CombatTracker interface** - Added complete interface in `src/types/contract/BattleNads.ts`
- [x] ✅ **Character interface updated** - `activeTask` changed from `string` to `CombatTracker` in contract types
- [x] ✅ **PollFrontendDataReturn updated** - Removed `unallocatedAttributePoints` field

**Phase 2: Contract Integration**

- [x] ✅ **Contract mapping updated** - Full `CombatTracker` mapping implemented in `src/mappers/contractToDomain.ts`
- [x] ✅ **BigInt conversion** - `targetBlock` properly converted from `bigint` to `number` in contract to domain layer (`src/mappers/contractToDomain.ts`)
- [x] ✅ **Polling data structure** - Array indices fixed after field removal
- [x] ✅ **unspentAttributePoints mapping** - Now uses `character.stats.unspentAttributePoints`


**Phase 3: UI Component Updates**

- [ ] **Task display components** - Need to utilize new CombatTracker fields instead of depreciated string type
- [x] **Character stats UI** - May still reference old `unallocatedAttributePoints`
- [ ] **Combat UI enhancements** - New CombatTracker fields not utilized
- [x] ✅ **DebugPanel.tsx** - Updated to parse full `CombatTracker` structure from contract data (`src/components/DebugPanel.tsx`)
- [x] ✅ **Removed deprecated fields** - Cleaned up `unallocatedAttributePoints` references from test mock (`/useGameData.test.tsx`)

**Phase 4: State Management**

- [ ] **Redux/state updates** - May have cached old structure
- [ ] **Hook updates** - Need to leverage enhanced CombatTracker features

**Phase 5: Error Handling**

- [ ] **CombatTracker error states** - `hasTaskError` field not used
- [ ] **New error types** - Contract error handling not updated

**Phase 6: Enhanced Features**

- [ ] **Progress tracking** - `targetBlock` field not utilized
- [ ] **Pending states** - `pending` field not used in UI
- [ ] **Delay handling** - `taskDelay`/`executorDelay` not implemented

**Phase 7: Performance & Optimization**

- [ ] **Caching updates** - May cache old structure
- [ ] **Utility functions** - No helper functions for CombatTracker

**Phase 8: Testing & Validation** 

- [x] ✅ **Test updates** - `useContractPolling.test.tsx` updated with new data structure
- [x] ✅ **Test updates** - All affected test files updated with new CombatTracker structure:
  - [x] `src/components/game/board/__tests__/CharacterInfo.test.tsx`
  - [x] `src/hooks/game/__tests__/useCharacterExperience.test.tsx`
  - [x] `src/hooks/session/__tests__/useSessionKey.test.tsx`
- [x] ✅ **Build verification** - TypeScript compilation passes (0 errors)
- [x] ✅ **Test coverage** - All 32 test suites pass (340 tests total)
---

## Overview

The smart contract has undergone significant changes that require frontend updates:

1. **CombatTracker struct** - `activeTask` changed from `address` to complex struct
2. **Shortened cooldowns** - Combat timing adjustments
3. **unallocatedAttributePoints removal** - Now nested in `battlenad.stats.unspentAttributePoints`

## Phase 1: Type System Updates

### 1.1 Update TypeScript Interfaces

- [x] **Update character types** (`src/types/domain/character.ts`)

  - [x] Add `CombatTracker` interface with all 6 fields
  - [ ] Update `Character` interface to use `CombatTracker` for `activeTask`
  - [ ] Update any other interfaces that reference `activeTask`
  - [x] Remove `unallocatedAttributePoints` from return types
  - [ ] Update `PollFrontendDataReturn` interface

- [ ] **Update contract interaction types**
  - [ ] Update ABI-generated types if using typechain
  - [ ] Update manual contract result types
  - [ ] Update any cached data structure types

### 1.2 Create Utility Functions

- [ ] **Create CombatTracker utilities** (`src/utils/combatTracker.ts`)
  - [ ] `hasActiveTask()` - Check if task address is not zero
  - [ ] `getTaskProgress()` - Calculate progress based on blocks
  - [ ] `isTaskInError()` - Check error state
  - [ ] `isTaskPending()` - Check pending state
  - [ ] `getEstimatedCompletion()` - Calculate ETA

## Phase 2: Contract Integration Updates

### 2.1 Update Contract Calls

- [ ] **Find all `activeTask` usage** (grep search needed)

  - [ ] Update direct address access to `activeTask.taskAddress`
  - [ ] Update task state checking logic
  - [ ] Update any conditional logic based on task state

- [ ] **Update `pollForFrontendData` usage**
  - [ ] Remove direct `unallocatedAttributePoints` access
  - [ ] Update to use `battlenad.stats.unspentAttributePoints`
  - [ ] Update any caching logic for this data

### 2.2 Update Contract Event Listeners

- [ ] **Add new event listeners**

  - [ ] `TaskNotScheduledInHandler` event
  - [ ] `TaskNotScheduledInTaskHandler` event
  - [ ] Handle task scheduling failures appropriately

- [ ] **Remove deprecated event listeners**
  - [ ] Remove `AlreadyInCombat` error handling
  - [ ] Remove `NotEnoughGas` error handling
  - [ ] Remove `TaskNotScheduled` error handling

## Phase 3: UI Component Updates

### 3.1 Task Display Components

- [ ] **Update task status displays**

  - [ ] Show pending state with loading indicators
  - [ ] Show error state with error messages
  - [ ] Display task address (from `taskAddress` field)
  - [ ] Add progress bars using block-based progress

- [ ] **Update task interaction components**
  - [ ] Disable actions when task has error
  - [ ] Show different states for pending vs active tasks
  - [ ] Update task cancellation logic if applicable

### 3.2 Character Stats Components

- [ ] **Update attribute point displays**
  - [ ] Change from direct `unallocatedAttributePoints` access
  - [ ] Update to use nested `stats.unspentAttributePoints`
  - [ ] Update any stat allocation UI components

### 3.3 Combat UI Components

- [ ] **Update combat timing displays**
  - [ ] Adjust for shortened cooldowns (factor of 4 reduction)
  - [ ] Update defensive ability timing displays
  - [ ] Add wind-up duration displays for defensive abilities
  - [ ] Update combat cold start delay handling

## Phase 4: State Management Updates

### 4.1 Redux/State Updates (if applicable)

- [ ] **Update state shape**

  - [ ] Update character state to include `CombatTracker`
  - [ ] Update any cached task data structures
  - [ ] Update selectors that access `activeTask`

- [ ] **Update actions and reducers**
  - [ ] Update character data actions
  - [ ] Update task-related actions
  - [ ] Update error handling actions

### 4.2 React Hook Updates

- [ ] **Update custom hooks**
  - [ ] `useCharacterData` - Handle new `activeTask` structure
  - [ ] `useTaskStatus` - Use new `CombatTracker` fields
  - [ ] `useAttributePoints` - Use nested path for unallocated points
  - [ ] Any other task-related hooks

## Phase 5: Error Handling & Validation

### 5.1 Add New Error Handling

- [ ] **Handle new error types**

  - [ ] `Storage_InvalidBlock` error handling
  - [ ] `Storage_InvalidIndex` error handling
  - [ ] Task scheduling failure handling

- [ ] **Update error boundaries**
  - [ ] Handle `CombatTracker` structure errors
  - [ ] Handle missing nested attribute points
  - [ ] Handle contract call failures with new structure

### 5.2 Add Data Validation

- [ ] **Validate `CombatTracker` structure**
  - [ ] Ensure all required fields are present
  - [ ] Validate field types and ranges
  - [ ] Handle malformed data gracefully

## Phase 6: Testing & Validation

### 6.1 Unit Tests

- [ ] **Test utility functions**

  - [ ] Test `CombatTracker` utility functions
  - [ ] Test attribute point access logic
  - [ ] Test error state handling

- [ ] **Test component updates**
  - [ ] Test task display components
  - [ ] Test character stats components
  - [ ] Test error handling in components

### 6.2 Integration Tests

- [ ] **Test contract integration**

  - [ ] Test `pollForFrontendData` updates
  - [ ] Test task state transitions
  - [ ] Test event listener functionality

- [ ] **Test user flows**
  - [ ] Test task creation and monitoring
  - [ ] Test attribute point allocation
  - [ ] Test combat timing displays

## Phase 7: Performance & Optimization

### 7.1 Caching Updates

- [ ] **Update cached data structures**
  - [ ] Update character data caching
  - [ ] Update task state caching
  - [ ] Clear old cached data format

### 7.2 Optimization

- [ ] **Optimize new data access patterns**
  - [ ] Optimize nested attribute point access
  - [ ] Optimize `CombatTracker` field access
  - [ ] Optimize progress calculations

## Phase 8: Documentation & Cleanup

### 8.1 Update Documentation

- [ ] **Update code comments**
  - [ ] Update comments referencing old `activeTask` structure
  - [ ] Add comments explaining new `CombatTracker` usage
  - [ ] Update any inline documentation

### 8.2 Code Cleanup

- [ ] **Remove deprecated code**
  - [ ] Remove old error handling code
  - [ ] Remove old task state checking logic
  - [ ] Remove old attribute point access patterns

## Critical Files to Update

Based on the ABI changes, these files likely need updates:

### High Priority

- [ ] `src/types/domain/character.ts` - Character type definitions
- [ ] `src/hooks/useCharacterData.ts` - Character data fetching
- [ ] `src/components/character/CharacterStats.tsx` - Attribute points display
- [ ] `src/components/combat/TaskStatus.tsx` - Task status display
- [ ] `src/services/contractService.ts` - Contract interaction logic

### Medium Priority

- [ ] `src/utils/taskHelpers.ts` - Task utility functions
- [ ] `src/components/combat/CombatTimer.tsx` - Combat timing display
- [ ] `src/store/characterSlice.ts` - Character state management
- [ ] `src/hooks/useTaskStatus.ts` - Task status hook

### Low Priority

- [ ] Any caching utilities
- [ ] Error logging utilities
- [ ] Performance monitoring for task states

## Risk Mitigation

### High Risk Items

- [ ] **Backup current working state** before starting updates
- [ ] **Test with minimal changes first** - Update types, then gradually update usage
- [ ] **Maintain feature flags** for rollback capability if needed

### Testing Strategy

- [ ] **Unit test each phase** before moving to next
- [ ] **Test with real contract data** to ensure compatibility
- [ ] **Test error scenarios** with malformed data

## Success Criteria

- [ ] All TypeScript compilation errors resolved
- [ ] All existing functionality works with new data structure
- [ ] New `CombatTracker` fields are properly utilized in UI
- [ ] Attribute points are correctly accessed from nested location
- [ ] Combat timing displays reflect new cooldown values
- [ ] Error handling works for new error types
- [ ] Performance is maintained or improved

## Notes

- **Breaking Change Impact:** This is a major breaking change that affects core character data structure
- **Backward Compatibility:** No backward compatibility needed - clean cutover
- **Data Migration:** Any cached character data should be cleared/refreshed
- **Testing Priority:** Focus testing on task state transitions and attribute point access

## Next Steps

1. **Start with Phase 1** - Update type definitions first
2. **Use grep search** to find all `activeTask` usage in codebase
3. **Create utility functions** before updating components
4. **Test incrementally** after each phase
5. **Coordinate with backend team** for any contract interaction questions
