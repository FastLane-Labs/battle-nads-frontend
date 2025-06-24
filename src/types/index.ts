/**
 * Type index for Battle Nads
 * 
 * This file organizes all types by their domain/purpose:
 * 
 * 1. contract - Raw blockchain data types (direct Solidity mappings)
 * 2. domain - Game logic types (business logic, independent of UI)
 * 3. ui - UI-specific types (React components, visual state)
 */

// Re-export namespaces for each layer
export * as contract from './contract';
export * as domain from './domain';
export * as ui from './ui';

// Optional: For backward compatibility, re-export some types directly
// This can be useful during transition, but should be removed eventually
export {
  CharacterClass,
  Direction,
  StatusEffect,
  Ability,
  LogType,
} from './domain';

