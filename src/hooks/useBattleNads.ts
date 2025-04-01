import { useState, useCallback, useEffect } from 'react';
import * as ethers from 'ethers';
import { usePrivy } from '@privy-io/react-auth';

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
const CHAIN_ID = 10143;

// Maximum safe integer for uint256 in Solidity
const MAX_SAFE_UINT256 = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

// Event interface definition for CharacterCreated event
interface CharacterCreatedEvent {
  characterID: string;
  owner: string;
}

export const useBattleNads = () => {
  const privy = usePrivy();
  const { user, authenticated, ready } = privy;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [characterId, setCharacterId] = useState<string | null>(null);

  // Load character ID from localStorage on mount
  useEffect(() => {
    const storedCharacterId = localStorage.getItem('battleNadsCharacterId');
    if (storedCharacterId) {
      setCharacterId(storedCharacterId);
    }
  }, []);

  // Get a read-only provider (doesn't require authentication)
  const getReadOnlyProvider = useCallback(() => {
    return new ethers.JsonRpcProvider(RPC_URL);
  }, []);

  // Get Privy wallet with real signer
  const getWalletSigner = useCallback(async () => {
    if (!authenticated || !user?.wallet?.address) {
      throw new Error("User not authenticated or no wallet found");
    }

    try {
      // Get an ethers-compatible provider from Privy
      const userWallet = user.wallet;
      console.log("Using wallet address:", userWallet.address);
      
      // Request the user to connect their wallet if not already connected
      // This will use the Privy interface to handle wallet connection
      await privy.connectWallet();
      
      // Get the provider from window.ethereum
      // This assumes Privy has injected the provider into window.ethereum
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Check if we're on the correct network
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);
      
      if (chainId !== CHAIN_ID) {
        console.log(`Wrong network detected: ${chainId}, requesting switch to ${CHAIN_ID}`);
        try {
          // Request network switch
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }]
          });
        } catch (switchError) {
          throw new Error(`Please switch to Monad Testnet (chainId: ${CHAIN_ID})`);
        }
      }
      
      // Get signer from the provider
      const signer = await provider.getSigner();
      
      // Check that the signer address matches the connected wallet
      const signerAddress = await signer.getAddress();
      console.log("Signer address:", signerAddress);
      
      if (signerAddress.toLowerCase() !== userWallet.address.toLowerCase()) {
        console.warn("Signer address doesn't match wallet address. Using signer address.");
      }
      
      // Get embedded wallet address for session key
      // For now, using the primary wallet address as session key
      // This should be replaced with actual embedded wallet when available
      const embeddedWalletAddress = userWallet.address;
      
      return {
        provider,
        signer,
        embeddedWalletAddress
      };
    } catch (err) {
      console.error("Error getting wallet signer:", err);
      throw err;
    }
  }, [authenticated, user, privy]);

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

  // Create a character with an actual blockchain transaction
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
      // Get wallet signer
      const { signer, provider, embeddedWalletAddress } = await getWalletSigner();
      
      if (!embeddedWalletAddress) {
        throw new Error("No wallet available for session key");
      }
      
      console.log("Using wallet as session key:", embeddedWalletAddress);
      
      // Create contract instance with signer
      const entrypoint = new ethers.Contract(
        ENTRYPOINT_ADDRESS,
        ENTRYPOINT_ABI,
        signer
      );
      
      // Get the buy-in amount required to create a character
      const buyInAmount = await entrypoint.estimateBuyInAmountInMON();
      console.log("Required buy-in amount:", ethers.formatEther(buyInAmount), "MONAD");
      
      // Set sessionKeyDeadline to maximum safe value
      const sessionKeyDeadline = MAX_SAFE_UINT256;
      console.log("Using session key deadline:", sessionKeyDeadline);
      
      // Create transaction options with gas limit
      const txOptions = {
        value: buyInAmount,
        gasLimit: 1000000
      };
      
      console.log("Sending createCharacter transaction with params:", {
        name, strength, vitality, dexterity, quickness, sturdiness, luck,
        sessionKey: embeddedWalletAddress,
        sessionKeyDeadline,
        txOptions
      });
      
      // Send the actual transaction
      const tx = await entrypoint.createCharacter(
        name,
        strength,
        vitality,
        dexterity,
        quickness,
        sturdiness,
        luck,
        embeddedWalletAddress,  // Use wallet as session key
        sessionKeyDeadline,
        txOptions
      );
      
      console.log("Character creation transaction sent:", tx.hash);
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      console.log("Transaction mined:", receipt);
      
      // Get character ID from transaction logs (if possible)
      let newCharacterId: string | null = null;
      
      try {
        // Try to parse logs for CharacterCreated event
        const topic = ethers.id("CharacterCreated(bytes32,address)");
        const log = receipt.logs.find(log => log.topics[0] === topic);
        
        if (log) {
          const data = log.data;
          const topics = log.topics;
          
          // Parse the event data
          newCharacterId = ethers.zeroPadValue(topics[1], 32);
          console.log("Character ID from event:", newCharacterId);
        }
      } catch (logError) {
        console.warn("Could not parse CharacterCreated event:", logError);
      }
      
      // If event parsing failed, try getting character IDs directly
      if (!newCharacterId) {
        console.log("Falling back to character ID lookup by address");
        const walletAddress = await signer.getAddress();
        const characterIds = await entrypoint.getPlayerCharacterIDs(walletAddress);
        if (characterIds && characterIds.length > 0) {
          newCharacterId = characterIds[characterIds.length - 1]; // Get the latest one
          console.log("Character ID from lookup:", newCharacterId);
        }
      }
      
      if (!newCharacterId) {
        throw new Error("Could not determine character ID after creation");
      }
      
      // Store character ID in local state and localStorage
      setCharacterId(newCharacterId);
      localStorage.setItem('battleNadsCharacterId', newCharacterId);
      
      return newCharacterId;
    } catch (err: any) {
      console.error("Error creating character:", err);
      setError(err.message || "Error creating character");
      return null;
    } finally {
      setLoading(false);
    }
  }, [getWalletSigner]);

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

  // Add debugging for errors
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
      
      console.log("Transaction receipt:", receipt);
      
      // Try to find the character ID from the logs
      let foundCharacterId: string | null = null;
      
      try {
        // Try to parse logs for CharacterCreated event
        const topic = ethers.id("CharacterCreated(bytes32,address)");
        console.log("Looking for topic:", topic);
        
        const log = receipt.logs.find(log => {
          console.log("Log topic:", log.topics[0]);
          return log.topics[0] === topic;
        });
        
        if (log) {
          console.log("Found matching log:", log);
          const topics = log.topics;
          
          // Parse the event data
          foundCharacterId = ethers.zeroPadValue(topics[1], 32);
          console.log("Character ID from event:", foundCharacterId);
        } else {
          console.log("No matching log found with topic:", topic);
          console.log("Available logs:", receipt.logs);
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

  // Check if an address has a character ID
  const getPlayerCharacterID = useCallback(async (ownerAddress: string) => {
    try {
      const provider = getReadOnlyProvider();
      
      // Create a contract instance for the Getters contract
      const gettersContract = new ethers.Contract(
        ENTRYPOINT_ADDRESS, // Same address as entrypoint
        ["function getPlayerCharacterID(address owner) external view returns (bytes32 characterID)"],
        provider
      );
      
      console.log(`Checking if address ${ownerAddress} has a character ID...`);
      
      // Call the getPlayerCharacterID function
      const characterID = await gettersContract.getPlayerCharacterID(ownerAddress);
      
      console.log(`Result for ${ownerAddress}:`, characterID);
      
      // Check if the character ID is a zero bytes32 value (indicating no character)
      const isZeroBytes32 = characterID === '0x0000000000000000000000000000000000000000000000000000000000000000';
      
      if (isZeroBytes32) {
        console.log(`Address ${ownerAddress} has no character ID`);
        return null;
      }
      
      // Store the character ID
      setCharacterId(characterID);
      localStorage.setItem('battleNadsCharacterId', characterID);
      
      return characterID;
    } catch (err: any) {
      console.error(`Error checking character ID for ${ownerAddress}:`, err);
      // If the function reverts, it probably means there's no character
      return null;
    }
  }, [getReadOnlyProvider]);

  return {
    createCharacter,
    getCharacter,
    getCharactersInArea,
    getPlayerCharacters,
    getCharacterIdByTransactionHash,
    getPlayerCharacterID,
    loading,
    error,
    characterId,
    isAuthenticated: authenticated
  };
}; 