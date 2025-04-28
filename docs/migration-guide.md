# Migration Guide: GameDataProvider to React Query

## Overview

We've migrated from the custom GameDataProvider to React Query. This change brings several benefits:

- **Centralized data management**: All game data is now managed through React Query
- **Automatic deduplication**: Multiple components requesting the same data share network requests
- **Simplified polling**: React Query handles all polling, including pausing when tab is hidden
- **Optimistic updates**: UI feels more responsive with optimistic updates
- **Consistent caching**: Data is cached consistently with proper invalidation
- **Specialized hooks**: Each game feature has its own hook, making code more modular

## Quick Migration Path

For components still using `useGameData`, you have two options:

### Option 1: Temporary compatibility layer (easier but less optimal)

1. Change your import statement:

```diff
- import { useGameData } from '../../providers/GameDataProvider';
+ import { useGameData } from '../../components/MigrationHelper';
```

This provides backward compatibility while you migrate gradually.

### Option 2: Switch to specialized hooks (recommended)

Depending on what functionality you need, import and use the appropriate specialized hooks:

```jsx
import { useGame } from '../../hooks/game/useGame';
import { useChat } from '../../hooks/game/useChat';
import { useCombat } from '../../hooks/game/useCombat';

function MyComponent() {
  // Basic game state
  const { 
    character,
    position,
    moveCharacter,
    isMoving
  } = useGame();
  
  // Chat functionality
  const {
    chatLogs,
    sendChatMessage,
    isSending
  } = useChat();
  
  // Combat functionality
  const {
    isInCombat,
    combatants,
    attack
  } = useCombat();
  
  // Rest of your component...
}
```

## Specialized Hooks Reference

Here's a quick reference for the available hooks and their functionality:

### `useGame`
Core game state and player character data.
- `character` - Player character
- `position` - Current position
- `movementOptions` - Available movement directions
- `moveCharacter(direction)` - Move in a direction
- `others` - Other characters in the area

### `useChat`
Chat functionality.
- `chatLogs` - List of chat messages
- `sendChatMessage(message)` - Send a chat message
- `isSending` - Whether a message is being sent

### `useCombat`
Combat functionality.
- `isInCombat` - Whether the player is in combat
- `combatants` - List of enemies in combat
- `attack(targetIndex)` - Attack a target
- `useAbility(ability, targetIndex)` - Use an ability
- `isAttacking` - Whether an attack is in progress

### `useCharacter`
Character management.
- `createCharacter(name, class)` - Create a new character
- `allocatePoints(attributes)` - Allocate attribute points
- `deleteCharacter()` - Delete the character
- `unallocatedPoints` - Available attribute points

### `useEquipment`
Equipment management.
- `currentWeapon` - Currently equipped weapon
- `currentArmor` - Currently equipped armor
- `weaponOptions` - Available weapons
- `armorOptions` - Available armors
- `equipWeapon(weaponId)` - Equip a weapon
- `equipArmor(armorId)` - Equip armor

### `useSessionFunding`
Session key management.
- `sessionKey` - Current session key data
- `balanceShortfall` - Amount needed to fund session key
- `needsFunding` - Whether session key needs funding
- `replenishBalance(amount)` - Add funds to session key
- `deactivateKey()` - Deactivate the session key

## Examples

### Chat component migration

```jsx
// Before
import { useGameData } from '../../providers/GameDataProvider';

function ChatPanel() {
  const { processedChatMessages, sendMessage } = useGameData();
  
  // Component implementation...
}

// After
import { useChat } from '../../hooks/game/useChat';

function ChatPanel() {
  const { chatLogs, sendChatMessage } = useChat();
  
  // Component implementation with chatLogs instead of processedChatMessages
  // and sendChatMessage instead of sendMessage
}
```

### Combat component migration

```jsx
// Before
import { useGameData } from '../../providers/GameDataProvider';

function CombatPanel() {
  const { isInCombat, combatants, attack } = useGameData();
  
  // Component implementation...
}

// After
import { useCombat } from '../../hooks/game/useCombat';

function CombatPanel() {
  const { isInCombat, combatants, attack } = useCombat();
  
  // Same implementation, different import!
}
``` 