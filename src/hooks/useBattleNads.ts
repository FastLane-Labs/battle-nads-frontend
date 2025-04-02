import { useState, useCallback, useEffect } from 'react';
import * as ethers from 'ethers';
import { usePrivy } from '@privy-io/react-auth';
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
  const privy = usePrivy();
  const { currentWallet, signer, provider, address, injectedWallet, embeddedWallet } = useWallet();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [characterId, setCharacterId] = useState<string | null>(null);

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
          
          // If this is the primary URL failing, don't set error yet as we'll try the fallback
          if (!usesPrimaryUrl || usedFallback) {
            setError(`Network connection error: ${error.message || "Failed to connect to Monad Testnet"}`);
          }
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
        
        setError(`Failed to connect to Monad Testnet: ${(error as Error)?.message || "Unknown error"}`);
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
          setError("Failed to connect to any Monad Testnet RPC endpoint. Please check your network connection.");
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
      }
    }
    
    // Fallback to injected wallet if available
    if (injectedWallet?.signer) {
      console.log(`[getSigner] Falling back to injected wallet for operation: ${operationType}`);
      return injectedWallet.signer;
    }
    
    // Last resort fallback
    if (signer) {
      console.log(`[getSigner] Using active wallet signer for operation: ${operationType}`);
      return signer;
    }
    
    throw new Error('No connected wallet found. Please connect a wallet first.');
  }, [injectedWallet, embeddedWallet, signer]);

  // Replace existing createCharacter with unified approach using WalletProvider
  const createCharacter = useCallback(async (
    name: string,
    strength: number,
    vitality: number,
    dexterity: number,
    quickness: number,
    sturdiness: number,
    luck: number
  ) => {
    setLoading(true);
    setError(null);

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
      setError(err.message || 'Error creating character');
      return null;
    } finally {
      setLoading(false);
    }
  }, [getSigner]);

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
      // Use retry mechanism for better resilience
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
      console.error(`[getCurrentSessionKey] Failed after retries:`, err);
      throw new Error(`Failed to get session key: ${(err as Error)?.message || "Unknown error"}`);
    }
  }, [getReadOnlyProvider]);

  // Now declare moveCharacter AFTER getCurrentSessionKey
  const moveCharacterImpl = useCallback(async (characterID: string, direction: string) => {
    setLoading(true);
    setError(null);

    try {
      console.log(`[moveCharacter] Starting movement ${direction} for character ${characterID}`);
      
      // Check if the session key is properly set before moving
      try {
        if (embeddedWallet?.address) {
          const currentSessionKey = await getCurrentSessionKey(characterID);
          console.log(`[moveCharacter] Current session key from contract: ${currentSessionKey}`);
          console.log(`[moveCharacter] Session key matches embedded wallet: ${embeddedWallet.address.toLowerCase() === currentSessionKey?.toLowerCase()}`);
          
          if (!currentSessionKey || currentSessionKey.toLowerCase() !== embeddedWallet.address.toLowerCase()) {
            console.warn(`[moveCharacter] Session key mismatch - should update session key first!`);
            console.warn(`[moveCharacter] Embedded wallet: ${embeddedWallet.address}`);
            console.warn(`[moveCharacter] Current session key: ${currentSessionKey}`);
          }
        } else {
          console.warn('[moveCharacter] No embedded wallet available for session key');
        }
      } catch (error) {
        console.error('[moveCharacter] Error checking session key:', error);
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
      } catch (error) {
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
      
      // Debug the contract interface to verify it's constructed properly
      const iface = new ethers.Interface(ENTRYPOINT_ABI);
      const encodedData = direction === 'north' 
        ? iface.encodeFunctionData("moveNorth", [formattedCharacterID])
        : direction === 'south'
        ? iface.encodeFunctionData("moveSouth", [formattedCharacterID])
        : direction === 'east'
        ? iface.encodeFunctionData("moveEast", [formattedCharacterID])
        : direction === 'west'
        ? iface.encodeFunctionData("moveWest", [formattedCharacterID])
        : direction === 'up'
        ? iface.encodeFunctionData("moveUp", [formattedCharacterID])
        : iface.encodeFunctionData("moveDown", [formattedCharacterID]);
      
      console.log(`[moveCharacter] Encoded movement data: ${encodedData}`);
      
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
      }
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
      
      setError(err.message || `Error moving ${direction}`);
    } finally {
      setLoading(false);
    }
  }, [getSigner, embeddedWallet, injectedWallet, getCurrentSessionKey]);

  // Get character data - moved before getPlayerCharacterID to resolve dependency
  const getCharacter = useCallback(async (characterId: string) => {
    setLoading(true);
    setError(null);

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
      setError(err.message || "Error getting character");
      return null;
    } finally {
      setLoading(false);
    }
  }, [getReadOnlyProvider]);

  // Update session key for a character
  const updateSessionKey = useCallback(async (newSessionKey: string, sessionKeyDeadline: string = MAX_SAFE_UINT256) => {
    setLoading(true);
    setError(null);

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
      
      // First, try to estimate the gas required to better understand requirements
      try {
        console.log(`[updateSessionKey] Attempting to estimate gas for transaction...`);
        const gasEstimate = await entrypoint.updateSessionKey.estimateGas(
          newSessionKey,
          sessionKeyDeadline,
          { value: ethers.parseEther("0.0001") } // Adding small value to ensure estimation works
        );
        console.log(`[updateSessionKey] Estimated gas required: ${gasEstimate.toString()}`);
        console.log(`[updateSessionKey] Using 3x the estimated gas as safety margin`);
      } catch (estimateErr) {
        console.error(`[updateSessionKey] Failed to estimate gas:`, estimateErr);
        console.log(`[updateSessionKey] Will use high fixed gas limit instead`);
      }
      
      // Try to get recommended balance for funding the session key
      let valueToSend = ethers.parseEther("0.0001"); // Default small amount
      try {
        const provider = getReadOnlyProvider();
        const readContract = new ethers.Contract(
          ENTRYPOINT_ADDRESS,
          ["function shortfallToRecommendedBalanceInMON(bytes32 characterID) external view returns (uint256 minAmount)"],
          provider
        );
        
        // If we have a character ID, get recommended balance
        if (characterId) {
          console.log(`[updateSessionKey] Getting recommended balance for character: ${characterId}`);
          const recommendedBalance = await readContract.shortfallToRecommendedBalanceInMON(characterId);
          console.log(`[updateSessionKey] Recommended balance from contract: ${recommendedBalance.toString()}`);
          
          if (recommendedBalance > BigInt(0)) {
            valueToSend = recommendedBalance;
          }
        }
      } catch (balanceErr) {
        console.error(`[updateSessionKey] Error getting recommended balance:`, balanceErr);
      }
      
      console.log(`[updateSessionKey] Using value for transaction: ${ethers.formatEther(valueToSend)} ETH`);
      
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
      
      setError(errorMessage || "Error updating session key");
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [getSigner, getReadOnlyProvider, characterId]);

  // Try to estimate gas for the transaction
  const estimateGas = useCallback(async (transaction: any) => {
    try {
      console.log("Estimating gas for transaction...");
      // Your gas estimation logic here
      return 1_000_000; // Default gas limit
    } catch (err) {
      console.error("Error estimating gas:", err);
      return 1_000_000; // Default to safe value
    }
  }, []);
  
  // Add a function to check for characters from contract logs as a last resort
  const getCharacterIdFromLogs = useCallback(async (ownerAddress: string) => {
    console.log("Checking for character creation events from contract logs...");
    
    try {
      const provider = getReadOnlyProvider();
      
      // Define the CharacterCreated event topic
      const characterCreatedTopic = ethers.id('CharacterCreated(bytes32,address)');
      
      // Filter configuration
      const filter = {
        address: ENTRYPOINT_ADDRESS,
        topics: [
          characterCreatedTopic,
          null,  // Any character ID
          ethers.zeroPadValue(ownerAddress.toLowerCase(), 32)  // Owner address as the indexed parameter
        ],
        fromBlock: 0,
        toBlock: 'latest'
      };
      
      console.log("Querying logs with filter:", filter);
      
      // Query the logs
      const logs = await provider.getLogs(filter);
      console.log("Logs found:", logs.length);
      
      if (logs.length > 0) {
        // Get the most recent character creation event
        const latestLog = logs[logs.length - 1];
        console.log("Latest character creation log:", latestLog);
        
        // Character ID is in the first indexed parameter
        const characterId = logs[0].topics[1];
        console.log("Character ID from logs:", characterId);
        
        if (characterId) {
          // Store it in localStorage for future use
          localStorage.setItem(LOCALSTORAGE_KEY, characterId);
          setCharacterId(characterId);
          return characterId;
        }
      }
      
      return null;
    } catch (err) {
      console.error("Error querying contract logs:", err);
      return null;
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
  
  // Update getPlayerCharacterID to use the smart contract function directly without logs fallback
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
      
      // Use the getPlayerCharacterID function from the smart contract with retry
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
          console.error("Error calling getPlayerCharacterID after retries:", err);
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

  // Get characters in area
  const getCharactersInArea = useCallback(async (depth: number, x: number, y: number) => {
    setLoading(true);
    setError(null);

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
      setError(err.message || "Error getting characters in area");
      return [];
    } finally {
      setLoading(false);
    }
  }, [getReadOnlyProvider]);

  // Get player characters
  const getPlayerCharacters = useCallback(async (address: string) => {
    setLoading(true);
    setError(null);

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
      setError(err.message || "Error getting player characters");
      return [];
    } finally {
      setLoading(false);
    }
  }, [getReadOnlyProvider]);

  // Get area information including monsters, players, etc.
  const getAreaInfo = useCallback(async (depth: number, x: number, y: number) => {
    setLoading(true);
    setError(null);

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
      setError(err.message || "Error getting area information");
      return null;
    } finally {
      setLoading(false);
    }
  }, [getReadOnlyProvider]);

  // Get combat state for a character (enemies, target index, etc.)
  const getAreaCombatState = useCallback(async (characterId: string) => {
    setLoading(true);
    setError(null);

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
      setError(err.message || "Error getting combat state");
      return null;
    } finally {
      setLoading(false);
    }
  }, [getReadOnlyProvider]);

  // Get movement options for a character
  const getMovementOptions = useCallback(async (characterId: string) => {
    setLoading(true);
    setError(null);

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
      setError(err.message || "Error getting movement options");
      return null;
    } finally {
      setLoading(false);
    }
  }, [getReadOnlyProvider]);

  // Get attack options for a character
  const getAttackOptions = useCallback(async (characterId: string) => {
    setLoading(true);
    setError(null);

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
      setError(err.message || "Error getting attack options");
      return null;
    } finally {
      setLoading(false);
    }
  }, [getReadOnlyProvider]);

  // Attack a target - use session key
  const attackTarget = useCallback(async (characterId: string, targetIndex: number) => {
    setLoading(true);
    setError(null);

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
      setError(err.message || "Error attacking target");
      return false;
    } finally {
      setLoading(false);
    }
  }, [getSigner]);

  // Equip a weapon - use session key
  const equipWeapon = useCallback(async (characterId: string, weaponId: number) => {
    setLoading(true);
    setError(null);

    try {
      // Use session key (embedded wallet) for equipment
      const equipmentSigner = getSigner('equipment');
      
      const entrypoint = new ethers.Contract(
        ENTRYPOINT_ADDRESS,
        ENTRYPOINT_ABI,
        equipmentSigner
      );
      
      const tx = await entrypoint.equipWeapon(characterId, weaponId, { gasLimit: 850000 });
      
      // Wait for transaction to be mined
      await tx.wait();
      
      return true;
    } catch (err: any) {
      console.error("Error equipping weapon:", err);
      setError(err.message || "Error equipping weapon");
      return false;
    } finally {
      setLoading(false);
    }
  }, [getSigner]);
   
  // Equip armor - use session key
  const equipArmor = useCallback(async (characterId: string, armorId: number) => {
    setLoading(true);
    setError(null);

    try {
      // Use session key (embedded wallet) for equipment
      const equipmentSigner = getSigner('equipment');
      
      const entrypoint = new ethers.Contract(
        ENTRYPOINT_ADDRESS,
        ENTRYPOINT_ABI,
        equipmentSigner
      );
      
      const tx = await entrypoint.equipArmor(characterId, armorId, { gasLimit: 850000 });
      
      // Wait for transaction to be mined
      await tx.wait();
      
      return true;
    } catch (err: any) {
      console.error("Error equipping armor:", err);
      setError(err.message || "Error equipping armor");
      return false;
    } finally {
      setLoading(false);
    }
  }, [getSigner]);

  // Helper for debugging/migrating
  const getCharacterIdByTransactionHash = useCallback(async (txHash: string) => {
    setLoading(true);
    setError(null);

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
      setError(err.message || "Error getting character ID");
      return null;
    } finally {
      setLoading(false);
    }
  }, [getReadOnlyProvider]);

  // Get all frontend data in one call - most efficient way to load game state
  const getFrontendData = useCallback(async (characterId: string) => {
    setLoading(true);
    setError(null);

    try {
      console.log("Loading frontend data for character:", characterId);
      const provider = getReadOnlyProvider();
          const entrypoint = new ethers.Contract(
            ENTRYPOINT_ADDRESS,
            ENTRYPOINT_ABI,
            provider
          );
      const frontendData = await entrypoint.getFrontendData(characterId);
      
      console.log("Frontend data loaded successfully:", frontendData);
      
      // Return a structured object for easier use in the UI
      return {
        character: frontendData[0],
        combatants: frontendData[1],
        noncombatants: frontendData[2],
        miniMap: frontendData[3],
        equipment: {
          weapons: {
            ids: frontendData[4],
            names: frontendData[5],
            currentId: frontendData[6] // Assuming this is returned in the ABI
          },
          armor: {
            ids: frontendData[6],
            names: frontendData[7],
            currentId: frontendData[8] // Assuming this is returned in the ABI
          }
        },
        unallocatedAttributePoints: frontendData[8]
      };
    } catch (err: any) {
      console.error("Error getting frontend data after retries:", err);
      setError(err.message || "Error getting game data");
      return null;
    } finally {
      setLoading(false);
    }
  }, [getReadOnlyProvider]);

  // Set the session key to the current embedded wallet address
  const setSessionKeyToEmbeddedWallet = useCallback(async (characterId: string) => {
    setLoading(true);
    setError(null);

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
      setError(err.message || "Error setting session key");
      return {
        success: false,
        error: err.message
      };
    } finally {
      setLoading(false);
    }
  }, [embeddedWallet, updateSessionKey, getCurrentSessionKey]);

  // Debug what functions were created
  console.log("useBattleNads exporting with functions:", {
    updateSessionKey: typeof updateSessionKey === 'function',
    getCurrentSessionKey: typeof getCurrentSessionKey === 'function',
    setSessionKeyToEmbeddedWallet: typeof setSessionKeyToEmbeddedWallet === 'function'
  });

  return {
    createCharacter,
    moveCharacter: moveCharacterImpl,
    getPlayerCharacterID,
    getCharacter,
    getCharactersInArea,
    getPlayerCharacters,
    getAreaInfo,
    getAreaCombatState,
    getMovementOptions,
    getAttackOptions,
    attackTarget,
    equipWeapon,
    equipArmor,
    updateSessionKey,
    getCurrentSessionKey,
    getCharacterIdByTransactionHash,
    getCharacterIdFromLogs,
    getFrontendData,
    characterId,
    loading,
    error,
    setSessionKeyToEmbeddedWallet
  };
}; 