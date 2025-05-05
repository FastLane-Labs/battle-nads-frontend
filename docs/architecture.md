# Battle-Nads Frontend Architecture

## Project Architecture Overview

This document records significant architectural decisions and structural changes.

```
/src
├── app                         # Next.js app directory
│   ├── (auth)                   # Auth-related pages grouped
│   │   └── login/page.tsx       # Login page
│   ├── (game)                   # Game-related pages
│   │   ├── dashboard/page.tsx   # Player dashboard
│   │   ├── character/page.tsx   # Character details
│   │   ├── create/page.tsx      # Character creation
│   │   └── game/page.tsx        # Main game interface
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Home page
│   └── theme.ts                 # Chakra UI theme
├── blockchain                  # Chain–specific plumbing
│   ├── adapters/…              # ↔ on-chain ABI bridges
│   └── clients/…               # Facade with "read / owner / session" adapters
├── components
│   ├── auth
│   │   └── Login.tsx            # Auth component
│   ├── characters
│   │   ├── Character.tsx        # Character details
│   │   └── CharacterCreation.tsx # Character creation form
│   ├── common
│   │   ├── NavBar.tsx           # Navigation bar
│   │   ├── CharacterCard.tsx    # Character stats display
│   │   ├── CharacterList.tsx    # Character selection
│   │   ├── WalletBalances.tsx   # Wallet balance display
│   │   └── DebugPanel.tsx       # Developer debug tools
│   ├── game
│   │   ├── board
│   │   │   └── GameBoard.tsx    # Game grid display
│   │   ├── ui
│   │   │   ├── ChatInterface.tsx # In-game chat
│   │   │   ├── ControlPanel.tsx  # Game controls
│   │   │   ├── EventFeed.tsx     # Game events
│   │   │   └── DataFeed.tsx      # Combined events and chat
│   │   └── controls
│   │       └── MovementControls.tsx # Movement UI
├── hooks
│   ├── contracts               # Wallet-aware client hook
│   │   └── useBattleNadsClient.ts
│   ├── game                    # Gameplay hooks (React-Query + XState helpers)
│   │   ├── useCachedDataFeed.ts
│   │   ├── useUiSnapshot.ts    # **single polling source of truth**
│   │   ├── useBattleNads.ts    # Core game data and actions
│   │   ├── useCharacter.ts     # Character management
│   │   ├── useCombat.ts        # Combat interactions
│   │   ├── useEquipment.ts     # Equipment handling
│   │   ├── useChat.ts          # Chat functionality
│   │   ├── useGame.ts          # High-level orchestration (wallet→key→play)
│   │   └── useGameMachine.ts   # XState bridge
│   ├── session                 # AA key hooks
│   │   ├── useSessionKey.ts    # Session key management
│   │   └── useSessionFunding.ts # Session funding functionality
│   └── index.ts                # Barrel exports
├── machines
│   └── gameStateMachine.ts     # Wallet / character / key FSM
├── mappers                     # Contract→Domain→UI transforms
│   ├── contractToDomain.ts     # Transform contract data to domain
│   ├── domainToUi.ts           # Transform domain to UI
│   └── index.ts                # Barrel exports
├── providers
│   ├── AuthProvider.tsx         # Authentication
│   ├── WalletProvider.tsx       # Wallet connections
│   └── PrivyAuthProvider.tsx    # Privy Auth configuration
├── types                       # contract / domain / ui namespaces
└── utils                       # misc helpers
```

## Core Technologies

* **Framework:** Next.js (14.1.0)
* **Base Libraries:** React (^18.2.0), React DOM (^18.2.0)
* **Language:** TypeScript (^5)
* **Authentication:** Privy Auth (@privy-io/react-auth ^2.8.0)
* **Styling:** 
    * Tailwind CSS (^3.4.1) (with PostCSS/Autoprefixer)
    * Chakra UI (@chakra-ui/react ^2.10.7)
* **Routing:** Next.js App Router (built-in)
* **State Management:** 
    * TanStack Query v5 (for data fetching and caching)
    * XState 5 (for finite state machines)
* **Blockchain Interaction:** ethers (^6.13.5)
* **Package Manager:** npm (Node version 18.17.1 specified in .nvmrc)

## Component Responsibilities

### Core Providers

#### `WalletProvider`
- Manages wallet connections (injected, embedded)
- Tracks wallet connection status
- Provides wallet addresses, signers, and providers
- Handles wallet reconnection logic
- Manages transaction submission
- Stores persistent wallet references for resilience

#### `AuthProvider` / `PrivyAuthProvider`
- Configures Privy integration
- Manages user authentication
- Handles wallet connection through Privy
- Provides login/logout operations

### Core Hooks

#### `useBattleNadsClient`
- **Purpose**: Client facade with adapters for different access levels
- **Responsibilities**:
  - Memoises a BattleNadsClient with three internal adapters:
    - **read** adapter (public RPC)
    - **owner** adapter (Metamask signer)
    - **session** adapter (embedded AA signer)
  - Handles contract instance loading and error states
  - Provides unified interface for contract interactions

#### `useCachedDataFeed`
- **Purpose**: Manage local cache (IndexedDB via localforage) of historical event and chat logs.
- **Responsibilities**:
  - Loads cached data blocks on initialization.
  - Determines the appropriate `startBlock` for incremental fetching based on the last cached block and a TTL.
  - Stores newly fetched `DataFeed` blocks (events/chats) from the client.
  - Purges expired blocks from the cache.
  - Provides the cached blocks and the latest block number covered by the cache to `useUiSnapshot`.

#### `useUiSnapshot`
- **Purpose**: Central polling mechanism for live game state data, integrating cached historical data.
- **Responsibilities**:
  - Primary interaction point with `client.getUiSnapshot()` for live data.
  - Uses `useCachedDataFeed` to determine the `startBlock` for polling, enabling incremental fetches.
  - Receives raw data from the client (currently array-based, mapped internally to an object structure - *potential fragility*).
  - Merges live `DataFeed` results with historical data from `useCachedDataFeed`.
  - Caches the combined, mapped response via TanStack Query tagged by [`'uiSnapshot'`, owner].

#### `useGame`
- **Purpose**: Game initialization and orchestration
- **Responsibilities**:
  - Manages the game's high-level state (ready, checking, etc.)
  - Coordinates initialization steps
  - Performs wallet and character validation
  - Handles session key verification via useSessionKey
  - Provides game state and update methods
  - Surfaces flags (isReady, needsSessionKeyUpdate, etc.)
  - Wraps movement/chat/attack mutations

#### `useBattleNads`
- **Purpose**: Maps raw snapshot data to UI-friendly game state.
- **Responsibilities**:
  - Consumes the cached data from `useUiSnapshot`.
  - Maps the `contract.PollFrontendDataReturn` structure through `contractToDomain` and `domainToUi` mappers.
  - Provides the final `ui.GameState` object.
  - Handles loading/error states from the underlying query.
  - Preserves the last valid state during refetches to prevent UI flickering.

#### `useSessionKey`
- **Purpose**: Account Abstraction key management and validation.
- **Responsibilities**:
  - **Currently fetches `sessionKeyData` and `currentBlock` independently via separate client calls.** (*Note: This is redundant; data is available in `useUiSnapshot` cache*).
  - Uses `sessionKeyMachine` and fetched data to determine the validation state (`VALID`, `EXPIRED`, `MISMATCH`, `MISSING`).
  - Provides the session key state and a `needsUpdate` flag.
  - Manages React Query caching for its independent fetches.

#### `useSessionFunding`
- **Purpose**: Handles funding actions for the session key.
- **Responsibilities**:
  - Manages MON top-ups & deactivation
  - Validates session key health
  - Updates session keys
  - Abstracts blockchain complexity

#### `useGameMachine`
- **Purpose**: XState bridge for game state management
- **Responsibilities**:
  - Wires XState to React components
  - Provides state transitions and guards
  - Manages game flow based on wallet, character, and session key state

#### `useWalletBalances`
- **Purpose**: Fetch and manage wallet balance information
- **Responsibilities**:
  - Fetches owner, session key, and bonded balances
  - Calculates balance shortfall for replenishment warnings
  - Provides data for the `WalletBalances` component

### UI Components

#### `AppInitializer` Component
- **Purpose**: Top-level application state management and rendering logic.
- **Responsibilities**:
  - Uses `useGame` hook to determine application state (loading, error, login, character creation, session key prompt, ready).
  - Renders appropriate UI screens or components based on the current state.
  - Handles redirects between application states (e.g., redirecting to `/create` if no character exists).
  - Acts as the entry point before the main game interface is displayed.

#### `GameContainer` Component
- **Purpose**: Container for the active game interface.
- **Responsibilities**:
  - Receives game state (`character`, `gameState`, etc.) and action handlers (`moveCharacter`, `attack`, etc.) as props, typically from `AppInitializer` / `useGame`.
  - Renders the core `GameView` component which includes the game board, controls, and data feeds.
  - Includes the toggle mechanism for the `DebugPanel`.
  - Orchestrates the UI elements directly involved in gameplay once the application is in a 'ready' state.

#### `GameView` Component
- **Purpose**: Arrange the main UI panels for the active game screen.
- **Responsibilities**:
  - Uses Chakra UI Grid to define the layout areas (map, character, controls, feed, chat).
  - Renders child components (`Minimap`, `CharacterInfo`, `MovementControls`, `CombatTargets`, `EventFeed`, `ChatPanel`) in their designated grid areas.
  - Passes necessary props (game state, event handlers) down to child components.
  - Handles responsive layout adjustments between base and medium screen sizes.

#### `Minimap` Component
- **Purpose**: Visualize the character's immediate surroundings.
- **Responsibilities**:
  - Renders a grid representing the local game area.
  - Displays the player character's position.
  - Potentially shows nearby combatants or non-combatants (implementation detail).

#### `CharacterInfo` Component
- **Purpose**: Display detailed information about the player's character within the main game view.
- **Responsibilities**:
  - Shows character name, stats (health, attributes).
  - Displays current equipment.
  - Potentially includes status effects or other in-game relevant character details.
  - Distinct from `CharacterCard` which might be used for summaries outside the main game screen.

#### `MovementControls` Component
- **Purpose**: Provide UI for movement actions.
- **Responsibilities**:
  - Renders direction buttons (N, S, E, W, Up, Down).
  - Disables buttons based on movement possibility or loading state (`isMoving`).
  - Calls the `onMove` handler passed from parent (`GameView`).
  - Displays current position coordinates.

#### `CombatTargets` Component
- **Purpose**: Display available targets and handle attack actions.
- **Responsibilities**:
  - Lists nearby combatants retrieved from game state.
  - Allows the user to select a target.
  - Calls the `onAttack` handler with the selected target index.
  - Indicates loading state (`isAttacking`).

#### `EventFeed` Component
- **Purpose**: Display game event messages.
- **Responsibilities**:
  - Renders a list of event logs (combat results, movement, etc.).
  - Filters or formats messages relevant to the player (`characterId`).
  - Manages scrolling for the feed area.

#### `ChatPanel` Component
- **Purpose**: Handle in-game chat display and input.
- **Responsibilities**:
  - Displays historical chat messages (`chatLogs`).
  - Provides an input field for sending new messages.
  - Calls the `onSendChatMessage` handler.
  - Manages scrolling for the chat area.

#### `CharacterCard` Component
- **Purpose**: Display character information
- **Responsibilities**:
  - Shows character stats and attributes
  - Displays health and experience bars
  - Shows equipment and inventory
  - Provides equipment changing interface
  - Shows character progress

#### `CharacterList` Component
- **Purpose**: List and select characters
- **Responsibilities**:
  - Displays available characters
  - Handles character selection
  - Shows character stats summaries
  - Provides character management options

#### `CharacterCreation` Component
- **Purpose**: Create new characters
- **Responsibilities**:
  - Handles name input
  - Manages attribute allocation
  - Validates stat distribution
  - Performs blockchain character creation
  - Handles transaction state and errors

#### `WalletBalances` Component
- **Purpose**: Show wallet balance information
- **Responsibilities**:
  - Displays session key balance
  - Shows bonded token balance
  - Provides funding actions
  - Shows balance warnings
  - Handles direct funding operations

#### `NavBar` Component
- **Purpose**: Navigation and app header
- **Responsibilities**:
  - Shows connected wallet information
  - Provides navigation links
  - Handles logout functionality
  - Adjusts based on authentication state
  - Shows character status

#### `DebugPanel` Component
- **Purpose**: Display debug information and provide testing tools.
- **Responsibilities**:
  - Shows detailed wallet addresses and character ID.
  - Allows fetching of character ID and full UI snapshot data via `useBattleNadsClient`.
  - Displays MON balance information for owner and session key.
  - Provides tools to estimate buy-in amounts.
  - Shows monster health details derived from game state (`useBattleNads`).
  - Logs actions performed within the panel.

## Data Flow

1. Authentication Flow:
   - `PrivyAuthProvider` → `WalletProvider` → `useGame` → UI Components

2. Game Data Flow:
   - Historical Logs: `localforage` → `useCachedDataFeed`
   - Live Data: Smart Contract → `useBattleNadsClient` → `useUiSnapshot` (informed by `useCachedDataFeed`) → React-Query Cache (`['uiSnapshot', owner]`) → `useBattleNads` (mapping) → `useGame` (orchestration) → UI Components
   - Session Key Validation: Smart Contract → `useBattleNadsClient` → `useSessionKey` → `useGame` → UI Components (*Note: Independent fetch path*)

3. Action Flow:
   - UI Components → Gameplay Hooks → `useBattleNadsClient` → Smart Contract → Invalidate Cache ['uiSnapshot', owner]

## State Management

### Global State
- Authentication state (Privy)
- Wallet connections (WalletProvider)
- Game data (React-Query cache via useUiSnapshot)
- Game flow (XState via gameStateMachine)

### Component State
- UI interaction state (loading, error, etc.)
- Form inputs and validations
- Local view preferences

## Optimizations

### Performance Considerations
- Single snapshot polling to minimize RPC load
- Memoization of expensive components
- Optimistic cache updates for chat & movement
- XState guards to prevent redundant polling

### Error Handling
- Error boundaries (e.g., `<GameErrorBoundary>`) can be used to wrap major sections like `app/(game)` routes to centralize handling of wallet, RPC, or transaction errors.
- Custom typed error classes (e.g., `WalletMissingError`, `ContractCallError`, `SessionKeyExpiredError`, `CharacterMissingError`) defined in `src/errors.ts` are used throughout the application to allow for specific error identification and handling logic.
- Transaction retry mechanisms can be implemented within relevant hooks or the client facade.
- UI components should display clear error messaging and provide recovery paths or actions where appropriate (e.g., retry buttons, funding prompts).

## Suggested Improvements

1. **Adapter Interface**: Define `interface IBattleNadsAdapter` so future L2s plug in cleanly.

2. **Query Selectors**: Expose tiny hooks (`useCharacterData(owner)`) that select from `uiSnapshot` to avoid JSON deep-diffs in components.

3. **Error Boundary Wrapper**: A `<GameErrorBoundary>` around `app/(game)` routes to centralise wallet/RPC/tx errors.

4. **Incremental Suspense**: Move polling queries to React 18 `suspense: true` for smoother hydration.

5. **Type Safety**: Strengthen TypeScript types throughout the application to reduce runtime errors.

6. **Testing**: Add comprehensive testing for critical game logic and contract interactions.

7. **Component Isolation**: Further separate UI components from business logic to improve testability and maintainability.

8. **JSDoc Comments**: Add comprehensive documentation to all components and hooks for better developer experience.