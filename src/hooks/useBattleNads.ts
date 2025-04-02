import { useState, useCallback, useEffect } from 'react';
import * as ethers from 'ethers';
import { usePrivy } from '@privy-io/react-auth';
import { useWallet } from '../providers/WalletProvider';
import { useSetRecoilState } from 'recoil';
import { gameStateAtom } from '../state/gameState';
import { parseFrontendData, createGameState } from '../utils/gameDataConverters';
import { GameState } from '../types/gameTypes';

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
  
  // Estimation functions - recently moved to Getters
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

// Maximum safe integer for uint256 in Solidity
const MAX_SAFE_UINT256 = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

// Create a safe localStorage key based on the contract address to avoid conflicts
const LOCALSTORAGE_KEY = `battleNadsCharacterId_${ENTRYPOINT_ADDRESS}`;

// Event interface definition for CharacterCreated event
interface CharacterCreatedEvent {
  characterID: string;
  owner: string;
}

export const useBattleNads = () => {
  console.log("useBattleNads hook initialized");
  const {signer, injectedWallet, embeddedWallet } = useWallet();

  // Keep minimal state for the hook itself
  const [characterId, setCharacterId] = useState<string | null>(null);
  // Add loading and error states for backward compatibility
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Move this to the top level of the hook
  const setGameState = useSetRecoilState(gameStateAtom);

  // Load stored characterId on mount
  useEffect(() => {
    const storedId = localStorage.getItem(LOCALSTORAGE_KEY);
    if (storedId) setCharacterId(storedId);
  }, []);

  // Get a read-only provider with fallback
  const getReadOnlyProvider = useCallback(() => {
    // Track if we've already tried the fallback
    let usesPrimaryUrl = true;
    let usedFallback = false;
    const primaryUrl = RPC_URL;
    const fallbackUrl = FALLBACK_RPC_URL;
    
    const createProvider = (url: string) => {
      console.log(`[getReadOnlyProvider] Connecting to Monad Testnet at: ${url}`);
      try {
        const provider = new ethers.JsonRpcProvider(url);
        
        // Add network listener to detect disconnection issues
        provider.on("error", (error) => {
          console.error(`[getReadOnlyProvider] Provider error event on ${usesPrimaryUrl ? 'primary' : 'fallback'} URL:`, error);
        });
        
        return provider;
      } catch (error) {
        console.error(`[getReadOnlyProvider] Failed to create provider with ${url}:`, error);
        
        // If this is the primary URL failing, we'll try the fallback
        if (usesPrimaryUrl && !usedFallback) {
          usesPrimaryUrl = false;
          usedFallback = true;
          console.log("[getReadOnlyProvider] Trying fallback RPC URL");
          return createProvider(fallbackUrl);
        }
        
        throw new Error(`RPC connection failed: ${(error as Error)?.message || "Unknown error"}`);
      }
    };
    
    const provider = createProvider(primaryUrl);
    
    // Test the connection by making a simple call
    provider.getBlockNumber().then(blockNumber => {
      console.log(`[getReadOnlyProvider] Successfully connected to Monad Testnet. Current block: ${blockNumber}`);
    }).catch(error => {
      console.error("[getReadOnlyProvider] Failed to get block number:", error);
      
      // If primary failed, try fallback
      if (usesPrimaryUrl && !usedFallback) {
        console.log("[getReadOnlyProvider] Primary RPC failed to get block number, trying fallback");
        usesPrimaryUrl = false;
        usedFallback = true;
        
        try {
          const fallbackProvider = createProvider(fallbackUrl);
          return fallbackProvider;
        } catch (fallbackError) {
          console.error("[getReadOnlyProvider] Fallback provider also failed:", fallbackError);
        }
      }
    });
    
    return provider;
  }, []);

  // Get the appropriate signer based on operation type
  const getSigner = useCallback((operationType: 'creation' | 'session' | 'gas' | 'movement' | 'combat' | 'equipment' = 'session') => {
    // Log detailed information about available wallets for debugging
    console.log(`[getSigner] Operation type: ${operationType}`);
    console.log(`[getSigner] Injected wallet:`, injectedWallet ? {
      address: injectedWallet.address,
      type: injectedWallet.walletClientType,
      hasSigner: !!injectedWallet.signer
    } : 'Not connected');
    console.log(`[getSigner] Embedded wallet:`, embeddedWallet ? {
      address: embeddedWallet.address,
      type: embeddedWallet.walletClientType,
      hasSigner: !!embeddedWallet.signer
    } : 'Not connected');
    
    // For character creation, gas refill, and session key updates, use the injected wallet (owner wallet)
    if (operationType === 'creation' || operationType === 'gas') {
      if (!injectedWallet?.signer) {
        throw new Error('No owner wallet connected. Please connect your owner wallet first.');
      }
      console.log(`[getSigner] Using owner wallet (injected) for operation: ${operationType}`);
      return injectedWallet.signer;
    }
    
    // For all other operations (movement, combat, equipment), prefer the embedded wallet (session key)
    if (operationType === 'movement' || operationType === 'combat' || operationType === 'equipment') {
      if (embeddedWallet?.signer) {
        console.log(`[getSigner] Using embedded wallet (session key) for operation: ${operationType}`);
        return embeddedWallet.signer;
      } else {
        console.warn(`[getSigner] WARNING: Embedded wallet not available for ${operationType}, falling back to injected wallet`);
        // Check exactly why the embedded wallet isn't available
        if (!embeddedWallet) {
          console.error('[getSigner] ERROR: embeddedWallet is null or undefined');
        } else if (!embeddedWallet.signer) {
          console.error('[getSigner] ERROR: embeddedWallet.signer is null or undefined');
          console.error('[getSigner] embeddedWallet details:', {
            address: embeddedWallet.address,
            walletClientType: embeddedWallet.walletClientType,
            hasProvider: !!embeddedWallet.provider
          });
        }
      }
    }
    
    // Fallback to injected wallet if available
    if (injectedWallet?.signer) {
      console.log(`[getSigner] Falling back to injected wallet for operation: ${operationType}`);
      return injectedWallet.signer;
    }
    
    throw new Error('No connected wallet found. Please connect a wallet first.');
  }, [injectedWallet, embeddedWallet]);

  // Get current session key for a character
  const getCurrentSessionKey = useCallback(async (characterId: string) => {
    try {
      console.log(`[getCurrentSessionKey] Getting session key for character ${characterId}`);
      
      const provider = getReadOnlyProvider();
      const contract = new ethers.Contract(
        ENTRYPOINT_ADDRESS,
        ENTRYPOINT_ABI,
        provider
      );

      const sessionKeyResponse = await contract.getCurrentSessionKey(characterId);
      // The response is a tuple containing (address key, uint64 expiration)
      // We need to handle both possible return formats
      let sessionKeyAddress = null;
      
      if (typeof sessionKeyResponse === 'string') {
        // Simple string address is returned
        sessionKeyAddress = sessionKeyResponse;
      } else if (Array.isArray(sessionKeyResponse)) {
        // Array format is returned (first element is the key)
        sessionKeyAddress = sessionKeyResponse[0];
      } else if (sessionKeyResponse && typeof sessionKeyResponse === 'object') {
        // Object format with named fields
        sessionKeyAddress = sessionKeyResponse.key || sessionKeyResponse[0];
      }
      
      if (!sessionKeyAddress) {
        console.warn(`[getCurrentSessionKey] Could not parse session key from response:`, sessionKeyResponse);
        return null;
      }
      
      console.log(`[getCurrentSessionKey] Found session key: ${sessionKeyAddress}`);
      return sessionKeyAddress;
    } catch (err) {
      console.error(`[getCurrentSessionKey] Failed:`, err);
      throw new Error(`Failed to get session key: ${(err as Error)?.message || "Unknown error"}`);
    }
  }, [getReadOnlyProvider]);

  // Directly ensure we're prioritizing the true owner wallet (MetaMask) by checking wallet type
  const getOwnerWalletAddress = useCallback(() => {
    // Check for MetaMask directly first - this is the most reliable way to get the owner address
    if (window.ethereum && (window.ethereum as any).isMetaMask && (window.ethereum as any).selectedAddress) {
      console.log("Found owner address directly from MetaMask:", (window.ethereum as any).selectedAddress);
      return (window.ethereum as any).selectedAddress;
    }
    
    // Default to the injectedWallet from context
    let ownerAddress = injectedWallet?.address;
    
    // If the injectedWallet appears to be a session key (has walletClientType 'privy'), log warning
    if (injectedWallet?.walletClientType === 'privy') {
      console.warn("Warning: injectedWallet appears to be a Privy session key, not the owner wallet");
      
      // Try to get signer address directly from window.ethereum as backup
      if (window.ethereum && (window.ethereum as any).selectedAddress) {
        console.log("Found owner address from window.ethereum:", (window.ethereum as any).selectedAddress);
        ownerAddress = (window.ethereum as any).selectedAddress;
      }
    }
    
    return ownerAddress;
  }, [injectedWallet]);
  
  // Get player character ID - pure blockchain call
  const getPlayerCharacterID = useCallback(async (addressToCheck?: string) => {
    try {
      // FIRST PRIORITY: Always use localStorage if available
      const storedCharacterId = localStorage.getItem(LOCALSTORAGE_KEY);
      if (storedCharacterId) {
        console.log("Using stored character ID from localStorage:", storedCharacterId);
        setCharacterId(storedCharacterId);
        return storedCharacterId;
      }
      
      // SECOND PRIORITY: Only if no localStorage value, check the blockchain using owner address
      console.log("No stored character ID in localStorage, checking blockchain");
      
      // Get the true owner wallet address (MetaMask)
      const ownerAddress = addressToCheck || getOwnerWalletAddress();
      
      console.log("Owner address:", ownerAddress);
      console.log("Injected wallet details:", 
                 "Address:", injectedWallet?.address, 
                 "Type:", injectedWallet?.walletClientType);
      
      if (!ownerAddress || !ethers.isAddress(ownerAddress)) {
        console.warn("No valid owner address available to check for character ID");
        return null;
      }
      
      // Use the getPlayerCharacterID function from the smart contract
      if (ownerAddress) {
        try {
          console.debug("Checking for character with the getPlayerCharacterID function");

          const provider = getReadOnlyProvider();
          const contract = new ethers.Contract(
            ENTRYPOINT_ADDRESS,
            ["function getPlayerCharacterID(address) view returns (bytes32)"],
            provider
          );
          const characterId = await contract.getPlayerCharacterID(ownerAddress);
          
          // Check if character exists (not zero bytes)
          const isZeroBytes = characterId === "0x0000000000000000000000000000000000000000000000000000000000000000";
          console.debug("Character ID from contract call:", characterId, "Is zero bytes:", isZeroBytes);
          
          if (!isZeroBytes) {
            console.log("Character found:", characterId);
            setCharacterId(characterId);
            localStorage.setItem(LOCALSTORAGE_KEY, characterId);
            return characterId;
          } else {
            console.log("No character found for address:", ownerAddress);
            return null;
          }
        } catch (err) {
          console.error("Error calling getPlayerCharacterID:", err);
          return null;
        }
      }
      
      console.log("No character found for owner address");
      return null;
    } catch (err) {
      console.error('Error in getPlayerCharacterID:', err);
      return null;
    }
  }, [getReadOnlyProvider, getOwnerWalletAddress, injectedWallet]);

  // Get character data - pure blockchain call
  const getCharacter = useCallback(async (characterId: string) => {
    try {
      const provider = getReadOnlyProvider();
      const entrypoint = new ethers.Contract(
        ENTRYPOINT_ADDRESS,
        ENTRYPOINT_ABI,
        provider
      );
      
      const character = await entrypoint.getBattleNad(characterId);
      return character;
    } catch (err: any) {
      console.error("Error getting character:", err);
      throw new Error(err.message || "Error getting character");
    }
  }, [getReadOnlyProvider]);

  // Get characters in area - pure blockchain call
  const getCharactersInArea = useCallback(async (depth: number, x: number, y: number) => {
    try {
      const provider = getReadOnlyProvider();
      const entrypoint = new ethers.Contract(
        ENTRYPOINT_ADDRESS,
        ENTRYPOINT_ABI,
        provider
      );
      
      const characters = await entrypoint.getBattleNadsInArea(depth, x, y);
      return characters;
    } catch (err: any) {
      console.error("Error getting characters in area:", err);
      throw new Error(err.message || "Error getting characters in area");
    }
  }, [getReadOnlyProvider]);

  // Get area information including monsters, players, etc. - pure blockchain call
  const getAreaInfo = useCallback(async (depth: number, x: number, y: number) => {
    try {
      const provider = getReadOnlyProvider();
      const entrypoint = new ethers.Contract(
        ENTRYPOINT_ADDRESS,
        ENTRYPOINT_ABI,
        provider
      );
      
      const areaInfo = await entrypoint.getAreaInfo(depth, x, y);
      return areaInfo;
    } catch (err: any) {
      console.error("Error getting area info:", err);
      throw new Error(err.message || "Error getting area information");
    }
  }, [getReadOnlyProvider]);

  // Get combat state for a character - pure blockchain call
  const getAreaCombatState = useCallback(async (characterId: string) => {
    try {
      const provider = getReadOnlyProvider();
      const entrypoint = new ethers.Contract(
        ENTRYPOINT_ADDRESS,
        ENTRYPOINT_ABI,
        provider
      );
      
      const combatState = await entrypoint.getAreaCombatState(characterId);
      return combatState;
    } catch (err: any) {
      console.error("Error getting combat state:", err);
      throw new Error(err.message || "Error getting combat state");
    }
  }, [getReadOnlyProvider]);

  // Get movement options for a character - pure blockchain call
  const getMovementOptions = useCallback(async (characterId: string) => {
    try {
      const provider = getReadOnlyProvider();
      const entrypoint = new ethers.Contract(
        ENTRYPOINT_ADDRESS,
        ENTRYPOINT_ABI,
        provider
      );
      
      const options = await entrypoint.getMovementOptions(characterId);
      return options;
    } catch (err: any) {
      console.error("Error getting movement options:", err);
      throw new Error(err.message || "Error getting movement options");
    }
  }, [getReadOnlyProvider]);

  // Get attack options for a character - pure blockchain call
  const getAttackOptions = useCallback(async (characterId: string) => {
    try {
      const provider = getReadOnlyProvider();
      const entrypoint = new ethers.Contract(
        ENTRYPOINT_ADDRESS,
        ENTRYPOINT_ABI,
        provider
      );
      
      const options = await entrypoint.getAttackOptions(characterId);
      return options;
    } catch (err: any) {
      console.error("Error getting attack options:", err);
      throw new Error(err.message || "Error getting attack options");
    }
  }, [getReadOnlyProvider]);

  // Get frontend data (unified function to get all game state) - pure blockchain call
  const getFrontendData = useCallback(async (characterId: string) => {
    if (!characterId) {
      console.error("getFrontendData called without characterId");
      return null;
    }
    
    try {
      // Get a read-only provider
      const provider = getReadOnlyProvider();
      const entrypoint = new ethers.Contract(ENTRYPOINT_ADDRESS, ENTRYPOINT_ABI, provider);
      
      console.log(`[getFrontendData] Fetching data for character ${characterId}`);
      const frontendData = await entrypoint.getFrontendData(characterId);
      console.log(`[getFrontendData] Data received:`, !!frontendData);
      
      if (!frontendData) {
        throw new Error("Failed to fetch frontend data");
      }
      
      return frontendData;
    } catch (err) {
      console.error(`[getFrontendData] Error:`, err);
      throw new Error(`Failed to load game data: ${(err as Error)?.message || "Unknown error"}`);
    }
  }, [getReadOnlyProvider]);

  // Get full game state and update the Recoil atom - hybrid function (backward compatibility)
  const getGameState = useCallback(async (characterId: string): Promise<GameState | null> => {
    if (!characterId) {
      console.error("getGameState called without characterId");
      return null;
    }
    
    // Use the setGameState from the component's top level (properly declared)
    // NOT calling useSetRecoilState here!
    
    // Start with loading state
    setGameState(currentState => ({
      ...currentState,
      loading: true,
      error: null
    }));
    
    try {
      // Set loading state for backward compatibility
      setLoading(true);
      
      const frontendDataRaw = await getFrontendData(characterId);
      
      if (!frontendDataRaw) {
        setGameState(currentState => ({
          ...currentState,
          loading: false,
          error: "Failed to load game data"
        }));
        setError("Failed to load game data");
        return null;
      }
      
      // Parse the raw data
      const parsedData = parseFrontendData(frontendDataRaw);
      
      // Create a structured game state
      const gameState = createGameState(parsedData);
      
      // Update the centralized state using Recoil
      setGameState({
        ...gameState,
        loading: false,
        error: null
      });
      
      console.log("[getGameState] Game state updated successfully");
      return gameState;
    } catch (err) {
      console.error("[getGameState] Error:", err);
      const errorMsg = `Failed to load game state: ${(err as Error)?.message || "Unknown error"}`;
      
      // Update error state in Recoil
      setGameState(currentState => ({
        ...currentState,
        loading: false,
        error: errorMsg
      }));
      
      // Also set local error state for backward compatibility
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [getFrontendData, setGameState]);

  // Create character - pure blockchain call
  const createCharacter = useCallback(async (
    name: string,
    strength: number,
    vitality: number,
    dexterity: number,
    quickness: number,
    sturdiness: number,
    luck: number
  ) => {
    try {
      // Use owner wallet for character creation
      const ownerSigner = getSigner('creation');
      const entrypoint = new ethers.Contract(ENTRYPOINT_ADDRESS, ENTRYPOINT_ABI, ownerSigner);

      const buyInAmount = await entrypoint.estimateBuyInAmountInMON();

      // We'll use the same sessionKey param as the connected wallet, for demonstration
      const sessionKey = await ownerSigner.getAddress();
      const sessionKeyDeadline = MAX_SAFE_UINT256;

      const txOptions = {
        value: buyInAmount,
        gasLimit: 1_000_000,
      };

      const tx = await entrypoint.createCharacter(
        name,
        strength,
        vitality,
        dexterity,
        quickness,
        sturdiness,
        luck,
        sessionKey,
        sessionKeyDeadline,
        txOptions
      );
      const receipt = await tx.wait();

      // Attempt to parse logs for the CharacterCreated event
      let newCharacterId: string | null = null;
      try {
        const topic = ethers.id('CharacterCreated(bytes32,address)');
        const log = receipt.logs.find((l: any) => l.topics[0] === topic);
        if (log) {
          newCharacterId = ethers.zeroPadValue(log.topics[1], 32);
        }
      } catch (err) {
        console.warn('Could not parse CharacterCreated event');
      }

      if (!newCharacterId) {
        // fallback: fetch all IDs owned by current EOA
        const walletAddress = await ownerSigner.getAddress();
        const characterIDs = await entrypoint.getPlayerCharacterIDs(walletAddress);
        if (characterIDs.length > 0) {
          newCharacterId = characterIDs[characterIDs.length - 1];
        }
      }

      if (!newCharacterId) {
        throw new Error('Unable to detect newly created character ID');
      }

      setCharacterId(newCharacterId);
      localStorage.setItem(LOCALSTORAGE_KEY, newCharacterId);
      return newCharacterId;
    } catch (err: any) {
      console.error("Error creating character:", err);
      throw new Error(err.message || 'Error creating character');
    }
  }, [getSigner]);

  // Move character - pure blockchain call
  const moveCharacter = useCallback(async (characterID: string, direction: string) => {
    try {
      console.log(`[moveCharacter] Starting movement ${direction} for character ${characterID}`);
      
      // Verify that embedded wallet is available before proceeding
      if (!embeddedWallet?.address) {
        console.error('[moveCharacter] No embedded wallet available, movement requires a session key');
        throw new Error('Session key wallet not available. Please refresh the page and try again.');
      }
      
      if (!embeddedWallet.signer) {
        console.error('[moveCharacter] Embedded wallet has no signer, movement requires an active session key');
        console.error('[moveCharacter] Embedded wallet details:', {
          address: embeddedWallet.address,
          walletClientType: embeddedWallet.walletClientType,
          hasProvider: !!embeddedWallet.provider
        });
        throw new Error('Session key wallet has no signer. Please refresh the page and try again.');
      }
      
      // Check if the session key is properly set before moving
      try {
        const currentSessionKey = await getCurrentSessionKey(characterID);
        console.log(`[moveCharacter] Current session key from contract: ${currentSessionKey}`);
        console.log(`[moveCharacter] Session key matches embedded wallet: ${embeddedWallet.address.toLowerCase() === currentSessionKey?.toLowerCase()}`);
        
        if (!currentSessionKey || currentSessionKey.toLowerCase() !== embeddedWallet.address.toLowerCase()) {
          console.warn(`[moveCharacter] Session key mismatch - should update session key first!`);
          console.warn(`[moveCharacter] Embedded wallet: ${embeddedWallet.address}`);
          console.warn(`[moveCharacter] Current session key: ${currentSessionKey}`);
          throw new Error('Session key mismatch. Please update your session key before moving.');
        }
      } catch (error) {
        console.error('[moveCharacter] Error checking session key:', error);
        // Only throw if this is a session key mismatch error we caught above
        if (error instanceof Error && error.message.includes('Session key mismatch')) {
          throw error;
        }
        // Otherwise continue and hope for the best
      }
      
      // Use session key (embedded wallet) for movement
      const movementSigner = getSigner('movement');
      console.log(`[moveCharacter] Executing move ${direction} for character ${characterID}`);
      
      // Log the actual wallet address being used for the movement transaction
      try {
        const signerAddress = await movementSigner.getAddress();
        console.log(`[moveCharacter] Using wallet address: ${signerAddress}`);
        
        // Check if this is the session key wallet or owner wallet
        const isSessionKey = embeddedWallet?.address === signerAddress;
        const isOwnerWallet = injectedWallet?.address === signerAddress;
        console.log(`[moveCharacter] Is using session key wallet: ${isSessionKey}`);
        console.log(`[moveCharacter] Is using owner wallet: ${isOwnerWallet}`);
        
        // Extra safety check - if we're not using the session key wallet, throw an error
        if (!isSessionKey) {
          console.error('[moveCharacter] Not using session key wallet for movement!');
          throw new Error('Movement must use session key wallet. Please update your session key and try again.');
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('Movement must use session key wallet')) {
          throw error; // Rethrow our explicit error
        }
        console.error('[moveCharacter] Failed to get signer information:', error);
      }
      
      const entrypoint = new ethers.Contract(ENTRYPOINT_ADDRESS, ENTRYPOINT_ABI, movementSigner);

      // Make sure characterID is properly formatted as bytes32
      let formattedCharacterID = characterID;
      if (!characterID.startsWith('0x')) {
        formattedCharacterID = '0x' + characterID;
      }
      // Ensure it's padded to 32 bytes (64 hex chars)
      if (formattedCharacterID.length < 66) {
        formattedCharacterID = ethers.zeroPadValue(formattedCharacterID, 32);
      }
      
      console.log(`[moveCharacter] Using formatted characterID: ${formattedCharacterID}`);
      
      let tx;
      const gasLimit = 850000;
      if (direction === 'north') {
        tx = await entrypoint.moveNorth(formattedCharacterID, { gasLimit });
      } else if (direction === 'south') {
        tx = await entrypoint.moveSouth(formattedCharacterID, { gasLimit });
      } else if (direction === 'east') {
        tx = await entrypoint.moveEast(formattedCharacterID, { gasLimit });
      } else if (direction === 'west') {
        tx = await entrypoint.moveWest(formattedCharacterID, { gasLimit });
      } else if (direction === 'up') {
        tx = await entrypoint.moveUp(formattedCharacterID, { gasLimit });
      } else if (direction === 'down') {
        tx = await entrypoint.moveDown(formattedCharacterID, { gasLimit });
      }

      if (tx) {
        console.log(`[moveCharacter] Transaction sent with hash: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`[moveCharacter] Movement transaction completed: ${receipt.hash}`);
        console.log(`[moveCharacter] Gas used: ${receipt.gasUsed.toString()}`);
        return true;
      }
      
      return false;
    } catch (err: any) {
      console.error('[moveCharacter] Error during movement:', err);
      
      // Additional logging for debugging transaction failures
      if (err.transaction) {
        console.error('[moveCharacter] Transaction details:', {
          data: err.transaction.data,
          from: err.transaction.from,
          to: err.transaction.to,
          hash: err.transaction.hash
        });
      }
      
      if (err.receipt) {
        console.error('[moveCharacter] Receipt details:', {
          status: err.receipt.status,
          gasUsed: err.receipt.gasUsed.toString()
        });
      }
      
      throw new Error(err.message || `Error moving ${direction}`);
    }
  }, [getSigner, embeddedWallet, injectedWallet, getCurrentSessionKey]);

  // Attack a target - pure blockchain call
  const attackTarget = useCallback(async (characterId: string, targetIndex: number) => {
    try {
      // Use session key (embedded wallet) for combat
      const combatSigner = getSigner('combat');
      
      const entrypoint = new ethers.Contract(
        ENTRYPOINT_ADDRESS,
        ENTRYPOINT_ABI,
        combatSigner
      );
      
      const tx = await entrypoint.attack(characterId, targetIndex, { gasLimit: 850000 });
      
      // Wait for transaction to be mined
      await tx.wait();
      
      return true;
    } catch (err: any) {
      console.error("Error attacking target:", err);
      throw new Error(err.message || "Error attacking target");
    }
  }, [getSigner]);

  // Update session key - pure blockchain call
  const updateSessionKey = useCallback(async (newSessionKey: string, sessionKeyDeadline: string = MAX_SAFE_UINT256) => {
    try {
      // Must use the owner wallet (injected wallet) to update session keys
      const ownerSigner = getSigner('creation');
      const entrypoint = new ethers.Contract(
        ENTRYPOINT_ADDRESS,
        ENTRYPOINT_ABI,
        ownerSigner
      );
      
      console.log(`[updateSessionKey] Setting session key to ${newSessionKey}`);
      console.log(`[updateSessionKey] Session key deadline: ${sessionKeyDeadline}`);
      
      // Try to get recommended balance for funding the session key
      let valueToSend = ethers.parseEther("0.0001"); // Default small amount
      
      // Use a very high gas limit to ensure the transaction has enough gas
      const highGasLimit = 2000000; // Use 2 million as a very high gas limit
      console.log(`[updateSessionKey] Using very high gas limit: ${highGasLimit}`);
      
      // Call the updateSessionKey function
      const tx = await entrypoint.updateSessionKey(
        newSessionKey,
        sessionKeyDeadline,
        { 
          gasLimit: highGasLimit,
          value: valueToSend 
        }
      );
      
      console.log(`[updateSessionKey] Transaction sent with hash: ${tx.hash}`);
      console.log(`[updateSessionKey] Waiting for transaction to be mined...`);
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      console.log(`[updateSessionKey] Session key updated successfully:`, receipt);
      console.log(`[updateSessionKey] Gas used: ${receipt.gasUsed.toString()}`);
      
      return {
        success: true,
        transactionHash: receipt.hash,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (err: any) {
      console.error(`[updateSessionKey] Error updating session key:`, err);
      
      // Try to identify if it's a gas-related error
      const errorMessage = err.message || "Unknown error";
      if (
        errorMessage.includes("out of gas") || 
        errorMessage.includes("exceeds gas limit") || 
        errorMessage.includes("insufficient funds") ||
        errorMessage.includes("gas required exceeds")
      ) {
        console.error(`[updateSessionKey] Gas-related error detected. Transaction needs more gas or funds.`);
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }, [getSigner]);

  // Set the session key to the current embedded wallet address
  const setSessionKeyToEmbeddedWallet = useCallback(async (characterId: string) => {
    try {
      if (!embeddedWallet?.address) {
        throw new Error("No embedded wallet available to use as session key");
      }

      console.log(`[setSessionKeyToEmbeddedWallet] Setting session key to embedded wallet: ${embeddedWallet.address}`);
      
      // Check current session key before updating
      try {
        const currentSessionKey = await getCurrentSessionKey(characterId);
        console.log(`[setSessionKeyToEmbeddedWallet] Current session key before update: ${currentSessionKey}`);
        
        if (currentSessionKey?.toLowerCase() === embeddedWallet.address.toLowerCase()) {
          console.log(`[setSessionKeyToEmbeddedWallet] Session key is already set to the embedded wallet`);
          return {
            success: true,
            sessionKey: embeddedWallet.address,
            transactionHash: null,
            alreadySet: true
          };
        }
      } catch (err) {
        console.warn(`[setSessionKeyToEmbeddedWallet] Error checking current session key:`, err);
      }
      
      // Use the embedded wallet address as the session key with a far future deadline
      console.log(`[setSessionKeyToEmbeddedWallet] Calling updateSessionKey with embedded wallet: ${embeddedWallet.address}`);
      const MAX_DEADLINE = MAX_SAFE_UINT256;
      console.log(`[setSessionKeyToEmbeddedWallet] Using deadline: ${MAX_DEADLINE}`);
      
      const result = await updateSessionKey(embeddedWallet.address, MAX_DEADLINE);
      
      if (result.success) {
        console.log(`[setSessionKeyToEmbeddedWallet] Successfully set session key to embedded wallet`);
        console.log(`[setSessionKeyToEmbeddedWallet] Transaction hash: ${result.transactionHash}`);
        
        if (result.gasUsed) {
          console.log(`[setSessionKeyToEmbeddedWallet] Gas used: ${result.gasUsed}`);
        }
        
        // Verify the session key was set correctly
        try {
          const updatedSessionKey = await getCurrentSessionKey(characterId);
          console.log(`[setSessionKeyToEmbeddedWallet] Updated session key from contract: ${updatedSessionKey}`);
          console.log(`[setSessionKeyToEmbeddedWallet] Session key matches embedded wallet: ${updatedSessionKey?.toLowerCase() === embeddedWallet.address.toLowerCase()}`);
          
          if (updatedSessionKey?.toLowerCase() !== embeddedWallet.address.toLowerCase()) {
            console.warn(`[setSessionKeyToEmbeddedWallet] WARNING: Session key was not updated correctly`);
            console.warn(`[setSessionKeyToEmbeddedWallet] Expected: ${embeddedWallet.address.toLowerCase()}`);
            console.warn(`[setSessionKeyToEmbeddedWallet] Actual: ${updatedSessionKey?.toLowerCase()}`);
          }
        } catch (err) {
          console.warn(`[setSessionKeyToEmbeddedWallet] Error verifying updated session key:`, err);
        }
        
        return {
          success: true,
          sessionKey: embeddedWallet.address,
          transactionHash: result.transactionHash
        };
      } else {
        console.error(`[setSessionKeyToEmbeddedWallet] Failed to set session key: ${result.error}`);
        throw new Error(result.error || "Failed to set session key");
      }
    } catch (err: any) {
      console.error(`[setSessionKeyToEmbeddedWallet] Error setting session key to embedded wallet:`, err);
      return {
        success: false,
        error: err.message
      };
    }
  }, [embeddedWallet, updateSessionKey, getCurrentSessionKey]);

  // Get player characters - pure blockchain call
  const getPlayerCharacters = useCallback(async (address: string) => {
    try {
      const provider = getReadOnlyProvider();
      const entrypoint = new ethers.Contract(
        ENTRYPOINT_ADDRESS,
        ENTRYPOINT_ABI,
        provider
      );
      
      // Get character IDs owned by the player
      const characterIds = await entrypoint.getPlayerCharacterIDs(address);
      
      // If no characters, return empty array
      if (!characterIds || characterIds.length === 0) {
        return [];
      }
      
      // Get details for each character
      const characterPromises = characterIds.map((id: string) => entrypoint.getBattleNad(id));
      const characters = await Promise.all(characterPromises);
      
      return characters;
    } catch (err: any) {
      console.error("Error getting player characters:", err);
      throw new Error(err.message || "Error getting player characters");
    }
  }, [getReadOnlyProvider]);

  // Helper for debugging/migrating
  const getCharacterIdByTransactionHash = useCallback(async (txHash: string) => {
    try {
      const provider = getReadOnlyProvider();
      
      // Get transaction receipt
      console.log(`Fetching receipt for transaction: ${txHash}`);
      const receipt = await provider.getTransactionReceipt(txHash);

      console.log(`Transaction receipt: ${JSON.stringify(receipt)}`);
      
      if (!receipt) {
        throw new Error("Transaction receipt not found");
      }
      
      // Try to find the character ID from the logs
      let foundCharacterId: string | null = null;
      
      try {
        // Try to parse logs for CharacterCreated event
        const topic = ethers.id("CharacterCreated(bytes32,address)");
        const log = receipt.logs.find(log => log.topics[0] === topic);
        
        if (log) {
          foundCharacterId = ethers.zeroPadValue(log.topics[1], 32);
        }
      } catch (logError) {
        console.warn("Could not parse CharacterCreated event:", logError);
      }
      
      if (foundCharacterId) {
        // Store character ID in local state and localStorage
        setCharacterId(foundCharacterId);
        localStorage.setItem(LOCALSTORAGE_KEY, foundCharacterId);
      }
      
      return foundCharacterId;
    } catch (err: any) {
      console.error("Error getting character ID by transaction hash:", err);
      return null;
    }
  }, [getReadOnlyProvider]);

  // Return only contract interaction functions
  return {
    createCharacter,
    moveCharacter,
    getPlayerCharacterID,
    getCharacter, 
    getCharactersInArea,
    getPlayerCharacters,
    getAreaInfo,
    getAreaCombatState,
    getMovementOptions,
    getAttackOptions,
    attackTarget,
    updateSessionKey,
    getCurrentSessionKey,
    getFrontendData,
    getGameState,
    getCharacterIdByTransactionHash,
    characterId,
    setSessionKeyToEmbeddedWallet,
    // Include loading and error for backward compatibility
    loading,
    error
  };
};
