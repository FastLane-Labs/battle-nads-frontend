# E – Async Feedback

|  |  |
|---|---|
| **Goal** | Surface task lifecycle so users know why UI is waiting; **MUST clearly show pending vs. settled states** |
| **Primary Data** | Tx hash + `endBlock`; `useActionTracker` derived states |
| **UI** | Toast notifications + inline loaders on buttons |
| **Logic** | `QUEUED`(tx mined) → `PENDING`(currentBlock<endBlock) → `DONE`(block reached). Retry if task fails |
| **Edge Cases** | Task gas failure triggers Feature D banner automatically |

**Design Ref Notes:**
*   Aligned with guiding principle #2 (Async first).
*   Task visibility per character is an open issue (see Issue #1); may need inference. 