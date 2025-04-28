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