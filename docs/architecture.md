# Frontend Architecture Analysis (BattleNads)

This document outlines the architecture of the `battle-nads-frontend` application based on an analysis conducted on [Date - e.g., Mar 31, 2024].

## 1. Overview

The frontend is a single-page application (SPA) built with React. Its primary purpose is to serve as the user interface for the "BattleNads" web3 RPG.

Currently, the application functions primarily as a **visual mock-up or prototype**. It renders a detailed game dashboard interface but relies heavily on hardcoded mock data, local component state (`useState`), and mock utility functions for its behavior. Key features like real-time state synchronization, blockchain interactions, persistent storage, and complex game logic appear to be planned but not yet implemented.

## 2. Core Technologies

*   **Framework:** React (^18.2.0)
*   **Language:** TypeScript (^5.3.3)
*   **Build Tool:** Vite (^5.0.12)
*   **Styling:** Tailwind CSS (^3.4.1) (with PostCSS/Autoprefixer)
*   **Routing:** React Router DOM (^6.22.0)
*   **State Management:** Recoil (^0.7.7)
*   **Package Manager:** pnpm (inferred from `pnpm-lock.yaml`)

## 3. Project Structure (`src/`)

The `src/` directory follows a relatively standard convention for React projects:

*   `index.tsx`: Application entry point.
*   `App.tsx`: Root React component.
*   `index.css`: Global styles and Tailwind directives.
*   `components/`: Reusable UI components (e.g., `GameDemo`, `GameBoard`, `AttributeAllocation`).
*   `pages/`: Intended for top-level page components (currently unused in the main flow).
*   `hooks/`: Custom React hooks (directory exists, contents not analyzed).
*   `state/`: Recoil atom/selector definitions (e.g., `atoms.ts`).
*   `utils/`: Utility functions (e.g., `mockData.ts`).
*   `types/` / `types.ts`: TypeScript type definitions.

## 4. Application Flow & Key Components

1.  **Entry Point (`src/index.tsx`):**
    *   Initializes React rendering into the `#root` DOM element.
    *   Wraps the application in:
        *   `React.StrictMode`
        *   `RecoilRoot`: Provides Recoil state context.
        *   `BrowserRouter`: Enables client-side routing.
    *   Imports global CSS (`index.css`).
    *   Renders the `<App />` component.

2.  **Root Component (`src/App.tsx`):**
    *   Minimal component.
    *   Provides a basic full-screen container with a background color.
    *   **Crucially, it directly renders `<GameDemo />` instead of setting up routes.** This means the application currently only displays the `GameDemo` content.

3.  **Game Demo Container (`src/components/GameDemo.tsx`):**
    *   Acts as a container or controller for the main game view.
    *   Uses `useState` and `useEffect` to initialize and manage mock game state (`currentCharacter`, `currentArea`, `currentInstance`).
    *   Imports mock data structures and interaction functions (`moveCharacter`, `attackCharacter`) from `../utils/mockData`.
    *   Imports Recoil state (`characterState`) but does not appear to actively use it.
    *   Renders the `<GameBoard />` component, passing down the mock state and interaction handlers (`handleMove`, `handleAttack`).

4.  **Main UI Hub (`src/components/GameBoard.tsx`):**
    *   The most complex component observed.
    *   Renders the main game dashboard UI using a 12-column Tailwind grid.
    *   **UI Panels:** Includes sections for Minimap, Character Stats, Inventory/Equipment, Combat Controls, Movement Controls, Characters in Area list, Combat Log, and Area Chat.
    *   **Local State:** Heavily relies on `useState` for managing UI state (e.g., `particles`, `screenShake`, `minimapData`, `combatLogs`, `areaMessages`, `currentTargetIndex`, `showAttributeAllocation`).
    *   **Mock Interactions:** Implements interaction handlers (`handleMove`, `handleAttack`, `simulateCombat`, `handleChatSubmit`, `handleSaveAttributes`) that primarily update local state, trigger UI effects (particles, screen shake), and call the mock functions passed via props. Contains comments indicating where real logic (e.g., contract calls) would go.
    *   **Visual Feedback:** Implements screen shake and particle effects using `requestAnimationFrame`.
    *   Renders the `AttributeAllocation` component as a modal.

5.  **Attribute Allocation (`src/components/AttributeAllocation.tsx`):**
    *   (Analysis Pending) Assumed to be a modal form for allocating character attribute points.

## 5. State Management

*   **Current:** Primarily uses local component state (`useState`) within `GameDemo` and extensively within `GameBoard` to manage the UI and mock game data. State is passed down via props (`GameDemo` -> `GameBoard`).
*   **Planned:** Recoil (`RecoilRoot`, atoms defined in `src/state/atoms.ts`) is set up but seems largely unused in the core components analyzed. It's likely intended for managing shared, persistent, or asynchronous application state once real data and logic are integrated.

## 6. Data Flow

*   Mock data is initialized within `GameDemo.tsx`.
*   Core game state (`currentCharacter`, `currentArea`, `currentInstance`) is passed as props from `GameDemo` to `GameBoard`.
*   Interaction handlers (`onMove`, `onAttack`) are passed as props from `GameDemo` to `GameBoard`. These handlers in `GameDemo` call mock utility functions (`moveCharacter`, `attackCharacter`) from `utils/mockData.ts` to update the state held in `GameDemo`.
*   `GameBoard` manages its own extensive UI-specific state locally.

## 7. Current Status & Potential Next Steps

*   The frontend is a **visual prototype**. It effectively mocks the appearance and basic interactions of the game interface.
*   **Needs implementation:** Real game logic, state persistence, connection to backend/blockchain (Monad), API calls, actual Recoil state usage, robust error handling.
*   **Routing:** `react-router-dom` is installed and `BrowserRouter` is set up, but no routes are defined in `App.tsx`. Routing might be planned for later or used internally within components not yet analyzed.
