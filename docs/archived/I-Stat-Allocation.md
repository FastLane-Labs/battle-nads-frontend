# I – Stat Allocation

|  |  |
|---|---|
| **Goal** | Spend points from level-ups |
| **Primary Data** | `character.unspentPoints`, `character.stats` |
| **UI** | Plus (+) buttons next to each stat; only enabled if `unspentPoints > 0` |
| **Logic** | `allocatePoints` contract call; disable UI during tx |
| **Edge Cases** | Race condition if points spent elsewhere; stale data |

**Design Ref Notes:**
*   Considered CRITICAL for MVP in the design doc checklist.
