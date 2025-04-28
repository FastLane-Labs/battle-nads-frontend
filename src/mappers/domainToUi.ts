/**
 * Mapper utility to convert domain types to UI types
 * This centralizes all transformation logic between the domain and UI layers
 */

import { domain, ui } from '../types';

/**
 * Determines if a character is hostile based on domain logic
 */
function isHostile(character: domain.CharacterLite): boolean {
  // Simple rule - monsters are hostile, players are not
  // This would be expanded with actual game logic
  return character.class < 4; // Assuming classes below 4 are monsters
}

/**
 * Maps domain character lite array to UI character lite array with hostility flag
 */
export function mapCharactersWithHostility(
  characters: domain.CharacterLite[]
): (domain.CharacterLite & { isHostile: boolean })[] {
  return characters.map(character => ({
    ...character,
    isHostile: isHostile(character)
  }));
}

/**
 * Creates empty updates object for the UI
 */
function createEmptyUpdates(): ui.GameUpdates {
  return {
    owner: false,
    character: false,
    sessionKey: false,
    others: new Array(64).fill(false),
    position: false,
    combat: false,
    movementOptions: false,
    eventLogs: false,
    chatLogs: false,
    lastBlock: false,
    error: false
  };
}

/**
 * Maps domain world snapshot to UI game state
 */
export function worldSnapshotToGameState(
  snapshot: domain.WorldSnapshot,
  prevState?: ui.GameState
): ui.GameState {
  // Start with a base object
  const gameState: ui.GameState = {
    owner: null,
    character: snapshot.character,
    others: new Array(64).fill(null), // Initialize a 64-length array
    position: snapshot.character?.position || { x: 0, y: 0, depth: 0 },
    movementOptions: snapshot.movementOptions,
    eventLogs: snapshot.eventLogs,
    chatLogs: snapshot.chatLogs,
    sessionKey: snapshot.sessionKeyData,
    lastBlock: snapshot.lastBlock,
    characterID: snapshot.characterID,
    combatants: snapshot.combatants,
    noncombatants: snapshot.noncombatants,
    equipableWeaponIDs: [], // Placeholder
    equipableWeaponNames: [], // Placeholder
    equipableArmorIDs: [], // Placeholder
    equipableArmorNames: [], // Placeholder
    unallocatedAttributePoints: snapshot.unallocatedAttributePoints,
    balanceShortfall: snapshot.balanceShortfall,
    
    // UI-specific flags
    updates: createEmptyUpdates(),
    loading: false,
    error: null
  };
  
  // Initialize the 'others' array with all characters
  const allCharacters = [...snapshot.combatants, ...snapshot.noncombatants];
  allCharacters.forEach(character => {
    if (character.index >= 0 && character.index < 64) {
      gameState.others[character.index] = character;
    }
  });
  
  // Mark what was updated compared to the previous state
  if (prevState) {
    const updates = createEmptyUpdates();
    
    // Check for character updates
    updates.character = JSON.stringify(prevState.character) !== JSON.stringify(snapshot.character);
    
    // Check for position updates
    updates.position = JSON.stringify(prevState.position) !== JSON.stringify(gameState.position);
    
    // Check for movement options updates
    updates.movementOptions = JSON.stringify(prevState.movementOptions) !== JSON.stringify(snapshot.movementOptions);
    
    // Check for session key updates
    updates.sessionKey = JSON.stringify(prevState.sessionKey) !== JSON.stringify(snapshot.sessionKeyData);
    
    // Check for last block updates
    updates.lastBlock = prevState.lastBlock !== snapshot.lastBlock;
    
    // Add updates to the game state
    gameState.updates = updates;
  }
  
  return gameState;
} 