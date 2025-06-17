/**
 * Wallet and balance-related configuration
 * Contains settings for thresholds, funding amounts, and other wallet-related constants
 */

// Session key balance thresholds
export const LOW_SESSION_KEY_THRESHOLD = 0.16; // Show direct funding button when balance is below 0.16 MON

// Funding amounts
export const DIRECT_FUNDING_AMOUNT = "0.5"; // Default amount for direct funding to session key
export const MIN_SAFE_OWNER_BALANCE = "0.001"; // Minimum amount to leave in owner wallet when replenishing

// Status update intervals
export const BALANCE_REFRESH_INTERVAL = 30000; // 30 seconds - interval for refreshing wallet balances 