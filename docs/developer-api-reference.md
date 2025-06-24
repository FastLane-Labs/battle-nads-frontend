# Developer API Reference

## 🔧 Battle Nads Frontend Architecture

This reference guide provides comprehensive documentation for developers working on or contributing to the Battle Nads frontend codebase.

## 📁 Project Structure

### Core Directories

```bash
src/
├── app/                    # Next.js app router pages
├── blockchain/             # Blockchain integration layer
├── components/             # React components
├── hooks/                  # Custom React hooks
├── types/                  # TypeScript type definitions
├── utils/                  # Utility functions
├── providers/              # React context providers
├── machines/               # Simplified state management (XState removed from session validation)
└── mappers/                # Data transformation functions
```

## 🔗 Blockchain Integration

### BattleNadsClient (`src/blockchain/clients/BattleNadsClient.ts`)

Primary interface for all contract interactions.

#### Core Methods

```typescript
class BattleNadsClient {
  // Character Management
  async createCharacter(params: CreateCharacterParams): Promise<TransactionResult>
  async getCharacter(characterId: string): Promise<ContractCharacter | null>
  async deleteCharacter(characterId: string): Promise<TransactionResult>
  
  // Game Actions
  async moveCharacter(direction: Direction): Promise<TransactionResult>
  async attackTarget(targetIndex: number): Promise<TransactionResult>
  async useAbility(abilityType: AbilityType): Promise<TransactionResult>
  
  // Session Key Management
  async createSessionKey(params: SessionKeyParams): Promise<TransactionResult>
  async validateSessionKey(): Promise<boolean>
  async fundSessionKey(amount: bigint): Promise<TransactionResult>
  
  // Data Polling
  async pollFrontendData(): Promise<ContractWorldSnapshot>
  async estimateBuyInAmountInMON(): Promise<bigint>
}
```

#### Usage Example

```typescript
import { useBattleNadsClient } from '@/hooks/contracts/useBattleNadsClient';

function GameComponent() {
  const client = useBattleNadsClient();
  
  const handleMove = async (direction: Direction) => {
    try {
      const result = await client.moveCharacter(direction);
      console.log('Move successful:', result.transactionHash);
    } catch (error) {
      console.error('Move failed:', error);
    }
  };
}
```

### Contract Adapters (`src/blockchain/adapters/`)

Transform raw contract responses into domain objects.

```typescript
// BattleNadsAdapter.ts
export class BattleNadsAdapter {
  static adaptCharacter(contractData: any): domain.Character
  static adaptWorldSnapshot(contractData: any): domain.WorldSnapshot
  static adaptCombatEvent(contractData: any): domain.CombatEvent
}
```

## 🎮 Game State Management

### Simplified 2-Layer Architecture

The game state is managed through a simplified 2-layer hook architecture that eliminates cascade invalidations and improves performance.

### Layer 1: Focused Data Hooks

#### useContractPolling (`src/hooks/game/useContractPolling.ts`)

Pure contract data fetching with real-time polling.

```typescript
interface ContractPollingResult {
  data: contract.PollFrontendDataReturn | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

// Usage
const { data, isLoading, error } = useContractPolling(ownerAddress);
```

#### useGameMutations (`src/hooks/game/useGameMutations.ts`)

Pure mutation functions for all game actions.

```typescript
interface GameMutations {
  // Actions
  moveCharacter: (direction: domain.Direction) => Promise<any>;
  attack: (targetIndex: number) => Promise<any>;
  sendChatMessage: (message: string) => Promise<any>;
  updateSessionKey: (endBlock: bigint) => Promise<any>;
  allocatePoints: (stats: StatAllocation) => Promise<any>;
  
  // States
  isMoving: boolean;
  isAttacking: boolean;
  isSendingChat: boolean;
  isUpdatingSessionKey: boolean;
  isAllocatingPoints: boolean;
  
  // Errors
  moveError: Error | null;
  attackError: Error | null;
  chatError: Error | null;
  sessionKeyError: Error | null;
  allocatePointsError: Error | null;
}

// Usage
const mutations = useGameMutations(characterId, ownerAddress);
```

### Layer 2: Business Logic Hooks

#### useSimplifiedGameState (`src/hooks/game/useSimplifiedGameState.ts`)

Unified interface that combines all game functionality.

```typescript
interface SimplifiedGameState {
  // Core Data
  character: domain.Character | null;
  characterId: string;
  worldSnapshot: domain.WorldSnapshot | null;
  position: { x: number; y: number; z: number };
  
  // Computed State
  isInCombat: boolean;
  balanceShortfall: bigint;
  
  // Session Management
  sessionKeyState: SessionKeyState;
  needsSessionKeyUpdate: boolean;
  
  // Loading States
  isLoading: boolean;
  isMoving: boolean;
  isAttacking: boolean;
  isSendingChat: boolean;
  
  // Wallet State
  hasWallet: boolean;
  connectWallet: () => void;
  
  // Actions (async functions)
  moveCharacter: (direction: domain.Direction) => Promise<any>;
  attack: (targetIndex: number) => Promise<any>;
  sendChatMessage: (message: string) => Promise<any>;
  updateSessionKey: () => Promise<any>;
  addOptimisticChatMessage: (message: string) => void;
  
  // Error States
  error: Error | null;
}

// Usage - Drop-in replacement for old useGameState
const game = useSimplifiedGameState();
```

#### useGameData (`src/hooks/game/useGameData.ts`)

Contract data transformations and business logic.

```typescript
interface GameDataOptions {
  includeHistory?: boolean;      // default: true
  includeSessionKey?: boolean;   // default: true
}

// Usage for specific data needs
const gameData = useGameData({ includeHistory: false });
```

#### useGameActions (`src/hooks/game/useGameActions.ts`)

Action coordination with optimistic updates.

```typescript
interface GameActionsOptions {
  includeWallet?: boolean;  // default: true
  readOnly?: boolean;       // default: false
}

// Usage for action-only components
const actions = useGameActions({ readOnly: true });
```

### Data Caching (`src/hooks/game/useCachedDataFeed.ts`)

Efficient caching system for blockchain data with automatic invalidation.

```typescript
interface CachedDataFeed {
  data: domain.WorldSnapshot | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  lastFetched: Date | null;
  
  // Manual cache control
  invalidateCache: () => void;
  refetch: () => Promise<void>;
}

// Usage
const { data, isLoading, invalidateCache } = useCachedDataFeed({
  enabled: true,
  refetchInterval: 500, // 500ms polling
});
```

### Ability System (`src/hooks/game/useAbilityCooldowns.ts`)

Manages ability cooldowns and state.

```typescript
interface AbilityCooldown {
  ability: AbilityType;
  blocksRemaining: number;
  isReady: boolean;
  isCharging: boolean;
  isActive: boolean;
  estimatedTimeRemaining: number; // milliseconds
}

interface AbilityCooldowns {
  cooldowns: Record<AbilityType, AbilityCooldown>;
  canUseAbility: (ability: AbilityType) => boolean;
  getTimeRemaining: (ability: AbilityType) => number;
  isAnyAbilityActive: boolean;
}

// Usage
const abilities = useAbilityCooldowns(character);
const canUseShieldBash = abilities.canUseAbility('ShieldBash');
```

## 🎨 Component Architecture

### Game Components (`src/components/game/`)

#### GameContainer (`src/components/game/GameContainer.tsx`)

Main game interface container component.

```typescript
interface GameContainerProps {
  character: domain.Character;
  position: { x: number; y: number; z: number };
  gameState: domain.WorldSnapshot | null;
  moveCharacter: (direction: domain.Direction) => Promise<void>;
  attack: (targetIndex: number) => Promise<void>;
  sendChatMessage: (message: string) => Promise<void>;
  isMoving: boolean;
  isAttacking: boolean;
  isSendingChat: boolean;
  isInCombat: boolean;
  addOptimisticChatMessage: (message: string) => void;
  isCacheLoading: boolean;
  equipableWeaponIDs?: number[];
  equipableWeaponNames?: string[];
  equipableArmorIDs?: number[];
  equipableArmorNames?: string[];
}
```

#### Movement Controls (`src/components/game/controls/MovementControls.tsx`)

```typescript
interface MovementControlsProps {
  onMove: (direction: domain.Direction) => Promise<void>;
  isMoving: boolean;
  isInCombat: boolean;
  currentPosition: { x: number; y: number; z: number };
}

// Directional movement with visual feedback
function MovementControls({ onMove, isMoving, isInCombat }: MovementControlsProps) {
  // Implementation handles all 6 directions: North, South, East, West, Up, Down
}
```

#### Ability Controls (`src/components/game/controls/AbilityControls.tsx`)

```typescript
interface AbilityControlsProps {
  character: domain.Character;
  onUseAbility: (ability: AbilityType) => Promise<void>;
  isUsingAbility: boolean;
}

// Renders ability buttons with cooldown timers and state indicators
```

### UI Components (`src/components/ui/`)

#### GameButton (`src/components/ui/GameButton.tsx`)

Standardized button component with game styling.

```typescript
interface GameButtonProps extends ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  loadingText?: string;
}
```

#### HealthBar (`src/components/game/ui/HealthBar.tsx`)

```typescript
interface HealthBarProps {
  currentHealth: number;
  maxHealth: number;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'red' | 'green' | 'blue';
}
```

## 📊 Type Definitions

### Domain Types (`src/types/domain/`)

Core business logic types independent of contract structure.

```typescript
// character.ts
export interface Character {
  id: string;
  name: string;
  level: number;
  class: CharacterClass;
  stats: CharacterStats;
  health: {
    current: number;
    max: number;
    regeneration: number;
  };
  equipment: {
    weapon: Equipment | null;
    armor: Equipment | null;
  };
  abilities: AbilityType[];
  statusEffects: StatusEffect[];
  isDead: boolean;
}

export interface CharacterStats {
  strength: number;
  vitality: number;
  dexterity: number;
  quickness: number;
  sturdiness: number;
  luck: number;
}

export type CharacterClass = 'Warrior' | 'Rogue' | 'Monk' | 'Sorcerer' | 'Bard';
export type AbilityType = 'ShieldBash' | 'ShieldWall' | 'EvasiveManeuvers' | 'ApplyPoison' | 'Pray' | 'Smite' | 'ChargeUp' | 'Fireball' | 'SingSong' | 'DoDance';
```

```typescript
// worldSnapshot.ts
export interface WorldSnapshot {
  currentBlock: number;
  areas: Record<string, AreaData>;
  characters: Record<string, Character>;
  monsters: Record<string, Monster>;
  combatEvents: CombatEvent[];
  chatMessages: ChatMessage[];
  timestamp: Date;
}

export interface AreaData {
  id: string;
  coordinates: { x: number; y: number; z: number };
  occupants: string[]; // character/monster IDs
  events: GameEvent[];
}
```

### Contract Types (`src/types/contract/`)

Raw blockchain response types.

```typescript
// BattleNads.ts
export interface ContractCharacter {
  id: string;
  name: string;
  level: bigint;
  class: number;
  stats: [bigint, bigint, bigint, bigint, bigint, bigint]; // [str, vit, dex, qui, stu, luc]
  health: {
    current: bigint;
    max: bigint;
  };
  // ... other contract-specific fields
}
```

## 🔄 Data Flow

### Contract → Domain → UI Pipeline

```typescript
// 1. Raw contract data
const contractData = await client.pollFrontendData();

// 2. Transform to domain objects
const worldSnapshot = BattleNadsAdapter.adaptWorldSnapshot(contractData);

// 3. Transform to UI-ready data
const uiSnapshot = domainToUi.transformWorldSnapshot(worldSnapshot);

// 4. Render in components
<GameView snapshot={uiSnapshot} />
```

### Mappers (`src/mappers/`)

```typescript
// contractToDomain.ts
export function adaptCharacter(contract: ContractCharacter): domain.Character {
  return {
    id: contract.id,
    name: contract.name,
    level: Number(contract.level),
    class: CONTRACT_CLASS_MAP[contract.class],
    stats: {
      strength: Number(contract.stats[0]),
      vitality: Number(contract.stats[1]),
      dexterity: Number(contract.stats[2]),
      quickness: Number(contract.stats[3]),
      sturdiness: Number(contract.stats[4]),
      luck: Number(contract.stats[5]),
    },
    // ... transform other fields
  };
}

// domainToUi.ts
export function transformCharacter(character: domain.Character): ui.CharacterDisplayData {
  return {
    ...character,
    healthPercentage: (character.health.current / character.health.max) * 100,
    levelProgress: calculateLevelProgress(character.level),
    displayName: formatCharacterName(character.name, character.level),
    // ... add UI-specific computed fields
  };
}
```

## 🔧 Utility Functions

### Block Utilities (`src/utils/blockUtils.ts`)

```typescript
export function blocksToMs(blocks: number): number {
  return blocks * BLOCK_TIME_MS; // 500ms per block
}

export function msToBlocks(ms: number): number {
  return Math.ceil(ms / BLOCK_TIME_MS);
}

export function getCurrentBlock(): number {
  // Implementation depends on blockchain polling
}
```

### Area ID Utilities (`src/utils/areaId.ts`)

```typescript
export function generateAreaId(x: number, y: number, z: number): string {
  return `${x}-${y}-${z}`;
}

export function parseAreaId(areaId: string): { x: number; y: number; z: number } {
  const [x, y, z] = areaId.split('-').map(Number);
  return { x, y, z };
}
```

### Event Filtering (`src/utils/eventFiltering.ts`)

```typescript
export function filterEventsByCharacter(events: GameEvent[], characterId: string): GameEvent[] {
  return events.filter(event => 
    event.participants.includes(characterId) ||
    event.target === characterId ||
    event.source === characterId
  );
}

export function filterEventsByArea(events: GameEvent[], areaId: string): GameEvent[] {
  return events.filter(event => event.areaId === areaId);
}
```

## 🎯 Testing

### Component Testing

```typescript
// Example: AbilityButton.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { AbilityButton } from '../AbilityButton';

describe('AbilityButton', () => {
  it('shows cooldown timer when ability is on cooldown', () => {
    render(
      <AbilityButton
        ability="ShieldBash"
        cooldown={{ blocksRemaining: 10, isReady: false }}
        onUse={jest.fn()}
      />
    );
    
    expect(screen.getByText(/10 blocks/)).toBeInTheDocument();
  });
});
```

### Hook Testing

```typescript
// Example: useAbilityCooldowns.test.tsx
import { renderHook } from '@testing-library/react';
import { useAbilityCooldowns } from '../useAbilityCooldowns';

describe('useAbilityCooldowns', () => {
  it('calculates cooldowns correctly', () => {
    const mockCharacter = createMockCharacter();
    const { result } = renderHook(() => useAbilityCooldowns(mockCharacter));
    
    expect(result.current.canUseAbility('ShieldBash')).toBe(true);
  });
});
```

## 🔄 State Management Patterns

## 🔐 Session Key Management

### useSessionKey (`src/hooks/session/useSessionKey.ts`)

Optimized session key management with consolidated validation logic.

```typescript
interface SessionKeyState {
  IDLE = 'idle';
  VALID = 'valid';
  EXPIRED = 'expired';
  MISMATCHED = 'mismatched';
  MISSING = 'missing';
}

interface SessionKeyData {
  owner: string;
  key: string;
  balance: string;
  targetBalance: string;
  ownerCommittedAmount: string;
  ownerCommittedShares: string;
  expiry: string;
}

interface SessionKeyHookResult {
  sessionKeyData: SessionKeyData | undefined;
  sessionKeyState: SessionKeyState;
  needsUpdate: boolean;
  isLoading: boolean;
  error: Error | null;
  refreshSessionKey: () => void;
}

// Usage
const sessionKey = useSessionKey(characterId);

// Check if session key needs updating
if (sessionKey.needsUpdate) {
  // Show session key prompt or auto-update
}
```

### useSessionFunding (`src/hooks/session/useSessionFunding.ts`)

Session balance management and funding.

```typescript
interface SessionFundingResult {
  balanceShortfall: bigint | undefined;
  canReplenish: boolean;
  replenishBalance: (amount: bigint) => void;
  deactivateSessionKey: () => void;
  isReplenishing: boolean;
  isDeactivating: boolean;
  replenishError: Error | null;
  deactivateError: Error | null;
}

// Usage
const funding = useSessionFunding(characterId);

// Check if funding is needed
if (funding.balanceShortfall && funding.balanceShortfall > 0n) {
  await funding.replenishBalance(funding.balanceShortfall);
}
```

### Session Key Validation Utility

Consolidated validation logic replacing XState machine.

```typescript
// src/utils/sessionKeyValidation.ts
export const validateSessionKey = (
  sessionKeyData: SessionKeyData | undefined,
  ownerAddress: string,
  embeddedWalletAddress: string,
  currentBlock: number
): SessionKeyValidation => {
  // Validates:
  // 1. Session key exists and not zero address
  // 2. Owner matches
  // 3. Key matches embedded wallet
  // 4. Not expired
  
  return {
    state: SessionKeyState.VALID, // or MISSING, EXPIRED, MISMATCHED
    message?: string,
    data?: SessionKeyData
  };
};

// Simplified version for contract-only data
export const validateSessionKeyData = (
  sessionKeyData: SessionKeyData | undefined,
  ownerAddress: string, 
  currentBlock: number
): SessionKeyValidation => {
  // Used by BattleNadsClient for contract-level validation
};
```

### React Query Integration

```typescript
// Caching strategy for blockchain data
export function useGameQuery(characterId: string) {
  return useQuery({
    queryKey: ['game', characterId],
    queryFn: () => pollGameData(characterId),
    refetchInterval: 500, // 500ms polling
    staleTime: 400, // Consider stale after 400ms
    gcTime: 5000, // Garbage collect after 5 seconds
  });
}
```

## 🚀 Migration & Usage Examples

### Migrating from Old useGameState

The new `useSimplifiedGameState` is a drop-in replacement for the old monolithic `useGameState` hook:

```typescript
// Before (old architecture)
const game = useGameState();

// After (new 2-layer architecture) - same interface!
const game = useSimplifiedGameState();

// All existing code continues to work:
const handleMove = async (direction) => {
  await game.moveCharacter(direction);
};
```

### Using Individual Hooks for Performance

For components that only need specific functionality:

```typescript
// Data-only component (no actions needed)
function CharacterDisplay() {
  const gameData = useGameData({ includeHistory: false });
  
  return (
    <div>
      <h3>{gameData.character?.name}</h3>
      <p>Health: {gameData.character?.health}</p>
    </div>
  );
}

// Action-only component (no game data needed)
function MovementControls() {
  const actions = useGameActions({ readOnly: false });
  
  return (
    <div>
      <button onClick={() => actions.moveCharacter('North')}>
        Move North
      </button>
    </div>
  );
}
```

### Layer 1 Usage for Maximum Performance

For high-performance components that need direct contract access:

```typescript
function RawContractDisplay() {
  const { data, isLoading } = useContractPolling(ownerAddress);
  const mutations = useGameMutations(characterId, ownerAddress);
  
  // Direct access to contract data without transformations
  const rawCharacter = data?.character;
  
  return (
    <div>
      {isLoading ? 'Loading...' : (
        <pre>{JSON.stringify(rawCharacter, null, 2)}</pre>
      )}
      <button onClick={() => mutations.moveCharacter('North')}>
        Raw Move
      </button>
    </div>
  );
}
```

## 📋 Development Guidelines

### Code Style

- **TypeScript**: Strict mode enabled, explicit types preferred
- **Components**: Functional components with hooks
- **Props**: Interface definitions for all component props
- **Error Handling**: Comprehensive error boundaries and try/catch blocks
- **Performance**: Memo and useMemo for expensive computations

### Blockchain Integration

- **Error Handling**: Always handle contract interaction failures
- **Loading States**: Show loading indicators for async operations
- **Optimistic Updates**: Update UI immediately, rollback on failure
- **Gas Management**: Estimate gas costs and handle insufficient funds

### Testing Requirements

- **Unit Tests**: All utility functions and hooks
- **Component Tests**: Critical UI components
- **Integration Tests**: Key user workflows
- **Mock Data**: Comprehensive test fixtures for contract responses

---

This API reference provides the foundation for understanding and contributing to the Battle Nads frontend codebase. For specific implementation details, refer to the source code and inline documentation.