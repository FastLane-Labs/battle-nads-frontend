# B – Area View

|  |  |
|---|---|
| **Goal** | 8×8 tile map showing player, allies, monsters |
| **Primary Data** | `combatants`, `noncombatants`, player coordinate from `character.stats` |
| **UI** | SVG grid; glyphs with health ring; click → select target |
| **Logic** | Map `index (1–63)` → `(row,col)`; compute `isTargetable` flag (`!isDead && class≠Monster?`) |
| **Edge Cases** | Two entities in same index (shouldn't) → stack indicator |
| **Dependencies** | `useCombat` mutation `setTargetIndex` |

# H – Area View (Other Entities)

|  |  |
|---|---|
| **Goal** | Show nearby entities for situational awareness |
| **Primary Data** | `otherEntities`, `combatants`, `noncombatants` lists from snapshot. The `combatants` list identifies enemies. |
| **UI** | List/grid of nearby entities with HP bars + target selection; **Minimap/heatmap is OUT of scope for MVP, nice-to-have later** |
| **Logic** | Filter out self; highlight selected target; flag entities present in the `combatants` list as enemies. |
| **Edge Cases** | >10 entities → pagination/virtualisation? Map tile boundaries? |

**Design Ref Notes:**
*   Moved from MVP to Next-Wave.
*   Core loop requires target HP bars.
*   Minimap explicitly deferred from MVP.
