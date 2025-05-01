# D – Session-Key Management

|  |  |
|---|---|
| **Goal** | CRUD lifecycle for AA session keys |
| **Primary Data** | `sessionKeyData` from snapshot |
| **UI** | Dropdown card + modal wizard |
| **Logic** | Form validation: expiry ≥ +720 blocks; address ≠ owner; ENS resolve |
| **Edge Cases** | Owner revokes key while modal open → refetch and disable submit |
