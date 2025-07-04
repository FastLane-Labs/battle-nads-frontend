# Ability Tracker Investigation Findings

## Issue
The ability tracker data from the smart contract appears empty, preventing the display of CHARGING and ACTION stage animations.

## Root Cause Analysis

### 1. Contract Structure Update
- The `BattleNad` struct contains `activeAbility` field of type `AbilityTracker`
- Field order in struct (important for array-like data):
  ```
  0: id (bytes32)
  1: stats (BattleNadStats)
  2: maxHealth (uint256)
  3: weapon (Weapon)
  4: armor (Armor)
  5: inventory (Inventory)
  6: tracker (StorageTracker)
  7: activeTask (CombatTracker)
  8: activeAbility (AbilityTracker)
  9: owner (address)
  10: name (string)
  ```

### 2. Data Mapping Issues
- Array-to-object conversion was using incorrect field order
- Fixed mapping to match exact contract struct order
- Added enhanced logging to debug ability data

### 3. Ability Data Architecture
- Ability data remains part of Character model (not moved to top level)
- Contract provides transient ability state (only populated during active tasks)
- Need client-side tracking for full stage progression

## Solution Implemented

### 1. **Type Updates**
- Updated `Character` interface to match exact contract struct order
- Maintained `activeAbility` field in Character model
- Removed incorrect top-level `abilityTracker` field

### 2. **Mapper Fixes**
- Fixed array-to-object conversion with correct field indices
- Enhanced logging for debugging ability data
- Proper handling of nested ability state

### 3. **New Hook: `useAbilityTracker`**
Created a dedicated hook for enhanced ability tracking:
```typescript
export interface AbilityTrackerData {
  activeAbility: domain.Ability;
  currentStage: AbilityStage;
  targetBlock: number;
  stageProgress: number; // 0-100%
  timeRemaining: number; // seconds
  stageDuration: number; // total seconds
  isOptimistic: boolean;
}
```

Features:
- Calculates stage progress based on blocks elapsed
- Provides time remaining in current stage
- Defines stage durations for each ability
- Ready for client-side optimistic updates

### 4. **Stage Durations Defined**
Each ability now has defined durations for:
- CHARGING stage (preparation)
- ACTION stage (execution)
- COOLDOWN stage (recovery)

Example:
```typescript
Fireball: { charging: 8 blocks, action: 4 blocks, cooldown: 56 blocks }
```

## Next Steps

1. **Monitor Contract Data**
   - Use enhanced logging to understand when ability data is populated
   - Verify stage transitions match expected behavior

2. **Implement Optimistic Updates**
   - Track ability activation client-side
   - Progress through stages based on block time
   - Reconcile with contract data when available

3. **Visual Indicators**
   - Use `useAbilityTracker` for progress bars
   - Show stage-specific animations
   - Display time remaining for better UX

## Technical Details

### Code Changes
1. `src/types/contract/BattleNads.ts` - Fixed Character struct order
2. `src/types/domain/character.ts` - Maintained ability field
3. `src/mappers/contractToDomain.ts` - Fixed array mapping, enhanced logging
4. `src/hooks/game/useAbilityTracker.ts` - New dedicated ability tracking hook
5. `src/hooks/game/useAbilityCooldowns.ts` - Restored to use character.ability

### Usage Example
```typescript
const { abilityTracker, isAbilityActive } = useAbilityTracker();

if (isAbilityActive && abilityTracker) {
  console.log(`Stage: ${AbilityStage[abilityTracker.currentStage]}`);
  console.log(`Progress: ${abilityTracker.stageProgress}%`);
  console.log(`Time remaining: ${abilityTracker.timeRemaining}s`);
}
```