# Battle-Nads Frontend Architecture

## Project Architecture Overview

```
/src
├── app                          # Next.js app directory
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
│   ├── contracts
│   │   ├── useContracts.ts      # Contract instances
│   │   └── useEmbeddedContract.ts # Embedded wallet contracts
│   ├── game
│   │   ├── useGame.ts           # Game orchestration
│   │   ├── useBattleNads.ts     # Game data and actions
│   │   └── useGameActions.ts    # Session key operations
│   └── wallet
│       └── useWalletBalances.ts # Wallet balance management
├── providers
│   ├── AuthProvider.tsx         # Authentication
│   ├── WalletProvider.tsx       # Wallet connections
│   ├── GameDataProvider.tsx     # Game state and polling
│   └── PrivyAuthProvider.tsx    # Privy Auth configuration
├── types
│   └── gameTypes.ts             # Type definitions
├── utils
│   ├── gameDataConverters.ts    # Data transformation utilities
│   └── getCharacterLocalStorageKey.ts # Storage helpers
```

## Component Responsibilities

### Core Providers

#### `WalletProvider`
- Manages wallet connections (injected, embedded)
- Tracks wallet connection status
- Provides wallet addresses, signers, and providers
- Handles wallet reconnection logic
- Manages transaction submission
- Stores persistent wallet references for resilience

#### `GameDataProvider`
- Central polling mechanism for game data
- Processes and normalizes blockchain data
- Manages data caching and updates
- Publishes events for data changes
- Handles loading and error states
- Maintains a coherent game state

#### `PrivyAuthProvider`
- Configures Privy integration
- Manages user authentication
- Handles wallet connection through Privy
- Provides login/logout operations

### Core Hooks

#### `useGame`
- **Purpose**: Game initialization and orchestration
- **Responsibilities**:
  - Manages the game's high-level state (ready, checking, etc.)
  - Coordinates initialization steps
  - Performs wallet and character validation
  - Handles session key verification
  - Provides game state and update methods
  - Manages transaction flags and references

#### `useBattleNads`
- **Purpose**: Core game data and contract interactions
- **Responsibilities**:
  - Retrieves character data
  - Performs game actions (movement, combat)
  - Creates characters and manages character data
  - Handles chat message transmission
  - Manages game events and data feeds
  - Processes blockchain data into usable formats

#### `useContracts`
- **Purpose**: Contract instance management
- **Responsibilities**:
  - Creates contract instances for different wallet types
  - Provides read and write contract access
  - Handles contract loading and error states
  - Manages contract interactions

#### `useEmbeddedContract`
- **Purpose**: Simplify embedded wallet transactions
- **Responsibilities**:
  - Formats and sends embedded wallet transactions
  - Provides specialized movement functions
  - Handles chat and combat transactions
  - Manages equipment changes

#### `useGameActions`
- **Purpose**: Session key and game action management
- **Responsibilities**:
  - Updates session keys
  - Validates session key health
  - Provides movement and chat functions
  - Abstracts blockchain complexity

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
   - Smart Contract → `useContracts` → `useBattleNads` → `GameDataProvider` → UI Components

3. Action Flow:
   - UI Components → `useGameActions`/`useBattleNads` → `useContracts`/`useEmbeddedContract` → Smart Contract

## State Management

### Global State
- Authentication state (Privy)
- Wallet connections (WalletProvider)
- Game data (GameDataProvider)

### Component State
- UI interaction state (loading, error, etc.)
- Form inputs and validations
- Local view preferences

## Optimizations

### Performance Considerations
- Memoization of expensive components
- Throttled/debounced blockchain polling
- Optimistic UI updates

### Error Handling
- Error boundaries for component failures
- Transaction retry mechanisms
- Clear error messaging and recovery paths

## Suggested Improvements

1. **State Management**: Consider implementing a more structured state management system like Zustand instead of relying on context and component state.

2. **Code Organization**: Group related components and hooks into feature folders for better organization.

3. **Type Safety**: Strengthen TypeScript types throughout the application to reduce runtime errors.

4. **Testing**: Add comprehensive testing for critical game logic and contract interactions.

5. **Component Isolation**: Further separate UI components from business logic to improve testability and maintainability.

6. **Custom Hooks**: Create more focused, single-responsibility hooks that compose well together.

7. **Error Handling**: Implement dedicated error handling modules to standardize error presentation and recovery.

8. **Loading States**: Create a unified loading state system to improve user experience.

9. **Event System**: Replace custom DOM events with a proper state management solution for cross-component communication.

10. **Documentation**: Add JSDoc comments to all components and hooks for better developer experience.