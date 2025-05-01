# C – Ability Cooldowns

|  |  |
|---|---|
| **Goal** | Prevent spam & show readiness timers |
| **Primary Data** | `character.activeAbility.{targetBlock, ability}` + `currentBlock` |
| **UI** | Two buttons with radial overlay + seconds badge |
| **Logic** | `secsLeft = max(0,targetBlock-currentBlock)*AVG_BLOCK_TIME`; update every block tick |
| **Edge Cases** | Task fails and cooldown never ends → show ⚠ with gas shortfall check |
