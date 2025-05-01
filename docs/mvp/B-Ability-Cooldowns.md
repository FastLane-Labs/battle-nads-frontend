# B – Ability Cooldowns

|  |  |
|---|---|
| **Goal** | Prevent spam & show readiness timers; **MUST show ability stage description** |
| **Primary Data** | `abilityTracker.{stage, targetBlock}` + `currentBlock` from `pollForFrontendData` |
| **UI** | Two buttons with radial overlay + seconds badge; **Must display remaining blocks & ETA in seconds** |
| **Logic** | Derive readiness from `abilityTracker.stage` (1=charging, 2=action, 3+=cooldown) & `abilityTracker.targetBlock`; update every block tick; `secsLeft = max(0, targetBlock - currentBlock) * AVG_BLOCK_TIME` |
| **Edge Cases** | Task fails and cooldown never ends → show ⚠ with gas shortfall check |

**Design Ref Notes:**
*   This is a CRITICAL MVP feature.
*   Uses `abilityTracker.stage` and `abilityTracker.targetBlock` per the updated data contract.
*   Core loop requires UI feedback for `useAbility` action.
