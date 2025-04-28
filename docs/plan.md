## Game Component UI Refactoring (Components: `game.tsx`, `GameLayout.tsx`, `CombatTargetsPanel.tsx`)

*   **Goal:** Improve UI structure of `game.tsx` by separating concerns.
*   **Actions:**
    *   Extracted the combat target rendering logic into a new component: `src/components/gameboard/CombatTargetsPanel.tsx`.
    *   Created a dedicated layout component `src/components/gameboard/GameLayout.tsx` to handle the arrangement of the main game panels (`CharacterCard`, `MovementControls`, `CombatTargetsPanel`, `DataFeed`).
    *   Simplified `src/components/gameboard/game.tsx` to focus on state management (loading, error, warnings), data fetching orchestration (`useGame`), action definitions (callbacks passed to `GameLayout`), and the Debug Panel modal.
    *   `game.tsx` now renders `<GameLayout />` in its main "ready" state, passing down necessary props.
*   **Rationale:** This separation makes `game.tsx` less cluttered and easier to maintain. Layout concerns are now isolated in `GameLayout`, and specific panel logic is encapsulated in dedicated components. The core `useGame` hook logic was untouched as per the requirements. 