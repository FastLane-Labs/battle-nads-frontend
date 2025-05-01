# G – Equipment Inventory

|  |  |
|---|---|
| **Goal** | Allow players to equip starting gear and found items via **one-click dropdowns** |
| **Primary Data** | `equipableWeaponIDs/Names`, `equipableArmorIDs/Names`, `inventory` bitmaps from snapshot |
| **UI** | Dropdowns listing unequipped items; slot panels for weapon/armor |
| **Logic** | One-click equip mutation (`equipItem`?) ↔ **disable dropdowns/buttons during combat state (Feature F)**; tooltip stat diff (nice-to-have) |
| **Edge Cases** | Attempt to equip not-owned item; busy state during tx |

**Design Ref Notes:**
*   This is a **CRITICAL MVP feature** (per Alex & functionality gap).
*   Core interaction: User clicks a slot (e.g., 'Weapon'), sees a dropdown of available weapons from `equipableWeaponIDs/Names`, and clicks one to equip.
*   Focus on **dropdowns for one-click equip**; drag-and-drop is out of scope for MVP.
*   `createCharacter` provides starting gear which MUST be equippable.
*   Functionality existed previously and needs to be restored/re-implemented.

**UI & Implementation Details:**

1.  **Equipped Slots:**
    *   Display current `equippedWeaponName` and `equippedArmorName` clearly.
    *   Each slot should be clickable to open the relevant dropdown.

2.  **Equipment Dropdowns:**
    *   Triggered by clicking an equipment slot (Weapon/Armor).
    *   Populate with items listed in `equipableWeaponIDs/Names` or `equipableArmorIDs/Names` respectively.
    *   Clicking an item in the dropdown triggers the `equipItem` mutation.
    *   Consider adding item stats/tooltips within the dropdown (could be nice-to-have).

3.  **Combat State Interaction:**
    *   The equip slots/dropdown triggers MUST be disabled when the player is in the combat state (derived from Feature F).
    *   Provide a tooltip on the disabled element: "Cannot change equipment while in combat". 