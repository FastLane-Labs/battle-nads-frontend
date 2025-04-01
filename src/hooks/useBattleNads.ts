import { useState, useCallback, useEffect } from 'react';
import * as ethers from 'ethers';
import { usePrivy } from '@privy-io/react-auth';
import { useWallet } from '../providers/WalletProvider';

// ABI snippets for the Battle-Nads contracts
const ENTRYPOINT_ABI = [
  // Existing functions
  "function executeWithSessionKey(bytes calldata data, bytes calldata sessionKeySignature) external",
  
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
  
  // Estimation functions - recently moved to Getters
  "function estimateBuyInAmountInMON() external view returns (uint256 minAmount)",
  "function estimateBuyInAmountInShMON() external view returns (uint256 minBondedShares)",
  "function shortfallToRecommendedBalanceInMON(bytes32 characterID) external view returns (uint256 minAmount)",
  "function shortfallToRecommendedBalanceInShMON(bytes32 characterID) external view returns (uint256 minBondedShares)"
];

// Use environment variables for contract addresses and RPC URL
const ENTRYPOINT_ADDRESS = "0xD1183C1c028E094FD839Ad508a188Cf7d26AAB48";
const RPC_URL = "https://rpc-testnet.monadinfra.com/rpc/Dp2u0HD0WxKQEvgmaiT4dwCeH9J14C24";

// Maximum safe integer for uint256 in Solidity
const MAX_SAFE_UINT256 = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

// Event interface definition for CharacterCreated event
interface CharacterCreatedEvent {
  characterID: string;
  owner: string;
}

export const useBattleNads = () => {
  const privy = usePrivy();
  const { currentWallet, signer, provider, address } = useWallet();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [characterId, setCharacterId] = useState<string | null>(null);

  // Load stored characterId on mount
  useEffect(() => {
    const storedId = localStorage.getItem('battleNadsCharacterId');
    if (storedId) setCharacterId(storedId);
  }, []);

  // Provide a read-only provider
  const getReadOnlyProvider = useCallback(() => {
    return new ethers.JsonRpcProvider(RPC_URL);
  }, []);

  // Provide the signer from our new WalletProvider context
  const getActiveSigner = useCallback(() => {
    if (!signer || !provider || currentWallet === 'none') {
      throw new Error('No connected wallet found. Please connect a wallet first.');
    }
    return signer;
  }, [signer, provider, currentWallet]);

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
      const activeSigner = getActiveSigner();
      const entrypoint = new ethers.Contract(ENTRYPOINT_ADDRESS, ENTRYPOINT_ABI, activeSigner);

      const buyInAmount = await entrypoint.estimateBuyInAmountInMON();

      // We'll use the same sessionKey param as the connected wallet, for demonstration
      const sessionKey = await activeSigner.getAddress();
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
        const walletAddress = await activeSigner.getAddress();
        const characterIDs = await entrypoint.getPlayerCharacterIDs(walletAddress);
        if (characterIDs.length > 0) {
          newCharacterId = characterIDs[characterIDs.length - 1];
        }
      }

      if (!newCharacterId) {
        throw new Error('Unable to detect newly created character ID');
      }

      setCharacterId(newCharacterId);
      localStorage.setItem('battleNadsCharacterId', newCharacterId);
      return newCharacterId;
    } catch (err: any) {
      setError(err.message || 'Error creating character');
      return null;
    } finally {
      setLoading(false);
    }
  }, [getActiveSigner]);

  // Update moveCharacter to use getActiveSigner
  const moveCharacter = useCallback(async (characterID: string, direction: string) => {
    setLoading(true);
    setError(null);

    try {
      const activeSigner = getActiveSigner();
      const entrypoint = new ethers.Contract(ENTRYPOINT_ADDRESS, ENTRYPOINT_ABI, activeSigner);

      let tx;
      if (direction === 'north') {
        tx = await entrypoint.moveNorth(characterID, { gasLimit: 500000 });
      } else if (direction === 'south') {
        tx = await entrypoint.moveSouth(characterID, { gasLimit: 500000 });
      } else if (direction === 'east') {
        tx = await entrypoint.moveEast(characterID, { gasLimit: 500000 });
      } else if (direction === 'west') {
        tx = await entrypoint.moveWest(characterID, { gasLimit: 500000 });
      } else if (direction === 'up') {
        tx = await entrypoint.moveUp(characterID, { gasLimit: 500000 });
      } else if (direction === 'down') {
        tx = await entrypoint.moveDown(characterID, { gasLimit: 500000 });
      }

      if (tx) {
        await tx.wait();
      }
    } catch (err: any) {
      setError(err.message || `Error moving ${direction}`);
    } finally {
      setLoading(false);
    }
  }, [getActiveSigner]);

  // Update getPlayerCharacterID to use read-only provider
  const getPlayerCharacterID = useCallback(async (ownerAddress: string) => {
    try {
      const roProvider = getReadOnlyProvider();
      const gettersContract = new ethers.Contract(
        ENTRYPOINT_ADDRESS,
        ["function getPlayerCharacterID(address) view returns (bytes32)"],
        roProvider
      );
      const cID = await gettersContract.getPlayerCharacterID(ownerAddress);
      if (cID === '0x0000000000000000000000000000000000000000000000000000000000000000') {
        return null;
      }
      setCharacterId(cID);
      localStorage.setItem('battleNadsCharacterId', cID);
      return cID;
    } catch (err) {
      console.error('Error in getPlayerCharacterID:', err);
      return null;
    }
  }, [getReadOnlyProvider]);

  // Get character data
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

  // Attack a target
  const attackTarget = useCallback(async (characterId: string, targetIndex: number) => {
    setLoading(true);
    setError(null);

    try {
      const activeSigner = getActiveSigner();
      
      const entrypoint = new ethers.Contract(
        ENTRYPOINT_ADDRESS,
        ENTRYPOINT_ABI,
        activeSigner
      );
      
      const tx = await entrypoint.attack(characterId, targetIndex, { gasLimit: 500000 });
      
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
  }, [getActiveSigner]);

  // Equip a weapon
  const equipWeapon = useCallback(async (characterId: string, weaponId: number) => {
    setLoading(true);
    setError(null);

    try {
      const activeSigner = getActiveSigner();
      
      const entrypoint = new ethers.Contract(
        ENTRYPOINT_ADDRESS,
        ENTRYPOINT_ABI,
        activeSigner
      );
      
      const tx = await entrypoint.equipWeapon(characterId, weaponId, { gasLimit: 500000 });
      
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
  }, [getActiveSigner]);
   
  // Equip armor
  const equipArmor = useCallback(async (characterId: string, armorId: number) => {
    setLoading(true);
    setError(null);

    try {
      const activeSigner = getActiveSigner();
      
      const entrypoint = new ethers.Contract(
        ENTRYPOINT_ADDRESS,
        ENTRYPOINT_ABI,
        activeSigner
      );
      
      const tx = await entrypoint.equipArmor(characterId, armorId, { gasLimit: 500000 });
      
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
  }, [getActiveSigner]);

  // Helper for debugging/migrating
  const getCharacterIdByTransactionHash = useCallback(async (txHash: string) => {
    setLoading(true);
    setError(null);

    try {
      const provider = getReadOnlyProvider();
      
      // Get transaction receipt
      console.log(`Fetching receipt for transaction: ${txHash}`);
      const receipt = await provider.getTransactionReceipt(txHash);
      
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
        localStorage.setItem('battleNadsCharacterId', foundCharacterId);
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

  // Replace other methods with similar implementations using getActiveSigner()
  // For example, attackTarget would be updated to use getActiveSigner() similar to moveCharacter

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
    equipWeapon,
    equipArmor,
    getCharacterIdByTransactionHash,
    characterId,
    loading,
    error
  };
}; 