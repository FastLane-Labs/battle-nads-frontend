/**
 * Contract types for backward compatibility
 * 
 * This file exists primarily to maintain backward compatibility with existing code.
 * For new code, import directly from 'types/index.ts'
 */

// Basic transaction options interface
export interface TransactionOptions {
  gasLimit?: number | bigint;
  value?: bigint;
  gasPrice?: bigint;
  nonce?: number;
}

// Legacy contract namespace for backward compatibility
import * as EntrypointTypes from './contracts/BattleNadsEntrypoint';
export { EntrypointTypes }; 