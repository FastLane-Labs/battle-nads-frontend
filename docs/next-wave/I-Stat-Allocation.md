# I – Stat Allocation

|  |  |
|---|---|
| **Goal** | Spend unallocated points post-level-up |
| **Primary Data** | `unallocatedAttributePoints` from snapshot |
| **UI** | Modal with plus/minus and live total validation |
| **Logic** | Sum check ≤ available; call `allocatePoints` |
| **Edge Cases** | Player in combat → disable allocate |
