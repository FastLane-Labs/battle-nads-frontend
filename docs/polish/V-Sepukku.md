# V – Sepukku UI

|  |  |
|---|---|
| **Goal** | Allow players to self-delete character (rage-quit) |
| **Primary Data** | Needs owner signature for `sepukku()` call |
| **UI** | Hidden button + confirmation modal (similar to death modal showing balances) |
| **Logic** | `sepukku()` contract call; triggers same cleanup as death |
| **Edge Cases** | Accidental click; insufficient gas for tx |

**Design Ref Notes:**
*   Core loop Death phase mentions `sepukku` as an alternative trigger.
*   Results in character deletion & allocation of loot/yield, similar to death.

# R – Sepukku

|  |  |
|---|---|
| **Goal** | Allow rage-quit self-destruct action |
| **Primary Data** | `sepukku` contract call |
| **UI** | Danger-zone accordion in settings; confirm by typing character name |
| **Logic** | Double confirmation; show lost shMON tooltip |
| **Edge Cases** | Session key expired → prompt owner wallet instead | 