import { useMemo, useState, useEffect } from 'react';
import * as ethers from 'ethers';
import { useWallet } from '../providers/WalletProvider';

// ABI snippets for the Battle-Nads contracts
const ENTRYPOINT_ABI = [
  // Existing functions
  "function executeWithSessionKey(bytes calldata data, bytes calldata sessionKeySignature) external",
  
  // Session key functions
  "function updateSessionKey(address sessionKey, uint256 sessionKeyDeadline) external payable returns (address previousKey, uint256 balanceOnPreviousKey)",
  "function getCurrentSessionKey(bytes32 characterID) public view returns (tuple(address key, uint64 expiration) sessionKey)",
  
  // Movement functions
  "function moveNorth(bytes32 characterID) external",
  "function moveSouth(bytes32 characterID) external",
  "function moveEast(bytes32 characterID) external",
  "function moveWest(bytes32 characterID) external",
  "function moveUp(bytes32 characterID) external",
  "function moveDown(bytes32 characterID) external",
  
  // Combat functions
  "function attack(bytes32 characterID, uint256 targetIndex) external",
  
  // Equipment functions
  "function equipWeapon(bytes32 characterID, uint8 weaponID) external",
  "function equipArmor(bytes32 characterID, uint8 armorID) external",
  
  // Character functions
  "function createCharacter(string memory name, uint256 strength, uint256 vitality, uint256 dexterity, uint256 quickness, uint256 sturdiness, uint256 luck, address sessionKey, uint256 sessionKeyDeadline) external payable returns (bytes32 characterID)",
  "function allocatePoints(bytes32 characterID, uint256 newStrength, uint256 newVitality, uint256 newDexterity, uint256 newQuickness, uint256 newSturdiness, uint256 newLuck) external",
  "function zoneChat(bytes32 characterID, string memory message) external",
  
  // View functions
  "function getBattleNad(bytes32 characterID) public view returns (tuple(bytes32 id, tuple(uint8 strength, uint8 vitality, uint8 dexterity, uint8 quickness, uint8 sturdiness, uint8 luck, uint8 depth, uint8 x, uint8 y, uint8 index, uint16 health, uint8 sumOfCombatantLevels, uint8 combatants, uint8 nextTargetIndex, uint64 combatantBitMap, uint8 weaponID, uint8 armorID, uint8 level, uint16 experience, bool isMonster) stats, tuple(string name, uint256 baseDamage, uint256 bonusDamage, uint256 accuracy, uint256 speed) weapon, tuple(string name, uint256 armorFactor, uint256 armorQuality, uint256 flexibility, uint256 weight) armor, tuple(uint64 weaponBitmap, uint64 armorBitmap, uint128 balance) inventory, tuple(bool updateStats, bool updateInventory, bool updateActiveTask, bool updateOwner, bool died) tracker, address activeTask, address owner, string name) character)",
  "function getBattleNadsInArea(uint8 depth, uint8 x, uint8 y) public view returns (tuple(bytes32 id, tuple(uint8 strength, uint8 vitality, uint8 dexterity, uint8 quickness, uint8 sturdiness, uint8 luck, uint8 depth, uint8 x, uint8 y, uint8 index, uint16 health, uint8 sumOfCombatantLevels, uint8 combatants, uint8 nextTargetIndex, uint64 combatantBitMap, uint8 weaponID, uint8 armorID, uint8 level, uint16 experience, bool isMonster) stats, tuple(string name, uint256 baseDamage, uint256 bonusDamage, uint256 accuracy, uint256 speed) weapon, tuple(string name, uint256 armorFactor, uint256 armorQuality, uint256 flexibility, uint256 weight) armor, tuple(uint64 weaponBitmap, uint64 armorBitmap, uint128 balance) inventory, tuple(bool updateStats, bool updateInventory, bool updateActiveTask, bool updateOwner, bool died) tracker, address activeTask, address owner, string name)[] characters)",
  "function getPlayerCharacterIDs(address owner) external view returns (bytes32[] memory characterIDs)",
  "function getAreaInfo(uint8 depth, uint8 x, uint8 y) external view returns (tuple(uint8 playerCount, uint32 sumOfPlayerLevels, uint64 playerBitMap, uint8 monsterCount, uint32 sumOfMonsterLevels, uint64 monsterBitMap, uint8 depth, uint8 x, uint8 y, bool update) area, uint8 playerCount, uint8 monsterCount, uint8 avgPlayerLevel, uint8 avgMonsterLevel)",
  "function getAreaCombatState(bytes32 characterID) external view returns (bool inCombat, uint8 combatantCount, tuple(bytes32 id, tuple(uint8 strength, uint8 vitality, uint8 dexterity, uint8 quickness, uint8 sturdiness, uint8 luck, uint8 depth, uint8 x, uint8 y, uint8 index, uint16 health, uint8 sumOfCombatantLevels, uint8 combatants, uint8 nextTargetIndex, uint64 combatantBitMap, uint8 weaponID, uint8 armorID, uint8 level, uint16 experience, bool isMonster) stats, tuple(string name, uint256 baseDamage, uint256 bonusDamage, uint256 accuracy, uint256 speed) weapon, tuple(string name, uint256 armorFactor, uint256 armorQuality, uint256 flexibility, uint256 weight) armor, tuple(uint64 weaponBitmap, uint64 armorBitmap, uint128 balance) inventory, tuple(bool updateStats, bool updateInventory, bool updateActiveTask, bool updateOwner, bool died) tracker, address activeTask, address owner)[] enemies, uint8 targetIndex)",
  "function getEquippableWeapons(bytes32 characterID) external view returns (uint8[] memory weaponIDs, string[] memory weaponNames, uint8 currentWeaponID)",
  "function getEquippableArmor(bytes32 characterID) external view returns (uint8[] memory armorIDs, string[] memory armorNames, uint8 currentArmorID)",
  "function getMovementOptions(bytes32 characterID) external view returns (bool canMoveNorth, bool canMoveSouth, bool canMoveEast, bool canMoveWest, bool canMoveUp, bool canMoveDown)",
  "function getAttackOptions(bytes32 characterID) external view returns (bool canAttack, bytes32[] memory targets, uint8[] memory targetIndexes)",
  
  // Key comprehensive function that gets all frontend data in one call
  "function getFrontendData(bytes32 characterID) public view returns (tuple(bytes32 id, tuple(uint8 strength, uint8 vitality, uint8 dexterity, uint8 quickness, uint8 sturdiness, uint8 luck, uint8 depth, uint8 x, uint8 y, uint8 index, uint16 health, uint8 sumOfCombatantLevels, uint8 combatants, uint8 nextTargetIndex, uint64 combatantBitMap, uint8 weaponID, uint8 armorID, uint8 level, uint16 experience, bool isMonster) stats, tuple(string name, uint256 baseDamage, uint256 bonusDamage, uint256 accuracy, uint256 speed) weapon, tuple(string name, uint256 armorFactor, uint256 armorQuality, uint256 flexibility, uint256 weight) armor, tuple(uint64 weaponBitmap, uint64 armorBitmap, uint128 balance) inventory, tuple(bool updateStats, bool updateInventory, bool updateActiveTask, bool updateOwner, bool died) tracker, address activeTask, address owner, string name) character, tuple(bytes32 id, tuple(uint8 strength, uint8 vitality, uint8 dexterity, uint8 quickness, uint8 sturdiness, uint8 luck, uint8 depth, uint8 x, uint8 y, uint8 index, uint16 health, uint8 sumOfCombatantLevels, uint8 combatants, uint8 nextTargetIndex, uint64 combatantBitMap, uint8 weaponID, uint8 armorID, uint8 level, uint16 experience, bool isMonster) stats, tuple(string name, uint256 baseDamage, uint256 bonusDamage, uint256 accuracy, uint256 speed) weapon, tuple(string name, uint256 armorFactor, uint256 armorQuality, uint256 flexibility, uint256 weight) armor, tuple(uint64 weaponBitmap, uint64 armorBitmap, uint128 balance) inventory, tuple(bool updateStats, bool updateInventory, bool updateActiveTask, bool updateOwner, bool died) tracker, address activeTask, address owner, string name)[] combatants, tuple(bytes32 id, tuple(uint8 strength, uint8 vitality, uint8 dexterity, uint8 quickness, uint8 sturdiness, uint8 luck, uint8 depth, uint8 x, uint8 y, uint8 index, uint16 health, uint8 sumOfCombatantLevels, uint8 combatants, uint8 nextTargetIndex, uint64 combatantBitMap, uint8 weaponID, uint8 armorID, uint8 level, uint16 experience, bool isMonster) stats, tuple(string name, uint256 baseDamage, uint256 bonusDamage, uint256 accuracy, uint256 speed) weapon, tuple(string name, uint256 armorFactor, uint256 armorQuality, uint256 flexibility, uint256 weight) armor, tuple(uint64 weaponBitmap, uint64 armorBitmap, uint128 balance) inventory, tuple(bool updateStats, bool updateInventory, bool updateActiveTask, bool updateOwner, bool died) tracker, address activeTask, address owner, string name)[] noncombatants, tuple(uint8 playerCount, uint32 sumOfPlayerLevels, uint64 playerBitMap, uint8 monsterCount, uint32 sumOfMonsterLevels, uint64 monsterBitMap, uint8 depth, uint8 x, uint8 y, bool update)[5][5] miniMap, uint8[] equipableWeaponIDs, string[] equipableWeaponNames, uint8[] equipableArmorIDs, string[] equipableArmorNames, uint256 unallocatedAttributePoints)",
  
  // Estimation functions
  "function estimateBuyInAmountInMON() external view returns (uint256 minAmount)",
  "function estimateBuyInAmountInShMON() external view returns (uint256 minBondedShares)",
  "function shortfallToRecommendedBalanceInMON(bytes32 characterID) external view returns (uint256 minAmount)",
  "function shortfallToRecommendedBalanceInShMON(bytes32 characterID) external view returns (uint256 minBondedShares)"
];

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