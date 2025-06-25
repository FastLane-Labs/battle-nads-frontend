# Claude's Guide to Battle Nads Frontend Development

## What is Battle Nads?

Battle Nads is a blockchain-based tactical RPG built on the Monad network. Players control characters in turn-based combat, managing abilities, equipment, and resources in a persistent game world.

The game features:

- **Characters** with unique stats and progression
- **Turn-based tactical combat** with ability cooldowns and positioning
- **Session key system** for gasless gameplay
- **Real-time multiplayer** with optimistic updates
- **Equipment and progression** systems

Built with Next.js, TypeScript, Privy wallet integration, XState for state management, and direct smart contract interactions on Monad.

## Your Role

Your role is to write code for the frontend. You do NOT have access to the running app or blockchain, so you cannot test contract interactions. You MUST rely on me, the user, to test the code.

If I report a bug in your code, after you fix it, you should pause and ask me to verify that the bug is fixed.

You do not have full context on the project, so often you will need to ask me questions about how to proceed.

Don't be shy to ask questions -- I'm here to help you!

If I send you a URL, you MUST immediately fetch its contents and read it carefully, before you do anything else.

## Workflow

We use GitHub issues to track work we need to do, and PRs to review code. Whenever you create an issue or a PR, tag it with "by-claude". Use the `gh` bash command to interact with GitHub.

To start working on a feature, you should:

### 1. Setup

- Read the relevant GitHub issue (or create one if needed)
- Checkout main and pull the latest changes
- Create a new branch like `feat/feature-name` or `fix/bug-name`. **NEVER commit to main. NEVER push to origin/main.**

### 2. Development

- Commit often as you write code, so that we can revert if needed
- When you have a draft of what you're working on, ask me to test it in the app to confirm that it works as you expect. Do this early and often
- For blockchain interactions, test against contract state changes and wallet integration

### 3. Review

- When the work is done, verify that the diff looks good with `git diff main`
- Run tests and build to ensure no regressions: `npm test && npm run build`
- While you should attempt to write code that adheres to our coding style, linting and formatting are handled by pre-commit hooks
- Push the branch to GitHub
- Open a PR:
  - The PR title should not include the issue number
  - The PR description should start with the issue number and a brief description of the changes
  - Write a test plan covering both new functionality and any EXISTING functionality that might be impacted

### 4. Fixing Issues

- To reconcile different branches, always rebase or cherry-pick. Do not merge
- For blockchain-related bugs, consider contract state, wallet connection, and transaction failures

## Project Architecture

### Core Structure

- **Blockchain Layer**: Contract adapters and clients in `src/blockchain/`
- **Domain Layer**: Business logic and types in `src/types/domain/` and `src/hooks/`
- **UI Layer**: React components in `src/components/`

### Key Directories

#### Blockchain Integration

- `src/blockchain/clients/` - BattleNadsClient for contract interactions
- `src/blockchain/adapters/` - Contract response adapters
- `src/blockchain/abis/` - Contract ABI definitions

#### Game Logic

- `src/hooks/game/` - Game state management hooks
- `src/hooks/contracts/` - Contract interaction hooks
- `src/hooks/session/` - Session key and wallet hooks
- `src/machines/` - XState state machines

#### Components

- `src/components/game/` - Game-specific UI (board, controls, modals)
- `src/components/characters/` - Character management UI
- `src/components/ui/` - Reusable UI components

#### Types & Data

- `src/types/contract/` - Raw contract response types
- `src/types/domain/` - Business logic types
- `src/types/ui/` - UI-specific types
- `src/mappers/` - Data transformation between layers

### Important Files

- `src/blockchain/clients/BattleNadsClient.ts` - Main contract client
- `src/hooks/game/useGameState.ts` - Core game state management
- `src/hooks/game/useAbilityCooldowns.ts` - Ability system logic
- `src/providers/WalletProvider.tsx` - Privy wallet integration
- `src/components/game/GameContainer.tsx` - Main game interface
- `src/app/game/page.tsx` - Game page entry point

## Ability System

### Architecture

- **Cooldowns**: Block-based timing with ability-specific durations
- **Implementation**: `useAbilityCooldowns` hook handles all cooldown logic
- **Block Time**: 500ms per block, polling every 500ms
- **States**: READY → CHARGING → ACTION → COOLDOWN → READY

### Cooldown Durations (in blocks)

- **Bard**: SingSong(0), DoDance(0) - no cooldown
- **Warrior**: ShieldBash(24), ShieldWall(24) - 12 seconds
- **Rogue**: EvasiveManeuvers(18), ApplyPoison(64) - 9s and 32s
- **Monk**: Pray(72), Smite(24) - 36s and 12s  
- **Sorcerer**: Fireball(56), ChargeUp(36) - 28s and 18s

### UI Features

- Circular progress indicators with real-time countdown
- Visual overlays and status badges
- Optimistic updates for immediate feedback
- Tooltip information with detailed ability stats

## Blockchain Architecture

### Wallet Management

- **Privy Integration**: Embedded and injected wallet support
- **Session Keys**: Gasless transactions for gameplay
- **Balance Tracking**: MON token balance and gas estimation
- **Connection States**: Handle disconnection and reconnection gracefully

### Contract Interactions

- **BattleNadsClient**: Main interface for contract calls
- **Polling Strategy**: 500ms intervals for game state updates
- **Error Handling**: Comprehensive error types for contract failures
- **Optimistic Updates**: Immediate UI feedback before confirmation

### State Management

- **useGameState**: Core hook for world state polling
- **useCachedDataFeed**: Efficient caching of blockchain data
- **XState Machines**: Complex workflows like session key validation
- **React Query**: Server state management with blockchain data

## Data Flow Patterns

### Contract → Domain → UI

1. **Contract Layer**: Raw blockchain responses
2. **Domain Layer**: Business logic types and validation
3. **UI Layer**: Component-ready data structures

### State Synchronization

- Poll contract state every 500ms during active gameplay
- Cache frequently accessed data in local storage
- Optimistic updates for user actions
- Rollback on transaction failures

## Coding Style

### TypeScript

- **Strict typing**: Enabled with ES2020 target
- **Type assertions**: Use `as` only with explanatory comments
- **BigInt handling**: Proper conversion for blockchain numbers
- **Address validation**: Ethereum address format checking

### Code Organization

- **Paths**: Use `@/` alias instead of relative imports
- **Components**: PascalCase for React components
- **Hooks**: camelCase with "use" prefix
- **Types**: Prefixed with domain context (e.g., `ContractCharacter`, `DomainCharacter`)
- **Constants**: UPPER_CASE for blockchain constants

### Blockchain Patterns

- **Error boundaries**: Wrap contract interactions
- **Loading states**: Always show loading for async operations  
- **Transaction feedback**: Clear success/failure messaging
- **Gas optimization**: Minimize unnecessary contract calls

### Testing

- **Unit tests**: Jest with React Testing Library
- **Mock contracts**: Simulate blockchain responses
- **Component tests**: Test UI behavior without real contracts
- **Integration tests**: End-to-end user flows

## Important Constraints

IMPORTANT: If you want to use any of these features, you must alert me and explicitly ask for my permission first: `setTimeout`, `useImperativeHandle`, `useRef`, or type assertions with `as`.

### Promise Handling

All promises must be handled (ESLint enforced). This is especially critical for:

- Contract interactions
- Wallet operations  
- State updates

### Performance Considerations

- Minimize contract calls during render
- Use React Query for efficient caching
- Debounce user inputs that trigger contract reads
- Optimize re-renders with proper dependency arrays

## WebSocket Configuration

WebSocket support is available but **disabled by default**. To enable:

```bash
# Enable WebSocket for development
NEXT_PUBLIC_ENABLE_WEBSOCKET=true npm run dev

# Or add to .env.local
echo "NEXT_PUBLIC_ENABLE_WEBSOCKET=true" >> .env.local
```

**Benefits of WebSocket:**
- Real-time contract state updates
- Lower latency for game polling
- Persistent connection reduces overhead

**Current Status:** Infrastructure ready, disabled by default for stability

## Commands

### Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm test -- -t "test name"` - Run specific test(s)

### Debugging

- Check browser console for contract interaction logs
- Use React DevTools for state inspection
- Monitor network tab for failed blockchain calls
- Check wallet connection status in Privy dashboard
