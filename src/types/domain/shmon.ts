/**
 * Domain types for ShMON (shared MONAD) operations
 */

/**
 * Configuration for automatic top-up behavior
 */
export interface TopUpConfig {
  /** Policy ID for the bonding configuration */
  policyId: bigint;
  /** Minimum bonded balance to maintain */
  minBondedBalance: bigint;
  /** Maximum amount that can be topped up per period */
  maxTopUpPerPeriod: bigint;
  /** Duration of each top-up period */
  topUpPeriodDuration: bigint;
}

/**
 * Balance information for ShMON tokens
 */
export interface ShMonBalances {
  /** Bonded (committed) ShMON balance */
  bondedBalance: bigint;
  /** Unbonded (liquid) ShMON balance */
  unbondedBalance: bigint;
  /** Total ShMON balance (bonded + unbonded) */
  totalBalance: bigint;
}

/**
 * Replenishment options for balance top-up
 */
export interface ReplenishmentOptions {
  /** Use minimal amount (just cover shortfall) */
  useMinimalAmount: boolean;
  /** Target amount to replenish to */
  targetAmount: bigint;
  /** Source of funds (owner wallet or ShMON) */
  fundingSource: 'owner' | 'shmon';
}

/**
 * Result of a top-up configuration operation
 */
export interface TopUpConfigResult {
  /** Whether the configuration was successful */
  success: boolean;
  /** Transaction hash if successful */
  transactionHash?: string;
  /** Error message if failed */
  error?: string;
  /** Configured top-up amount per day */
  dailyTopUpAmount?: bigint;
}