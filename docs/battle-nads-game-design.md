# BattleNads Smart Contract Game Design Analysis

This document outlines the core game mechanics, state management, player interactions, asset handling, and technical considerations for the BattleNads smart contract game, intended to inform frontend development.

## 1. Game Flow & Mechanics

The game is a task-based, asynchronous dungeon crawler RPG built on smart contracts.

**Game Start:**

1.  **Character Creation:** Player calls `createCharacter` (`Entrypoint.sol`) providing:
    *   `name` (string)
    *   Starting stats (`strength`, `vitality`, etc. - must sum to `STARTING_STAT_SUM=32`, each >= `MIN_STAT_VALUE=3`)
    *   `sessionKey`, `sessionKeyDeadline` (optional, for gas abstraction)
    *   `msg.value` (MON for funding session key and/or bonding `shMON`)
2.  **Initialization:**
    *   `CharacterFactory.sol` generates a unique `characterID` (`bytes32`).
    *   Assigns a class (Warrior, Rogue, etc.) via `_getPlayerClass` (`Classes.sol`).
    *   Determines random starting weapon/armor (IDs 1-4).
    *   Stores initial state (`Storage.sol`).
    *   Takes `BUY_IN_AMOUNT` (0.1 `shMON`) from bonded balance (`_allocatePlayerBuyIn` in `Balances.sol`).
3.  **Spawning:**
    *   A *spawn task* is scheduled via the `TaskManager` (`_createSpawnTask` in `TaskHandler.sol`).
    *   After `SPAWN_DELAY` blocks, the task calls `processSpawn` (`TaskHandler.sol`) -> `_handleSpawn` (`Handler.sol`).
    *   Character is placed at random coordinates (x, y) on depth 1 (`_randomSpawnCoordinates`, `_enterLocation`).

**Core Gameplay Loop (Progression):**

1.  **Exploration:**
    *   Player calls movement functions (`moveNorth`, `moveEast`, etc. in `Entrypoint.sol`).
    *   Internal call to `handleMovement` (`Handler.sol`).
    *   **Restrictions:** Cannot move while dead (`NotWhileDead`) or in combat (`NotWhileInCombat`). Movement validated (`_validateLocationChange`).
    *   **Process:** Leave old location (`_leaveLocation`), enter new (`_enterLocation`), find empty index (`_findNextIndex`).
2.  **Monster Encounters:**
    *   **Aggro Check:** `_checkForAggro` runs on movement. Determines if existing monsters attack or a new one spawns based on proximity, depth, randomness. Bosses (`_isBoss`) have different aggro rules.
    *   **Combat Initiation:** If aggro occurs:
        *   Load existing monster (`_loadExistingMonster`) or create new (`_buildNewMonster`).
        *   Player and monster flagged for combat (`_enterMutualCombatToTheDeath`).
        *   *Combat tasks* scheduled (`_createCombatTask`) for both if not already active. Tasks are paid for by bonded `shMON`.
3.  **Combat Resolution (Task-Based):**
    *   `TaskManager` executes scheduled combat tasks, calling `processTurn` (`TaskHandler.sol`) -> `_handleCombatTurn` (`Handler.sol`).
    *   **Targeting:** `_getTargetIDAndStats` selects a target (player-specified via `attack` or random).
    *   **Attack:** `_attack` calculates hit/crit (`_checkHit`) and damage (`_getDamage`) based on stats, equipment, randomness, and status effects.
    *   **Health Regen:** `_regenerateHealth` applies passive health recovery based on stats and status effects (adjusted for cooldown time). Full heal out of combat.
    *   **Death:** If health reaches 0 (`defender.tracker.died`):
        *   Experience awarded (`_earnExperience`) - bonus for PvP (`PVP_EXP_BONUS_FACTOR`).
        *   Loot awarded (`_handleLoot`) - defeated character's equipped weapon/armor ID added to victor's inventory bitmap if not present.
        *   `shMON` balance transferred (`_allocateBalanceInDeath`) - portion goes to `_boostYield`, remainder to victor (player inventory or monster pool).
        *   Combatants disengage (`_disengageFromCombat`).
        *   Dead character state updated (`_processDefenderDeath`, `_processAttackerDeath`).
    *   **Task Rescheduling:** Combat task reschedules itself with a cooldown (`_cooldown`) if combat continues. Cost is estimated and paid from bonded `shMON`. If balance is insufficient, the task might fail to reschedule, halting combat progression for that character.
4.  **Ability Usage:**
    *   Player calls `useAbility` (`Entrypoint.sol`) -> `handleAbility` (`Handler.sol`).
    *   **Restrictions:** Not dead, ability not on cooldown (`_checkAbilityTimeout`). Target required for offensive abilities.
    *   **Process:** Loads ability definition (`_getAbility` based on class). `_processAbility` applies effects (damage, heal, buffs, debuffs) potentially over multiple stages.
    *   **Tasks:** Schedules an *ability task* (`_createAbilityTask`) for subsequent stages or cooldowns, paid by bonded `shMON`.

**End/Loss Conditions:**

*   **Death:** Health = 0. Character state largely deleted (`_deleteBattleNad`), stats potentially archived (`_storeDeadBattleNadStats`). Inventory `shMON` balance is lost (distributed via `_allocateBalanceInDeath`). Player must create a new character.
*   **Sepukku:** Player calls `sepukku` (`Entrypoint.sol`). Calls `_forceKill`. Deletes character, returns inventory `shMON` balance to the owner's address.

## 2. State Management

State is primarily managed through mappings in `Storage.sol`, often packing multiple values into single `uint256` slots for gas efficiency.

**Key State Variables:**

*   `characterStats` (`mapping(bytes32 => uint256)`): Packed `BattleNadStats` (level, XP, attributes, location (depth, x, y, index), health, equipped IDs, combat status (bitmap, count, target), buffs/debuffs, class). *Needs careful unpacking/packing.*
*   `inventories` (`mapping(bytes32 => Inventory)`): Tracks owned weapon/armor IDs (bitmaps) and internal `shMON` balance (`uint128`).
*   `instances` (`mapping(uint8 => mapping(uint8 => mapping(uint8 => BattleInstance)))`): Area state. Each `BattleInstance` contains:
    *   `area` (`BattleArea`): Player/monster counts, total levels, location bitmaps (`playerBitMap`, `monsterBitMap`).
    *   `combatants` (`bytes32[64]`): Array mapping location index (1-63) to the `characterID` present there.
*   `owners` / `characters` / `characterNames` / `characterIDs`: Link owner addresses, character IDs, and names.
*   `characterTasks` / `abilityTasks`: Map character IDs to their active combat/ability task addresses (`address(uint160(uint256(taskID)))`).
*   `balances` (`BalanceTracker`): Global struct tracking player/monster counts, level sums, and the pooled monster `shMON` balance.
*   `logs` / `chatLogs`: Store historical event/chat logs keyed by area (`_getLogSpaceID`) and block number.

**State Transitions:** Triggered by player actions (`Entrypoint.sol`) and task executions (`TaskHandler.sol`). See previous analysis for detailed transitions per action.

## 3. Player Interaction

Players primarily interact via `Entrypoint.sol`, with calls often wrapped by `GasAbstracted` or `CreateOrUpdateSessionKey` modifiers.

**Player-Callable Functions (`Entrypoint.sol`):**

*   `createCharacter(name, stats..., sessionKey?, deadline?) payable`: Starts the game. Returns `characterID`.
*   Movement (`moveNorth(id)`, `moveSouth(id)`, etc.): Requires `characterID`. No return. Restrictions: Not dead, not in combat.
*   `attack(id, targetIndex)`: Requires `characterID`, target's location index (1-63). No return. Restrictions: Not dead.
*   `useAbility(id, targetIndex?, abilityIndex)`: Requires `characterID`, target index (0 if none), ability index (1 or 2). No return. Restrictions: Not dead, ability not on cooldown.
*   `sepukku(id) payable`: Requires `characterID`. No return. Ends game, returns inventory balance.
*   `equipWeapon(id, weaponID)`: Requires `characterID`, `weaponID`. No return. Restrictions: Not dead, not in combat, weapon in inventory.
*   `equipArmor(id, armorID)`: Requires `characterID`, `armorID`. No return. Restrictions: Not dead, not in combat, armor in inventory.
*   `allocatePoints(id, strPoints, vitPoints, ...)`: Requires `characterID`, points to add per stat. No return. Restrictions: Not dead, not in combat, sufficient unspent points.
*   `zoneChat(id, message)`: Requires `characterID`, message string. No return. Restrictions: Not dead.

**Session Key Management (`Cashier.sol`):**

*   `updateSessionKey(keyAddress, expiration) payable`: Owner sets/updates their key.
*   `replenishGasBalance() payable`: Owner/Key adds MON funds.
*   `deactivateSessionKey(keyAddress) payable`: Owner/Key expires the key.

**Interaction Pattern:**

1.  Player sends transaction to `Entrypoint.sol` (via owner wallet or session key).
2.  Contract validates, initiates state changes, potentially schedules tasks (`TaskManager`).
3.  Transaction completes. Frontend might see success.
4.  Actual game state change (e.g., combat result, movement completion) happens later when the `TaskManager` executes the scheduled task.
5.  Frontend must poll (`pollForFrontendData`) or listen to events (`Events.sol`) to observe the outcome.

## 4. Asset Management

*   **MON / shMON:**
    *   MON (native token) needed for `msg.value` in `createCharacter`, `replenishGasBalance`, `updateSessionKey`. Primarily used to fund session key gas or be converted to `shMON`.
    *   `shMON` (wrapped MON, likely ERC20) is the primary utility token bonded via `Cashier.sol` to:
        *   Pay the `BUY_IN_AMOUNT` (0.1 `shMON`).
        *   Fund automated tasks (combat, abilities, spawning). Task costs are estimated (`_estimateTaskCost`) and paid from the bonded balance associated with the character's `owner`.
    *   Internal Balance: `Inventory.balance` tracks `shMON` held *by the character*. Gained on creation, looted on player kills. Lost on death or `sepukku`. Can be partially converted (`_allocateBalanceFromInventory`) to bonded balance to fund tasks if needed.
    *   Yield Boost: A portion of looted `shMON` balance is sent to `_boostYield`, functioning as a source of yield to the main `shMONAD` contract.
*   **Character ID (`bytes32`):** Acts as a non-transferable identifier for the player's progress and state, similar to a soulbound NFT.
*   **Equipment (Items):** Represented by `uint8` IDs. Ownership tracked via bitmaps in `Inventory`. Stats hardcoded in `Equipment.sol`. Acquired via looting (`_handleLoot`). Not ERC tokens.

## 5. Frontend Requirements

**Data Display:**

*   **Primary Source:** `pollForFrontendData(owner, startBlock)` (`Getters.sol`). Provides a comprehensive snapshot.
*   **Key UI Elements:**
    *   Character Stats: Attributes, level, XP, health/max health, class, buffs/debuffs.
    *   Location: Depth, X, Y coordinates.
    *   Equipment: Currently equipped weapon/armor names.
    *   Inventory: List of equippable weapons/armor (from IDs/Names in poll data), internal `shMON` balance.
    *   Area View: Display `combatants` and `noncombatants` (from poll data). Show their class, health, level, status effects, target index.
    *   Logs: Render combat, movement, chat history from `dataFeeds`.
    *   Ability Status: Show active ability, stage, cooldown (`character.activeAbility`, `noncombatants[i].abilityTargetBlock`).
    *   Gas/Task Funding: Display `sessionKeyData`, `balanceShortfall`. Prompt for replenishment if needed.
    *   Level Up: Show unspent points, allow allocation.

**Input Collection:**

*   Standard inputs for character creation, movement buttons, target selection (by index), ability selection, equipment selection, stat allocation, chat messages.
*   Session key management requires address and expiration inputs.

**Event Listening (`Events.sol`):**

*   Supplement polling for more immediate UI feedback (e.g., combat hits, level ups, loot drops, chat messages).

**Timing & Asynchronicity:**

*   **Polling:** Regularly call `pollForFrontendData`. Use the last received `endBlock` as the next `startBlock`.
*   **Action Feedback:** Transactions confirm *initiation*, not *completion*. Rely on polling/events for outcomes.
*   **Cooldowns:** Display estimated time remaining for tasks/abilities based on block numbers (`nextBlock`, `targetBlock`), but rely on polled state for accuracy.

## 6. Technical Constraints & Security

*   **Gas & Tasks:**
    *   Gas abstraction relies on `shMON` bonded via `Cashier.sol`. Frontend must monitor `balanceShortfall` and guide users to `replenishGasBalance` to ensure tasks execute.
    *   `pollForFrontendData` can be gas-intensive; use moderate polling frequency.
*   **Cooldowns:** Respect block-based cooldowns for combat turns and abilities.
*   **Security:**
    *   Session keys add UX benefits but require careful handling (expiration).
    *   `try/catch` in `Entrypoint.sol` means transaction success doesn't guarantee game state change; polling is crucial.
    *   Frontend should perform basic input validation (valid target index, message length).

## Summary & Open Questions

BattleNads is an asynchronous, task-based dungeon crawler RPG using `shMON` for task automation and gas abstraction. The frontend needs to handle this asynchronicity primarily through polling `pollForFrontendData`, displaying the rich game state, and providing interfaces for player actions defined in `Entrypoint.sol`.

*   **Monster Balance Pool:** What is the purpose of tracking `BalanceTracker.monsterSumOfBalances`?
*   **Yield Boost:** What is the precise external effect of `_boostYield` within the `shMONAD` ecosystem?
*   **Coordinate System:** Confirmed as 1-based, ranging from 1 to 50 for X and Y. 
