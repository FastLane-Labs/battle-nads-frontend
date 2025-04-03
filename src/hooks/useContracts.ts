import { useMemo, useState, useEffect } from 'react';
import * as ethers from 'ethers';
import { useWallet } from '../providers/WalletProvider';
import ENTRYPOINT_ABI from '../abis/battleNads.json';
import { BattleNad, AreaInfo, MovementOptions, GameState } from '../types/gameTypes';

// Define transaction options type
export interface TransactionOptions {
  gasLimit?: number | bigint;
  value?: ethers.BigNumberish;
  gasPrice?: ethers.BigNumberish;
  nonce?: number;
}

// Use environment variables for contract addresses and RPC URLs
const ENTRYPOINT_ADDRESS = process.env.NEXT_PUBLIC_ENTRYPOINT_ADDRESS || "0xbD4511F188B606e5a74A62b7b0F516d0139d76D5";

// Primary and fallback RPC URLs
const PRIMARY_RPC_URL = "https://rpc-testnet.monadinfra.com/rpc/Dp2u0HD0WxKQEvgmaiT4dwCeH9J14C24";
const FALLBACK_RPC_URL = "https://monad-testnet-rpc.dwellir.com";
const RPC_URL = process.env.NEXT_PUBLIC_MONAD_RPC_URL || PRIMARY_RPC_URL;

// Define a type for our contract with the specific methods we need
export type BattleNadsContract = ethers.Contract & {
  // Movement methods
  moveNorth: (characterId: string, options?: TransactionOptions) => Promise<ethers.TransactionResponse>;
  moveSouth: (characterId: string, options?: TransactionOptions) => Promise<ethers.TransactionResponse>;
  moveEast: (characterId: string, options?: TransactionOptions) => Promise<ethers.TransactionResponse>;
  moveWest: (characterId: string, options?: TransactionOptions) => Promise<ethers.TransactionResponse>;
  moveUp: (characterId: string, options?: TransactionOptions) => Promise<ethers.TransactionResponse>;
  moveDown: (characterId: string, options?: TransactionOptions) => Promise<ethers.TransactionResponse>;
  
  // Combat methods
  attack: (characterId: string, targetIndex: number, options?: TransactionOptions) => Promise<ethers.TransactionResponse>;
  
  // Equipment methods
  equipWeapon: (characterId: string, weaponId: number, options?: TransactionOptions) => Promise<ethers.TransactionResponse>;
  equipArmor: (characterId: string, armorId: number, options?: TransactionOptions) => Promise<ethers.TransactionResponse>;
  
  // Character methods
  createCharacter: (
    name: string, 
    strength: number, 
    vitality: number, 
    dexterity: number, 
    quickness: number, 
    sturdiness: number, 
    luck: number, 
    sessionKey: string, 
    sessionKeyDeadline: string, 
    options?: TransactionOptions
  ) => Promise<ethers.TransactionResponse>;
  
  allocatePoints: (
    characterId: string,
    strength: number,
    vitality: number,
    dexterity: number,
    quickness: number,
    sturdiness: number,
    luck: number,
    options?: TransactionOptions
  ) => Promise<ethers.TransactionResponse>;
  
  // Session key methods
  updateSessionKey: (
    sessionKey: string, 
    sessionKeyDeadline: string, 
    options?: TransactionOptions
  ) => Promise<ethers.TransactionResponse>;
  
  replenishGasBalance: (options?: TransactionOptions) => Promise<ethers.TransactionResponse>;
  
  // Tuple type for session key return
  getCurrentSessionKey: (characterId: string) => Promise<{ key: string; expiration: number } | [string, number]>;
  
  // Query methods with defined return types
  getBattleNad: (characterId: string) => Promise<any>; // Raw data for BattleNad, will be converted by utils
  getBattleNadsInArea: (depth: number, x: number, y: number) => Promise<any[]>; // Raw data for BattleNad[], will be converted by utils
  getPlayerCharacterIDs: (address: string) => Promise<string[]>;
  
  getAreaInfo: (depth: number, x: number, y: number) => Promise<{
    area: any; // Raw data for AreaInfo, will be converted by utils
    playerCount: number;
    monsterCount: number;
    avgPlayerLevel: number;
    avgMonsterLevel: number;
  }>;
  
  getAreaCombatState: (characterId: string) => Promise<{
    inCombat: boolean;
    combatantCount: number;
    enemies: any[]; // Raw data for BattleNad[], will be converted by utils
    targetIndex: number;
  }>;
  
  getMovementOptions: (characterId: string) => Promise<MovementOptions>;
  
  getAttackOptions: (characterId: string) => Promise<{
    canAttack: boolean;
    targets: string[];
    targetIndexes: number[];
  }>;
  
  // Key comprehensive function that gets all frontend data in one call
  getFrontendData: (characterId: string) => Promise<{
    character: any; // Raw data for BattleNad
    combatants: any[]; // Raw data for BattleNad[]
    noncombatants: any[]; // Raw data for BattleNad[]
    miniMap: any[][]; // Raw data for area grid
    equipableWeaponIDs: number[];
    equipableWeaponNames: string[];
    equipableArmorIDs: number[];
    equipableArmorNames: string[];
    unallocatedAttributePoints: number;
  }>;
  
  // Estimation methods
  estimateBuyInAmountInMON: () => Promise<ethers.BigNumberish>;
  shortfallToRecommendedBalanceInMON: (characterId: string) => Promise<ethers.BigNumberish>;
  shortfallToRecommendedBalanceInShMON: (characterId: string) => Promise<ethers.BigNumberish>;
};

export const useContracts = () => {
  const { injectedWallet, embeddedWallet } = useWallet();
  const [error, setError] = useState<string | null>(null);

  // Create a read-only provider that falls back to RPC if needed
  const readOnlyProvider = useMemo(() => {
    console.log('[useContracts] Creating read-only provider');
    try {
      // Try to use an existing wallet provider first to save RPC costs
      if (injectedWallet?.provider) {
        console.log('[useContracts] Using injected wallet provider for reads');
        return injectedWallet.provider;
      }
      
      if (embeddedWallet?.provider) {
        console.log('[useContracts] Using embedded wallet provider for reads');
        return embeddedWallet.provider;
      }
      
      // Fallback to a JsonRpcProvider
      console.log('[useContracts] Creating new JsonRpcProvider with RPC URL');
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      
      // Add error handler
      provider.on("error", (error) => {
        console.error(`[useContracts] Provider error:`, error);
        setError("Provider connection error. Please check your network connection.");
      });
      
      return provider;
    } catch (error) {
      console.error('[useContracts] Failed to create provider:', error);
      setError(`Provider creation failed: ${(error as Error)?.message || "Unknown error"}`);
      
      // Return a fallback provider
      return new ethers.JsonRpcProvider(FALLBACK_RPC_URL);
    }
  }, [injectedWallet?.provider, embeddedWallet?.provider]);

  // Contract with read-only provider - for query operations
  const readContract = useMemo(() => {
    console.log('[useContracts] Creating read-only contract');
    try {
      return new ethers.Contract(
        ENTRYPOINT_ADDRESS,
        ENTRYPOINT_ABI,
        readOnlyProvider
      ) as BattleNadsContract;
    } catch (error) {
      console.error('[useContracts] Failed to create read contract:', error);
      setError(`Read contract creation failed: ${(error as Error)?.message || "Unknown error"}`);
      return null;
    }
  }, [readOnlyProvider]);

  // Contract with injected wallet - for owner operations (character creation, session key)
  const injectedContract = useMemo(() => {
    console.log('[useContracts] Creating injected wallet contract');
    if (!injectedWallet?.signer) {
      console.log('[useContracts] No injected wallet signer available');
      return null;
    }
    
    try {
      return new ethers.Contract(
        ENTRYPOINT_ADDRESS,
        ENTRYPOINT_ABI,
        injectedWallet.signer
      ) as BattleNadsContract;
    } catch (error) {
      console.error('[useContracts] Failed to create injected contract:', error);
      setError(`Injected contract creation failed: ${(error as Error)?.message || "Unknown error"}`);
      return null;
    }
  }, [injectedWallet?.signer]);

  // Contract with embedded wallet - for session key operations (movement, combat)
  const embeddedContract = useMemo(() => {
    console.log('[useContracts] Creating embedded wallet contract');
    if (!embeddedWallet?.signer) {
      console.log('[useContracts] No embedded wallet signer available');
      return null;
    }
    
    try {
      return new ethers.Contract(
        ENTRYPOINT_ADDRESS,
        ENTRYPOINT_ABI,
        embeddedWallet.signer
      ) as BattleNadsContract;
    } catch (error) {
      console.error('[useContracts] Failed to create embedded contract:', error);
      setError(`Embedded contract creation failed: ${(error as Error)?.message || "Unknown error"}`);
      return null;
    }
  }, [embeddedWallet?.signer]);

  // Log changes to contract instances
  useEffect(() => {
    console.log('[useContracts] Contract instances updated:', {
      readContractAvailable: !!readContract,
      injectedContractAvailable: !!injectedContract,
      embeddedContractAvailable: !!embeddedContract
    });
  }, [readContract, injectedContract, embeddedContract]);

  return {
    readContract,
    injectedContract,
    embeddedContract,
    error
  };
}; 