/**
 * Centralized environment configuration
 * All environment variables and constants should be accessed from this file
 */ 

// Contract addresses
export const ENTRYPOINT_ADDRESS =
  process.env.NEXT_PUBLIC_ENTRYPOINT_ADDRESS ||
  "0xA6Bc6bBc4e670203E3C941ab2b9a27B7973E9e70";

export const SHMONAD_ADDRESS =
  process.env.NEXT_SHMONAD_ADDRESS ||
  "0x3a98250F98Dd388C211206983453837C8365BDc1"; 

export const POLICY_ID = process.env.NEXT_PUBLIC_POLICY_ID || 58;


// RPC URLs - WebSocket and HTTP fallback
export const RPC_URLS = {
  // WebSocket URL for real-time connection (port 443 confirmed working)
  PRIMARY_WS:
    process.env.NEXT_PUBLIC_MONAD_WS_URL ||
    "wss://rpc-testnet.monadinfra.com/rpc/Dp2u0HD0WxKQEvgmaiT4dwCeH9J14C24",

  // HTTP URLs for fallback
  PRIMARY_HTTP:
    process.env.NEXT_PUBLIC_MONAD_RPC_URL ||
    "https://rpc-testnet.monadinfra.com/rpc/Dp2u0HD0WxKQEvgmaiT4dwCeH9J14C24",
  FALLBACK_HTTP: "https://monad-testnet-rpc.dwellir.com",
};

export const RPC =
  process.env.NEXT_PUBLIC_DEFAULT_RPC_URL || RPC_URLS.PRIMARY_HTTP;

// Polling settings
export const POLL_INTERVAL = 500; // 500ms - back to frequent polling with fresh data

// Chain settings
export const CHAIN_ID = parseInt(
  process.env.NEXT_PUBLIC_CHAIN_ID || "10143",
  10
);

// Feature flags
export const ENABLE_WEBSOCKET =
  process.env.NEXT_PUBLIC_ENABLE_WEBSOCKET === "true"; // Default: false

// Game constants
export const MAX_PLAYER_LEVEL = 100;
export const MAX_SESSION_KEY_VALIDITY_BLOCKS = 10_000; // About 1.5 hours at 0.5s blocks (24*60*60 / 0.5)
// export const MAX_SESSION_KEY_VALIDITY_BLOCKS = 172800; // About 24 hours at 0.5s blocks (24*60*60 / 0.5)

// External URLs
export const SHMONAD_WEBSITE_URL = "https://shmonad.xyz/";

// Gas limits for different actions (adjust based on network and contract complexity)
