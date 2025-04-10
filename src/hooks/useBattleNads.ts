'use client';

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
  
  // Estimation functions - recently moved to Getters
  "function estimateBuyInAmountInMON() external view returns (uint256 minAmount)",
  "function estimateBuyInAmountInShMON() external view returns (uint256 minBondedShares)",
  "function shortfallToRecommendedBalanceInMON(bytes32 characterID) external view returns (uint256 minAmount)",
  "function shortfallToRecommendedBalanceInShMON(bytes32 characterID) external view returns (uint256 minBondedShares)",
  "function getFrontendData(bytes32 characterID) external view returns (tuple(tuple(uint8 strength, uint8 vitality, uint8 dexterity, uint8 quickness, uint8 sturdiness, uint8 luck, uint8 depth, uint8 x, uint8 y, uint8 index, uint16 health, uint8 sumOfCombatantLevels, uint8 combatants, uint8 nextTargetIndex, uint64 combatantBitMap, uint8 weaponID, uint8 armorID, uint8 level, uint16 experience, bool isMonster) character, tuple(uint8[] memory combatants, uint8[] memory noncombatants) combatants, tuple(uint8[] memory weapons, uint8[] memory armor) equipment, uint256 unallocatedAttributePoints) data)"
];

// Use environment variables for contract addresses and RPC URL
const FALLBACK_ADDRESS = "0xbD4511F188B606e5a74A62b7b0F516d0139d76D5";
const ENTRYPOINT_ADDRESS = ethers.getAddress(process.env.NEXT_PUBLIC_ENTRYPOINT_ADDRESS || FALLBACK_ADDRESS);
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
  const { currentWallet, signer, provider, address, injectedWallet, embeddedWallet } = useWallet();

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
      // Use owner wallet (injected wallet) for character creation transaction
      const ownerSigner = getActiveSigner();
      const entrypoint = new ethers.Contract(ENTRYPOINT_ADDRESS, ENTRYPOINT_ABI, ownerSigner);

      console.log(`[createCharacter] Getting buy-in amount from contract...`);
      let buyInAmount: bigint;
      try {
        // This will return a BigInt from the contract
        buyInAmount = await entrypoint.estimateBuyInAmountInMON();
        console.log(`[createCharacter] Buy-in amount from contract: ${ethers.formatEther(buyInAmount)} ETH (${buyInAmount.toString()} wei)`);
        
        // Add safety margin (50% more) to ensure transaction doesn't fail
        buyInAmount = (buyInAmount * BigInt(150)) / BigInt(100);
        console.log(`[createCharacter] Buy-in amount with safety margin: ${ethers.formatEther(buyInAmount)} ETH (${buyInAmount.toString()} wei)`);
      } catch (err) {
        console.error(`[createCharacter] Error getting buy-in amount:`, err);
        // Default to a reasonably high amount if we can't get the buy-in amount
        buyInAmount = ethers.parseEther("0.01");
        console.log(`[createCharacter] Using default buy-in amount: ${ethers.formatEther(buyInAmount)} ETH (${buyInAmount.toString()} wei)`);
      }

      // Use the embedded wallet address as the session key
      let sessionKey: string;
      if (embeddedWallet?.address) {
        sessionKey = embeddedWallet.address;
        console.log(`[createCharacter] Using embedded wallet as session key: ${sessionKey}`);
      } else {
        console.warn(`[createCharacter] No embedded wallet available, using zero address as session key`);
        sessionKey = ethers.ZeroAddress;
      }
      
      // Use a far future deadline for the session key
      const sessionKeyDeadline = MAX_SAFE_UINT256;
      console.log(`[createCharacter] Session key deadline: ${sessionKeyDeadline}`);

      // Format the transaction options correctly with BigInt value
      const txOptions = {
        value: buyInAmount,
        gasLimit: BigInt(1_000_000)
      };
      
      console.log(`[createCharacter] Creating character with parameters:`, {
        name,
        strength,
        vitality,
        dexterity,
        quickness,
        sturdiness,
        luck,
        sessionKey,
        sessionKeyDeadline,
        txOptions: {
          value: ethers.formatEther(buyInAmount) + " ETH",
          gasLimit: txOptions.gasLimit.toString()
        }
      });

      // Log the signer to confirm we're using the correct wallet
      console.log(`[createCharacter] Transaction will be signed by: ${await ownerSigner.getAddress()}`);
      console.log(`[createCharacter] Injected wallet address: ${injectedWallet?.address}`);
      console.log(`[createCharacter] Embedded wallet address: ${embeddedWallet?.address}`);
      console.log(`[createCharacter] Session key address: ${sessionKey}`);

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
      
      console.log(`[createCharacter] Transaction sent with hash: ${tx.hash}`);
      console.log(`[createCharacter] Waiting for transaction to be mined...`);
      
      const receipt = await tx.wait();
      console.log(`[createCharacter] Transaction mined in block ${receipt.blockNumber}`);
      console.log(`[createCharacter] Gas used: ${receipt.gasUsed.toString()}`);

      // Attempt to parse logs for the CharacterCreated event
      let newCharacterId: string | null = null;
      try {
        const topic = ethers.id('CharacterCreated(bytes32,address)');
        const log = receipt.logs.find((l: any) => l.topics[0] === topic);
        if (log) {
          newCharacterId = ethers.zeroPadValue(log.topics[1], 32);
          console.log(`[createCharacter] Found character ID from event: ${newCharacterId}`);
        }
      } catch (err) {
        console.warn('[createCharacter] Could not parse CharacterCreated event:', err);
      }

      if (!newCharacterId) {
        console.log(`[createCharacter] Character ID not found in events, trying to fetch from contract...`);
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
      localStorage.setItem('battleNadsCharacterId', newCharacterId);
      return newCharacterId;
    } catch (err: any) {
      console.error(`[createCharacter] Error creating character:`, err);
      
      // Try to identify if it's a value-related error
      const errorMessage = err.message || "Unknown error";
      if (
        errorMessage.includes("insufficient funds") || 
        errorMessage.includes("not enough value") || 
        errorMessage.includes("below minimum required")
      ) {
        setError("Error: Insufficient funds for character creation. Make sure your wallet has enough ETH.");
      } else {
        setError(errorMessage || 'Error creating character');
      }
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [getActiveSigner, injectedWallet, embeddedWallet]);

  // Update moveCharacter to use getActiveSigner
  const moveCharacter = useCallback(async (characterID: string, direction: string) => {
    setLoading(true);
    setError(null);

    try {
      const activeSigner = getActiveSigner();
      const entrypoint = new ethers.Contract(ENTRYPOINT_ADDRESS, ENTRYPOINT_ABI, activeSigner);

      let tx;
      if (direction === 'north') {
        tx = await entrypoint.moveNorth(characterID, { gasLimit: 850000 });
      } else if (direction === 'south') {
        tx = await entrypoint.moveSouth(characterID, { gasLimit: 850000 });
      } else if (direction === 'east') {
        tx = await entrypoint.moveEast(characterID, { gasLimit: 850000 });
      } else if (direction === 'west') {
        tx = await entrypoint.moveWest(characterID, { gasLimit: 850000 });
      } else if (direction === 'up') {
        tx = await entrypoint.moveUp(characterID, { gasLimit: 850000 });
      } else if (direction === 'down') {
        tx = await entrypoint.moveDown(characterID, { gasLimit: 850000 });
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

  // Get current session key for a character
  const getCurrentSessionKey = useCallback(async (characterId: string) => {
    try {
      const provider = getReadOnlyProvider();
      const entrypoint = new ethers.Contract(
        ENTRYPOINT_ADDRESS,
        ENTRYPOINT_ABI,
        provider
      );
      
      const sessionKey = await entrypoint.getCurrentSessionKey(characterId);
      return sessionKey;
    } catch (err: any) {
      console.error("Error getting current session key:", err);
      return null;
    }
  }, [getReadOnlyProvider]);

  // Update session key for a character
  const updateSessionKey = useCallback(async (newSessionKey: string, sessionKeyDeadline: string = MAX_SAFE_UINT256) => {
    setLoading(true);
    setError(null);

    try {
      // Must use the owner wallet (injected wallet) to update session keys
      if (!injectedWallet?.signer) {
        throw new Error("Owner wallet (MetaMask) is required to update session keys");
      }
      
      const ownerSigner = injectedWallet.signer;
      const entrypoint = new ethers.Contract(
        ENTRYPOINT_ADDRESS,
        ENTRYPOINT_ABI,
        ownerSigner
      );
      
      console.log(`Updating session key to ${newSessionKey}`);
      
      // Call the updateSessionKey function
      const tx = await entrypoint.updateSessionKey(
        newSessionKey,
        sessionKeyDeadline,
        { gasLimit: 850000 }
      );
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      console.log("Session key updated successfully:", receipt);
      
      return {
        success: true,
        transactionHash: receipt.hash
      };
    } catch (err: any) {
      console.error("Error updating session key:", err);
      setError(err.message || "Error updating session key");
      return {
        success: false,
        error: err.message
      };
    } finally {
      setLoading(false);
    }
  }, [injectedWallet]);

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
          localStorage.setItem('battleNadsCharacterId', characterId);
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
      const storedCharacterId = localStorage.getItem('battleNadsCharacterId');
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
            localStorage.setItem('battleNadsCharacterId', characterId);
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

  // Add getFrontendData implementation
  const getFrontendData = useCallback(async (characterId: string) => {
    setLoading(true);
    setError(null);

    try {
      console.log(`[getFrontendData] Loading all game data for character: ${characterId}`);
      const provider = getReadOnlyProvider();
      const entrypoint = new ethers.Contract(
        ENTRYPOINT_ADDRESS,
        ENTRYPOINT_ABI,
        provider
      );
      
      const frontendData = await entrypoint.getFrontendData(characterId);
      console.log("[getFrontendData] Data loaded successfully");
      
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
            currentId: frontendData[6]
          },
          armor: {
            ids: frontendData[7],
            names: frontendData[8],
            currentId: frontendData[9]
          }
        },
        unallocatedAttributePoints: frontendData[10]
      };
    } catch (err: any) {
      console.error(`[getFrontendData] Error loading game data:`, err);
      setError(err.message || "Error loading game data");
      return null;
    } finally {
      setLoading(false);
    }
  }, [getReadOnlyProvider]);

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
    updateSessionKey,
    getCurrentSessionKey,
    getCharacterIdByTransactionHash,
    getCharacterIdFromLogs,
    getFrontendData,
    characterId,
    loading,
    error
  };
}; 