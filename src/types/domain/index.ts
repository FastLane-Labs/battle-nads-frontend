// Re-export all domain types
export * from './enums';
export * from './character';
export * from './combat';
export * from './session';

// Fix circular references in WorldSnapshot
import { Character, CharacterLite } from './character';
import { MovementOptions, EventMessage, ChatMessage } from './combat';
import { WorldSnapshot as BaseWorldSnapshot } from './session';

// Create a properly typed WorldSnapshot
export interface WorldSnapshot extends Omit<BaseWorldSnapshot, 
  'character' | 'combatants' | 'noncombatants' | 'movementOptions' | 'eventLogs' | 'chatLogs'> {
  character: Character | null;
  combatants: CharacterLite[];
  noncombatants: CharacterLite[];
  movementOptions: MovementOptions;
  eventLogs: EventMessage[];
  chatLogs: ChatMessage[];
} 