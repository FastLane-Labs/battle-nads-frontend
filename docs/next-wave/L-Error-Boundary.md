# L – Error Boundary

|  |  |
|---|---|
| **Goal** | Graceful handling of wallet/RPC/tx errors |
| **Primary Data** | Caught exceptions, custom error classes |
| **UI** | Friendly fallback view + retry button |
| **Logic** | Map `instanceof WalletMissingError` → prompt connect; others → bug report link |
| **Edge Cases** | Error inside boundary recursion → show minimal text |
