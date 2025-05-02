/**
 * Mapper utility to convert domain types to UI types
 * This centralizes all transformation logic between the domain and UI layers
 */

import { domain, ui } from '@/types';
import { DEFAULT_SESSION_KEY_DATA } from '@/types/domain';

/**
 * Maps domain characters with added UI hostility markers
 */
export function mapCharactersWithHostility(
  characters: domain.CharacterLite[], 
  mainCharacter: domain.Character | null
): (domain.CharacterLite & { isHostile: boolean })[] {
  return characters.map(char => ({
    ...char,
    isHostile: false, // Default value, would be determined by game rules
  }));
}

/**
 * Maps a domain WorldSnapshot to a UI GameState
 */
export function worldSnapshotToGameState(
  snapshot: domain.WorldSnapshot,
  prevState?: ui.GameState
): ui.GameState {
  // Create default update flags
  const updates: ui.GameUpdates = {
    owner: true,
    character: true,
    sessionKey: true,
    others: Array(64).fill(true),
    position: true,
    combat: true,
    eventLogs: true,
    chatLogs: true,
    lastBlock: true,
    error: false
  };
  
  // If previous state exists, determine what changed
  if (prevState) {
    updates.owner = prevState.owner !== (snapshot.character?.owner ?? null);
    updates.character = JSON.stringify(prevState.character) !== JSON.stringify(snapshot.character);
    updates.sessionKey = JSON.stringify(prevState.sessionKey) !== JSON.stringify(snapshot.sessionKeyData);
    updates.position = (
      (prevState.position.x !== (snapshot.character?.position?.x ?? 0)) ||
      (prevState.position.y !== (snapshot.character?.position?.y ?? 0)) ||
      (prevState.position.depth !== (snapshot.character?.position?.depth ?? 0))
    );
    updates.eventLogs = prevState.eventLogs.length !== snapshot.eventLogs.length;
    updates.chatLogs = prevState.chatLogs.length !== snapshot.chatLogs.length;
    updates.lastBlock = prevState.lastBlock !== snapshot.lastBlock;
  }
  
  return {
    owner: snapshot.character?.owner ?? null,
    character: snapshot.character,
    others: [...(snapshot.combatants ?? []), ...(snapshot.noncombatants ?? [])],
    position: snapshot.character?.position ?? { x: 0, y: 0, depth: 0 },
    eventLogs: snapshot.eventLogs,
    chatLogs: snapshot.chatLogs,
    sessionKey: snapshot.sessionKeyData ?? DEFAULT_SESSION_KEY_DATA,
    lastBlock: snapshot.lastBlock,
    characterID: snapshot.characterID,
    combatants: snapshot.combatants || [],
    noncombatants: snapshot.noncombatants || [],
    equipableWeaponIDs: [], // Not in WorldSnapshot, would come from equipmentData
    equipableWeaponNames: [],
    equipableArmorIDs: [],
    equipableArmorNames: [],
    unallocatedAttributePoints: snapshot.unallocatedAttributePoints,
    balanceShortfall: snapshot.balanceShortfall,
    updates,
    loading: false,
    error: null
  };
}