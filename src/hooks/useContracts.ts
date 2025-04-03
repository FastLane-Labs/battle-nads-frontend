import { useMemo, useState, useEffect } from 'react';
import * as ethers from 'ethers';
import { useWallet } from '../providers/WalletProvider';
import ENTRYPOINT_ABI from '../abis/battleNads.json';

// Use environment variables for contract addresses and RPC URLs
const ENTRYPOINT_ADDRESS = process.env.NEXT_PUBLIC_ENTRYPOINT_ADDRESS || "0xbD4511F188B606e5a74A62b7b0F516d0139d76D5";

// Primary and fallback RPC URLs
const PRIMARY_RPC_URL = "https://rpc-testnet.monadinfra.com/rpc/Dp2u0HD0WxKQEvgmaiT4dwCeH9J14C24";
const FALLBACK_RPC_URL = "https://monad-testnet-rpc.dwellir.com";
const RPC_URL = process.env.NEXT_PUBLIC_MONAD_RPC_URL || PRIMARY_RPC_URL;

// Define a type for our contract with the specific methods we need
export type BattleNadsContract = ethers.Contract & {
  // Movement methods
  moveNorth: (characterId: string, options?: any) => Promise<any>;
  moveSouth: (characterId: string, options?: any) => Promise<any>;
  moveEast: (characterId: string, options?: any) => Promise<any>;
  moveWest: (characterId: string, options?: any) => Promise<any>;
  moveUp: (characterId: string, options?: any) => Promise<any>;
  moveDown: (characterId: string, options?: any) => Promise<any>;
  
  // Combat methods
  attack: (characterId: string, targetIndex: number, options?: any) => Promise<any>;
  
  // Character methods
  createCharacter: (name: string, strength: number, vitality: number, dexterity: number, 
                   quickness: number, sturdiness: number, luck: number, 
                   sessionKey: string, sessionKeyDeadline: string, options?: any) => Promise<any>;
  updateSessionKey: (sessionKey: string, sessionKeyDeadline: string, options?: any) => Promise<any>;
  
  // Query methods
  getBattleNad: (characterId: string) => Promise<any>;
  getBattleNadsInArea: (depth: number, x: number, y: number) => Promise<any>;
  getPlayerCharacterIDs: (address: string) => Promise<any>;
  getFrontendData: (characterId: string) => Promise<any>;
  getCurrentSessionKey: (characterId: string) => Promise<any>;
  getAreaInfo: (depth: number, x: number, y: number) => Promise<any>;
  getAreaCombatState: (characterId: string) => Promise<any>;
  getMovementOptions: (characterId: string) => Promise<any>;
  getAttackOptions: (characterId: string) => Promise<any>;
  
  // Estimation methods
  estimateBuyInAmountInMON: () => Promise<ethers.BigNumberish>;
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