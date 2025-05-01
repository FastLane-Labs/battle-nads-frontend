# A – Combat & Event Log

|  |  |
|---|---|
| **Goal** | Chronological feed of combat, XP, loot, movement, system notes |
| **Primary Data** | `DataFeed[].logs` merged in `useUiSnapshot` |
| **UI** | Virtualised list (`react-virtual`) inside `EventFeed.tsx`; colour-coded badges per `LogType` |
| **Logic** | Sort by `blockNumber ⇣`, then `index`; coalesce identical sequential hits; highlight player-initiated rows |
| **Edge Cases** | Thousands of logs → windowing; missing `weaponName`/`armorName` fallback to ID |
| **Future Hooks** | "Jump to block" deep-link; filter toggles |
