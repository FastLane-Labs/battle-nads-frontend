import { useMemo, useState, useEffect, useCallback } from 'react';
import * as ethers from 'ethers';
import { useWallet } from '../providers/WalletProvider';
import ENTRYPOINT_ABI from '../abis/battleNads.json';
import { MovementOptions } from '../types/gameTypes';

// Debug log the imported ABI to check if it's properly loaded
console.log("[useContracts] Loaded ABI from file:", 
  Array.isArray(ENTRYPOINT_ABI) ? `Array with ${ENTRYPOINT_ABI.length} items` : typeof ENTRYPOINT_ABI);
// Define transaction options type
export interface TransactionOptions {
  gasLimit?: number | bigint;
  value?: ethers.BigNumberish;
  gasPrice?: ethers.BigNumberish;
  nonce?: number;
}

// Use environment variables for contract addresses and RPC URLs
const ENTRYPOINT_ADDRESS = process.env.NEXT_PUBLIC_ENTRYPOINT_ADDRESS || "0x1E85b64E23Cf13b305b4c056438DD5242d93BB76";

// Primary and fallback RPC URLs
const PRIMARY_RPC_URL = "https://rpc-testnet.monadinfra.com/rpc/Dp2u0HD0WxKQEvgmaiT4dwCeH9J14C24";
const FALLBACK_RPC_URL = "https://monad-testnet-rpc.dwellir.com";
const RPC_URL = process.env.NEXT_PUBLIC_MONAD_RPC_URL || PRIMARY_RPC_URL;

// Define a type for our contract with the specific methods we need
export type BattleNadsContract = ethers.Contract & {
  // Add populateTransaction interface
  populateTransaction: {
    // Movement methods
    moveNorth: (characterId: string, options?: TransactionOptions) => Promise<ethers.TransactionRequest>;
    moveSouth: (characterId: string, options?: TransactionOptions) => Promise<ethers.TransactionRequest>;
    moveEast: (characterId: string, options?: TransactionOptions) => Promise<ethers.TransactionRequest>;
    moveWest: (characterId: string, options?: TransactionOptions) => Promise<ethers.TransactionRequest>;
    moveUp: (characterId: string, options?: TransactionOptions) => Promise<ethers.TransactionRequest>;
    moveDown: (characterId: string, options?: TransactionOptions) => Promise<ethers.TransactionRequest>;
    
    // Combat methods
    attack: (characterId: string, targetIndex: number, options?: TransactionOptions) => Promise<ethers.TransactionRequest>;
    
    // Chat methods - include all possible variants the contract might use
    zoneChat?: (characterId: string, message: string, options?: TransactionOptions) => Promise<ethers.TransactionRequest>;
    chat?: (characterId: string, message: string, options?: TransactionOptions) => Promise<ethers.TransactionRequest>;
    sendMessage?: (characterId: string, message: string, options?: TransactionOptions) => Promise<ethers.TransactionRequest>;
    sendChatMessage?: (characterId: string, message: string, options?: TransactionOptions) => Promise<ethers.TransactionRequest>;
    
    // Equipment methods
    equipWeapon: (characterId: string, weaponId: number, options?: TransactionOptions) => Promise<ethers.TransactionRequest>;
    equipArmor: (characterId: string, armorId: number, options?: TransactionOptions) => Promise<ethers.TransactionRequest>;
    
    // Other methods - add as needed
    updateSessionKey: (
      sessionKey: string, 
      sessionKeyDeadline: bigint, 
      options?: TransactionOptions
    ) => Promise<ethers.TransactionRequest>;
    
    replenishGasBalance: (options?: TransactionOptions) => Promise<ethers.TransactionRequest>;
    allocatePoints: (characterId: string, strength: bigint, vitality: bigint, dexterity: bigint, quickness: bigint, sturdiness: bigint, luck: bigint, options?: TransactionOptions) => Promise<ethers.TransactionRequest>;
  };
  
  // Movement methods
  moveNorth: (characterId: string, options?: TransactionOptions) => Promise<ethers.TransactionResponse>;
  moveSouth: (characterId: string, options?: TransactionOptions) => Promise<ethers.TransactionResponse>;
  moveEast: (characterId: string, options?: TransactionOptions) => Promise<ethers.TransactionResponse>;
  moveWest: (characterId: string, options?: TransactionOptions) => Promise<ethers.TransactionResponse>;
  moveUp: (characterId: string, options?: TransactionOptions) => Promise<ethers.TransactionResponse>;
  moveDown: (characterId: string, options?: TransactionOptions) => Promise<ethers.TransactionResponse>;
  
  // Combat methods
  attack: (characterId: string, targetIndex: number, options?: TransactionOptions) => Promise<ethers.TransactionResponse>;
  
  // Chat methods
  zoneChat: (characterId: string, message: string, options?: TransactionOptions) => Promise<ethers.TransactionResponse>;
  
  // Equipment methods
  equipWeapon: (characterId: string, weaponId: number, options?: TransactionOptions) => Promise<ethers.TransactionResponse>;
  equipArmor: (characterId: string, armorId: number, options?: TransactionOptions) => Promise<ethers.TransactionResponse>;
  
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
  
  allocatePoints: (
    characterId: string,
    strength: bigint,
    vitality: bigint,
    dexterity: bigint,
    quickness: bigint,
    sturdiness: bigint,
    luck: bigint,
    options?: TransactionOptions
  ) => Promise<ethers.TransactionResponse>;
  
  // Session key methods
  updateSessionKey: (
    sessionKey: string, 
    sessionKeyDeadline: bigint, 
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
    equipment?: { // Optional equipment data
      weapons?: {
        ids: number[];
        names: string[];
        currentId?: number;
      };
      armor?: {
        ids: number[];
        names: string[];
        currentId?: number;
      };
    };
  }>;
  
  // Function to get all frontend data including balances in one call
  getFullFrontendData: (owner: string, startBlock: number) => Promise<{
    characterID: string;
    sessionKey: string;
    sessionKeyBalance: bigint;
    bondedShMonadBalance: bigint;
    balanceShortfall: bigint;
    unallocatedAttributePoints: number;
    character: any; // Raw data for BattleNad
    combatants: any[]; // Raw data for BattleNad[]
    noncombatants: any[]; // Raw data for BattleNad[]
    miniMap: any[][]; // Raw data for area grid
    equipableWeaponIDs: number[];
    equipableWeaponNames: string[];
    equipableArmorIDs: number[];
    equipableArmorNames: string[];
    dataFeeds: any[];
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
      // Debug log the ABI before creating contract
      console.log('[useContracts] Using ABI for contract creation:', 
        typeof ENTRYPOINT_ABI === 'string' 
          ? 'string ABI: ' + (ENTRYPOINT_ABI as string).substring(0, 100) + '...' 
          : `Array ABI with ${ENTRYPOINT_ABI.length} items`
      );
      
      // Ensure the ABI includes createCharacter function
      if (Array.isArray(ENTRYPOINT_ABI)) {
        const createCharacterAbi = ENTRYPOINT_ABI.find(item => 
          typeof item === 'string' && (item as string).includes('createCharacter')
        );
        console.log('[useContracts] Found createCharacter in ABI:', 
          createCharacterAbi ? 'Yes - ' + createCharacterAbi : 'No');
      }
      
      const contract = new ethers.Contract(
        ENTRYPOINT_ADDRESS,
        ENTRYPOINT_ABI,
        injectedWallet.signer
      ) as BattleNadsContract;
      
      // Check contract functions
      console.log('[useContracts] Contract has createCharacter function:', 
        typeof contract.createCharacter === 'function');
      
      return contract;
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
      );
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