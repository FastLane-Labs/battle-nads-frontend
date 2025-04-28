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
import { contract, ui } from '@/types';

/**
 * Maps contract data directly to UI game state
 */
export function contractToGameState(
  data: contract.PollFrontendDataReturn,
  owner: string | null = null,
  prevState?: ui.GameState
): ui.GameState {
  const snapshot = contractToWorldSnapshot(data, owner);
  return worldSnapshotToGameState(snapshot, prevState);
}