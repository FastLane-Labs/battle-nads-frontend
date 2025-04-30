## Game Component UI Refactoring (Components: `game.tsx`, `GameLayout.tsx`, `CombatTargetsPanel.tsx`)

*   **Goal:** Improve UI structure of `game.tsx` by separating concerns.
*   **Actions:**
    *   Extracted the combat target rendering logic into a new component: `src/components/gameboard/CombatTargetsPanel.tsx`.
    *   Created a dedicated layout component `src/components/gameboard/GameLayout.tsx` to handle the arrangement of the main game panels (`CharacterCard`, `MovementControls`, `CombatTargetsPanel`, `DataFeed`).
    *   Simplified `src/components/gameboard/game.tsx` to focus on state management (loading, error, warnings), data fetching orchestration (`useGame`), action definitions (callbacks passed to `GameLayout`), and the Debug Panel modal.
    *   `game.tsx` now renders `<GameLayout />` in its main "ready" state, passing down necessary props.
*   **Rationale:** This separation makes `game.tsx` less cluttered and easier to maintain. Layout concerns are now isolated in `GameLayout`, and specific panel logic is encapsulated in dedicated components. The core `useGame` hook logic was untouched as per the requirements.

## Fix Character Creation Signature Mismatch

*   **Problem:** `createCharacter` calls were failing with "no matching fragment" errors due to incorrect function signatures in the client/adapter layers compared to the actual contract ABI.
*   **Actions:**
    *   Inspected the `createCharacter` function definition in `BattleNadsEntrypoint.json` ABI.
    *   Updated the `createCharacter` method signature in `BattleNadsAdapter.ts` and `BattleNadsClient.ts` to match the ABI: `(name: string, strength: bigint, ..., luck: bigint, sessionKey: string, sessionKeyDeadline: bigint)`.
    *   Refactored `CharacterCreation.tsx`:
        *   Removed the class selection.
        *   Re-added state and UI (`AttributeInput`) for allocating the 6 base stats (STR, VIT, DEX, QCK, STD, LCK).
        *   Implemented logic to enforce allocation of exactly 32 total points.
        *   Updated the `createCharacterMutation` to pass the `name`, 6 stats (as `bigint`), `embeddedWallet.address` (as `sessionKey`), and `BigInt(0)` (as `sessionKeyDeadline`) to `client.createCharacter`.
*   **Rationale:** Aligns the frontend function calls with the smart contract's interface, resolving the signature mismatch error.

## Refactor WalletBalances Component

*   **Goal:** Simplify `WalletBalances.tsx` by leveraging existing hooks and reducing duplicated data fetching.
*   **Actions:**
    *   Refactored `WalletBalances.tsx` to use the existing `useWalletBalances` hook instead of managing its own internal state.
    *   Removed unnecessary and duplicated data fetching and state management code.
    *   Maintained the original UI layout and styling while simplifying the code behind it.
    *   Added proper type handling for the `shortfall` value (supporting both `number` and `bigint` types).
    *   Removed debug logging and instance tracking that complicated the component.
    *   Created a new config file `src/config/wallet.ts` to centralize wallet-related constants.
    *   Moved hardcoded values like `LOW_SESSION_KEY_THRESHOLD`, `DIRECT_FUNDING_AMOUNT`, and `MIN_SAFE_OWNER_BALANCE` to the config file.
    *   Updated `useWalletBalances` to use `BALANCE_REFRESH_INTERVAL` from the config for periodic balance updates.
*   **Rationale:** 
    *   The existing `useWalletBalances` hook already provides all necessary balance data by combining `useBattleNads` and direct wallet balance fetching.
    *   Removing duplicated state management and RPC calls reduces code complexity and potential for inconsistencies.
    *   By centralizing data fetching in the hook, we ensure a single source of truth for wallet balances across the application.
    *   Moving constants to a config file improves maintainability and makes it easier to adjust thresholds and values in the future.
    *   Improved component readability and maintainability by focusing on presentation rather than data management.