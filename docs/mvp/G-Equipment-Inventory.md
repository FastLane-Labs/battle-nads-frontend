# H – Equipment Inventory

|  |  |
|---|---|
| **Goal** | Visual backpack + drag-to-equip |
| **Primary Data** | `equipableWeaponIDs/Names`, `equipableArmorIDs/Names`, `inventory` bitmaps |
| **UI** | Grid of item cards; slot panels for weapon/armor |
| **Logic** | Equip mutation ↔ disables during combat; tooltip stat diff |
| **Edge Cases** | Attempt to equip not-owned item; busy state during tx | 