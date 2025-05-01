# B – Area View

|  |  |
|---|---|
| **Goal** | 8×8 tile map showing player, allies, monsters |
| **Primary Data** | `combatants`, `noncombatants`, player coordinate from `character.stats` |
| **UI** | SVG grid; glyphs with health ring; click → select target |
| **Logic** | Map `index (1–63)` → `(row,col)`; compute `isTargetable` flag (`!isDead && class≠Monster?`) |
| **Edge Cases** | Two entities in same index (shouldn't) → stack indicator |
| **Dependencies** | `useCombat` mutation `setTargetIndex` |
