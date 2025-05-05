# A – Combat & Event Log

**Status: ✅ COMPLETE**

|  |  |
|---|---|
| **Goal** | Provide clear, chronological feed of combat, XP, loot, movement, system notes for **game transparency** |
| **Primary Data** | `DataFeed[].logs` merged in `useUiSnapshot`; **MUST utilize `combatants` list to identify enemies** involved in logs |
| **UI** | Virtualised list (`react-virtual`) inside `EventFeed.tsx`; **Use colour-coded badges/icons per `LogType` for quick scanning**; **MUST clearly show attacker → defender relationships based on indices**; Consider highlighting log entries involving entities from the `combatants` list. |
| **Logic** | Sort by `blockNumber ⇣`, then `index`; **Use `mainPlayerIndex`/`otherPlayerIndex` to map to character names/IDs for display**; coalesce identical sequential hits; highlight player-initiated rows; **Infer active combat state if `combatants` list is not empty (see Issue #1)** |
| **Edge Cases** | Thousands of logs → windowing; missing `weaponName`/`armorName` fallback to ID |
| **Future Hooks** | "Jump to block" deep-link; filter toggles |

**Design Ref Notes:**
*   **CRITICAL MVP Feature** for understanding game state and asynchronous events.
*   Needs refinement to ensure clarity and accuracy based on current data structures.
*   Mapping `mainPlayerIndex`/`otherPlayerIndex` correctly is key.

**UI & Implementation Details:**

1.  **Log Entry Format:**
    *   Clearly display the `LogType` (e.g., via icon/badge/color).
    *   For combat logs (Hit, Crit, Miss, etc.), show `AttackerName → DefenderName` and the outcome (damage, miss, etc.).
    *   For XP/Loot logs, clearly state amount/item gained.
    *   System/Movement logs should be distinct.

2.  **Highlighting:**
    *   Consider a subtle background highlight or distinct text color for log entries where either the attacker or defender is currently in the player's `combatants` list.
    *   Ensure player-initiated actions are visually distinct (already noted in logic).

3.  **Virtualization:**
    *   Use `react-virtual` or similar to handle potentially large numbers of log entries efficiently.
