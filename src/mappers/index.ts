/**
 * Barrel file for mappers
 * Provides convenient access to all mapper utilities
 */

// Re-export all contract-to-domain mappers
export * from './contractToDomain';

// Re-export all domain-to-ui mappers
export * from './domainToUi';

// Convenient composition functions for direct contract-to-ui mapping
import { contractToWorldSnapshot } from './contractToDomain';
import { worldSnapshotToGameState } from './domainToUi';
import { contract, domain, ui } from '../types';

/**
 * Maps contract data directly to UI game state
 * @deprecated Use mapPollDataToUi with PollFrontendDataRaw and then extract game state
 */
export function contractToGameState(
  data: contract.PollFrontendDataReturn,
  owner: string | null = null,
  prevState?: ui.GameState
): ui.GameState {
  const snapshot = contractToWorldSnapshot(data, owner);
  
  // Create default world snapshot if null
  if (!snapshot) {
    // Create a minimal valid WorldSnapshot
    const defaultSnapshot: domain.WorldSnapshot = {
      characterID: '',
      sessionKeyData: null,
      character: null,
      combatants: [],
      noncombatants: [],
      movementOptions: {
        canMoveNorth: false,
        canMoveSouth: false,
        canMoveEast: false,
        canMoveWest: false,
        canMoveUp: false,
        canMoveDown: false
      },
      eventLogs: [],
      chatLogs: [],
      balanceShortfall: 0,
      unallocatedAttributePoints: 0,
      lastBlock: 0
    };
    return worldSnapshotToGameState(defaultSnapshot, prevState);
  }
  
  return worldSnapshotToGameState(snapshot, prevState);
}