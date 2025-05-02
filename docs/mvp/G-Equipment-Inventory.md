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

**Implementation Status: COMPLETED & ENHANCED** ✅

**UI & Implementation Details:**

1.  **Equipped Slots & Stat Display:**
    *   Displays current `equippedWeaponName` and `equippedArmorName` clearly.
    *   Below the name, detailed stats for the equipped item (Base Dmg, Accuracy, Armor Factor, etc.) are shown.
    *   Each displayed stat has an info icon (`ⓘ`) that reveals a popover explaining the stat on hover/tap.
    
    **✅ Completed Implementation:** Current equipment name and stats are displayed. Popovers explain each stat.

2.  **Changing Equipment:**
    *   A dropdown (`<Select>`) next to each equipment slot (Weapon/Armor) lists available items to equip, populated from `equipableWeaponIDs/Names` or `equipableArmorIDs/Names`.
    *   Users **first select** an item from the dropdown.
    *   Users then **click an adjacent "Equip" button** (`<Button>`) to confirm the change and trigger the mutation (`equipWeapon`/`equipArmor`).
    *   The "Equip" button displays a loading state while the transaction is processing.
    
    **✅ Completed Implementation:** Implemented using Select + Button pattern. Button shows loading state during mutation.

3.  **Combat State Interaction:**
    *   The equip dropdown (`<Select>`) and confirm button (`<Button>`) MUST be disabled when the player is in the combat state.
    *   Tooltips indicate why controls are disabled (e.g., "Cannot change equipment while in combat", "Select an item to equip").
    
    **✅ Completed Implementation:** Equipment changes disabled during combat. Tooltips provide context.

**Features Not Yet Implemented:**
1.  **Item Stat Comparison Tooltips**: Showing stat differences between current and selected equipment.
2.  **Item Stats in Dropdowns**: Displaying basic stats next to item names in the `<Select>` options.

**Future Enhancement Path:**
* Implement stat comparison by enhancing `useEquipment` hook to fetch and compare item stats (potentially using the `getWeaponName`/`getArmorName` or fetching full item details).
* Create hover tooltips or enhance popovers to show detailed stat comparisons with visual indicators.
* Add stats to the dropdown options for easier selection. 