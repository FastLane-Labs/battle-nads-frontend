# M – Event Listeners

|  |  |
|---|---|
| **Goal** | Push new logs via p2p instead of waiting for next poll |
| **Primary Data** | `ethers.Provider.on(filter)` for `FrontEndDataEmitted` events |
| **UI** | None (background); triggers `queryClient.setQueryData` merge |
| **Logic** | Throttle to 1 s; if polling fetch due sooner, skip push |
| **Edge Cases** | Provider disconnect → fall back to polling only | 