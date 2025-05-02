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

**Implementation Status: COMPLETED** ✅
* Created standalone `EquipmentPanel` component for equipment management
* Enhanced `useEquipment` hook with combat state check using `character.isInCombat`
* Integrated in both `CharacterCard` and `CharacterInfo` components
* Basic implementation without stat comparison tooltips (nice-to-have for future)

**UI & Implementation Details:**

1.  **Equipped Slots:**
    *   Display current `equippedWeaponName` and `equippedArmorName` clearly.
    *   Each slot should be clickable to open the relevant dropdown.
    
    **✅ Completed Implementation:** Current equipment displayed using `currentWeapon` and `currentArmor` from `useEquipment` hook with clear formatting.

2.  **Equipment Dropdowns:**
    *   Triggered by clicking an equipment slot (Weapon/Armor).
    *   Populate with items listed in `equipableWeaponIDs/Names` or `equipableArmorIDs/Names` respectively.
    *   Clicking an item in the dropdown triggers the `equipItem` mutation.
    *   Consider adding item stats/tooltips within the dropdown (could be nice-to-have).
    
    **✅ Completed Implementation:** Implemented using ChakraUI Select components with data from `weaponOptions`/`armorOptions`. Used `equipWeapon`/`equipArmor` mutations for blockchain updates. Stat comparison tooltips not implemented yet.

3.  **Combat State Interaction:**
    *   The equip slots/dropdown triggers MUST be disabled when the player is in the combat state (derived from Feature F).
    *   Provide a tooltip on the disabled element: "Cannot change equipment while in combat". 
    
    **✅ Completed Implementation:** Equipment changes disabled during combat using `isInCombat` flag from `useEquipment`. Tooltips show "Cannot change equipment while in combat" as specified.

**Features Not Yet Implemented:**
1. **Item Stat Comparison Tooltips**: The nice-to-have feature to show stat differences between current equipment and potential new equipment was not implemented. The component structure is prepared for this with:
   * A `getEquipmentStatDiff` function placeholder in `useEquipment` (removed to avoid confusion)
   * The `EquipmentTooltip` component was created but was removed as it wasn't being used

2. **Item Stats in Dropdowns**: Equipment options in the dropdowns currently only show item names without additional stats

3. **Equipment Visualization**: No visual representation of equipment on character model/avatar

**Future Enhancement Path:**
* Implement stat comparison by enhancing `useEquipment` hook to fetch and compare item stats
* Create hover tooltips that show detailed stat comparisons with visual indicators for improvements/downgrades
* Add equipment visual indicators on character profiles/avatars 