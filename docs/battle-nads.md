# BattleNads Frontend Integration Guide

## Overview

This document provides frontend developers with the necessary information to integrate with the BattleNads smart contracts. BattleNads is an on-chain RPG where players create characters, explore dungeons, battle monsters and other players, collect loot, and level up. The core logic, character state, and actions are managed by the smart contracts detailed below.

**Core Interaction Contract:** `BattleNadsEntrypoint.sol`
**Public Interface Definition:** `IBattleNads.sol`

---

## Key Concepts

### 1. Gas Abstraction & Session Keys

To improve user experience, BattleNads implements a gas abstraction system using session keys. This allows users to perform actions without needing MON (the gas token) in their primary wallet for every transaction, after initial setup.

*   **Session Key:** A temporary, secondary `address` authorized by the user (owner) to send transactions on their behalf for a limited duration. It holds a small amount of MON (`uint256`) to pay for transaction gas.
*   **Owner's Bonded shMON:** The user's primary wallet must bond shMON tokens (`uint256` shares) to the BattleNads `Cashier` contract. This bonded balance serves two purposes:
    1.  **Task Scheduling:** Pays for the estimated cost (`uint256`) of scheduling asynchronous tasks (like combat turns) on the `TaskManager`.
    2.  **Session Key Reimbursement:** Automatically reimburses the Session Key's MON balance (`uint256`) after it successfully executes a transaction, using the owner's bonded shMON.
*   **Flow:**
    1.  **Setup:** Owner calls `updateSessionKey` to designate a Session Key `address` and set its expiration (`uint256` block number). They can send MON (`msg.value`) in this call to initially fund the Session Key.
    2.  **Funding:** Owner calls `replenishGasBalance` (sending MON/shMON via `msg.value`) to top up the Session Key's MON balance to its target and bond the remaining shMON.
    3.  **Interaction:** Frontend sends transactions for game actions (`move`, `attack`, etc.) *signed by the Session Key `address`*.
    4.  **Reimbursement:** After the Session Key transaction completes, the contract automatically transfers MON (equivalent to gas used + target top-up) from the owner's bonded shMON pool to the Session Key address.
*   **Frontend Needs:**
    *   UI to create, display, extend, and potentially deactivate session keys (`updateSessionKey`, `deactivateSessionKey`).
    *   Display the Session Key's current MON balance (`uint256`) and expiration (`uint64`) (`getCurrentSessionKeyData`).
    *   Display the Owner's currently bonded shMON balance (`uint256`) (`getCurrentSessionKeyData`).
    *   Provide a way to add funds (`replenishGasBalance`).
    *   Monitor balances and prompt the user if funds are low (check `shortfallToRecommendedBalanceInMON`).
    *   Ensure game action transactions are signed and sent *from* the active Session Key `address`.

### 2. Asynchronous Task Management

Many game actions (like combat turns, monster spawning, ability effects) are not resolved instantly within the transaction that initiates them. Instead, they are scheduled as tasks on the Monad `TaskManager`.

*   **Why:** This allows complex or potentially long-running game logic to execute reliably without consuming excessive gas in the initial user transaction. It keeps the core actions cheap and responsive.
*   **Frontend Impact:**
    *   When a user performs an action (e.g., `attack`), the immediate transaction confirms the *intent* and schedules the task.
    *   The actual outcome (damage dealt, health change, loot dropped) happens later when the task executes in a subsequent block.
    *   The frontend **must poll** (`pollForFrontendData`) to see the results of these actions reflected in the game state. Do not assume the state changes immediately after sending an action transaction.

### 3. Polling Strategy

*   The `pollForFrontendData` function is designed to be the main source of state updates for the frontend.
*   Poll this function periodically (e.g., every few blocks or seconds) to refresh the UI with the latest character stats, location, nearby entities, logs, and balances.
*   Use the `startBlock` parameter in `pollForFrontendData` (or use `getDataFeed` separately) to fetch only *new* logs since the last poll, avoiding redundant data transfer. The returned `endBlock` indicates the block number up to which the data is current.

---

## Read Functions (Getters)

These functions read data from the contract state without modifying it. They are typically `view` functions and do not require gas payment beyond the RPC provider's allowance, nor do they need to be called by a session key.

*   `pollForFrontendData(address owner, uint256 startBlock) view returns (bytes32 characterID, SessionKeyData memory sessionKeyData, BattleNad memory character, BattleNadLite[] memory combatants, BattleNadLite[] memory noncombatants, uint8[] memory equipableWeaponIDs, string[] memory equipableWeaponNames, uint8[] memory equipableArmorIDs, string[] memory equipableArmorNames, DataFeed[] memory dataFeeds, uint256 balanceShortfall, uint256 unallocatedAttributePoints, uint256 endBlock)`
    *   **Purpose:** Primary function for fetching a comprehensive UI state snapshot.
    *   **Parameters:**
        *   `owner` (`address`): The player's main wallet address.
        *   `startBlock` (`uint256`): The block number from which to start fetching logs (`DataFeed`). Use 0 or the `endBlock` from the previous poll.
    *   **Returns:**
        *   `characterID` (`bytes32`): The player's character ID.
        *   `sessionKeyData` (`SessionKeyData memory`): Current session key status (see Data Structures).
        *   `character` (`BattleNad memory`): Full details of the player's character (see Data Structures).
        *   `combatants` (`BattleNadLite[] memory`): Array of characters currently in combat with the player.
        *   `noncombatants` (`BattleNadLite[] memory`): Array of characters in the same area but not in combat with the player.
        *   `equipableWeaponIDs` (`uint8[] memory`): IDs of weapons the player owns.
        *   `equipableWeaponNames` (`string[] memory`): Corresponding names for owned weapons.
        *   `equipableArmorIDs` (`uint8[] memory`): IDs of armors the player owns.
        *   `equipableArmorNames` (`string[] memory`): Corresponding names for owned armors.
        *   `dataFeeds` (`DataFeed[] memory`): Array of logs and chat messages, one `DataFeed` per block from `startBlock` to `endBlock`.
        *   `balanceShortfall` (`uint256`): Calculated MON shortfall compared to recommended bonded/session key balance (includes buffer). 0 if sufficient funds.
        *   `unallocatedAttributePoints` (`uint256`): Points available to allocate via `allocatePoints`.
        *   `endBlock` (`uint256`): The block number up to which the returned data (especially logs) is current. Use this as `startBlock` for the next poll.

*   `getCurrentSessionKeyData(address owner) view returns (SessionKeyData memory sessionKeyData)`
    *   **Purpose:** Get detailed status of the owner's current session key setup.
    *   **Parameters:** `owner` (`address`).
    *   **Returns:** `sessionKeyData` (`SessionKeyData memory`) (see Data Structures).

*   `getDataFeed(address owner, uint256 startBlock, uint256 endBlock) view returns (DataFeed[] memory dataFeeds)`
    *   **Purpose:** Get logs (`DataFeed`) for a specific block range. Useful for displaying history.
    *   **Parameters:** `owner` (`address`), `startBlock` (`uint256`), `endBlock` (`uint256`).
    *   **Returns:** `dataFeeds` (`DataFeed[] memory`).

*   `getPlayerCharacterID(address owner) external view returns (bytes32 characterID)`
    *   **Purpose:** Get the character ID associated with an owner address. Call this first to identify the player's character.
    *   **Parameters:** `owner` (`address`).
    *   **Returns:** `characterID` (`bytes32`).

*   `getBattleNad(bytes32 characterID) public view returns (BattleNad memory character)`
    *   **Purpose:** Get full, detailed data for any character ID (player or monster). Includes stats, inventory details (bitmaps), task status etc.
    *   **Parameters:** `characterID` (`bytes32`).
    *   **Note:** More data-intensive than `getBattleNadLite`. Use for detailed views (e.g., player character sheet, inspected target).
    *   **Returns:** `character` (`BattleNad memory`).

*   `getBattleNadLite(bytes32 characterID) public view returns (BattleNadLite memory character)`
    *   **Purpose:** Get summarized, lightweight data for a character ID. Suitable for displaying lists of characters in an area.
    *   **Parameters:** `characterID` (`bytes32`).
    *   **Note:** Omits detailed inventory bitmaps and some internal state compared to `getBattleNad`. Includes calculated `maxHealth`, status effects, weapon/armor *names*.
    *   **Returns:** `character` (`BattleNadLite memory`).

*   `shortfallToRecommendedBalanceInMON(bytes32 characterID) external view returns (uint256 minAmount)`
    *   **Purpose:** Calculates the *additional* MON the owner needs to deposit (`replenishGasBalance`) to meet the recommended bonded shMON amount and session key MON balance, including a safety buffer.
    *   **Parameters:** `characterID` (`bytes32`).
    *   **Returns:** `minAmount` (`uint256`) in MON. Returns 0 if balances are sufficient.

*   `estimateBuyInAmountInMON() external view returns (uint256 minAmount)`
    *   **Purpose:** Estimates the total MON required as `msg.value` when calling `createCharacter` for the first time. Includes character buy-in cost, minimum bonded shMON, initial session key funding, and buffer.
    *   **Returns:** `minAmount` (`uint256`) in MON.

*   `getWeaponName(uint8 weaponID) external view returns (string memory name)`
    *   **Purpose:** Get the display name for a weapon ID.
    *   **Parameters:** `weaponID` (`uint8`).
    *   **Returns:** `name` (`string memory`).

*   `getArmorName(uint8 armorID) external pure returns (string memory name)`
    *   **Purpose:** Get the display name for an armor ID.
    *   **Parameters:** `armorID` (`uint8`).
    *   **Returns:** `name` (`string memory`).

---

## Write Functions (Actions)

These functions modify the contract state and are typically called to perform game actions. They should generally be called **from the active Session Key address** unless otherwise noted. Most use the `GasAbstracted` modifier.

*   `updateSessionKey(address sessionKeyAddress, uint256 expiration) external payable`
    *   **Purpose:** Creates, updates expiration, or deactivates a session key for the caller (`msg.sender`).
    *   **Caller:** Owner's main wallet.
    *   **Parameters:**
        *   `sessionKeyAddress` (`address`): The address to authorize as a session key. Set to `address(0)` to deactivate the current key.
        *   `expiration` (`uint256`): The block number when the key expires. Set to `0` to deactivate.
    *   **Payment:** `payable`. `msg.value` (`uint256`) first funds the session key (if specified and not expiring) up to its target balance; any remainder is bonded as shMON for the owner.
    *   **Modifier:** `Locked` (Reentrancy guard).

*   `replenishGasBalance() external payable`
    *   **Purpose:** Adds funds. `msg.value` (`uint256`) first tops up the active Session Key's MON balance, then bonds the rest as shMON for the owner.
    *   **Caller:** Owner's main wallet.
    *   **Payment:** `payable`. Requires `msg.value > 0`.
    *   **Modifier:** `Locked`.

*   `deactivateSessionKey(address sessionKeyAddress) external payable`
    *   **Purpose:** Explicitly deactivates a specific session key by setting its expiration to 0.
    *   **Caller:** Owner's main wallet OR the `sessionKeyAddress` (`address`) itself.
    *   **Parameters:**
        *   `sessionKeyAddress` (`address`): The session key to deactivate. Must match the caller or the key associated with the caller (if called by owner).
    *   **Payment:** `payable`. Any `msg.value` (`uint256`) sent is directly bonded as shMON for the owner.
    *   **Modifier:** `Locked`.

*   `createCharacter(string memory name, uint256 strength, uint256 vitality, uint256 dexterity, uint256 quickness, uint256 sturdiness, uint256 luck, address sessionKey, uint256 sessionKeyDeadline) external payable returns (bytes32 characterID)`
    *   **Purpose:** Creates a new player character, assigns initial stats/equipment, bonds the buy-in amount from `msg.value`, and schedules the initial spawn task. Can optionally create/update a session key simultaneously.
    *   **Caller:** Owner's main wallet.
    *   **Parameters:**
        *   `name` (`string memory`): Character name.
        *   `strength`, `vitality`, `dexterity`, `quickness`, `sturdiness`, `luck` (`uint256`): Initial stat points (must sum to `STARTING_STAT_SUM`).
        *   `sessionKey` (`address`): Optional session key to create/update.
        *   `sessionKeyDeadline` (`uint256`): Expiration block for the optional session key.
    *   **Payment:** `payable`. Requires sufficient `msg.value` (`uint256`) (check `estimateBuyInAmountInMON`).
    *   **Modifier:** `CreateOrUpdateSessionKey`.
    *   **Returns:** `characterID` (`bytes32`) of the newly created character.

*   `moveNorth(bytes32 characterID)`, `moveSouth(bytes32 characterID)`, `moveEast(bytes32 characterID)`, `moveWest(bytes32 characterID)`, `moveUp(bytes32 characterID)`, `moveDown(bytes32 characterID)` `external`
    *   **Purpose:** Attempts to move the specified character 1 unit in the given direction. Handles area transitions, finding a location index, checking for monster aggro, and potentially scheduling combat tasks.
    *   **Caller:** Active Session Key.
    *   **Parameters:** `characterID` (`bytes32`) of the character to move.
    *   **Modifier:** `GasAbstracted`.
    *   **Reverts:** If in combat, invalid move (off map, diagonal), area full.

*   `attack(bytes32 characterID, uint256 targetIndex) external`
    *   **Purpose:** Initiates or confirms an attack against a target at `targetIndex` in the same area. Schedules combat tasks if needed. Sets this target as the preferred one for subsequent combat turns.
    *   **Caller:** Active Session Key.
    *   **Parameters:**
        *   `characterID` (`bytes32`): Attacker's ID.
        *   `targetIndex` (`uint256`): The location index (1-63) of the character to attack.
    *   **Modifier:** `GasAbstracted`.
    *   **Reverts:** Invalid target index, target not found, level difference too high (anti-griefing), already attacking this target.

*   `useAbility(bytes32 characterID, uint256 targetIndex, uint256 abilityIndex) external`
    *   **Purpose:** Uses a character's class ability. Handles cooldowns, effects (damage, heal, status), target validation, and schedules ability effect/cooldown tasks.
    *   **Caller:** Active Session Key.
    *   **Parameters:**
        *   `characterID` (`bytes32`): User's character ID.
        *   `targetIndex` (`uint256`): Target's location index (required for offensive abilities, must be 0 for self/no-target abilities).
        *   `abilityIndex` (`uint256`): The index of the ability to use (usually 1 or 2 based on class).
    *   **Modifier:** `GasAbstracted`.
    *   **Reverts:** Ability on cooldown, invalid target (missing for offensive, present for non-target), ability index invalid for class, character is monster.

*   `ascend(bytes32 characterID) external payable`
    *   **Purpose:** Permanently deletes the character. Cleans up state, transfers inventory balance (shMON) to owner's bonded balance.
    *   **Caller:** Active Session Key.
    *   **Parameters:** `characterID` (`bytes32`).
    *   **Payment:** `payable`. `msg.value` (`uint256`) is used for gas abstraction and any remainder is returned to the *caller* (session key or owner).
    *   **Modifier:** `GasAbstracted`.
    *   **Note:** Irreversible action.

*   `equipWeapon(bytes32 characterID, uint8 weaponID)` / `equipArmor(bytes32 characterID, uint8 armorID)` `external`
    *   **Purpose:** Equips a weapon/armor from the character's inventory.
    *   **Caller:** Active Session Key.
    *   **Parameters:** `characterID` (`bytes32`), `weaponID`/`armorID` (`uint8`).
    *   **Modifier:** `GasAbstracted`.
    *   **Reverts:** If character does not possess the item (check inventory bitmap from `getBattleNad`).

*   `allocatePoints(bytes32 characterID, uint256 newStrength, uint256 newVitality, uint256 newDexterity, uint256 newQuickness, uint256 newSturdiness, uint256 newLuck) external`
    *   **Purpose:** Spends unallocated attribute points gained from leveling up.
    *   **Caller:** Active Session Key.
    *   **Parameters:** `characterID` (`bytes32`), points to add to each stat (`uint256`).
    *   **Modifier:** `GasAbstracted`.
    *   **Reverts:** If attempting to spend more points than available (`unallocatedAttributePoints` from polling).

*   `zoneChat(bytes32 characterID, string calldata message) external`
    *   **Purpose:** Sends a chat message associated with the character. Stored in the block's logs.
    *   **Caller:** Active Session Key.
    *   **Parameters:** `characterID` (`bytes32`), `message` (`string calldata`).
    *   **Modifier:** `GasAbstracted`.
    *   **Reverts:** If message length exceeds `_MAX_CHAT_STRING_LENGTH`.

---

## Key Data Structures (Solidity Types)

*   **`BattleNad`** (`Types.sol`):
    *   `id` (`bytes32`)
    *   `stats` (`BattleNadStats`)
    *   `maxHealth` (`uint256`)
    *   `weapon` (`Weapon`)
    *   `armor` (`Armor`)
    *   `inventory` (`Inventory`)
    *   `activeTask` (`address`)
    *   `activeAbility` (`AbilityTracker`)
    *   `owner` (`address`)
    *   `name` (`string`)

*   **`BattleNadStats`** (`Types.sol`): _(Note: This struct is packed into a `uint256` in storage)_
    *   `class` (`CharacterClass` enum -> `uint8`)
    *   `buffs` (`uint8`) - bitmap for `StatusEffect` enum
    *   `debuffs` (`uint8`) - bitmap for `StatusEffect` enum
    *   `level` (`uint8`)
    *   `unspentAttributePoints` (`uint8`)
    *   `experience` (`uint16`)
    *   `strength`, `vitality`, `dexterity`, `quickness`, `sturdiness`, `luck` (`uint8`)
    *   `depth`, `x`, `y` (`uint8`) - Location coordinates
    *   `index` (`uint8`) - Location index within area (0-63)
    *   `weaponID`, `armorID` (`uint8`) - Equipped item IDs
    *   `health` (`uint16`)
    *   `sumOfCombatantLevels` (`uint8`) - Used internally for level cap checks
    *   `combatants` (`uint8`) - Count of current combat opponents
    *   `nextTargetIndex` (`uint8`) - Preferred target index for next attack
    *   `combatantBitMap` (`uint64`) - Bitmap of opponents' location indices

*   **`BattleNadLite`** (`Types.sol`): _(Returned by view functions)_
    *   `id` (`bytes32`)
    *   `class` (`CharacterClass` enum -> `uint8`)
    *   `health` (`uint256`)
    *   `maxHealth` (`uint256`)
    *   `buffs` (`uint256`) - bitmap
    *   `debuffs` (`uint256`) - bitmap
    *   `level` (`uint256`)
    *   `index` (`uint256`)
    *   `combatantBitMap` (`uint256`)
    *   `ability` (`Ability` enum -> `uint8`)
    *   `abilityStage` (`uint256`)
    *   `abilityTargetBlock` (`uint256`)
    *   `name` (`string`)
    *   `weaponName` (`string`)
    *   `armorName` (`string`)
    *   `isDead` (`bool`)

*   **`SessionKeyData`** (`CashierTypes.sol`):
    *   `owner` (`address`)
    *   `key` (`address`)
    *   `balance` (`uint256`) - MON balance of key address
    *   `targetBalance` (`uint256`) - Ideal MON balance
    *   `ownerCommittedAmount` (`uint256`) - Owner's bonded shMON (MON estimate)
    *   `ownerCommittedShares` (`uint256`) - Owner's bonded shMON (shares)
    *   `expiration` (`uint64`) - Block number

*   **`DataFeed`** (`Types.sol`):
    *   `blockNumber` (`uint256`)
    *   `logs` (`Log[] memory`)
    *   `chatLogs` (`string[] memory`)

*   **`Log`** (`Types.sol`):
    *   `logType` (`LogType` enum -> `uint8`)
    *   `index` (`uint16`) - Index within the block's logs array
    *   `mainPlayerIndex`, `otherPlayerIndex` (`uint8`) - Location indices
    *   `hit`, `critical` (`bool`)
    *   `damageDone`, `healthHealed` (`uint16`)
    *   `targetDied` (`bool`)
    *   `lootedWeaponID`, `lootedArmorID` (`uint8`)
    *   `experience` (`uint16`)
    *   `value` (`uint128`) - Generic value (e.g., shMON looted, ability cooldown block)

*   **`Inventory`** (`Types.sol`):
    *   `weaponBitmap`, `armorBitmap` (`uint64`) - Bitmaps of owned item IDs
    *   `balance` (`uint128`) - Character's internal shMON balance

*   **`Weapon` / `Armor`** (`Types.sol`):
    *   `name` (`string`)
    *   `baseDamage`, `bonusDamage`, `accuracy`, `speed` (`uint256`) for Weapon
    *   `armorFactor`, `armorQuality`, `flexibility`, `weight` (`uint256`) for Armor

*   **`AbilityTracker`** (`Types.sol`):
    *   `ability` (`Ability` enum -> `uint8`)
    *   `stage` (`uint8`) - Current stage of multi-turn ability
    *   `targetIndex` (`uint8`) - Target's location index for the ability
    *   `taskAddress` (`address`) - Address of the scheduled ability task
    *   `targetBlock` (`uint64`) - Block number for next stage/cooldown end

*   **Enums**: `CharacterClass`, `StatusEffect`, `Ability`, `LogType` are represented as `uint8` in function calls and storage where applicable. 
