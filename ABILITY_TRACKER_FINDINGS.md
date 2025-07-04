# Ability Tracker Investigation Findings

## Issue
The ability tracker data from the smart contract appears empty, preventing the display of CHARGING and ACTION stage animations.

## Root Cause Analysis

### 1. Blockchain Architecture
- Each wallet can only have **one character**, so the ability data is character-specific
- The contract provides `activeAbility: AbilityState` with:
  - `ability`: The ability enum value
  - `stage`: Current stage (READY=0, CHARGING=1, ACTION=2, COOLDOWN=3)
  - `targetIndex`: Target of the ability
  - `taskAddress`: Address handling the ability execution
  - `targetBlock`: Block number when the current stage ends
- **However**, the data appears to always be empty/default values

### 2. Current Frontend Implementation
- Uses optimistic updates to immediately show COOLDOWN state after ability use
- Only tracks two states effectively: READY and COOLDOWN
- Missing client-side tracking for CHARGING and ACTION stages

### 3. Data Structure Issues
- Ethers.js may return contract data as array-like Result objects
- Added handling for array-to-object conversion, but data is still empty
- The empty data is by design, not a mapping error

## Implications

1. **Visual Indicators Limited**: Cannot show CHARGING/ACTION animations based on blockchain data alone
2. **Optimistic Updates**: Current implementation jumps directly from READY → COOLDOWN
3. **Stage Progression**: Would need client-side state machine to track READY → CHARGING → ACTION → COOLDOWN

## Recommended Solution

To implement proper ability stage animations:

1. **Client-Side State Machine**
   - Track ability activation timestamp locally
   - Calculate stage durations based on ability type
   - Progress through stages: CHARGING (X blocks) → ACTION (Y blocks) → COOLDOWN

2. **Enhanced Optimistic Updates**
   ```typescript
   // Instead of jumping to COOLDOWN:
   setOptimisticAbilityUse({
     stage: AbilityStage.CHARGING,
     startBlock: currentBlock,
     chargingDuration: ABILITY_CHARGING_BLOCKS[ability],
     actionDuration: ABILITY_ACTION_BLOCKS[ability],
     cooldownDuration: ABILITY_COOLDOWN_BLOCKS[ability]
   });
   ```

3. **Stage Calculation Logic**
   ```typescript
   const calculateAbilityStage = (abilityUse, currentBlock) => {
     const blocksSinceUse = currentBlock - abilityUse.startBlock;
     
     if (blocksSinceUse < abilityUse.chargingDuration) {
       return AbilityStage.CHARGING;
     } else if (blocksSinceUse < abilityUse.chargingDuration + abilityUse.actionDuration) {
       return AbilityStage.ACTION;
     } else if (blocksSinceUse < abilityUse.totalDuration) {
       return AbilityStage.COOLDOWN;
     } else {
       return AbilityStage.READY;
     }
   };
   ```

## Technical Details

### Logging Added
1. `BattleNadsAdapter.ts`: Raw contract response structure logging
2. `contractToDomain.ts`: Character data mapping with array-like handling
3. `useContractPolling.ts`: Raw character data inspection

### Code Changes Made
- Added array-to-object conversion for ethers Result objects
- Enhanced logging to understand data structure
- Fixed character property references after conversion
- Added null checks and default values for missing ability data

## Next Steps

1. Implement client-side ability state tracking
2. Define CHARGING and ACTION durations for each ability
3. Update optimistic updates to include all stages
4. Test visual animations with simulated stage progression