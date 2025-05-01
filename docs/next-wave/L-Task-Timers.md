# K – Task Timers

|  |  |
|---|---|
| **Goal** | Show ETAs for spawn/combat turns/abilities |
| **Primary Data** | `character.activeTask`, monsters' `taskAddress`; next block targets |
| **UI** | Mini countdown chips beside entity names |
| **Logic** | Convert blocks→seconds; pause when tab hidden |
| **Edge Cases** | Task cancelled → hide timer |
