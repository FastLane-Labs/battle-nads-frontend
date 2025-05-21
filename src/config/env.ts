/**
 * Centralized environment configuration
 * All environment variables and constants should be accessed from this file
 */

// Contract addresses
export const ENTRYPOINT_ADDRESS = process.env.NEXT_PUBLIC_ENTRYPOINT_ADDRESS || '0x965A23f7B69a116BD4E55C7715B93d6B50FC473E'; // Policy 20

// old version `0x965A23f7B69a116BD4E55C7715B93d6B50FC473E` Policy 19
// old version `0xA0ea5C5C7959C45501E5F2E46e84DBD117921a39` Policy 18
// old version `0xc77a04D8f748bEd418Fa8515F822cCF2B427fbaF` Policy 17

// RPC URLs
export const RPC_URLS = {
  PRIMARY: process.env.NEXT_PUBLIC_MONAD_RPC_URL || 'https://rpc-testnet.monadinfra.com/rpc/Dp2u0HD0WxKQEvgmaiT4dwCeH9J14C24',
  FALLBACK: 'https://monad-testnet-rpc.dwellir.com',
};

export const RPC = process.env.NEXT_PUBLIC_DEFAULT_RPC_URL || RPC_URLS.PRIMARY;

// Polling settings
export const POLL_INTERVAL = 3000; // 3 seconds

// Chain settings
export const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '10143', 10143);

// Game constants
export const MAX_PLAYER_LEVEL = 100;
export const INITIAL_SNAPSHOT_LOOKBACK_BLOCKS = 1200; // ~10-20 minutes depending on block time, used as fallback for initial UI snapshot fetch
export const MAX_SESSION_KEY_VALIDITY_BLOCKS = 172800; // About 24 hours at 0.5s blocks (24*60*60 / 0.5)

// Gas limits for different actions (adjust based on network and contract complexity) 