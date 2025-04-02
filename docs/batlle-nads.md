Below is a curated **Frontend Integration Guide** that explains **all** of the publicly exposed methods in the **Battle Nads** system. This should help developers understand which functions are relevant to the user interface, their purpose, parameters, return values, and side effects.

> **Note**: The core contracts for **Battle Nads** revolve around player actions, character and monster data, inventory management, session key usage, and auto‐task execution. The overarching design is that most user actions go through **`BattleNadsEntrypoint`** (and secondarily through a few read‐only “getter” functions). Automated game logic is executed via tasks that call **`TaskHandler.processTurn`** or **`TaskHandler.processSpawn`**.

---

## Table of Contents

1. [BattleNadsEntrypoint](#battlenadsentrypoint)
   - [Movement](#movement-functions)
   - [Combat Actions](#combat-actions)
   - [Equipment & Inventory](#equipment--inventory)
   - [Character Creation & Upgrades](#character-creation--upgrades)
   - [Session Key & Gas Replenishment](#session-key--gas-replenishment)
   - [Miscellaneous](#miscellaneous-in-battlenadsentrypoint)

2. [Getters (Read-Only API)](#getters-read-only-api)
   - [High-Level Aggregators](#high-level-aggregators)
   - [Area and Combat Information](#area-and-combat-information)
   - [Character & Inventory Data](#character--inventory-data)

3. [TaskHandler](#taskhandler)
   - [Automated Task Entry Points](#automated-task-entry-points)

---

## BattleNadsEntrypoint

The **`BattleNadsEntrypoint`** contract provides the primary user-facing endpoints for interacting with the game in real time: movement, attacking, equipping, leveling up, chatting, and so on. Most calls to these functions will be performed by the game’s front end on behalf of a user.

Below is a breakdown of its **public**/**external** functions:

---

### Movement Functions

Each of these functions changes the character’s coordinates or depth in the game world. They **revert** if the character is in combat or if the movement is invalid (moving outside boundaries, etc.).

1. **`moveNorth(bytes32 characterID)`**
2. **`moveSouth(bytes32 characterID)`**
3. **`moveEast(bytes32 characterID)`**
4. **`moveWest(bytes32 characterID)`**
5. **`moveUp(bytes32 characterID)`**
6. **`moveDown(bytes32 characterID)`**

**Parameters**
- `characterID`: The unique ID of the player’s character (returned from creation).

**Key Points / Effects**
- **Requires** that the character:
  - Is not dead
  - Is not in combat
  - Has enough gas left (the call reverts if `gasleft() < MIN_EXECUTION_GAS`).
- Checks boundaries: will revert if the new coordinates are invalid (e.g. moving out of the map).
- May trigger an **aggro check** in the new area, possibly spawning or encountering monsters.

**Typical Usage**  
```solidity
battleNadsEntrypoint.moveNorth(characterId);
```

---

### Combat Actions

1. **`attack(bytes32 characterID, uint256 targetIndex)`**

   **Parameters**
   - `characterID`: The attacking character’s ID.
   - `targetIndex`: The target’s “index” in the current area’s bitmap. Usually retrieved from reading area data or from the user’s targeting logic.

   **Effects**
   - The character attempts to **initiate or re‐initiate combat** with an entity at `targetIndex`.
   - Reverts if the entity is out of range or not present.
   - Checks and sets up future tasks for turn-by-turn auto-combat if not already scheduled.
   - If the target is a monster, that monster’s “owner” is set to the attacking player (so that player funds the monster’s tasks).
   - Creates or updates tasks so that automated combat can continue block-by-block.

2. **`sepukku(bytes32 characterID)`**

   **Parameters**
   - `characterID`: The player’s character ID.
   - Must not be in combat.

   **Effects**
   - Immediately **kills** the player character (thematic “voluntary suicide”).
   - Frees up the user from the game. The user can create a new character.  
   - The user’s deposit is returned if the call is successful (the function call expects some msg.value deposit, but if it fails, it returns deposit to the sessionKey or msg.sender).

---

### Equipment & Inventory

1. **`equipWeapon(bytes32 characterID, uint8 weaponID)`**

   **Parameters**
   - `characterID`: The player’s character ID.
   - `weaponID`: The ID of the weapon they wish to equip (from their inventory).

   **Effects**
   - Reverts unless the player is not in combat.
   - Ensures the user actually **owns** the specified `weaponID` (bit-checked in inventory).
   - Sets `character.stats.weaponID` to the new weapon, if valid.

2. **`equipArmor(bytes32 characterID, uint8 armorID)`**

   **Parameters**
   - `characterID`: The player’s character ID.
   - `armorID`: The ID of the armor they wish to equip.

   **Effects**
   - Reverts unless the player is not in combat.
   - Checks inventory to ensure `armorID` is present, then sets `character.stats.armorID`.

---

### Character Creation & Upgrades

1. **`createCharacter(...)`**  
   ```solidity
   function createCharacter(
     string memory name,
     uint256 strength,
     uint256 vitality,
     uint256 dexterity,
     uint256 quickness,
     uint256 sturdiness,
     uint256 luck,
     address sessionKey,
     uint256 sessionKeyDeadline
   )
     external
     payable
     returns (bytes32 characterID)
   ```
   **Parameters**
   - `name`: The character’s name (unique hash).
   - `strength, vitality, dexterity, quickness, sturdiness, luck`: The initial distribution of stat points (must sum to 32).
   - `sessionKey`: Optional ephemeral address allowed to move or act on behalf of the user, for gas abstraction.
   - `sessionKeyDeadline`: If > current block, the session key remains valid until that block.
   - `msg.value`: Some deposit in native token (used to bond ShMON, fund session key gas, etc.).

   **Effects**
   - Creates a brand-new **player** in the game.
   - Mints starter equipment, assigns stats, etc.
   - Schedules a “spawn task” so the character actually appears on the map in ~8 blocks.
   - Bonds user’s deposit so the user can pay for tasks.
   - Returns the newly created `characterID`.

2. **`allocatePoints(...)`**  
   ```solidity
   function allocatePoints(
     bytes32 characterID,
     uint256 newStrength,
     uint256 newVitality,
     ...
   ) external
   ```
   **Parameters**
   - `characterID`: The player’s character ID.
   - `newStrength, newVitality, newDexterity, newQuickness, newSturdiness, newLuck`: Additional stat points to allocate.

   **Effects**
   - Called **after leveling up** to assign newly available stat points.
   - Reverts if total requested points exceed the unallocated pool.

---

### Session Key & Gas Replenishment

These functions manage ephemeral **session keys** that let an off-chain user interface handle transactions from an address that is not the owner’s actual EOA.

1. **`updateSessionKey(address sessionKey, uint256 sessionKeyDeadline)`**
   **Parameters**
   - `sessionKey`: The new ephemeral key to trust (or zero address to disable).
   - `sessionKeyDeadline`: Expiration block.

   **Effects**
   - Sets up or updates the session key for the caller’s account, or removes it if zero.
   - If the user `msg.value` is provided, some is used to top up that session key’s gas via direct `ETH` transfer or ShMON unbonding.

2. **`replenishGasBalance()`**  
   **Parameters**
   - `msg.value`: deposit from the user.

   **Effects**
   - Tops up the session key’s balance in `ETH`.
   - Bonds any leftover deposit into the user’s Battle Nads policy (shMONAD).

3. **`getCurrentSessionKey(bytes32 characterID)` (view)**
   **Parameters**
   - `characterID`: The character to check.

   **Returns**
   - The session key assigned to that character’s owner plus its expiration.

**Usage**:  
- These are typically used so a user’s front-end can handle game actions from a “sessionKey” rather than a hardware wallet or metamask on every single move.

---

### Miscellaneous in BattleNadsEntrypoint

1. **`zoneChat(bytes32 characterID, string memory message)`**
   - Allows a user’s character to “chat” in the current area.
   - Emits a `ChatMessage` event containing `(areaID, characterID, message)`.
   - Reverts if `message.length > MAX_CHAT_STRING_LENGTH`.

2. ****Shortfall / Estimate Functions**  
   - **`shortfallToRecommendedBalanceInShMON(bytes32 characterID)`** → `uint256`
   - **`shortfallToRecommendedBalanceInMON(bytes32 characterID)`** → `uint256`
   - **`estimateBuyInAmountInShMON()`** → `uint256`
   - **`estimateBuyInAmountInMON()`** → `uint256`

   These read the recommended or minimum bonding/balance levels to keep tasks safely funded.

---

## Getters (Read-Only API)

The **`Getters`** contract (inherited by `BattleNadsEntrypoint` and `TaskHandler`) exposes a range of **view**/**pure** helper functions for retrieving character details, area details, and aggregated game data. They are safe to call off-chain for front-end rendering.

### High-Level Aggregators

1. **`getFrontendData(bytes32 characterID)`**  
   ```solidity
   function getFrontendData(bytes32 characterID)
     public
     view
     returns (
       BattleNad memory character,
       BattleNad[] memory combatants,
       BattleNad[] memory noncombatants,
       BattleArea[5][5] memory miniMap,
       uint8[] memory equipableWeaponIDs,
       string[] memory equipableWeaponNames,
       uint8[] memory equipableArmorIDs,
       string[] memory equipableArmorNames,
       uint256 unallocatedAttributePoints
     )
   ```
   **Parameters**
   - `characterID`: The player’s character ID.

   **Returns** 
   - A single call that returns:
     - The `character` itself.
     - A list of `combatants` in the same area who are in active combat with `character`.
     - A list of `noncombatants` in the same area.
     - A 5x5 `miniMap` of the areas around the character’s position.
     - The list of `(weaponIDs, weaponNames)` the user can equip from inventory.
     - The list of `(armorIDs, armorNames)` the user can equip from inventory.
     - The `unallocatedAttributePoints`.

   **Usage**:  
   - Great for quickly populating a **single** front-end frame with all relevant data.

2. **`getBattleNad(bytes32 characterID)`**  
   - Returns a single `BattleNad` struct with stats, inventory, name, etc.

3. **`getBattleNadsInArea(uint8 depth, uint8 x, uint8 y)`**  
   - Returns up to 64 occupant `BattleNad` structs in that area.

### Area and Combat Information

1. **`getMiniMap(bytes32 characterID) → (BattleArea[5][5])`**  
   - Provides a local 5x5 area grid around the character’s current coordinates.

2. **`getCombatantBattleNads(bytes32 characterID)`**  
   - Returns an array of all `BattleNad`s in combat with the given character.

3. **`getNonCombatantBattleNads(bytes32 characterID)`**  
   - The array of `BattleNad`s in the same location but **not** in combat with `character`.

4. **`getPlayerCharacterID(address owner) → bytes32`**  
   - Looks up a player’s main `characterID`.

5. **`getAndValidateCharacterID(...)`**  
   ```solidity
   function getAndValidateCharacterID(address owner, address expectedSessionKey)
     external
     view
     returns (bytes32 characterID, bool newCharacter, bool updateSessionKey, bool refillSessionKey, bool increaseBondedAmount)
   ```
   - Checks if the user has a character, whether they need a new session key, etc.

6. **`getAreaInfo(uint8 depth, uint8 x, uint8 y)`**  
   ```solidity
   function getAreaInfo(
     uint8 depth,
     uint8 x,
     uint8 y
   )
     external
     view
     returns (
       BattleArea memory area,
       uint8 playerCount,
       uint8 monsterCount,
       uint8 avgPlayerLevel,
       uint8 avgMonsterLevel
     )
   ```
   - Summarizes occupant counts & average levels in an area.

7. **`getAreaCombatState(bytes32 characterID)`**  
   - Returns `(bool inCombat, uint8 combatantCount, BattleNad[] memory enemies, uint8 targetIndex)`.

8. **`getEquippableWeapons(bytes32 characterID)`** / **`getEquippableArmor(bytes32 characterID)`**  
   - List out the user’s inventory of weapons/armor (IDs and item names).
   - Also returns the currently equipped ID.

9. **`getMovementOptions(bytes32 characterID)`**  
   - Boolean flags for each cardinal direction plus up/down to see if the user can safely move there.

---

## TaskHandler

The **`TaskHandler`** contract is primarily called via the Task Manager’s automated “executeTask.” Front-end developers typically do **not** call these directly, but it’s helpful to know what they do in the background.

### Automated Task Entry Points

1. **`processTurn(bytes32 characterID)`**  
   - Called when the Task Manager executes a “combat turn.”  
   - Performs:
     - Attack & hit/miss logic
     - Health regeneration
     - Checking if the character or the target died
     - Possibly re-scheduling another turn if the fight is still ongoing

2. **`processSpawn(bytes32 characterID)`**  
   - Called by the “spawn task” that places a new character into the game map after creation.

**Note**: The front-end usually **doesn’t** directly invoke these. They are invoked by the `TaskManager.scheduleTask(...)` calls behind the scenes whenever a new combat or spawn event is created.

---

## Summary / Integration Flow

1. **Create Character**  
   - `createCharacter(...)` → returns `characterID`.
   - Wait ~8 blocks for the spawn logic to place you on the map automatically (via task).
   - Poll `getFrontendData(characterID)` to see your location, miniMap, and stats once live.

2. **Move or Attack**  
   - With your `characterID`, call any `moveXYZ` or `attack(characterID, targetIndex)`.
   - The result is immediate for movement but may spawn or schedule monster tasks.

3. **Equip Items**  
   - Use `getEquippableWeapons/Armor` to see what you have in your inventory.
   - Then call `equipWeapon` or `equipArmor`.

4. **Allocate Stat Points**  
   - Check `unallocatedAttributePoints` in your `BattleNad` or from `getFrontendData`.
   - Call `allocatePoints(...)` to assign them.

5. **Manage Session Key** (Optional but recommended for continuous gameplay)
   - `updateSessionKey` or `replenishGasBalance` to handle ephemeral signer usage.
   - Then have the sessionKey call `moveXYZ(...)` or `attack(...)` in your place.

6. **Get Current State**  
   - The front-end can frequently call `getFrontendData(characterID)` or the more focused getters to keep the UI updated.

7. **Leave or Re-roll**  
   - If you want to end your run, call `sepukku(characterID)` or simply let your character die in combat.  
   - After that, you can create a new character.

---

## Reference Cheat-Sheet

- **Character Lifecycle**: 
  1. **createCharacter** → 2. **(automated spawn)** → 3. **move/attack** → 4. **combat tasks** → 5. **death** (sepukku or killed).
- **Combat**:
  - `attack(...)` triggers a new or continuing auto-combat cycle.
- **Equipment**:
  - `equipWeapon/Armor` from items in your inventory.
- **Upgrades**:
  - `allocatePoints(...)` after leveling up.
- **Session Keys**:
  - `updateSessionKey(...)`, `replenishGasBalance()` → Keep ephemeral addresses topped up with native gas and/or ShMON bonded to cover auto-tasks.
- **Reading Data**:
  - `getFrontendData(...)`: A single-call snapshot for the entire game state relevant to your character’s immediate area.
  - Additional specialized getters: `getAreaInfo(...)`, `getEquippableWeapons(...)`, `getMovementOptions(...)`, etc.

---

### Closing Notes

- **Public `TaskHandler`** methods (`processTurn`, `processSpawn`) are called automatically by the system. Front-end usually **only** calls `BattleNadsEntrypoint` or the read‐only “Getters.”
- You can always get a single holistic game state by calling `getFrontendData(characterID)`.
- Each move/attack call can spawn or re-schedule tasks for monster AI. Keep your `bonded` balance high enough to fund these tasks or you risk forcibly losing your character if tasks can’t be scheduled.

This document should allow a front-end developer to integrate with the **Battle Nads** game by clearly showing which functions can be called, what to expect in returns, and how to handle the underlying data structures.