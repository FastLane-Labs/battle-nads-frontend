/**
 * Global configuration for the Battle Nads application
 */

// Contract addresses
export const ENTRYPOINT_ADDRESS = process.env.NEXT_PUBLIC_ENTRYPOINT_ADDRESS || "0x1E85b64E23Cf13b305b4c056438DD5242d93BB76";

// RPC URLs
export const PRIMARY_RPC_URL = "https://rpc-testnet.monadinfra.com/rpc/Dp2u0HD0WxKQEvgmaiT4dwCeH9J14C24";
export const FALLBACK_RPC_URL = "https://monad-testnet-rpc.dwellir.com";
export const RPC_URL = process.env.NEXT_PUBLIC_MONAD_RPC_URL || PRIMARY_RPC_URL;

// Local storage keys
export const STORAGE_KEY_PREFIX = "battleNadsCharacterId";
export const LEGACY_CHARACTER_KEY = "battleNadsCharacterId";
export const LAST_KNOWN_OWNER_KEY = "lastKnownOwnerAddress"; 