# F – Chat History

|  |  |
|---|---|
| **Goal** | Real-time zone chat with scrollback |
| **Primary Data** | `DataFeed.chatLogs[]`; sender address→name map (`owners` mapping) |
| **UI** | `ChatPanel.tsx` flex column; auto-scroll unless user scrolled up |
| **Logic** | De-dupe identical msgs in same block; date header when block gap ≥ 120 |
| **Edge Cases** | Profanity filter; message length > limit → silent reject feedback |
