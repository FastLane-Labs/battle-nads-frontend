import * as ethers from 'ethers';
import { SessionKeyData, PollResponse } from './gameTypes';

// Define transaction options type
export interface TransactionOptions {
  gasLimit?: number | bigint;
  value?: ethers.BigNumberish;
  gasPrice?: ethers.BigNumberish;
  nonce?: number;
}

// Define a type for our contract with the specific methods we need
export type BattleNadsContract = ethers.Contract & {
  
  // Character methods
  createCharacter: (
    name: string, 
    strength: bigint, 
    vitality: bigint, 
    dexterity: bigint, 
    quickness: bigint, 
    sturdiness: bigint, 
    luck: bigint, 
    sessionKey: string, 
    sessionKeyDeadline: bigint, 
    options?: TransactionOptions
  ) => Promise<ethers.TransactionResponse>;
  
  // Cashier methods
  updateSessionKey: (
    sessionKey: string, 
    sessionKeyDeadline: bigint, 
    options?: TransactionOptions
  ) => Promise<ethers.TransactionResponse>;
  
  replenishGasBalance: (options?: TransactionOptions) => Promise<ethers.TransactionResponse>;
  
  deactivateSessionKey: (sessionKeyAddress: string, options?: TransactionOptions) => Promise<ethers.TransactionResponse>;
  
  // Getter methods
  getCurrentSessionKeyData: (owner: string) => Promise<SessionKeyData>;
  
  getPlayerCharacterID: (address: string) => Promise<string>;
  
  // Poll function to get all frontend data including balances in one call
  pollForFrontendData: (
    owner: string, 
    startBlock: number
  ) => Promise<PollResponse>;
  
  // Estimation methods
  estimateBuyInAmountInMON: () => Promise<ethers.BigNumberish>;
  shortfallToRecommendedBalanceInMON: (characterId: string) => Promise<ethers.BigNumberish>;
}; 