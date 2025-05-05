# Q – Death / Revival Flow

|  |  |
|---|---|
| **Goal** | Handle player death (auto on HP 0) |
| **Primary Data** | `character.hp <= 0`; `taskResult` from combat task |
| **UI** | **Modal confirming loss & showing balances returned** |
| **Logic** | Trigger on HP 0; Character deleted, loot/yield allocated; cleanup combat task; show death modal |
| **Edge Cases** | Simultaneous death with monster |

**Design Ref Notes:**
*   Core loop includes Death phase: HP 0 triggers auto-death.
*   Contract deletes character, allocates loot/yield.
*   UI MUST show modal confirming loss and returned balances. 