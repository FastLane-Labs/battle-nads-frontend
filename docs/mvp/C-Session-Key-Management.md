# C – Session-Key Management

**Status: ✅ COMPLETE**

|  |  |
|---|---|
| **Goal** | Manage CRUD lifecycle for AA session keys using the **Privy embedded wallet** as the key actor. **MUST ensure reliable reconnection** and seamless gameplay without frequent owner signing. |
| **Primary Data** | `sessionKeyData` (including `key`, `expiration`, `balance`, `ownerCommittedAmount`, `balanceShortfall`) from the main `pollForFrontendData` snapshot. |
| **UI** | Display status via card/indicator (e.g., `WalletBalances`). Use **modal prompt (`SessionKeyPrompt`)** for required updates/creation. Provide funding/deactivation options. |
| **Logic** | Client-side validation: **check embedded wallet address matches `sessionKeyData.key`**; check `expiration` against `currentBlock` (+ buffer, e.g., `720` blocks warning); address ≠ owner. *ENS resolve deferred.* |
| **Edge Cases** | Handle external revocation/expiry: UI must react to polled state changes (e.g., disable actions in prompt if key becomes invalid). Handle insufficient funds (`balanceShortfall > 0`) via prompts. |

**Design Ref Notes:**
*   This is a CRITICAL MVP feature for gas abstraction.
*   Reliable UX is paramount – validation prevents entering gameplay with an invalid key.
*   Closely linked to Gas Funding Prompts (Feature D) – `balanceShortfall` drives the need for user action via `useSessionFunding`.
*   Implementation uses `useSessionKey` hook consuming snapshot data and `sessionKeyMachine` for validation state.
