/**
 * Hook return type definitions for Battle Nads
 * 
 * These interfaces provide explicit typing for complex hook return values,
 * improving type safety and developer experience when consuming hooks.
 * 
 * Note: Some fields are typed as `any` due to current contract limitations:
 * - Raw contract data comes from array destructuring until contract provides proper return types
 * - Complex aggregated data structures where full typing would be overly complex
 * - These will be improved when the contract API is updated
 */

import { domain, contract } from '@/types';
import { GameActions } from '@/types/ui';
import { SessionKeyState } from '@/types/domain/session';

// Import AbilityStatus from the hook that defines it
import type { AbilityStatus } from '@/hooks/game/useAbilityCooldowns';

/**
 * Return type for useGameData hook
 * Provides comprehensive game state data with conditional properties based on options
 */
export interface UseGameDataReturn {
  // Core data
  worldSnapshot: domain.WorldSnapshot | null;
  gameState: domain.WorldSnapshot | null;
  
  // Raw contract data (from array destructuring - typed as any until contract provides proper return types)
  rawSessionKeyData: any; // Will be contract.SessionKeyData once contract provides typed returns
  rawEndBlock: bigint | undefined; // Already properly typed from contract
  balanceShortfall: bigint | undefined; // Already properly typed from contract
  
  // Character info  
  character: domain.Character | null;
  characterId: string | null;
  position: { x: number; y: number; depth: number } | null;
  
  // Session key data (conditional based on includeSessionKey option)
  sessionKeyData?: domain.SessionKeyData;
  sessionKeyState?: SessionKeyState;
  needsSessionKeyUpdate?: boolean;
  
  // Wallet info
  owner: string | null;
  
  // Chat and events
  addOptimisticChatMessage: (message: string) => void;
  chatLogs: domain.ChatMessage[];
  eventLogs: domain.EventMessage[];
  
  // Other characters (enemy combatants)
  others: domain.CharacterLite[];
  
  // Combat state
  isInCombat: boolean;
  
  // Loading states
  isLoading: boolean;
  isPollingLoading: boolean;
  isHistoryLoading: boolean;
  isCacheLoading: boolean;
  
  // Error states
  error: Error | null;
  
  // Equipment data (from array destructuring - typed as any until contract provides proper return types)
  rawEquipableWeaponIDs: any; // Will be number[] once contract provides typed returns
  rawEquipableWeaponNames: any; // Will be string[] once contract provides typed returns
  rawEquipableArmorIDs: any; // Will be number[] once contract provides typed returns
  rawEquipableArmorNames: any; // Will be string[] once contract provides typed returns
  
  // Historical data functions (conditional based on includeHistory option)
  getAllCharactersForOwner?: (owner: string) => Promise<any[]>; // Returns StoredCharacterMetadata[] - keeping any for simplicity
  getDataSummaryForOwner?: (owner: string) => any; // Complex aggregated data - keeping any for simplicity  
  historicalBlocks?: any[]; // Complex cached data - keeping any for simplicity
}

/**
 * Return type for useAbilityCooldowns hook
 * Provides ability management and cooldown tracking
 */
export interface UseAbilityCooldownsReturn {
  abilities: AbilityStatus[];
  useAbility: (abilityIndex: domain.Ability, targetIndex?: number) => void;
  isUsingAbility: boolean;
  abilityError: Error | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Return type for useGameActions hook
 * Provides game action functions with state management
 * Note: This should match the GameActions interface but is defined separately for explicit hook typing
 */
export interface UseGameActionsReturn extends GameActions {
  // Inherits all GameActions properties
}

/**
 * Return type for useSessionKey hook
 * Provides session key validation and management
 */
export interface UseSessionKeyReturn {
  // Raw data used for validation (from contract array destructuring)
  sessionKeyData: any; // Will be contract.SessionKeyData once contract provides typed returns
  isLoading: boolean;
  error: Error | null;
  refreshSessionKey: () => void;
  sessionKeyState: SessionKeyState;
  needsUpdate: boolean;
  currentBlock: number;
}

/**
 * Return type for useContractPolling hook
 * Provides raw contract data polling
 */
export interface UseContractPollingReturn {
  data: any; // Raw contract array data - will be contract.PollFrontendDataReturn once contract provides proper types
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Return type for useBattleNadsClient hook
 * Provides contract client instance
 */
export interface UseBattleNadsClientReturn {
  client: any | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Return type for useEquipment hook
 * Provides equipment management functionality
 */
export interface UseEquipmentReturn {
  weapons: domain.Weapon[];
  armors: domain.Armor[];
  equippedWeapon: domain.Weapon | null;
  equippedArmor: domain.Armor | null;
  equipWeapon: (weaponId: string) => Promise<void>;
  equipArmor: (armorId: string) => Promise<void>;
  isEquipping: boolean;
  equipError: Error | null;
}