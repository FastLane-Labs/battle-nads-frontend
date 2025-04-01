'use client';

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
];

// Contract address
const ENTRYPOINT_ADDRESS = "0x1234567890123456789012345678901234567890"; // Replace with the real address

// RPC URL for Monad testnet
const RPC_URL = "https://rpc-testnet.monadinfra.com/rpc/Dp2u0HD0WxKQEvgmaiT4dwCeH9J14C24";

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

  // Create character
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
      
      const entrypoint = new ethers.Contract(
        ENTRYPOINT_ADDRESS,
        ENTRYPOINT_ABI,
        activeSigner
      );
      
      // Using zero values for session key parameters as they're not relevant yet
      const tx = await entrypoint.createCharacter(
        name,
        strength,
        vitality, 
        dexterity,
        quickness,
        sturdiness,
        luck,
        ethers.ZeroAddress, // No session key for now
        0, // No deadline
        { 
          gasLimit: 1000000,
          value: ethers.parseEther("0.0001") // Small fee to prevent spam
        }
      );
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      // Try to extract character ID from logs
      if (receipt && receipt.logs) {
        // Attempt to parse logs for CharacterCreated event
        // This would need proper event parsing logic based on the actual event format
        console.log("Transaction successful, receipt:", receipt);
      }
      
      return true;
    } catch (err: any) {
      console.error("Error creating character:", err);
      setError(err.message || "Error creating character");
      return false;
    } finally {
      setLoading(false);
    }
  }, [getActiveSigner]);

  // Move character
  const moveCharacter = useCallback(async (characterId: string, direction: 'north' | 'south' | 'east' | 'west' | 'up' | 'down') => {
    setLoading(true);
    setError(null);

    try {
      const activeSigner = getActiveSigner();
      
      const entrypoint = new ethers.Contract(
        ENTRYPOINT_ADDRESS,
        ENTRYPOINT_ABI,
        activeSigner
      );
      
      let tx;
      
      // Call the appropriate movement function
      switch (direction) {
        case 'north':
          tx = await entrypoint.moveNorth(characterId, { gasLimit: 500000 });
          break;
        case 'south':
          tx = await entrypoint.moveSouth(characterId, { gasLimit: 500000 });
          break;
        case 'east':
          tx = await entrypoint.moveEast(characterId, { gasLimit: 500000 });
          break;
        case 'west':
          tx = await entrypoint.moveWest(characterId, { gasLimit: 500000 });
          break;
        case 'up':
          tx = await entrypoint.moveUp(characterId, { gasLimit: 500000 });
          break;
        case 'down':
          tx = await entrypoint.moveDown(characterId, { gasLimit: 500000 });
          break;
        default:
          throw new Error(`Invalid direction: ${direction}`);
      }
      
      // Wait for transaction to be mined
      await tx.wait();
      
      return true;
    } catch (err: any) {
      console.error(`Error moving ${direction}:`, err);
      setError(err.message || `Error moving ${direction}`);
      return false;
    } finally {
      setLoading(false);
    }
  }, [getActiveSigner]);

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

  // Get player character ID
  const getPlayerCharacterID = useCallback(async (ownerAddress: string) => {
    try {
      const roProvider = getReadOnlyProvider();
      
      // Use provider.call directly to bypass ethers decoding
      try {
        // Get function signature and encode the parameters
        const functionSignature = "getPlayerCharacterID(address)";
        const functionSelector = ethers.keccak256(ethers.toUtf8Bytes(functionSignature)).slice(0, 10);
        const encodedParams = ethers.AbiCoder.defaultAbiCoder().encode(
          ["address"],
          [ownerAddress]
        );
        
        // Combine function selector and encoded parameters
        const callData = functionSelector + encodedParams.slice(2);
        
        // Make a direct call to avoid the decoding issue
        const result = await roProvider.call({
          to: ENTRYPOINT_ADDRESS,
          data: callData
        });
        
        // Check for empty results or all zeros
        if (!result || result === '0x' || result === '0x0000000000000000000000000000000000000000000000000000000000000000') {
          console.log('No character found for address:', ownerAddress);
          return null;
        }
        
        // Store the character ID and return it
        setCharacterId(result);
        localStorage.setItem('battleNadsCharacterId', result);
        return result;
      } catch (contractErr) {
        console.error('Contract call error in getPlayerCharacterID:', contractErr);
        // For empty response "0x", we'll just return null to indicate no character
        return null;
      }
    } catch (err) {
      console.error('Provider error in getPlayerCharacterID:', err);
      return null;
    }
  }, [getReadOnlyProvider]);

  return {
    createCharacter,
    moveCharacter,
    getPlayerCharacterID,
    getCharacter,
    getCharactersInArea,
    attackTarget,
    characterId,
    loading,
    error
  };
}; 