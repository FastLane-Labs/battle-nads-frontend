# F – Chat History

|  |  |
|---|---|
| **Goal** | Real-time zone chat with scrollback |
| **Primary Data** | `DataFeed.chatLogs[]`; sender address→name map (`owners` mapping) |
| **UI** | `ChatPanel.tsx` flex column; auto-scroll unless user scrolled up |
| **Logic** | De-dupe identical msgs in same block; date header when block gap ≥ 120 |
| **Edge Cases** | Profanity filter; message length > limit → silent reject feedback |

# N – Chat History Rendering

|  |  |
|---|---|
| **Goal** | Persistent chat log across sessions |
| **Primary Data** | Chain events OR dedicated indexer/cache |
| **UI** | Scrollable chat pane with pagination/search |
| **Logic** | Fetch historical logs on demand; local cache? **Requires archive node or heavy local cache; out of scope for MVP.** |
| **Edge Cases** | >10k messages; spam filtering |

**Design Ref Notes:**
*   Explicitly deferred from MVP.
*   Requires archive node or significant caching effort.
