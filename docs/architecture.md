# Battle-Nads Frontend Architecture

## Project Architecture Overview

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

#### `useUiSnapshot`
- **Purpose**: Central polling mechanism for game data
- **Responsibilities**:
  - The only polling point in the application
  - Fetches client.getUiSnapshot() on a regular interval
  - Maps contract data to domain model
  - Caches responses via TanStack Query tagged by ['uiSnapshot', owner]
  - Maintains a coherent game state

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
- **Purpose**: Core game data and contract interactions
- **Responsibilities**:
  - Reads from the uiSnapshot cache
  - Performs game actions (movement, combat)
  - Creates characters and manages character data
  - Handles chat message transmission
  - Manages game events and data feeds
  - Invalidates cache to ensure data consistency

#### `useSessionKey` / `useSessionFunding`
- **Purpose**: Account Abstraction key management
- **Responsibilities**:
  - Provides Query + FSM validation for AA keys
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

### UI Components

#### `Game` Component
- **Purpose**: Main game UI orchestration
- **Responsibilities**:
  - Renders the appropriate UI based on game state
  - Handles initialization flow
  - Manages game state transitions
  - Coordinates sub-components
  - Handles error states and loading
  - Processes user input for game actions

#### `GameBoard` Component
- **Purpose**: Render the 2D game world
- **Responsibilities**:
  - Displays the game grid
  - Shows player position
  - Renders other characters and monsters
  - Visualizes movement possibilities
  - Handles attack targeting

#### `MovementControls` Component
- **Purpose**: Provide UI for movement actions
- **Responsibilities**:
  - Renders direction buttons
  - Handles user movement input
  - Shows movement feedback and tooltips
  - Displays position coordinates

#### `ChatInterface` Component
- **Purpose**: In-game communication
- **Responsibilities**:
  - Displays chat history
  - Manages message input
  - Shows sender information
  - Handles message submission

#### `DataFeed` Component
- **Purpose**: Combine game events and chat
- **Responsibilities**:
  - Renders `EventFeed` and `ChatInterface`
  - Manages layout and scrolling
  - Routes messages to appropriate handlers

#### `EventFeed` Component
- **Purpose**: Display game events
- **Responsibilities**:
  - Shows combat results
  - Displays movement confirmations
  - Formats events with timestamps
  - Categorizes events by type

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

## Data Flow

1. Authentication Flow:
   - `PrivyAuthProvider` → `WalletProvider` → `useGame` → UI Components

2. Game Data Flow:
   - Smart Contract → `useBattleNadsClient` → `useUiSnapshot` → React-Query Cache → Gameplay Hooks → UI Components

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
- Error boundaries for component failures
- Transaction retry mechanisms
- Clear error messaging and recovery paths

## Suggested Improvements

1. **Adapter Interface**: Define `interface IBattleNadsAdapter` so future L2s plug in cleanly.

2. **Query Selectors**: Expose tiny hooks (`useCharacterData(owner)`) that select from `uiSnapshot` to avoid JSON deep-diffs in components.

3. **Error Boundary Wrapper**: A `<GameErrorBoundary>` around `app/(game)` routes to centralise wallet/RPC/tx errors.

4. **Incremental Suspense**: Move polling queries to React 18 `suspense: true` for smoother hydration.

5. **Type Safety**: Strengthen TypeScript types throughout the application to reduce runtime errors.

6. **Testing**: Add comprehensive testing for critical game logic and contract interactions.

7. **Component Isolation**: Further separate UI components from business logic to improve testability and maintainability.

8. **JSDoc Comments**: Add comprehensive documentation to all components and hooks for better developer experience.