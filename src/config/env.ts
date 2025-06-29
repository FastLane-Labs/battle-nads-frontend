/**
 * Centralized environment configuration
 * All environment variables and constants should be accessed from this file
 */

// Contract addresses
export const ENTRYPOINT_ADDRESS = process.env.NEXT_PUBLIC_ENTRYPOINT_ADDRESS || '0x26ad265Ad3b6724417082F37a4E1ed6E79e54c17'; // Policy 34

//'0x6a5b12B54921d023d3537caa210dCfFEB2f4A253'; // Policy 30


// to many dead bodies 
// old version `0x0950Be4D3Fe3bd194a0ecCB526D3f3880ACE6fcd` Policy 21
// old version `0x3A384d7aB80A749650a20b3127A9322e49278204` Policy 20
// old version `0x965A23f7B69a116BD4E55C7715B93d6B50FC473E` Policy 19
// old version `0xA0ea5C5C7959C45501E5F2E46e84DBD117921a39` Policy 18
// old version `0xc77a04D8f748bEd418Fa8515F822cCF2B427fbaF` Policy 17

// RPC URLs - WebSocket and HTTP fallback
export const RPC_URLS = {
  // WebSocket URL for real-time connection (port 443 confirmed working)
  PRIMARY_WS: process.env.NEXT_PUBLIC_MONAD_WS_URL || 'wss://rpc-testnet.monadinfra.com/rpc/Dp2u0HD0WxKQEvgmaiT4dwCeH9J14C24',
  
  // HTTP URLs for fallback
  PRIMARY_HTTP: process.env.NEXT_PUBLIC_MONAD_RPC_URL || 'https://rpc-testnet.monadinfra.com/rpc/Dp2u0HD0WxKQEvgmaiT4dwCeH9J14C24',
  FALLBACK_HTTP: 'https://monad-testnet-rpc.dwellir.com',
};

export const RPC = process.env.NEXT_PUBLIC_DEFAULT_RPC_URL || RPC_URLS.PRIMARY_HTTP;

// Polling settings
export const POLL_INTERVAL = 500; // 500ms - back to frequent polling with fresh data

// Chain settings
export const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '10143', 10);

// Feature flags
export const ENABLE_WEBSOCKET = process.env.NEXT_PUBLIC_ENABLE_WEBSOCKET === 'true'; // Default: false

// Game constants
export const MAX_PLAYER_LEVEL = 100;
export const MAX_SESSION_KEY_VALIDITY_BLOCKS = 172800; // About 24 hours at 0.5s blocks (24*60*60 / 0.5)

// Gas limits for different actions (adjust based on network and contract complexity) 