---
title: "BattleNads ABI Changes - Combat Tracker Refactor"
date: "2025-07-02"
commit: "8517aa8"
branch: "update-sc-refactor"
type: "breaking-change"
impact: "high"
---

# BattleNads ABI Changes - Combat Tracker Refactor

**Date:** July 2, 2025  
**Commit:** `8517aa8` - "update abi"  
**Branch:** `update-sc-refactor`  
**File:** `src/blockchain/abis/BattleNadsEntrypoint.json`

## Overview

This document outlines the changes made to the BattleNads smart contract ABI, specifically focusing on the transformation of the `activeTask` field from a simple address to a comprehensive combat tracking structure.

> 🚨 **Breaking Change:** This is a major breaking change that affects all functions returning character data and requires immediate frontend updates.

## Critical Context for Future AI Agents

### What This Change Represents

The smart contract underwent a significant refactor to improve combat task tracking. Previously, the system only tracked the address of an active task. Now it tracks comprehensive state information including error states, timing, and execution details.

### Scope of Impact

This change affects **every function** in the ABI that returns character data, including but not limited to:

- Character retrieval functions
- Combat state queries
- Task management functions
- Battle result functions
- Character update operations

**Total Occurrences:** The `activeTask` field appears in approximately 15+ different function return types throughout the ABI.

## Major Changes

### 1. ActiveTask Field Transformation

**Before:**

```json
{
  "name": "activeTask",
  "type": "address",
  "internalType": "address"
}
```

**After:**

```json
{
  "name": "activeTask",
  "type": "tuple",
  "internalType": "struct CombatTracker",
  "components": [
    {
      "name": "hasTaskError",
      "type": "bool",
      "internalType": "bool"
    },
    {
      "name": "pending",
      "type": "bool",
      "internalType": "bool"
    },
    {
      "name": "taskDelay",
      "type": "uint8",
      "internalType": "uint8"
    },
    {
      "name": "executorDelay",
      "type": "uint8",
      "internalType": "uint8"
    },
    {
      "name": "taskAddress",
      "type": "address",
      "internalType": "address"
    },
    {
      "name": "targetBlock",
      "type": "uint64",
      "internalType": "uint64"
    }
  ]
}
```

### 2. CombatTracker Structure Fields

| Field           | Type      | Description                                                        | Usage Context                                   |
| --------------- | --------- | ------------------------------------------------------------------ | ----------------------------------------------- |
| `hasTaskError`  | `bool`    | Indicates if the task has encountered an error                     | Error handling, UI error states                 |
| `pending`       | `bool`    | Indicates if the task is currently pending                         | Loading states, UI indicators                   |
| `taskDelay`     | `uint8`   | Delay associated with the task execution                           | Timing calculations, progress bars              |
| `executorDelay` | `uint8`   | Delay associated with the executor                                 | Advanced timing logic, performance metrics      |
| `taskAddress`   | `address` | The address of the task (equivalent to the old `activeTask` value) | **Direct replacement for old activeTask field** |
| `targetBlock`   | `uint64`  | The target block number for task execution                         | Progress tracking, ETA calculations             |

> 💡 **Key Migration Point:** `taskAddress` is the direct replacement for the old `activeTask` value.

## Detailed Function Impact Analysis

### Functions Returning Character Data

All functions that previously returned a character struct with `activeTask: address` now return `activeTask: CombatTracker`. This includes:

**Character Query Functions:**

- `getCharacter(bytes32 characterId)`
- `getCharacterByOwner(address owner)`
- `getCharacterStats(bytes32 characterId)`
- `getCharacterCombatData(bytes32 characterId)`

**Battle/Combat Functions:**

- `getBattleState(uint256 battleId)`
- `getCombatResult(bytes32 characterId)`
- `getActiveAbilities(bytes32 characterId)`

**Task Management Functions:**

- `getTaskStatus(bytes32 characterId)`
- `getScheduledTasks(address owner)`

### Example Function Signature Changes

**Before:**

```typescript
// Old function return type
interface CharacterData {
  id: string;
  owner: string;
  level: number;
  activeTask: string; // This was just an address
  // ... other fields
}

// Usage in frontend
const character = await contract.getCharacter(characterId);
const taskAddress = character.activeTask; // Direct address access
```

**After:**

```typescript
// New function return type
interface CombatTracker {
  hasTaskError: boolean;
  pending: boolean;
  taskDelay: number;
  executorDelay: number;
  taskAddress: string; // The actual task address
  targetBlock: bigint;
}

interface CharacterData {
  id: string;
  owner: string;
  level: number;
  activeTask: CombatTracker; // Now a complex object
  // ... other fields
}

// Usage in frontend
const character = await contract.getCharacter(characterId);
const taskAddress = character.activeTask.taskAddress; // Access nested field
const isTaskPending = character.activeTask.pending;
const hasError = character.activeTask.hasTaskError;
```

## Impact on Frontend Integration

### TypeScript Type Updates Required

The frontend will need to update its TypeScript interfaces to reflect the new structure:

**Old Interface:**

```typescript
interface Character {
  // ... other fields
  activeTask: string; // address
}
```

**New Interface:**

```typescript
interface CombatTracker {
  hasTaskError: boolean;
  pending: boolean;
  taskDelay: number; // uint8
  executorDelay: number; // uint8
  taskAddress: string; // address
  targetBlock: bigint; // uint64
}

interface Character {
  // ... other fields
  activeTask: CombatTracker;
}
```

### Code Migration Strategy

1. **Immediate Changes:**

   - Update all TypeScript interfaces that reference `activeTask`
   - Update any code that directly accesses `activeTask` as an address
   - Change `character.activeTask` to `character.activeTask.taskAddress`

2. **Enhanced Functionality:**
   - Utilize the new `hasTaskError` field for error handling
   - Use `pending` field for UI state management
   - Implement delay-based UI updates using `taskDelay` and `executorDelay`
   - Use `targetBlock` for progress tracking and timing

### Critical Migration Examples

**Task Address Access:**

```typescript
// OLD CODE - Will break
const taskAddress = character.activeTask;

// NEW CODE - Required update
const taskAddress = character.activeTask.taskAddress;
```

**Task State Checking:**

```typescript
// OLD CODE - Limited information
const hasActiveTask =
  character.activeTask !== "0x0000000000000000000000000000000000000000";

// NEW CODE - Rich state information
const hasActiveTask =
  character.activeTask.taskAddress !==
  "0x0000000000000000000000000000000000000000";
const isTaskPending = character.activeTask.pending;
const hasTaskError = character.activeTask.hasTaskError;
```

**Error Handling:**

```typescript
// OLD CODE - No error information available
// Had to rely on external error detection

// NEW CODE - Built-in error tracking
if (character.activeTask.hasTaskError) {
  // Handle task error state
  showErrorMessage("Task encountered an error");
}
```

**Progress Tracking:**

```typescript
// OLD CODE - No progress information
// Had to estimate or guess progress

// NEW CODE - Precise progress tracking
const currentBlock = await provider.getBlockNumber();
const progress = Math.min(
  (currentBlock - startBlock) / (character.activeTask.targetBlock - startBlock),
  1
);
```

### Functions Affected

The `activeTask` field change affects multiple functions in the ABI. All functions that return character data or combat-related information will now return the new `CombatTracker` structure instead of a simple address.

## Additional Changes

### 3. Removed Fields

- `unallocatedAttributePoints` field was removed from some character structures

> ℹ️ **Note:** This field removal affects character stat management and may require updates to stat allocation UI components.

### 4. New Events Added

```json
{
  "type": "event",
  "name": "TaskNotScheduledInHandler",
  "inputs": [
    {
      "name": "id",
      "type": "uint256",
      "indexed": false,
      "internalType": "uint256"
    },
    {
      "name": "characterID",
      "type": "bytes32",
      "indexed": false,
      "internalType": "bytes32"
    },
    {
      "name": "currentBlock",
      "type": "uint256",
      "indexed": false,
      "internalType": "uint256"
    },
    {
      "name": "targetBlock",
      "type": "uint256",
      "indexed": false,
      "internalType": "uint256"
    }
  ]
}
```

```json
{
  "type": "event",
  "name": "TaskNotScheduledInTaskHandler",
  "inputs": [
    {
      "name": "id",
      "type": "uint256",
      "indexed": false,
      "internalType": "uint256"
    },
    {
      "name": "characterID",
      "type": "bytes32",
      "indexed": false,
      "internalType": "bytes32"
    },
    {
      "name": "currentBlock",
      "type": "uint256",
      "indexed": false,
      "internalType": "uint256"
    },
    {
      "name": "targetBlock",
      "type": "uint256",
      "indexed": false,
      "internalType": "uint256"
    }
  ]
}
```

**Event Usage Context:**
These events are fired when tasks fail to be scheduled properly. Frontend should listen for these events to handle scheduling failures and provide appropriate user feedback.

### 5. Error Types Removed

- `AlreadyInCombat` - Combat state conflicts are now handled differently
- `NotEnoughGas` - Gas estimation and handling has been refactored
- `TaskNotScheduled` - Replaced with more specific error handling

### 6. Error Types Added

- `Storage_InvalidBlock` - Thrown when block number validation fails
- `Storage_InvalidIndex` - Thrown when array/mapping index is invalid

## Comprehensive Migration Guide

### Step 1: Update Type Definitions

Create or update your TypeScript definitions:

```typescript
// src/types/combat.ts
export interface CombatTracker {
  hasTaskError: boolean;
  pending: boolean;
  taskDelay: number;
  executorDelay: number;
  taskAddress: string;
  targetBlock: bigint;
}

// Update existing character interface
export interface Character {
  // ... existing fields
  activeTask: CombatTracker; // Changed from string to CombatTracker
}
```

### Step 2: Update Contract Interaction Code

```typescript
// src/hooks/useCharacterData.ts
export const useCharacterData = (characterId: string) => {
  const [character, setCharacter] = useState<Character | null>(null);

  const fetchCharacter = async () => {
    const result = await contract.getCharacter(characterId);

    // OLD: Direct assignment
    // const character = { ...result, activeTask: result.activeTask };

    // NEW: Handle CombatTracker structure
    const character = {
      ...result,
      activeTask: {
        hasTaskError: result.activeTask.hasTaskError,
        pending: result.activeTask.pending,
        taskDelay: Number(result.activeTask.taskDelay),
        executorDelay: Number(result.activeTask.executorDelay),
        taskAddress: result.activeTask.taskAddress,
        targetBlock: BigInt(result.activeTask.targetBlock),
      },
    };

    setCharacter(character);
  };
};
```

### Step 3: Update UI Components

```typescript
// src/components/CharacterTask.tsx
interface CharacterTaskProps {
  character: Character;
}

export const CharacterTask: React.FC<CharacterTaskProps> = ({ character }) => {
  const { activeTask } = character;

  // OLD: Simple address check
  // const hasActiveTask = activeTask !== "0x0000000000000000000000000000000000000000";

  // NEW: Rich state checking
  const hasActiveTask =
    activeTask.taskAddress !== "0x0000000000000000000000000000000000000000";

  if (!hasActiveTask) {
    return <div>No active task</div>;
  }

  return (
    <div className="task-container">
      <div className="task-address">Task: {activeTask.taskAddress}</div>

      {/* NEW: Enhanced UI with rich state information */}
      {activeTask.pending && (
        <div className="task-status pending">
          <Spinner /> Task Pending...
        </div>
      )}

      {activeTask.hasTaskError && (
        <div className="task-status error">⚠️ Task Error Detected</div>
      )}

      {/* NEW: Progress tracking */}
      <TaskProgress
        targetBlock={activeTask.targetBlock}
        taskDelay={activeTask.taskDelay}
        executorDelay={activeTask.executorDelay}
      />
    </div>
  );
};
```

### Step 4: Update Event Listeners

```typescript
// src/services/eventListener.ts
export const setupEventListeners = (contract: Contract) => {
  // NEW: Listen for task scheduling failures
  contract.on(
    "TaskNotScheduledInHandler",
    (id, characterID, currentBlock, targetBlock) => {
      console.warn("Task scheduling failed in handler:", {
        id: id.toString(),
        characterID,
        currentBlock: currentBlock.toString(),
        targetBlock: targetBlock.toString(),
      });

      // Handle scheduling failure in UI
      notifyTaskSchedulingFailure(characterID);
    }
  );

  contract.on(
    "TaskNotScheduledInTaskHandler",
    (id, characterID, currentBlock, targetBlock) => {
      console.warn("Task scheduling failed in task handler:", {
        id: id.toString(),
        characterID,
        currentBlock: currentBlock.toString(),
        targetBlock: targetBlock.toString(),
      });

      // Handle scheduling failure in UI
      notifyTaskSchedulingFailure(characterID);
    }
  );
};
```

## Integration Checklist

- [ ] Update TypeScript interfaces for `CombatTracker`
- [ ] Replace direct `activeTask` address usage with `activeTask.taskAddress`
- [ ] Implement error handling using `hasTaskError` field
- [ ] Add UI indicators for `pending` state
- [ ] Implement delay-based timing using `taskDelay` and `executorDelay`
- [ ] Add block-based progress tracking using `targetBlock`
- [ ] Update event listeners for new task scheduling events
- [ ] Remove references to deprecated error types
- [ ] Add handling for new error types
- [ ] Test all combat-related functionality
- [ ] Update any documentation or comments referencing the old structure
- [ ] Create utility functions for common `CombatTracker` operations
- [ ] Add validation for `CombatTracker` structure in frontend code
- [ ] Update any cached data structures that store character data
- [ ] Test error scenarios with `hasTaskError` flag
- [ ] Implement progress bars using `targetBlock` information

## Utility Functions for Migration

```typescript
// src/utils/combatTracker.ts
export const combatTrackerUtils = {
  // Check if character has an active task
  hasActiveTask: (tracker: CombatTracker): boolean => {
    return tracker.taskAddress !== "0x0000000000000000000000000000000000000000";
  },

  // Get task progress as percentage
  getTaskProgress: async (
    tracker: CombatTracker,
    provider: Provider
  ): Promise<number> => {
    if (!combatTrackerUtils.hasActiveTask(tracker)) return 0;

    const currentBlock = await provider.getBlockNumber();
    const targetBlock = Number(tracker.targetBlock);

    if (currentBlock >= targetBlock) return 100;

    // Estimate progress based on blocks (this might need adjustment based on task type)
    const estimatedStartBlock =
      targetBlock - (tracker.taskDelay + tracker.executorDelay);
    const progress = Math.max(
      0,
      (currentBlock - estimatedStartBlock) / (targetBlock - estimatedStartBlock)
    );

    return Math.min(progress * 100, 100);
  },

  // Check if task is in error state
  isTaskInError: (tracker: CombatTracker): boolean => {
    return tracker.hasTaskError;
  },

  // Check if task is pending
  isTaskPending: (tracker: CombatTracker): boolean => {
    return tracker.pending;
  },

  // Get estimated completion time
  getEstimatedCompletion: async (
    tracker: CombatTracker,
    provider: Provider
  ): Promise<Date | null> => {
    if (!combatTrackerUtils.hasActiveTask(tracker)) return null;

    const currentBlock = await provider.getBlockNumber();
    const targetBlock = Number(tracker.targetBlock);

    if (currentBlock >= targetBlock) return new Date(); // Already completed

    const blocksRemaining = targetBlock - currentBlock;
    const avgBlockTime = 12; // seconds (adjust for your network)
    const estimatedSeconds = blocksRemaining * avgBlockTime;

    return new Date(Date.now() + estimatedSeconds * 1000);
  },
};
```

## Notes for AI Agents

When working on integrating these changes:

1. **Backward Compatibility:** The old `activeTask` address is now available as `activeTask.taskAddress`
2. **Enhanced State Management:** The new structure provides much more granular control over task states
3. **Error Handling:** The `hasTaskError` field should be checked before processing task-related operations
4. **Timing Logic:** Use `targetBlock` in combination with current block number for progress calculations
5. **UI Updates:** The `pending` field is ideal for showing loading states in the UI
6. **Event Handling:** New events provide better insight into task scheduling failures
7. **Data Validation:** Always validate the `CombatTracker` structure when receiving data from the contract

## Questions for Implementation

- Should we maintain backward compatibility helpers for the old `activeTask` usage? A: No
- How should we handle the migration of existing saved state or cached data? A: Delete / disregard

## Risk Assessment

> 🚨 **High Risk Areas:**
>
> - Any code that directly accesses `activeTask` as a string/address
> - Cached character data that hasn't been updated
> - Event listeners that expect old error types
> - UI components that assume simple task state
