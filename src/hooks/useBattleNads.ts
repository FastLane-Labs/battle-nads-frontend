import { useState, useCallback, useEffect, useRef } from 'react';
import * as ethers from 'ethers';
import { useWallet } from '../providers/WalletProvider';
import { useContracts } from './useContracts';
import { parseFrontendData, createGameState } from '../utils/gameDataConverters';
import { GameState } from '../types/gameTypes';
import { getCharacterLocalStorageKey } from '../utils/getCharacterLocalStorageKey';
import { useContractWrite, useContractRead, useNetwork } from 'wagmi';
import { useEmbeddedWallet } from '@/context/EmbeddedWalletContext';
import { useOwnerWallet } from '@/context/OwnerWalletContext';
import { ensureReceipt } from '@/utils/transaction';
import { useUserCharacter } from '@/context/UserCharacterContext';

// Constants
const ENTRYPOINT_ADDRESS = process.env.NEXT_PUBLIC_ENTRYPOINT_ADDRESS || "0x1E85b64E23Cf13b305b4c056438DD5242d93BB76";
const RPC_URL = "https://rpc-testnet.monadinfra.com/rpc/Dp2u0HD0WxKQEvgmaiT4dwCeH9J14C24";
// Maximum safe integer for uint256 in Solidity
const MAX_SAFE_UINT256 = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
// Create a safe localStorage key based on the contract address to avoid conflicts
const LOCALSTORAGE_KEY = `battleNadsCharacterId_${ENTRYPOINT_ADDRESS}`;
// Gas limit constants from the smart contract
const MIN_EXECUTION_GAS = 700000; // From Constants.sol
const TRANSACTION_GAS_LIMIT = BigInt(MIN_EXECUTION_GAS + 350000); // Regular transactions
const MOVEMENT_GAS_LIMIT = BigInt((MIN_EXECUTION_GAS + 350000) * 2); // Double gas limit only for movement

// Flag to control debug logging (set to false in production)
const DEBUG_MODE = true;

// Debug logger that only logs when debugging is enabled
const debugLog = (...args: any[]) => {
  if (DEBUG_MODE) {
    console.log(...args);
  }
};

// Function to process data feeds from the contract
const processDataFeeds = (dataFeeds: any[]): DataFeed[] => {
  if (!dataFeeds || dataFeeds.length === 0) {
    return [];
  }
  
  return dataFeeds.map(feed => {
    const blockNumber = Number(feed.blockNumber);
    const logs = feed.logs.map((log: any) => ({
      logType: Number(log.logType),
      source: log.source,
      message: log.message,
      characterID: log.characterID, 
      characterName: log.characterName,
      x: log.x !== undefined ? Number(log.x) : undefined,
      y: log.y !== undefined ? Number(log.y) : undefined,
      depth: log.depth !== undefined ? Number(log.depth) : undefined,
      extraData: log.extraData
    }));
    
    return { blockNumber, logs };
  });
};

// Add TypeScript definitions for the new data structures
export enum LogType {
  NONE = 0,
  MOVEMENT = 1,
  COMBAT = 2,
  CHARACTER_ACTION = 3,
  ITEM = 4, 
  SYSTEM = 5,
  CHAT = 6,
  DEATH = 7
}

interface Log {
  logType: LogType;
  source: string;
  message: string;
  characterID?: string;
  characterName?: string;
  x?: number;
  y?: number;
  depth?: number;
  extraData?: any;
}

export interface DataFeed {
  blockNumber: number;
  logs: Log[];
}

export interface ChatMessage {
  characterName: string;
  message: string;
  timestamp?: number;
}

// Update the ENTRYPOINT_ABI to include the createCharacter function
const ENTRYPOINT_ABI = [
  // Character creation
  "function createCharacter(string name, uint256 strength, uint256 vitality, uint256 dexterity, uint256 quickness, uint256 sturdiness, uint256 luck, address sessionKey, uint256 sessionKeyDeadline) external payable returns (bytes32)",
  
  // Standard ABI entries
  "function getFrontendData(bytes32 characterID) external view returns (tuple(bytes32 id, tuple(uint8 strength, uint8 vitality, uint8 dexterity, uint8 quickness, uint8 sturdiness, uint8 luck, uint8 depth, uint8 x, uint8 y, uint8 index, uint16 health, uint8 sumOfCombatantLevels, uint8 combatants, uint8 nextTargetIndex, uint64 combatantBitMap, uint8 weaponID, uint8 armorID, uint8 level, uint16 experience, bool isMonster) stats, tuple(string name, uint256 baseDamage, uint256 bonusDamage, uint256 accuracy, uint256 speed) weapon, tuple(string name, uint256 armorFactor, uint256 armorQuality, uint256 flexibility, uint256 weight) armor, tuple(uint64 weaponBitmap, uint64 armorBitmap, uint128 balance) inventory, tuple(bool updateStats, bool updateInventory, bool updateActiveTask, bool updateOwner, bool died) tracker, address activeTask, address owner, string name) character, tuple(bytes32 id, tuple(uint8 strength, uint8 vitality, uint8 dexterity, uint8 quickness, uint8 sturdiness, uint8 luck, uint8 depth, uint8 x, uint8 y, uint8 index, uint16 health, uint8 sumOfCombatantLevels, uint8 combatants, uint8 nextTargetIndex, uint64 combatantBitMap, uint8 weaponID, uint8 armorID, uint8 level, uint16 experience, bool isMonster) stats, tuple(string name, uint256 baseDamage, uint256 bonusDamage, uint256 accuracy, uint256 speed) weapon, tuple(string name, uint256 armorFactor, uint256 armorQuality, uint256 flexibility, uint256 weight) armor, tuple(uint64 weaponBitmap, uint64 armorBitmap, uint128 balance) inventory, tuple(bool updateStats, bool updateInventory, bool updateActiveTask, bool updateOwner, bool died) tracker, address activeTask, address owner, string name)[] combatants, tuple(bytes32 id, tuple(uint8 strength, uint8 vitality, uint8 dexterity, uint8 quickness, uint8 sturdiness, uint8 luck, uint8 depth, uint8 x, uint8 y, uint8 index, uint16 health, uint8 sumOfCombatantLevels, uint8 combatants, uint8 nextTargetIndex, uint64 combatantBitMap, uint8 weaponID, uint8 armorID, uint8 level, uint16 experience, bool isMonster) stats, tuple(string name, uint256 baseDamage, uint256 bonusDamage, uint256 accuracy, uint256 speed) weapon, tuple(string name, uint256 armorFactor, uint256 armorQuality, uint256 flexibility, uint256 weight) armor, tuple(uint64 weaponBitmap, uint64 armorBitmap, uint128 balance) inventory, tuple(bool updateStats, bool updateInventory, bool updateActiveTask, bool updateOwner, bool died) tracker, address activeTask, address owner, string name)[] noncombatants, tuple(uint8 playerCount, uint32 sumOfPlayerLevels, uint64 playerBitMap, uint8 monsterCount, uint32 sumOfMonsterLevels, uint64 monsterBitMap, uint8 depth, uint8 x, uint8 y, bool update)[5][5] miniMap, uint8[] equipableWeaponIDs, string[] equipableWeaponNames, uint8[] equipableArmorIDs, string[] equipableArmorNames, uint256 unallocatedAttributePoints)",
  "function getFullFrontendData(address owner, uint256 startBlock) external view returns (bytes32 characterID, address sessionKey, uint256 sessionKeyBalance, uint256 bondedShMonadBalance, uint256 balanceShortfall, uint256 unallocatedAttributePoints, tuple(bytes32 id, tuple(uint8 logType, address source, string message, bytes32 characterID, string characterName, uint8 x, uint8 y, uint8 depth, bytes extraData)[] logs)[] dataFeeds)",
  "function getDataFeed(address owner, uint256 startBlock, uint256 endBlock) external view returns (tuple(uint256 blockNumber, tuple(uint8 logType, address source, string message, bytes32 characterID, string characterName, uint8 x, uint8 y, uint8 depth, bytes extraData)[] logs)[] dataFeeds)",
  
  // Other common functions
  "function moveNorth(bytes32 characterID) external",
  "function moveSouth(bytes32 characterID) external",
  "function moveEast(bytes32 characterID) external",
  "function moveWest(bytes32 characterID) external",
  "function moveUp(bytes32 characterID) external",
  "function moveDown(bytes32 characterID) external",
  "function attack(bytes32 characterID, uint256 targetIndex) external",
  "function equipWeapon(bytes32 characterID, uint8 weaponID) external",
  "function equipArmor(bytes32 characterID, uint8 armorID) external",
  "function updateSessionKey(address sessionKey, uint256 sessionKeyDeadline) external payable",
  "function replenishGasBalance() external payable",
  "function getPlayerCharacterID(address owner) external view returns (bytes32)"
];

export const useBattleNads = () => {
  // Only log on development and when needed
  debugLog("useBattleNads hook initialized");
  
  const { injectedWallet, embeddedWallet } = useWallet();
  const { readContract, injectedContract, embeddedContract, error: contractError } = useContracts();

  // Keep minimal state for the hook itself
  const [characterId, setCharacterId] = useState<string | null>(null);
  // Add loading and error states for backward compatibility
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(contractError);
  
  // Use ref to track initialization status and prevent multiple initializations
  const initializedRef = useRef(false);

  // Add state for data feeds
  const [dataFeeds, setDataFeeds] = useState<DataFeed[]>([]);
  const [eventLogs, setEventLogs] = useState<Log[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [lastFetchedBlock, setLastFetchedBlock] = useState<number>(0);

  // Update error state when contract error changes
  useEffect(() => {
    if (contractError) {
      setError(contractError);
    }
  }, [contractError]);

  // Add back effect to load characterId from localStorage on mount
  useEffect(() => {
    // Skip if already initialized
    if (initializedRef.current) {
      return;
    }
    
    // Mark as initialized
    initializedRef.current = true;
    
    const loadInitialCharacterId = async () => {
      try {
        // Check for MetaMask directly first - this is the most reliable way to get the owner address
        let ownerAddress = null;
        if (window.ethereum && (window.ethereum as any).isMetaMask && (window.ethereum as any).selectedAddress) {
          ownerAddress = (window.ethereum as any).selectedAddress;
        } else if (injectedWallet?.address) {
          ownerAddress = injectedWallet.address;
        }
        
        if (ownerAddress) {
          const storageKey = getCharacterLocalStorageKey(ownerAddress);
          if (storageKey) {
            const storedId = localStorage.getItem(storageKey);
            if (storedId) {
              debugLog(`[useBattleNads] Initializing with stored character ID: ${storedId}`);
              setCharacterId(storedId);
            }
          }
        }
      } catch (error) {
        console.error("[useBattleNads] Error loading initial character ID:", error);
      }
    };
    
    loadInitialCharacterId();
  }, [injectedWallet?.address]);

  // Get current session key for a character
  const getCurrentSessionKey = useCallback(async (characterId: string) => {
    try {
      debugLog(`[getCurrentSessionKey] Getting session key for character ${characterId}`);
      
      if (!readContract) {
        console.error("[getCurrentSessionKey] No read contract available to check session key");
        return null;
      }
      
      const sessionKeyResponse = await readContract.getCurrentSessionKey(characterId);
      // The response is a tuple containing (address key, uint64 expiration)
      // We need to handle both possible return formats
      let sessionKeyAddress = null;
      
      if (typeof sessionKeyResponse === 'string') {
        // Simple string address is returned
        sessionKeyAddress = sessionKeyResponse;
      } else if (Array.isArray(sessionKeyResponse)) {
        // Array format is returned (first element is the key)
        sessionKeyAddress = sessionKeyResponse[0];
      } else if (sessionKeyResponse && typeof sessionKeyResponse === 'object' && 'key' in sessionKeyResponse) {
        // Object format with named fields
        sessionKeyAddress = sessionKeyResponse.key;
      }
      
      if (!sessionKeyAddress) {
        console.warn(`[getCurrentSessionKey] Could not parse session key from response:`, sessionKeyResponse);
        return null;
      }
      
      debugLog(`[getCurrentSessionKey] Found session key: ${sessionKeyAddress}`);
      return sessionKeyAddress;
    } catch (err) {
      console.error(`[getCurrentSessionKey] Failed:`, err);
      return null; // Return null instead of throwing to prevent cascading errors
    }
  }, [readContract]);

  // Helper to select the appropriate contract based on operation type
  const getContractForOperation = useCallback((operationType: 'creation' | 'session' | 'gas' | 'movement' | 'combat' | 'equipment' | 'read' = 'session') => {
    debugLog(`[getContractForOperation] Operation type: ${operationType}`);
    
    // For read operations (queries), use read-only contract
    if (operationType === 'read') {
      return readContract;
    }
    
    // Movement, combat, and equipment always use embedded wallet (session key)
    if (['movement', 'combat', 'equipment'].includes(operationType)) {
      return embeddedContract;
    }
    
    // Character creation, session key updates, and gas operations use owner wallet
    if (['creation', 'gas', 'session'].includes(operationType)) {
      if (!injectedContract) {
        throw new Error('No owner wallet connected. Please connect your owner wallet first.');
      }
      return injectedContract;
    }
    
    // Default fallback to read contract
    return readContract;
  }, [readContract, injectedContract, embeddedContract]);

  // Directly ensure we're prioritizing the true owner wallet (MetaMask) by checking wallet type
  const getOwnerWalletAddress = useCallback(() => {
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
  const getPlayerCharacterID = useCallback(async (addressToCheck?: string): Promise<string | null> => {
    try {
      // Get the true owner wallet address (MetaMask)
      const ownerAddress = addressToCheck || getOwnerWalletAddress();
      
      if (!ownerAddress || !ethers.isAddress(ownerAddress)) {
        console.warn("No valid owner address available to check for character ID");
        return null;
      }
      
      // Get wallet-specific localStorage key
      const storageKey = getCharacterLocalStorageKey(ownerAddress);
      
      if (!storageKey) {
        console.warn(`[getPlayerCharacterID] Could not generate storage key for address: ${ownerAddress}`);
        return null;
      }
      
      // FIRST PRIORITY: Always use localStorage if available for this specific wallet
      const storedCharacterId = localStorage.getItem(storageKey);
      if (storedCharacterId) {
        console.log(`Using stored character ID from localStorage for ${ownerAddress}:`, storedCharacterId);
        setCharacterId(storedCharacterId);
        return storedCharacterId;
      }
      
      // SECOND PRIORITY: Only if no localStorage value, check the blockchain using owner address
      debugLog("No character in localStorage, checking blockchain...");
      
      if (!readContract) {
        console.warn("No read contract available to check for character ID");
        return null;
      }
      
      const characterIdFromChain = await readContract.getPlayerCharacterID(ownerAddress);
      
      // If valid character ID returned, store it
      if (characterIdFromChain && characterIdFromChain !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
        debugLog(`Found character ID on blockchain for ${ownerAddress}:`, characterIdFromChain);
        setCharacterId(characterIdFromChain);
        localStorage.setItem(storageKey, characterIdFromChain);
        return characterIdFromChain;
      }
      
      return null;
    } catch (err) {
      console.error('Error in getPlayerCharacterID:', err);
      return null;
    }
  }, [getOwnerWalletAddress, readContract]);

  // Get character data - pure blockchain call
  const getCharacter = useCallback(async (characterId: string) => {
    try {
      if (!readContract) throw new Error("No contract available to get character data");
      const character = await readContract.getBattleNad(characterId);
      return character;
    } catch (err: any) {
      console.error("Error getting character:", err);
      throw new Error(err.message || "Error getting character");
    }
  }, [readContract]);

  // Get characters in area - pure blockchain call
  const getCharactersInArea = useCallback(async (depth: number, x: number, y: number) => {
    try {
      if (!readContract) throw new Error("No contract available to get characters in area");
      const characters = await readContract.getBattleNadsInArea(depth, x, y);
      return characters;
    } catch (err: any) {
      console.error("Error getting characters in area:", err);
      throw new Error(err.message || "Error getting characters in area");
    }
  }, [readContract]);

  // Get area information including monsters, players, etc. - pure blockchain call
  const getAreaInfo = useCallback(async (depth: number, x: number, y: number) => {
    try {
      if (!readContract) throw new Error("No contract available to get area info");
      const areaInfo = await readContract.getAreaInfo(depth, x, y);
      return areaInfo;
    } catch (err: any) {
      console.error("Error getting area info:", err);
      throw new Error(err.message || "Error getting area information");
    }
  }, [readContract]);

  // Get combat state for a character - pure blockchain call
  const getAreaCombatState = useCallback(async (characterId: string) => {
    try {
      if (!readContract) throw new Error("No contract available to get combat state");
      const combatState = await readContract.getAreaCombatState(characterId);
      return combatState;
    } catch (err: any) {
      console.error("Error getting combat state:", err);
      throw new Error(err.message || "Error getting combat state");
    }
  }, [readContract]);

  // Get estimated buy-in amount in ETH for creating a character or updating session key
  const getEstimatedBuyInAmount = useCallback(async () => {
    try {
      console.log(`[getEstimatedBuyInAmount] Estimating buy-in amount in MON`);
      
      if (!readContract) {
        throw new Error('Read contract not available to estimate buy-in amount');
      }
      
      const estimatedAmount = await readContract.estimateBuyInAmountInMON();
      console.log(`[getEstimatedBuyInAmount] Estimated amount: ${estimatedAmount.toString()}`);
      
      return estimatedAmount;
    } catch (err: any) {
      console.error("[getEstimatedBuyInAmount] Error:", err);
      // Return a default amount if estimation fails
      return BigInt(0);
    }
  }, [readContract]);

  // Get movement options for a character - pure blockchain call
  const getMovementOptions = useCallback(async (characterId: string) => {
    try {
      if (!readContract) throw new Error("No contract available to get movement options");
      const options = await readContract.getMovementOptions(characterId);
      return options;
    } catch (err: any) {
      console.error("Error getting movement options:", err);
      throw new Error(err.message || "Error getting movement options");
    }
  }, [readContract]);

  // Get attack options for a character - pure blockchain call
  const getAttackOptions = useCallback(async (characterId: string) => {
    try {
      if (!readContract) throw new Error("No contract available to get attack options");
      const options = await readContract.getAttackOptions(characterId);
      return options;
    } catch (err: any) {
      console.error("Error getting attack options:", err);
      throw new Error(err.message || "Error getting attack options");
    }
  }, [readContract]);

  // Get frontend data (unified function to get all game state) - pure blockchain call
  const getFrontendData = useCallback(async (characterId: string) => {
    if (!characterId) {
      console.error("getFrontendData called without characterId");
      return null;
    }
    
    try {
      if (!readContract) throw new Error("No contract available to get frontend data");
      const frontendData = await readContract.getFrontendData(characterId);
      
      if (!frontendData) {
        throw new Error("Failed to fetch frontend data");
      }
      
      return frontendData;
    } catch (err) {
      console.error(`[getFrontendData] Error:`, err);
      throw new Error(`Failed to load game data: ${(err as Error)?.message || "Unknown error"}`);
    }
  }, [readContract]);

  // Helper function to ensure transaction receipt
  const ensureReceipt = (receipt: any, operationName: string) => {
    if (!receipt) {
      throw new Error(`No receipt returned for ${operationName} operation`);
    }
    return receipt;
  };

  // Get full frontend data including chat/event logs
  const getFullFrontendData = useCallback(async (characterIdOrOwnerAddress?: string, startBlockOverride?: number) => {
    try {
      setLoading(true);
      
      // For getFullFrontendData, we need an owner address, not a character ID
      const ownerAddress = characterIdOrOwnerAddress || getOwnerWalletAddress() || '';
      
      if (!ownerAddress) {
        console.error("[getFullFrontendData] ERROR: No owner address available");
        setError("No owner address available");
        return null;
      }
      
      console.log(`[getFullFrontendData] Using owner address: ${ownerAddress}`);
      
      const contract = getContractForOperation('read');
      if (!contract) {
        console.error("[getFullFrontendData] ERROR: No contract available");
        setError("No contract available");
        return null;
      }
      
      // Calculate start block - use override or lastFetchedBlock or 0
      let startBlock = startBlockOverride !== undefined ? startBlockOverride : lastFetchedBlock || 0;
      console.log(`[getFullFrontendData] Using startBlock: ${startBlock}`);
      
      // Call the actual getFullFrontendData method from the contract
      console.log(`[getFullFrontendData] Calling contract.getFullFrontendData(${ownerAddress}, ${startBlock})...`);
      
      // Helper function to safely stringify objects containing BigInt values
      const safeStringify = (obj: any): string => {
        return JSON.stringify(obj, (_, value) => 
          typeof value === 'bigint' ? value.toString() : value
        );
      };
      
      const response = await contract.getFullFrontendData(ownerAddress, startBlock);
      console.log(`[getFullFrontendData] Response received, type: ${typeof response}`);
      
      // Initialize result object with default values
      const result: any = {
        characterID: null,
        sessionKey: null,
        sessionKeyBalance: BigInt(0),
        bondedShMonadBalance: BigInt(0),
        balanceShortfall: BigInt(0),
        unallocatedAttributePoints: 0,
        character: null,
        combatants: [],
        noncombatants: [],
        miniMap: [],
        equipableWeaponIDs: [],
        equipableWeaponNames: [],
        equipableArmorIDs: [],
        equipableArmorNames: [],
        dataFeeds: []
      };
      
      try {
        // Process response based on its format
        if (Array.isArray(response)) {
          // Array format (traditional solidity tuple return)
          console.log(`[getFullFrontendData] Response is array with ${response.length} items`);
          
          // Extract values in order based on the contract definition
          [
            result.characterID,
            result.sessionKey,
            result.sessionKeyBalance,
            result.bondedShMonadBalance,
            result.balanceShortfall,
            result.unallocatedAttributePoints,
            result.character,
            result.combatants,
            result.noncombatants,
            result.miniMap,
            result.equipableWeaponIDs,
            result.equipableWeaponNames,
            result.equipableArmorIDs,
            result.equipableArmorNames,
            result.dataFeeds
          ] = response;
          
        } else if (typeof response === 'object' && response !== null) {
          // Object format (ethers.js named outputs)
          console.log(`[getFullFrontendData] Response is object with keys: ${Object.keys(response).join(', ')}`);
          
          // Copy properties from response to result, preserving defaults for missing properties
          Object.keys(result).forEach(key => {
            if (key in response && response[key as keyof typeof response] !== undefined) {
              result[key] = response[key as keyof typeof response];
            }
          });
        }
        
        // Log the key values for debugging
        console.log(`[getFullFrontendData] Character ID from chain: ${result.characterID || 'null'}`);
        console.log(`[getFullFrontendData] Session key: ${result.sessionKey || 'null'}`);
        console.log(`[getFullFrontendData] Session key balance: ${result.sessionKeyBalance ? result.sessionKeyBalance.toString() : '0'}`);
        console.log(`[getFullFrontendData] Bonded shMONAD balance: ${result.bondedShMonadBalance ? result.bondedShMonadBalance.toString() : '0'}`);
        
        // Add detailed debug logging for character object
        if (result.character) {
          console.log(`[getFullFrontendData] DEBUG: Character object structure:`, {
            hasName: !!result.character.name,
            nameType: typeof result.character.name,
            nameValue: result.character.name,
            id: result.character.id,
            props: Object.keys(result.character),
            stats: result.character.stats ? Object.keys(result.character.stats) : 'no stats'
          });
        } else {
          console.log(`[getFullFrontendData] DEBUG: No character object in result`);
        }
        
        // Validate characterID - check if it's a valid bytes32 hex
        if (result.characterID) {
          const isHex = /^0x[0-9a-f]{64}$/i.test(result.characterID);
          console.log(`[getFullFrontendData] Character ID is valid hex bytes32: ${isHex}`);
          
          if (!isHex) {
            console.warn(`[getFullFrontendData] Character ID has invalid format: ${result.characterID}`);
          }
        } else {
          console.warn('[getFullFrontendData] WARNING: Received null or empty characterID from contract');
          
          // Use fallback from state if available
          if (characterId) {
            console.log(`[getFullFrontendData] Using cached characterId from state: ${characterId}`);
            result.characterID = characterId;
          } else {
            console.log('[getFullFrontendData] No fallback characterId available in state');
          }
        }
      } catch (err) {
        console.error('[getFullFrontendData] Error processing response:', err);
        try {
          // Log a safe version of the response for debugging
          console.log('[getFullFrontendData] Raw response (truncated):', safeStringify(response).substring(0, 1000) + '...');
        } catch (jsonErr) {
          console.error('[getFullFrontendData] Could not stringify response:', jsonErr);
          console.log('[getFullFrontendData] Response type:', typeof response);
        }
      }
      
      // Ensure BigInt values are handled properly
      result.sessionKeyBalance = result.sessionKeyBalance || BigInt(0);
      result.bondedShMonadBalance = result.bondedShMonadBalance || BigInt(0);
      result.balanceShortfall = result.balanceShortfall || BigInt(0);
      result.unallocatedAttributePoints = result.unallocatedAttributePoints ? Number(result.unallocatedAttributePoints) : 0;
      
      // Emit events for balance updates so other components can react to them
      dispatchEvent(new CustomEvent('sessionKeyBalanceUpdated', { 
        detail: { balance: result.sessionKeyBalance } 
      }));
      
      dispatchEvent(new CustomEvent('bondedBalanceUpdated', { 
        detail: { balance: result.bondedShMonadBalance } 
      }));
      
      // Update the current block for next time
      try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const currentBlock = await provider.getBlockNumber();
        setLastFetchedBlock(currentBlock);
        console.log(`[getFullFrontendData] Setting last fetched block to current block: ${currentBlock}`);
      } catch (blockErr) {
        console.warn('[getFullFrontendData] Could not get current block:', blockErr);
      }
      
      // Store characterID in state if it's valid and not already stored
      if (result.characterID && (!characterId || characterId !== result.characterID)) {
        console.log(`[getFullFrontendData] Updating character ID in state: ${result.characterID}`);
        setCharacterId(result.characterID);
        
        // Store in localStorage for persistence
        try {
          const storageKey = getCharacterLocalStorageKey(ownerAddress);
          if (storageKey) {
            localStorage.setItem(storageKey, result.characterID);
            console.log(`[getFullFrontendData] Saved character ID to localStorage with key: ${storageKey}`);
          }
        } catch (storageErr) {
          console.error('[getFullFrontendData] Failed to save character ID to localStorage:', storageErr);
        }
      }
      
      // Process any data feeds for event logging
      if (Array.isArray(result.dataFeeds) && result.dataFeeds.length > 0) {
        try {
          const processedDataFeeds = processDataFeeds(result.dataFeeds);
          setDataFeeds(processedDataFeeds);
          
          // Extract and collate event logs from all data feeds
          const allLogs = processedDataFeeds.flatMap(feed => feed.logs || []);
          if (allLogs.length > 0) {
            setEventLogs(prev => [...allLogs.filter(log => log.logType !== LogType.CHAT), ...prev]);
            
            // Extract chat messages
            const chatLogs = allLogs.filter(log => log.logType === LogType.CHAT);
            if (chatLogs.length > 0) {
              const newChatMessages = chatLogs.map(log => ({
                characterName: log.characterName || 'Unknown',
                message: log.message || '',
                timestamp: Date.now()
              }));
              setChatMessages(prev => [...newChatMessages, ...prev]);
            }
          }
        } catch (dataFeedErr) {
          console.error('[getFullFrontendData] Error processing data feeds:', dataFeedErr);
        }
      }
      
      // Log result summary
      try {
        const simplifiedResult = {
          characterID: result.characterID,
          hasSessionKey: !!result.sessionKey,
          sessionKeyBalance: result.sessionKeyBalance.toString(),
          bondedShMonadBalance: result.bondedShMonadBalance.toString(),
          balanceShortfall: result.balanceShortfall.toString(),
          unallocatedAttributePoints: result.unallocatedAttributePoints,
          dataFeedsCount: Array.isArray(result.dataFeeds) ? result.dataFeeds.length : 0
        };
        console.log(`[getFullFrontendData] Result summary:`, safeStringify(simplifiedResult));
      } catch (logErr) {
        console.warn('[getFullFrontendData] Could not log result summary:', logErr);
      }
      
      console.log(`[getFullFrontendData] Returning result with character ID: ${result.characterID || 'null'}`);
      return result;
    } catch (err) {
      console.error("[getFullFrontendData] Error:", err);
      setError(`Failed to get data: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, [characterId, lastFetchedBlock, getContractForOperation, getOwnerWalletAddress, setCharacterId, processDataFeeds]);

  // Implement attackTarget function
  const attackTarget = useCallback(async (characterId: string, targetIndex: number) => {
    try {
      console.log(`[attackTarget] Attacking target ${targetIndex} with character ${characterId}`);
      
      if (!embeddedContract) {
        throw new Error('Session key wallet not available. Please connect your wallet and try again.');
      }
      
      const tx = await embeddedContract.attack(characterId, targetIndex, { gasLimit: TRANSACTION_GAS_LIMIT });
      console.log(`[attackTarget] Transaction sent: ${tx.hash}`);
      
      const receipt = ensureReceipt(await tx.wait(), "Attack target");
      console.log(`[attackTarget] Attack completed: ${receipt.hash}, gas used: ${receipt.gasUsed.toString()}`);
      return receipt;
    } catch (err: any) {
      console.error("[attackTarget] Error:", err);
      throw new Error(err.message || "Error attacking target");
    }
  }, [embeddedContract]);

  // Implement updateSessionKey function
  const updateSessionKey = useCallback(async (sessionKey?: string, sessionKeyDeadline?: number) => {
    try {
      console.log(`[updateSessionKey] Updating session key to ${sessionKey}`);
      
      if (!injectedContract) {
        throw new Error('Owner wallet not available. Please connect your wallet and try again.');
      }
      
      // Use the embedded wallet address as the session key if not provided
      const actualSessionKey = sessionKey || (embeddedWallet?.address || ethers.ZeroAddress);
      // Set deadline to 30 days from now if not provided
      const actualDeadline = sessionKeyDeadline || Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
      
      // Get the estimated buy-in amount
      const estimatedBuyInAmount = await getEstimatedBuyInAmount();
      console.log(`[updateSessionKey] Using estimated buy-in amount: ${estimatedBuyInAmount.toString()}`);
      
      const tx = await injectedContract.updateSessionKey(actualSessionKey, BigInt(actualDeadline), { 
        gasLimit: TRANSACTION_GAS_LIMIT,
        value: estimatedBuyInAmount
      });
      
      console.log(`[updateSessionKey] Transaction sent: ${tx.hash}`);
      
      const receipt = ensureReceipt(await tx.wait(), "Update session key");
      console.log(`[updateSessionKey] Session key updated: ${receipt.hash}, gas used: ${receipt.gasUsed.toString()}`);
      return { 
        success: true, 
        transactionHash: tx.hash,
        receipt
      };
    } catch (err: any) {
      console.error("[updateSessionKey] Error:", err);
      throw new Error(err.message || "Error updating session key");
    }
  }, [injectedContract, embeddedWallet, getEstimatedBuyInAmount]);

  // Implement getGameState function
  const getGameState = useCallback(async (characterId?: string) => {
    try {
      console.log(`[getGameState] Getting game state for character ${characterId}`);
      
      // Use the character ID from state if not provided
      const targetCharacterId = characterId || characterId;
      if (!targetCharacterId) {
        throw new Error('No character ID provided or available');
      }
      
      // Get the full game state by calling getFrontendData
      const gameData = await getFrontendData(targetCharacterId);
      if (!gameData) {
        throw new Error('Failed to get game data');
      }
      
      // Convert the contract data to our GameState format
      const gameState = createGameState(gameData);
      return gameState;
    } catch (err: any) {
      console.error("[getGameState] Error:", err);
      throw new Error(err.message || "Error getting game state");
    }
  }, [getFrontendData, characterId]);

  // Implement setSessionKeyToEmbeddedWallet function
  const setSessionKeyToEmbeddedWallet = useCallback(async () => {
    try {
      console.log(`[setSessionKeyToEmbeddedWallet] Setting session key to embedded wallet`);
      
      if (!embeddedWallet?.address) {
        throw new Error('No embedded wallet available');
      }
      
      // Call the updateSessionKey function with the embedded wallet address
      return await updateSessionKey(
        embeddedWallet.address, 
        Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60 // 1 year validity
      );
    } catch (err: any) {
      console.error("[setSessionKeyToEmbeddedWallet] Error:", err);
      throw new Error(err.message || "Error setting session key to embedded wallet");
    }
  }, [updateSessionKey, embeddedWallet]);

  // Implement sendChatMessage function
  const sendChatMessage = useCallback(async (message: string) => {
    try {
      console.log(`[sendChatMessage] Sending chat message: ${message}`);
      
      if (!characterId) {
        throw new Error('No character ID available');
      }
      
      if (!embeddedContract) {
        throw new Error('Session key wallet not available. Please connect your wallet and try again.');
      }
      
      const tx = await embeddedContract.zoneChat(characterId, message, { gasLimit: TRANSACTION_GAS_LIMIT });
      console.log(`[sendChatMessage] Transaction sent: ${tx.hash}`);
      
      const receipt = ensureReceipt(await tx.wait(), "Send chat message");
      console.log(`[sendChatMessage] Message sent: ${receipt.hash}, gas used: ${receipt.gasUsed.toString()}`);
      
      // Add message to local chat list for immediate UI feedback
      const newMessage: ChatMessage = {
        characterName: "You", // Will be updated with real name when fetched from chain
        message: message,
        timestamp: Date.now()
      };
      
      setChatMessages(prev => [newMessage, ...prev]);
      
      return receipt;
    } catch (err: any) {
      console.error("[sendChatMessage] Error:", err);
      throw new Error(err.message || "Error sending chat message");
    }
  }, [embeddedContract, characterId]);

  // Get player characters - pure blockchain call
  const getPlayerCharacters = useCallback(async (address: string) => {
    try {
      if (!readContract) throw new Error("No contract available to get player characters");
      
      // Get character ID owned by the player
      const characterId = await readContract.getPlayerCharacterID(address);
      
      // If no character or zero ID, return empty array
      if (!characterId || characterId === "0x0000000000000000000000000000000000000000000000000000000000000000") {
      return [];
      }
      
      // Get details for the character
      const character = await readContract.getBattleNad(characterId);
      
      return [character];
    } catch (err: any) {
      console.error("Error getting player characters:", err);
      throw new Error(err.message || "Error getting player characters");
    }
  }, [readContract]);

  // Helper for debugging/migrating
  const getCharacterIdByTransactionHash = useCallback(async (txHash: string) => {
    try {
      if (!injectedWallet?.provider) {
        throw new Error("No provider available to get transaction receipt");
      }
      
      // Get transaction receipt
      console.log(`Fetching receipt for transaction: ${txHash}`);
      const receipt = await injectedWallet.provider.getTransactionReceipt(txHash);

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
        // Get the owner address for localStorage key
        const ownerAddress = getOwnerWalletAddress();
        if (ownerAddress) {
          const storageKey = getCharacterLocalStorageKey(ownerAddress);
          if (storageKey) {
            // Store character ID in local state and localStorage with wallet-specific key
            setCharacterId(foundCharacterId);
            localStorage.setItem(storageKey, foundCharacterId);
          }
        }
      }
      
      return foundCharacterId;
    } catch (err: any) {
      console.error("Error getting character ID by transaction hash:", err);
      return null;
    }
  }, [injectedWallet?.provider, getOwnerWalletAddress]);

  // Equip weapon for a character - blockchain call
  const equipWeapon = useCallback(async (characterId: string, weaponId: number) => {
    try {
      console.log(`[equipWeapon] Equipping weapon ${weaponId} for character ${characterId}`);
      
      // Directly use embedded contract for equipment
      if (!embeddedContract) {
        throw new Error('Session key wallet not available. Please refresh the page and try again.');
      }
      
      const tx = await embeddedContract.equipWeapon(characterId, weaponId, { gasLimit: TRANSACTION_GAS_LIMIT });
      console.log(`[equipWeapon] Transaction sent: ${tx.hash}`);
      
      const receipt = ensureReceipt(await tx.wait(), "Equip weapon");
      console.log(`[equipWeapon] Weapon equipped: ${receipt.hash}, gas used: ${receipt.gasUsed.toString()}`);
      return true;
    } catch (err: any) {
      console.error("[equipWeapon] Error:", err);
      throw new Error(err.message || "Error equipping weapon");
    }
  }, [embeddedContract]);

  // Equip armor for a character - blockchain call
  const equipArmor = useCallback(async (characterId: string, armorId: number) => {
    try {
      console.log(`[equipArmor] Equipping armor ${armorId} for character ${characterId}`);
      
      // Directly use embedded contract for equipment
      if (!embeddedContract) {
        throw new Error('Session key wallet not available. Please refresh the page and try again.');
      }
      
      const tx = await embeddedContract.equipArmor(characterId, armorId, { gasLimit: TRANSACTION_GAS_LIMIT });
      console.log(`[equipArmor] Transaction sent: ${tx.hash}`);
      
      const receipt = ensureReceipt(await tx.wait(), "Equip armor");
      console.log(`[equipArmor] Armor equipped: ${receipt.hash}, gas used: ${receipt.gasUsed.toString()}`);
      return true;
    } catch (err: any) {
      console.error("[equipArmor] Error:", err);
      throw new Error(err.message || "Error equipping armor");
    }
  }, [embeddedContract]);

  // Allocate attribute points - blockchain call
  const allocatePoints = useCallback(async (
    characterId: string,
    strength: number, 
    vitality: number, 
    dexterity: number, 
    quickness: number, 
    sturdiness: number, 
    luck: number
  ) => {
    try {
      console.log(`[allocatePoints] Allocating points for character ${characterId}`);
      
      // Use owner wallet (injected) for allocating points
      if (!injectedContract) {
        throw new Error('Owner wallet not available. Please connect your wallet and try again.');
      }
      
      const tx = await injectedContract.allocatePoints(
        characterId,
        BigInt(strength),
        BigInt(vitality),
        BigInt(dexterity),
        BigInt(quickness),
        BigInt(sturdiness),
        BigInt(luck),
        { gasLimit: TRANSACTION_GAS_LIMIT }
      );
      console.log(`[allocatePoints] Transaction sent: ${tx.hash}`);
      
      const receipt = ensureReceipt(await tx.wait(), "Allocate points");
      console.log(`[allocatePoints] Points allocated: ${receipt.hash}, gas used: ${receipt.gasUsed.toString()}`);
      return true;
    } catch (err: any) {
      console.error("[allocatePoints] Error:", err);
      throw new Error(err.message || "Error allocating points");
    }
  }, [injectedContract]);

  // Replenish gas balance - blockchain call
  const replenishGasBalance = useCallback(async (amount: string) => {
    try {
      console.log(`[replenishGasBalance] Replenishing gas balance with ${amount} ETH`);
      
      // Must use owner wallet (injected) for funding
      if (!injectedContract) {
        throw new Error('Owner wallet not available. Please connect your wallet and try again.');
      }
      
      const valueToSend = ethers.parseEther(amount);
      
      const tx = await injectedContract.replenishGasBalance({ 
        value: valueToSend,
        gasLimit: TRANSACTION_GAS_LIMIT 
      });
      console.log(`[replenishGasBalance] Transaction sent: ${tx.hash}`);
      
      const receipt = ensureReceipt(await tx.wait(), "Replenish gas balance");
      console.log(`[replenishGasBalance] Gas balance replenished: ${receipt.hash}, gas used: ${receipt.gasUsed.toString()}`);
      return true;
    } catch (err: any) {
      console.error("[replenishGasBalance] Error:", err);
      throw new Error(err.message || "Error replenishing gas balance");
    }
  }, [injectedContract]);

  // New function to check if a player has a character (either in localStorage or on blockchain)
  const hasPlayerCharacter = useCallback(async (): Promise<boolean> => {
    try {
      // Don't set loading to true if we already have a character ID in state
      if (characterId) {
        debugLog("Character ID already in state, no need to check again");
        return true;
      }
      
      setLoading(true);
      
      // Get the owner address
      const ownerAddress = getOwnerWalletAddress();
      
      if (!ownerAddress) {
        debugLog("No wallet address available to check for character");
        return false;
      }
      
      // First check localStorage for this specific wallet
      const storageKey = getCharacterLocalStorageKey(ownerAddress);
      if (storageKey) {
        const storedCharacterId = localStorage.getItem(storageKey);
        if (storedCharacterId) {
          debugLog("Character found in localStorage:", storedCharacterId);
          // Update our state if we find a character ID
          setCharacterId(storedCharacterId);
          return true;
        }
      }
      
      // If not in localStorage, check the blockchain
      debugLog("No character in localStorage, checking blockchain...");
      const characterIdFromChain = await getPlayerCharacterID(ownerAddress);
      
      // If we found a character on the blockchain, it will also be stored in localStorage by getPlayerCharacterID
      return !!characterIdFromChain;
    } catch (error) {
      console.error("Error checking for player character:", error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [getOwnerWalletAddress, getPlayerCharacterID, characterId]);

  // Common helper for getting a read-only provider
  const getReadOnlyProvider = useCallback(() => {
    return new ethers.JsonRpcProvider(RPC_URL);
  }, []);

  // Get the appropriate signer based on operation type
  const getSigner = useCallback((operationType: 'creation' | 'session' | 'gas' | 'movement' | 'combat' | 'equipment' = 'session') => {
    // For character creation, gas refill, and session key updates, use the injected wallet (owner wallet)
    if (operationType === 'creation' || operationType === 'gas') {
      if (!injectedWallet?.signer) {
        throw new Error('No owner wallet connected. Please connect your owner wallet first.');
      }
      return injectedWallet.signer;
    }
    
    // For all other operations (movement, combat, equipment), prefer the embedded wallet (session key)
    if (operationType === 'movement' || operationType === 'combat' || operationType === 'equipment') {
      if (embeddedWallet?.signer) {
        return embeddedWallet.signer;
      }
    }
    
    // Fallback to injected wallet if available
    if (injectedWallet?.signer) {
      return injectedWallet.signer;
    }
    
    throw new Error('No connected wallet found. Please connect a wallet first.');
  }, [injectedWallet, embeddedWallet]);

  // Create a character (strength, vitality, dexterity, quickness, sturdiness, luck)
  const createCharacter = useCallback(async (
    name: string,
    strength: number,
    vitality: number,
    dexterity: number,
    quickness: number,
    sturdiness: number,
    luck: number,
    sessionKey?: string,
    sessionKeyDeadline?: number
  ) => {
    try {
      console.log(`[createCharacter] Creating character "${name}" with stats:`, {
        strength, vitality, dexterity, quickness, sturdiness, luck
      });
      
      if (!injectedWallet?.signer) {
        throw new Error('Owner wallet not available. Please connect your wallet and try again.');
      }
      
      // Use defaults for sessionKey parameters if not provided
      const actualSessionKey = sessionKey || ethers.ZeroAddress;
      const actualDeadline = sessionKeyDeadline || Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
      
      console.log(`[createCharacter] Using session key: ${actualSessionKey}`);
      console.log(`[createCharacter] Session key deadline: ${actualDeadline}`);
      
      // Get the estimated buy-in amount
      const estimatedBuyInAmount = await getEstimatedBuyInAmount();
      console.log(`[createCharacter] Using estimated buy-in amount: ${estimatedBuyInAmount.toString()}`);
      
      // Debug contract interface
      console.log(`[createCharacter] Contract instance available: ${!!injectedContract}`);
      console.log(`[createCharacter] Contract address: ${ENTRYPOINT_ADDRESS}`);
      
      if (!injectedContract) {
        throw new Error('Contract instance not available');
      }
      
      // Debug interface fragments available
      if (injectedContract.interface) {
        console.log(`[createCharacter] Interface fragments count: `, injectedContract.interface.fragments.length);
        
        // Log all function names in the interface to confirm createCharacter exists
        const functionNames = injectedContract.interface.fragments
          .filter((f: any) => f.type === 'function')
          .map((f: any) => f.name);
        
        console.log('[createCharacter] Available functions:', functionNames);
        
        // Check if createCharacter function exists in the ABI
        const hasCreateCharacterFunction = functionNames.includes('createCharacter');
        console.log(`[createCharacter] ABI contains createCharacter: ${hasCreateCharacterFunction}`);
        
        // Find the createCharacter function fragment for more details
        const createCharacterFragment = injectedContract.interface.fragments.find(
          (f: any) => f && f.type === 'function' && f.name === 'createCharacter'
        );
        
        if (createCharacterFragment) {
          console.log(`[createCharacter] CreateCharacter function has ${createCharacterFragment.inputs.length} parameters`);
          console.log(`[createCharacter] Parameter types:`, 
            createCharacterFragment.inputs.map((i: any) => `${i.type} ${i.name}`));
        } else {
          console.warn(`[createCharacter] createCharacter function not found in interface!`);
        }
      }
      
      // Convert all numeric values to BigInt to ensure proper encoding
      const inputParams = {
        name,
        strength: BigInt(strength),
        vitality: BigInt(vitality),
        dexterity: BigInt(dexterity),
        quickness: BigInt(quickness),
        sturdiness: BigInt(sturdiness),
        luck: BigInt(luck),
        sessionKey: actualSessionKey,
        deadline: BigInt(actualDeadline)
      };
      
      console.log(`[createCharacter] Input parameters with BigInt conversion:`, {
        name: inputParams.name,
        strength: inputParams.strength.toString(),
        vitality: inputParams.vitality.toString(),
        dexterity: inputParams.dexterity.toString(),
        quickness: inputParams.quickness.toString(),
        sturdiness: inputParams.sturdiness.toString(),
        luck: inputParams.luck.toString(),
        sessionKey: inputParams.sessionKey,
        deadline: inputParams.deadline.toString()
      });
      
      // Generate transaction options
      const txOptions = { 
        gasLimit: TRANSACTION_GAS_LIMIT * BigInt(2), // Double the gas limit to ensure there's enough gas
        value: estimatedBuyInAmount
      };
        
      console.log(`[createCharacter] Transaction options:`, {
        gasLimit: txOptions.gasLimit.toString(),
        value: txOptions.value.toString()
      });
      
      // Try manual encoding as a test 
      try {
        // Define a test ABI just for the createCharacter function
        const testAbi = ["function createCharacter(string name, uint256 strength, uint256 vitality, uint256 dexterity, uint256 quickness, uint256 sturdiness, uint256 luck, address sessionKey, uint256 sessionKeyDeadline) payable returns (bytes32)"];
        const testInterface = new ethers.Interface(testAbi);
        
        // Encode the function call data using the test interface
        const encodedData = testInterface.encodeFunctionData("createCharacter", [
          inputParams.name,
          inputParams.strength,
          inputParams.vitality,
          inputParams.dexterity,
          inputParams.quickness,
          inputParams.sturdiness,
          inputParams.luck,
          inputParams.sessionKey,
          inputParams.deadline
        ]);
        
        console.log(`[createCharacter] Test encoding produces data (${encodedData.length} bytes):`, 
          encodedData.substring(0, 66) + '...');
        
        // Compare with contract interface encoding
        const contractEncoding = injectedContract.interface.encodeFunctionData(
          "createCharacter", 
          [
            inputParams.name,
            inputParams.strength,
            inputParams.vitality,
            inputParams.dexterity,
            inputParams.quickness,
            inputParams.sturdiness,
            inputParams.luck,
            inputParams.sessionKey,
            inputParams.deadline
          ]
        );
        
        console.log(`[createCharacter] Contract interface encoding produces data (${contractEncoding.length} bytes):`,
          contractEncoding.substring(0, 66) + '...');
          
        console.log(`[createCharacter] Test encoding matches contract encoding: ${encodedData === contractEncoding}`);
      } catch (encodeErr) {
        console.error('[createCharacter] Error in test encoding:', encodeErr);
      }
      
      console.log(`[createCharacter] Calling contract.createCharacter with explicit BigInt parameters...`);
      
      // Send the transaction with explicit BigInt parameters
      const tx = await injectedContract.createCharacter(
        inputParams.name,
        inputParams.strength,
        inputParams.vitality,
        inputParams.dexterity, 
        inputParams.quickness,
        inputParams.sturdiness,
        inputParams.luck,
        inputParams.sessionKey,
        inputParams.deadline,
        txOptions
      );
      
      console.log(`[createCharacter] Transaction sent:`, tx.hash);
      console.log(`[createCharacter] Transaction data:`, tx.data || 'No data');
      
      // Wait for transaction to be mined
      const receipt = ensureReceipt(await tx.wait(), "Create character");
      console.log(`[createCharacter] Character created: ${receipt.hash}, gas used: ${receipt.gasUsed.toString()}`);
      
      // Try to get the character ID from the receipt
      const characterId = await getCharacterIdByTransactionHash(tx.hash);
      
      if (characterId) {
        setCharacterId(characterId);
        
        // Also store in localStorage for the current wallet
        const ownerAddress = getOwnerWalletAddress();
        if (ownerAddress) {
          const storageKey = getCharacterLocalStorageKey(ownerAddress);
          if (storageKey) {
            localStorage.setItem(storageKey, characterId);
          }
        }
      }
      
      return { characterId, transactionHash: tx.hash };
    } catch (err: any) {
      console.error("[createCharacter] Error:", err);
      
      // Add more detailed error logging
      console.error("[createCharacter] Error details:", {
        message: err.message,
        code: err.code,
        reason: err.reason,
        transaction: err.transaction ? {
          from: err.transaction.from,
          to: err.transaction.to,
          data: err.transaction.data || 'No data',
          value: err.transaction.value ? ethers.formatEther(err.transaction.value) + ' ETH' : '0 ETH'
        } : 'No transaction'
      });
      
      throw new Error(err.message || "Error creating character");
    }
  }, [injectedWallet, injectedContract, getCharacterIdByTransactionHash, getOwnerWalletAddress, getEstimatedBuyInAmount, setCharacterId]);

  // Update the moveCharacter function to accept characterId and direction parameters
  const moveCharacter = useCallback(async (characterId: string, direction: string) => {
    try {
      console.log(`[moveCharacter] Moving character ${characterId} in direction ${direction}`);
      
      // First check if we have the embedded wallet properly set up
      if (!embeddedWallet?.signer || !embeddedWallet?.address) {
        console.error('[moveCharacter] Embedded wallet not properly set up', {
          hasSigner: !!embeddedWallet?.signer,
          address: embeddedWallet?.address
        });
        throw new Error('Session key wallet not available or not properly set up. Please reload the page and try again.');
      }
      
      // Then check if we have a contract instance
      if (!embeddedContract) {
        console.error('[moveCharacter] No embedded contract instance available');
        throw new Error('Session key wallet not available. Please connect your wallet and try again.');
      }
      
      // Add debugging for contract instance
      console.log('[moveCharacter] Contract address:', embeddedContract.target);
      
      // Check for move function existence
      const moveFunction = `move${direction.charAt(0).toUpperCase() + direction.slice(1).toLowerCase()}`;
      console.log(`[moveCharacter] Checking for function ${moveFunction}:`, 
        typeof embeddedContract[moveFunction] === 'function');
      
      // Verify character ID format
      if (!characterId || !characterId.startsWith('0x')) {
        console.error('[moveCharacter] Invalid character ID format:', characterId);
        throw new Error('Invalid character ID format');
      }
      
      // Check if character is in combat before moving
      try {
        const areaState = await getAreaCombatState(characterId);
        if (areaState && areaState.inCombat) {
          console.error('[moveCharacter] Character is in combat and cannot move');
          throw new Error('Cannot move while in combat');
        }
      } catch (combatErr) {
        console.warn('[moveCharacter] Failed to check combat state:', combatErr);
        // Continue anyway, the contract will reject if in combat
      }
      
      let tx;
      
      // Call the appropriate direction-specific function
      try {
        switch (direction.toLowerCase()) {
        case 'north':
            tx = await embeddedContract.moveNorth(characterId, { gasLimit: MOVEMENT_GAS_LIMIT });
          break;
        case 'south':
            tx = await embeddedContract.moveSouth(characterId, { gasLimit: MOVEMENT_GAS_LIMIT });
          break;
        case 'east':
            tx = await embeddedContract.moveEast(characterId, { gasLimit: MOVEMENT_GAS_LIMIT });
          break;
        case 'west':
            tx = await embeddedContract.moveWest(characterId, { gasLimit: MOVEMENT_GAS_LIMIT });
          break;
        case 'up':
            tx = await embeddedContract.moveUp(characterId, { gasLimit: MOVEMENT_GAS_LIMIT });
          break;
        case 'down':
            tx = await embeddedContract.moveDown(characterId, { gasLimit: MOVEMENT_GAS_LIMIT });
          break;
          default:
            throw new Error(`Invalid direction: ${direction}`);
        }
        
        console.log(`[moveCharacter] Transaction sent: ${tx.hash}`);
        
        // Add debug logging for the transaction
        console.log(`[moveCharacter] Transaction data:`, {
          data: tx.data,
          from: tx.from,
          to: tx.to,
          gasLimit: tx.gasLimit?.toString(),
          nonce: tx.nonce
        });
      } catch (txErr) {
        console.error('[moveCharacter] Error sending transaction:', txErr);
        
        // Special handling for different error types
        if (typeof txErr === 'object' && txErr !== null) {
          if ('reason' in txErr) {
            console.error('[moveCharacter] Error reason:', (txErr as any).reason);
          }
          if ('code' in txErr) {
            console.error('[moveCharacter] Error code:', (txErr as any).code);
          }
          if ('error' in txErr && (txErr as any).error && 'message' in (txErr as any).error) {
            console.error('[moveCharacter] Inner error message:', (txErr as any).error.message);
          }
        }
        
        // Check if there's an issue with the session key
        const ownerAddress = getOwnerWalletAddress();
        const sessionKey = embeddedWallet?.address;
        
        if (ownerAddress && sessionKey) {
          try {
            // Try to get the current session key for this character
            const currentSessionKey = await getCurrentSessionKey(characterId);
            console.log(`[moveCharacter] Current session key check:`, {
              current: currentSessionKey,
              embedded: sessionKey,
              match: currentSessionKey === sessionKey
            });
            
            // If they don't match, suggest updating the session key
            if (currentSessionKey && currentSessionKey !== sessionKey) {
              throw new Error('Session key mismatch. Please update your session key in the wallet settings.');
            }
          } catch (sessionErr) {
            console.warn('[moveCharacter] Failed to check session key:', sessionErr);
          }
        }
        
        // Re-throw with a more user-friendly message
        throw new Error(`Failed to move ${direction}: ${txErr.message || 'Unknown error'}`);
      }
      
      // Wait for transaction to be mined
      try {
        const receipt = await tx.wait();
        console.log(`[moveCharacter] Move completed: ${receipt.hash}, gas used: ${receipt.gasUsed.toString()}`);
        return receipt;
      } catch (receiptErr) {
        console.error('[moveCharacter] Error getting transaction receipt:', receiptErr);
        
        // Check if transaction was probably executed despite the error
    try {
      const provider = getReadOnlyProvider();
          const txReceipt = await provider.getTransactionReceipt(tx.hash);
          
          if (txReceipt) {
            console.log('[moveCharacter] Transaction was mined:', {
              status: txReceipt.status,
              blockNumber: txReceipt.blockNumber,
              gasUsed: txReceipt.gasUsed.toString()
            });
            
            if (txReceipt.status === 0) {
              throw new Error(`Movement failed: Transaction was reverted by the contract`);
            } else {
              console.log('[moveCharacter] Transaction succeeded despite error getting receipt');
              return txReceipt;
            }
          }
        } catch (checkErr) {
          console.warn('[moveCharacter] Error checking transaction status:', checkErr);
        }
        
        throw new Error(`Movement succeeded but error occurred while waiting for confirmation: ${receiptErr.message}`);
      }
    } catch (err: any) {
      console.error("[moveCharacter] Error:", err);
      
      // Provide better error message for common issues
      if (err.message && err.message.includes('insufficient funds')) {
        throw new Error('Insufficient funds in your wallet. Please add more funds or replenish your gas balance.');
      } else if (err.message && err.message.includes('execution reverted')) {
        throw new Error('Movement rejected by the game. You may be trying to move in an invalid direction or be in combat.');
      } else if (err.message && err.message.includes('nonce too low')) {
        throw new Error('Transaction error: Please reload the page and try again.');
      } else {
        throw new Error(err.message || "Error moving character");
      }
    }
  }, [embeddedContract, embeddedWallet, getAreaCombatState, getOwnerWalletAddress, getCurrentSessionKey, getReadOnlyProvider]);

  // Return all the functions and state that components need
  return {
    characterId,
    loading,
    error,
    dataFeeds,
    eventLogs,
    chatMessages,
    lastFetchedBlock,
    getCurrentSessionKey,
    getContractForOperation,
    getOwnerWalletAddress,
    getPlayerCharacterID,
    getCharacter,
    getCharactersInArea,
    getAreaInfo,
    getAreaCombatState,
    getEstimatedBuyInAmount,
    getMovementOptions,
    getAttackOptions,
    getFrontendData,
    getFullFrontendData,
    attackTarget,
    updateSessionKey,
    getGameState,
    setSessionKeyToEmbeddedWallet,
    sendChatMessage,
    getPlayerCharacters,
    getCharacterIdByTransactionHash,
    equipWeapon,
    equipArmor,
    allocatePoints,
    replenishGasBalance,
    hasPlayerCharacter,
    getReadOnlyProvider,
    getSigner,
    processDataFeeds,
    createCharacter,
    moveCharacter,
    attack: attackTarget
  };
}; 