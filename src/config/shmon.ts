/**
 * ShMON (shared MONAD) configuration
 * Contains settings for top-up, bonding, and gas replenishment
 */

// Top-up configuration
export const TOPUP_MULTIPLIER = 3; // Multiplier for shortfall calculation
export const SAFE_REPLENISH_MULTIPLIER = 2; // Additional multiplier for safe replenishment
export const MAX_TOPUP_DURATION_BLOCKS = 5760; // 60 min * 24 hours * 4 (assuming 15s blocks)

// Gas limits for ShMON operations
export const SHMON_GAS_LIMITS = {
  SET_MIN_BONDED_BALANCE: BigInt(400_000),
  BALANCE_OF: BigInt(400_000),
} as const;

// Top-up period configuration
export const DEFAULT_TOPUP_PERIOD_DURATION = BigInt(200_000); // Default period duration for automatic top-ups