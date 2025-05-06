# B – Ability Cooldowns

**Status: ✅ COMPLETE**

|  |  |
|---|---|
| **Goal** | Prevent spam & show readiness timers; **MUST show ability stage description** |
| **Primary Data** | `abilityTracker.{stage, targetBlock}` + `currentBlock` from `pollForFrontendData` |
| **UI** | Button with radial overlay, seconds timer, gas shortfall badge, out-of-combat indicator. **Shows stage & ETA.** |
| **Logic** | Derive readiness from `activeAbility.stage` & `activeAbility.targetBlock`. Charging ready at `targetBlock`. Action/Cooldown ready at `targetBlock + 200` blocks. `secondsLeft` uses `AVG_BLOCK_TIME_MS`. |
| **Edge Cases** | Task fails and cooldown never ends → show ⚠ with gas shortfall check |
| **Status** | **✅ COMPLETE** |
| **Notes** | - Displays stage, readiness, cooldown timer (seconds), gas shortfall warning.<br />- State for target selection (`selectedTargetIndex`) lifted to `GameView`.<br />- Abilities disabled when out of combat.<br />- Descriptions include character name for active states (Charging, Action, Cooldown).<br />- **Remaining TODO:** Visual cooldown progress uses placeholder durations in `AbilityButton`. Calculation based purely on `secondsLeft` is accurate, but visual % might not be. |

**Design Ref Notes:**
*   This is a CRITICAL MVP feature.
*   Uses `abilityTracker.stage` and `abilityTracker.targetBlock` per the updated data contract.
*   Core loop requires UI feedback for `useAbility` action.
