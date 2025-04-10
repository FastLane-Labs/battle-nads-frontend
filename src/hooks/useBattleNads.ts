import { useState, useCallback, useEffect } from 'react';
import * as ethers from 'ethers';
import { useWallet } from '../providers/WalletProvider';
import { useContracts } from './useContracts';
import { parseFrontendData, createGameState } from '../utils/gameDataConverters';
import { GameState } from '../types/gameTypes';
import { getCharacterLocalStorageKey } from '../utils/getCharacterLocalStorageKey';

// Maximum safe integer for uint256 in Solidity
const MAX_SAFE_UINT256 = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

export const useBattleNads = () => {
  console.log("useBattleNads hook initialized");
  const { injectedWallet, embeddedWallet } = useWallet();
  const { readContract, injectedContract, embeddedContract, error: contractError } = useContracts();

  // Keep minimal state for the hook itself
  const [characterId, setCharacterId] = useState<string | null>(null);
  // Add loading and error states for backward compatibility
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(contractError);

  // Update error state when contract error changes
  useEffect(() => {
    if (contractError) {
      setError(contractError);
    }
  }, [contractError]);

  // Add back effect to load characterId from localStorage on mount
  useEffect(() => {
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
          console.log(`[useBattleNads] Initializing with stored character ID: ${storedId}`);
          setCharacterId(storedId);
        }
      }
    }
  }, [injectedWallet?.address]);

  // Get current session key for a character
  const getCurrentSessionKey = useCallback(async (characterId: string) => {
    try {
      console.log(`[getCurrentSessionKey] Getting session key for character ${characterId}`);
      
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
      
      console.log(`[getCurrentSessionKey] Found session key: ${sessionKeyAddress}`);
      return sessionKeyAddress;
    } catch (err) {
      console.error(`[getCurrentSessionKey] Failed:`, err);
      return null; // Return null instead of throwing to prevent cascading errors
    }
  }, [readContract]);

  // Helper to select the appropriate contract based on operation type
  const getContractForOperation = useCallback((operationType: 'creation' | 'session' | 'gas' | 'movement' | 'combat' | 'equipment' | 'read' = 'session') => {
    console.log(`[getContractForOperation] Operation type: ${operationType}`);
    
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
  const getPlayerCharacterID = useCallback(async (addressToCheck?: string) => {
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
      console.log(`No stored character ID in localStorage for ${ownerAddress}, checking blockchain`);
      
      if (!readContract) {
        throw new Error("No contract available to check character ID");
      }
      
      // Use the getPlayerCharacterID function from the smart contract
      if (ownerAddress) {
        try {
          console.debug("Checking for character with the getPlayerCharacterID function");

          const characterId = await readContract.getPlayerCharacterID(ownerAddress);
          
          if (characterId) {
            // Check if character exists (not zero bytes)
            const isZeroBytes = characterId === "0x0000000000000000000000000000000000000000000000000000000000000000";
            console.debug("Character ID from contract call:", characterId, "Is zero bytes:", isZeroBytes);
            
            if (!isZeroBytes) {
              console.log("Character found:", characterId);
              setCharacterId(characterId);
              localStorage.setItem(storageKey, characterId);
              return characterId;
            }
          }
          
          console.log("No character found for address:", ownerAddress);
          return null;
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
  }, [readContract, getOwnerWalletAddress, injectedWallet]);

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

  // Get full game state and update the Recoil atom - hybrid function (backward compatibility)
  const getGameState = useCallback(async (characterId: string): Promise<GameState | null> => {
    if (!characterId) {
      console.error("getGameState called without characterId");
      return null;
    }
    
    try {
      // Set loading state for backward compatibility
      setLoading(true);
      
      const frontendDataRaw = await getFrontendData(characterId);
      
      if (!frontendDataRaw) {
        setError("Failed to load game data");
        return null;
      }
      
      // Parse the raw data
      const parsedData = parseFrontendData(frontendDataRaw);
      
      // Create a structured game state
      const gameState = createGameState(parsedData);
      
      console.log("[getGameState] Game state fetched successfully");
      return gameState;
    } catch (err) {
      console.error("[getGameState] Error:", err);
      const errorMsg = `Failed to load game state: ${(err as Error)?.message || "Unknown error"}`;
      
      // Set local error state for backward compatibility
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [getFrontendData]);

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
      const contract = getContractForOperation('creation');
      if (!contract) throw new Error("No owner wallet contract available for character creation");
      
      if (!readContract) throw new Error("No read contract available for character creation");

      const buyInAmount = await readContract.estimateBuyInAmountInMON();

      // Use the owner wallet address as the sessionKey
      const sessionKey = await injectedWallet?.signer?.getAddress();
      if (!sessionKey) throw new Error("No owner wallet address available");
      
      const sessionKeyDeadline = MAX_SAFE_UINT256;

      const txOptions = {
        value: buyInAmount,
        gasLimit: 1_000_000,
      };

      const tx = await contract.createCharacter(
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
      if (!receipt) {
        throw new Error("Transaction failed: no receipt returned");
      }

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

      if (!newCharacterId && injectedWallet?.signer) {
        // fallback: fetch all IDs owned by current EOA
        const walletAddress = await injectedWallet.signer.getAddress();
        const characterID = await readContract.getPlayerCharacterID(walletAddress);
        if (characterID && characterID !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
          newCharacterId = characterID;
        }
      }

      if (!newCharacterId) {
        throw new Error('Unable to detect newly created character ID');
      }

      // Get the owner address for storage key
      const ownerAddress = await injectedWallet?.signer?.getAddress();
      if (!ownerAddress) {
        console.warn('No owner wallet address available to save character ID');
        setCharacterId(newCharacterId);
        return newCharacterId;
      }

      // Get wallet-specific storage key
      const storageKey = getCharacterLocalStorageKey(ownerAddress);
      if (!storageKey) {
        console.warn(`Could not generate storage key for address: ${ownerAddress}`);
        setCharacterId(newCharacterId);
        return newCharacterId;
      }

      setCharacterId(newCharacterId);
      localStorage.setItem(storageKey, newCharacterId);
      return newCharacterId;
    } catch (err: any) {
      console.error("Error creating character:", err);
      throw new Error(err.message || 'Error creating character');
    }
  }, [getContractForOperation, readContract, injectedWallet?.signer]);

  // Move character - pure blockchain call
  const moveCharacter = useCallback(async (characterID: string, direction: string) => {
    try {
      console.log(`[moveCharacter] Moving ${direction} for character ${characterID}`);
      
      // Directly use the embedded contract for movement
      if (!embeddedContract) {
        throw new Error('Session key wallet not available. Please refresh the page and try again.');
      }
      
      // Set gas limit once for all movements
      const gasLimit = 850000;
      
      let tx;
      // Simple switch for direction
      switch (direction) {
        case 'north': tx = await embeddedContract.moveNorth(characterID, { gasLimit }); break;
        case 'south': tx = await embeddedContract.moveSouth(characterID, { gasLimit }); break;
        case 'east': tx = await embeddedContract.moveEast(characterID, { gasLimit }); break;
        case 'west': tx = await embeddedContract.moveWest(characterID, { gasLimit }); break;
        case 'up': tx = await embeddedContract.moveUp(characterID, { gasLimit }); break;
        case 'down': tx = await embeddedContract.moveDown(characterID, { gasLimit }); break;
        default: throw new Error(`Invalid direction: ${direction}`);
      }

      console.log(`[moveCharacter] Transaction sent: ${tx.hash}`);
      
      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error("Transaction failed: no receipt returned");
      }
      
      console.log(`[moveCharacter] Movement completed: ${receipt.hash}, gas used: ${receipt.gasUsed.toString()}`);
      return true;
    } catch (err: any) {
      console.error('[moveCharacter] Error:', err);
      throw new Error(err.message || `Error moving ${direction}`);
    }
  }, [embeddedContract]);

  // Add null check helper function to reuse in all transaction functions
  const ensureReceipt = (receipt: ethers.TransactionReceipt | null, operation: string): ethers.TransactionReceipt => {
    if (!receipt) {
      throw new Error(`${operation} transaction failed: no receipt returned`);
    }
    return receipt;
  }

  // Attack a target - pure blockchain call
  const attackTarget = useCallback(async (characterId: string, targetIndex: number) => {
    try {
      console.log(`[attackTarget] Attacking target ${targetIndex} with character ${characterId}`);
      
      // Directly use embedded contract for combat
      if (!embeddedContract) {
        throw new Error('Session key wallet not available. Please refresh the page and try again.');
      }
      
      const tx = await embeddedContract.attack(characterId, targetIndex, { gasLimit: 850000 });
      console.log(`[attackTarget] Transaction sent: ${tx.hash}`);
      
      // Wait for transaction to be mined
      const receipt = ensureReceipt(await tx.wait(), "Attack");
      console.log(`[attackTarget] Attack completed: ${receipt.hash}, gas used: ${receipt.gasUsed.toString()}`);
      return true;
    } catch (err: any) {
      console.error("[attackTarget] Error:", err);
      throw new Error(err.message || "Error attacking target");
    }
  }, [embeddedContract]);

  // Update session key - pure blockchain call
  const updateSessionKey = useCallback(async (newSessionKey: string, sessionKeyDeadline: string = MAX_SAFE_UINT256) => {
    try {
      // Must use the owner wallet (injected wallet) to update session keys
      const contract = getContractForOperation('creation');
      if (!contract) throw new Error("No owner wallet contract available for session key update");
      
      console.log(`[updateSessionKey] Setting session key to ${newSessionKey}`);
      console.log(`[updateSessionKey] Session key deadline: ${sessionKeyDeadline}`);
      
      // Try to get recommended balance for funding the session key
      let valueToSend = ethers.parseEther("0.0001"); // Default small amount
      
      // Use a very high gas limit to ensure the transaction has enough gas
      const highGasLimit = 2000000; // Use 2 million as a very high gas limit
      console.log(`[updateSessionKey] Using very high gas limit: ${highGasLimit}`);
      
      // Call the updateSessionKey function
      const tx = await contract.updateSessionKey(
        newSessionKey,
        sessionKeyDeadline,
        { 
          gasLimit: highGasLimit,
          value: valueToSend 
        }
      );
      
      console.log(`[updateSessionKey] Transaction sent with hash: ${tx.hash}`);
      console.log(`[updateSessionKey] Waiting for transaction to be mined...`);
      
      // Wait for transaction to be mined and ensure receipt exists
      const receipt = ensureReceipt(await tx.wait(), "Update session key");
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
  }, [getContractForOperation]);

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
        
        if (currentSessionKey && currentSessionKey.toLowerCase() === embeddedWallet.address.toLowerCase()) {
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
          
          if (updatedSessionKey) {
            // Only perform comparison if we got a valid session key
            console.log(`[setSessionKeyToEmbeddedWallet] Session key matches embedded wallet: ${updatedSessionKey.toLowerCase() === embeddedWallet.address.toLowerCase()}`);
            
            if (updatedSessionKey.toLowerCase() !== embeddedWallet.address.toLowerCase()) {
              console.warn(`[setSessionKeyToEmbeddedWallet] WARNING: Session key was not updated correctly`);
              console.warn(`[setSessionKeyToEmbeddedWallet] Expected: ${embeddedWallet.address.toLowerCase()}`);
              console.warn(`[setSessionKeyToEmbeddedWallet] Actual: ${updatedSessionKey.toLowerCase()}`);
            }
          } else {
            console.warn(`[setSessionKeyToEmbeddedWallet] Could not verify session key update - null response from contract`);
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
      
      const tx = await embeddedContract.equipWeapon(characterId, weaponId, { gasLimit: 500000 });
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
      
      const tx = await embeddedContract.equipArmor(characterId, armorId, { gasLimit: 500000 });
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
        strength,
        vitality,
        dexterity,
        quickness,
        sturdiness,
        luck,
        { gasLimit: 500000 }
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
        gasLimit: 300000 
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
      setLoading(true);
      
      // Get the owner address
      const ownerAddress = getOwnerWalletAddress();
      
      if (!ownerAddress) {
        console.log("No wallet address available to check for character");
        return false;
      }
      
      // First check localStorage for this specific wallet
      const storageKey = getCharacterLocalStorageKey(ownerAddress);
      if (storageKey) {
        const storedCharacterId = localStorage.getItem(storageKey);
        if (storedCharacterId) {
          console.log("Character found in localStorage:", storedCharacterId);
          return true;
        }
      }
      
      // If not in localStorage, check the blockchain
      console.log("No character in localStorage, checking blockchain...");
      const characterId = await getPlayerCharacterID(ownerAddress);
      
      // If we found a character on the blockchain, it will also be stored in localStorage by getPlayerCharacterID
      return !!characterId;
    } catch (error) {
      console.error("Error checking for player character:", error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [getOwnerWalletAddress, getPlayerCharacterID]);

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
    // Add new functions to the export
    equipWeapon,
    equipArmor,
    allocatePoints,
    replenishGasBalance,
    // Include loading and error for backward compatibility
    loading,
    error,
    // Add the new hasPlayerCharacter function
    hasPlayerCharacter,
  };
};
