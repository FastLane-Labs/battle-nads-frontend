# Battle-Nads Frontend Architecture

## Project Architecture Overview

```text
/src/app                     # Next.js App Router directory
├── globals.css              # Global CSS styles
├── layout.tsx               # Root layout component
├── metadata.ts              # Page metadata configuration
├── favicon.ico              # Favicon
├── theme.ts                 # Chakra UI theme
├── ErrorBoundary.tsx        # Global error boundary
├── page.tsx                 # Home page
├── character                # Character details page
│   └── page.tsx
├── create                   # Character creation page
│   └── page.tsx
├── dashboard                # Player dashboard page
│   └── page.tsx
└── game                     # Main game interface page
    └── page.tsx
/src/blockchain              # Chain-specific plumbing
├── adapters/…               # On-chain ABI bridges
└── clients/…                # Facade with 'read', 'owner', 'session' adapters
/src/components              # Reusable UI components
├── AppInitializer.tsx       # Top-level app initialization and routing
├── DebugPanel.tsx           # Developer debug tools
├── NavBar.tsx               # Navigation bar
├── WalletBalances.tsx       # Wallet balance display
├── auth
│   └── Login.tsx            # Authentication component
├── characters
│   ├── Character.tsx        # Character detail component
│   ├── CharacterCreation.tsx# Character creation form
│   ├── CharacterList.tsx    # Character selection component
│   └── CharacterCard.tsx    # Character summary card
└── game                     # Game-related UI components
    ├── GameContainer.tsx    # Container for active game UI
    ├── board                # Game board display
    │   ├── CharacterInfo.tsx
    │   └── Minimap.tsx
    ├── controls             # Movement and combat controls
    │   └── MovementControls.tsx
    ├── feed                 # Event and chat feed
    │   ├── ChatPanel.tsx
    │   ├── EventFeed.tsx
    │   └── EventLogItemRenderer.tsx
    ├── indicators           # Game status indicators
    ├── layout               # Game layout components
    └── equipment            # Equipment management UI
/src/hooks                    # Core data and game hooks
├── contracts
│   └── useBattleNadsClient.ts
├── game                      # Gameplay hooks (React Query, XState)
│   ├── useAbilityCooldowns.ts
│   ├── useBattleNads.ts
│   ├── useCachedDataFeed.ts
│   ├── useEquipment.ts
│   ├── useGame.ts
│   └── useUiSnapshot.ts
├── session                   # Account abstraction key hooks
│   ├── useSessionKey.ts
│   └── useSessionFunding.ts
├── useGameMachine.ts         # XState bridge for game flow state
├── useWalletBalances.ts      # Wallet balance management hook
├── utils.ts                  # Miscellaneous hook utilities
└── index.ts                  # Barrel exports
/src/machines                 # XState finite state machine definitions
└── gameStateMachine.ts
/src/mappers                  # Data transformation layers
├── contractToDomain.ts
├── domainToUi.ts
└── index.ts
/src/providers                # Context and provider components
├── AuthProvider.tsx
├── WalletProvider.tsx
└── PrivyAuthProvider.tsx
/src/types                    # TypeScript type definitions and namespaces
/src/utils                    # Miscellaneous utility functions
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

#### `useAbilityCooldowns`
- **Purpose**: Manage character ability cooldowns and execution.
- **Responsibilities**:
  - Tracks ability status (ready, charging, active, cooldown)
  - Calculates remaining cooldown time based on current and target blocks
  - Provides ability-use functionality with proper validation
  - Handles success/failure notifications for ability activation
  - Maintains character-class-specific ability lists
  - Shows gas shortfall warnings when abilities appear stuck

#### `useBattleNads`
- **Purpose**: Maps raw snapshot data to UI-friendly game state.
- **Responsibilities**:
  - Consumes the cached data from `useUiSnapshot`.
  - Maps the `contract.PollFrontendDataReturn` structure through `contractToDomain` and `domainToUi` mappers.
  - Provides the final `ui.GameState` object.
  - Handles loading/error states from the underlying query.
  - Preserves the last valid state during refetches to prevent UI flickering.

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

#### `useEquipment`
- **Purpose**: Handle character equipment changes and item management.
- **Responsibilities**:
  - Provides functions to equip weapons and armor
  - Tracks available equipment for the character
  - Enforces equipment rules (e.g., no changes during combat)
  - Shows current equipped items and available alternatives
  - Handles blockchain transaction processing for equipment changes
  - Provides name resolution for equipment IDs

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

#### `useGameMachine`
- **Purpose**: XState bridge for pre-game flow state management
- **Responsibilities**:
  - Wires XState to React components
  - Manages wallet connection verification
  - Checks for character existence from local storage
  - Verifies session key status using client validation
  - Handles character creation flow
  - Provides session key update functionality with funding
  - Manages error states and recovery paths

#### `useSessionFunding`
- **Purpose**: Handles funding actions for the session key.
- **Responsibilities**:
  - Manages MON top-ups & deactivation
  - Validates session key health
  - Updates session keys
  - Abstracts blockchain complexity

#### `useSessionKey`
- **Purpose**: Account Abstraction key management and validation.
- **Responsibilities**:
  - **Currently fetches `sessionKeyData` and `currentBlock` independently via separate client calls.** (*Note: This is redundant; data is available in `useUiSnapshot` cache*).
  - Uses `sessionKeyMachine` and fetched data to determine the validation state (`VALID`, `EXPIRED`, `MISMATCH`, `MISSING`).
  - Provides the session key state and a `needsUpdate` flag.
  - Manages React Query caching for its independent fetches.

#### `useUiSnapshot`
- **Purpose**: Central polling mechanism for live game state data, integrating cached historical data.
- **Responsibilities**:
  - Primary interaction point with `client.getUiSnapshot()` for live data.
  - Uses `useCachedDataFeed` to determine the `startBlock` for polling, enabling incremental fetches.
  - Receives raw data from the client (currently array-based, mapped internally to an object structure - *potential fragility*).
  - Merges live `DataFeed` results with historical data from `useCachedDataFeed`.
  - Caches the combined, mapped response via TanStack Query tagged by [`'uiSnapshot'`, owner].

#### `useWalletBalances`
- **Purpose**: Fetch and manage wallet balance information
- **Responsibilities**:
  - Fetches owner wallet balance via direct RPC provider
  - Extracts session key and bonded balance from game state
  - Calculates balance shortfall from session key data
  - Formats balances for display
  - Determines if balance is below threshold for warnings
  - Refreshes balances at configured intervals

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

1. **Authentication Flow**:
   - `PrivyAuthProvider` → `WalletProvider` → `useGameMachine` → `AppInitializer` → UI Components
   - Wallet connections are managed through Privy's integration, with persistent reconnection handling
   - Session validation uses XState via gameStateMachine to coordinate wallet, character, and session key statuses

2. **Game Data Flow**:
   - **Historical Logs**: 
     - Dexie IndexedDB (`src/lib/db.ts`) ← → `useCachedDataFeed` 
     - Cached blocks include events and chat logs with timestamps
     - Cached data has TTL-based expiry with automatic purging
   
   - **Live Game State**:
     - Smart Contract → `useBattleNadsClient` → `useUiSnapshot` → React-Query Cache (`['uiSnapshot', owner]`) 
     - `useUiSnapshot` decides fetch parameters based on `lastBlock` from previous query
     - Newly fetched data feeds asynchronously stored to Dexie via `storeFeedData`
     - `useBattleNads` transforms contract data → domain model → UI model
     - Specialized hooks consume data from `useBattleNads`:
       - `useEquipment` for available items and equipment changes
       - `useAbilityCooldowns` for character abilities and cooldown management
       - `useGame` for general game orchestration
     - UI Components receive transformed data and action handlers
   
   - **Session Key Management**:
     - Smart Contract → `useBattleNadsClient` → `useSessionKey` → `useGameMachine` → Game Ready State
     - `useSessionFunding` provides MON balance replenishment
     - `useWalletBalances` tracks balances across owner and session keys with periodic refreshes

3. **Action Flow**:
   - **Movement Actions**:
     - UI Components → `useGame.moveCharacter` → `useBattleNadsClient.move` → Smart Contract 
     - Cache invalidation: `['uiSnapshot', owner]`
   
   - **Combat Actions**:
     - UI Components → `useGame.attack` → `useBattleNadsClient.attack` → Smart Contract
     - Cache invalidation: `['uiSnapshot', owner]`
   
   - **Ability Usage**:
     - UI Components → `useAbilityCooldowns.useAbility` → `useBattleNadsClient.useAbility` → Smart Contract
     - Cache invalidation: `['uiSnapshot', owner]`
   
   - **Equipment Changes**:
     - UI Components → `useEquipment.equipWeapon/equipArmor` → `useBattleNadsClient.equipWeapon/equipArmor` → Smart Contract
     - Cache invalidation: `['uiSnapshot', owner]`
   
   - **Chat Messages**:
     - UI Components → `useGame.sendChatMessage` → `useBattleNadsClient.sendChatMessage` → Smart Contract
     - Cache invalidation: `['uiSnapshot', owner]`

4. **Wallet & Session Flow**:
   - **Session Key Updates**:
     - UI → `useGameMachine.updateSessionKey` → Generate new key → `useBattleNadsClient.updateSessionKey` → Smart Contract
     - Calculates expiration blocks based on current block + `MAX_SESSION_KEY_VALIDITY_BLOCKS`
   
   - **Balance Management**:
     - UI → `useSessionFunding.fundSessionKey` → `useBattleNadsClient` → Smart Contract
     - `useWalletBalances` detects low balance conditions and formats for display

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