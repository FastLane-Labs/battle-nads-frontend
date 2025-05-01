# S – Class Visualization

|  |  |
|---|---|
| **Goal** | Show predicted class during character creation |
| **Primary Data** | Stat allocation draft; helper `_getPlayerClass` mirror in TS |
| **UI** | Dynamic icon + flavour text beside stat form |
| **Logic** | Recompute on every stat change; highlight if class changes |
| **Edge Cases** | Stats invalid (sum≠32) → show '?' silhouette |