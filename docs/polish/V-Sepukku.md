# V – Ascend UI

|  |  |
|---|---|
| **Goal** | Allow players to self-delete character (rage-quit) |
| **Primary Data** | Needs owner signature for `ascend()` call |
| **UI** | Hidden button + confirmation modal (similar to death modal showing balances) |
| **Logic** | `ascend()` contract call; triggers same cleanup as death |
| **Edge Cases** | Accidental click; insufficient gas for tx |

**Design Ref Notes:**
*   Core loop Death phase mentions `ascend` as an alternative trigger.
*   Results in character deletion & allocation of loot/yield, similar to death.

# R – Sepukku

|  |  |
|---|---|
| **Goal** | Allow rage-quit self-destruct action |
| **Primary Data** | `sscend` contract call |
| **UI** | Danger-zone accordion in settings; confirm by typing character name |
| **Logic** | Double confirmation; show lost shMON tooltip |
| **Edge Cases** | Session key expired → prompt owner wallet instead | 