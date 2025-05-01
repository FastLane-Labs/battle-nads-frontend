# L – Task & Ability Timers

|  |  |
|---|---|
| **Goal** | Real-time countdowns for pending actions; **Show ability stage description** |
| **Primary Data** | `task.endBlock`, `abilityTracker.{stage, targetBlock}` |
| **UI** | Radial overlay + seconds badge (same as cooldowns) |
| **Logic** | Derived from `currentBlock` vs `targetBlock/endBlock`; use `abilityTracker.stage` for description |
| **Edge Cases** | Re-orgs; block time variance |

**Design Ref Notes:**
*   Core loop requires cooldown timer bar and stage description.
*   Uses `abilityTracker.stage` and `abilityTracker.targetBlock`.
