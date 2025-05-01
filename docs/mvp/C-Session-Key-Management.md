# C – Session-Key Management

|  |  |
|---|---|
| **Goal** | CRUD lifecycle for AA session keys; **MUST ensure reliable reconnection** |
| **Primary Data** | `sessionKeyData` from snapshot |
| **UI** | Dropdown card + modal wizard |
| **Logic** | Form validation: expiry ≥ +720 blocks; address ≠ owner; ENS resolve |
| **Edge Cases** | Owner revokes key while modal open → refetch and disable submit |

**Design Ref Notes:**
*   This is a CRITICAL MVP feature.
*   Reliable UX is paramount.
*   Closely linked to Gas Funding Prompts (Feature D) via `sessionKeyData.balanceShortfall`.
