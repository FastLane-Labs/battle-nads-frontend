# G – Async Feedback

|  |  |
|---|---|
| **Goal** | Surface task lifecycle so users know why UI is waiting |
| **Primary Data** | Tx hash + `endBlock`; `useActionTracker` derived states |
| **UI** | Toast notifications + inline loaders on buttons |
| **Logic** | `QUEUED`(tx mined) → `PENDING`(currentBlock<endBlock) → `DONE`(block reached). Retry if task fails |
| **Edge Cases** | Task gas failure triggers Feature E banner automatically | 