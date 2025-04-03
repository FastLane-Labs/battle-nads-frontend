import { useState, useCallback, useEffect } from 'react';
import * as ethers from 'ethers';
import { useWallet } from '../providers/WalletProvider';
import { useContracts } from './useContracts';
import { parseFrontendData, createGameState } from '../utils/gameDataConverters';
import { GameState } from '../types/gameTypes';

// Maximum safe integer for uint256 in Solidity
const MAX_SAFE_UINT256 = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

// Create a safe localStorage key based on the contract address to avoid conflicts
const LOCALSTORAGE_KEY = `battleNadsCharacterId_${process.env.NEXT_PUBLIC_ENTRYPOINT_ADDRESS || "0xbD4511F188B606e5a74A62b7b0F516d0139d76D5"}`;

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

  // Load stored characterId on mount
  useEffect(() => {
    const storedId = localStorage.getItem(LOCALSTORAGE_KEY);
    if (storedId) setCharacterId(storedId);
  }, []);

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
      return null; // Return null instead of throwing to prevent cascading errors
    }
  }, [readContract]);

  // Helper to select the appropriate contract based on operation type
  const getContractForOperation = useCallback((operationType: 'creation' | 'session' | 'gas' | 'movement' | 'combat' | 'equipment' = 'session') => {
    console.log(`[getContractForOperation] Operation type: ${operationType}`);
    
    // Log contract availability for debugging
    console.log(`[getContractForOperation] Contract availability:`, {
      readContractAvailable: !!readContract,
      injectedContractAvailable: !!injectedContract,
      embeddedContractAvailable: !!embeddedContract,
    });
    
    // For character creation, session key updates, and gas operations, use injected (owner) wallet
    if (['creation', 'gas', 'session'].includes(operationType)) {
      if (!injectedContract) {
        console.error('[getContractForOperation] No owner wallet connected for operation:', operationType);
        throw new Error('No owner wallet connected. Please connect your owner wallet first.');
      }
      console.log(`[getContractForOperation] Using owner (injected) contract for ${operationType}`);
      return injectedContract;
    }
    
    // For movement, combat, and equipment operations, prefer embedded wallet (session key)
    if (['movement', 'combat', 'equipment'].includes(operationType)) {
      if (embeddedContract) {
        console.log(`[getContractForOperation] Using embedded contract for ${operationType}`);
        return embeddedContract;
      }
      
      console.warn(`[getContractForOperation] No embedded contract available for ${operationType}, falling back to injected`);
      // Fall back to injected contract if embedded not available
      if (injectedContract) {
        return injectedContract;
      }
    }
    
    // For read operations or fallback, use read-only contract
    if (readContract) {
      console.log(`[getContractForOperation] Using read-only contract for ${operationType}`);
      return readContract;
    }
    
    console.error(`[getContractForOperation] No contracts available for operation: ${operationType}`);
    return null; // Return null instead of throwing - let the calling function handle it
  }, [readContract, injectedContract, embeddedContract]);

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
      
      if (!readContract) {
        throw new Error("No contract available to check character ID");
      }
      
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

          const characterId = await readContract.getPlayerCharacterIDs(ownerAddress);
          
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
        const characterIDs = await readContract.getPlayerCharacterIDs(walletAddress);
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
  }, [getContractForOperation, readContract, injectedWallet?.signer]);

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
      const contract = getContractForOperation('movement');
      if (!contract) throw new Error("No contract available for movement");
      
      console.log(`[moveCharacter] Executing move ${direction} for character ${characterID}`);
      
      // Log the actual wallet address being used for the movement transaction
      try {
        const signerAddress = await embeddedWallet.signer.getAddress();
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
      
      let tx;
      const gasLimit = 850000;
      
      switch (direction) {
        case 'north':
          tx = await contract.moveNorth(characterID, { gasLimit });
          break;
        case 'south':
          tx = await contract.moveSouth(characterID, { gasLimit });
          break;
        case 'east':
          tx = await contract.moveEast(characterID, { gasLimit });
          break;
        case 'west':
          tx = await contract.moveWest(characterID, { gasLimit });
          break;
        case 'up':
          tx = await contract.moveUp(characterID, { gasLimit });
          break;
        case 'down':
          tx = await contract.moveDown(characterID, { gasLimit });
          break;
        default:
          throw new Error(`Invalid direction: ${direction}`);
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
  }, [getContractForOperation, embeddedWallet, injectedWallet, getCurrentSessionKey]);

  // Attack a target - pure blockchain call
  const attackTarget = useCallback(async (characterId: string, targetIndex: number) => {
    try {
      // Use session key (embedded wallet) for combat
      const contract = getContractForOperation('combat');
      if (!contract) throw new Error("No contract available for combat");
      
      const tx = await contract.attack(characterId, targetIndex, { gasLimit: 850000 });
      
      // Wait for transaction to be mined
      await tx.wait();
      
      return true;
    } catch (err: any) {
      console.error("Error attacking target:", err);
      throw new Error(err.message || "Error attacking target");
    }
  }, [getContractForOperation]);

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
      if (!readContract) throw new Error("No contract available to get player characters");
      
      // Get character IDs owned by the player
      const characterIds = await readContract.getPlayerCharacterIDs(address);
      
      // If no characters, return empty array
      if (!characterIds || characterIds.length === 0) {
        return [];
      }
      
      // Get details for each character
      const characterPromises = characterIds.map((id: string) => readContract.getBattleNad(id));
      const characters = await Promise.all(characterPromises);
      
      return characters;
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
        // Store character ID in local state and localStorage
        setCharacterId(foundCharacterId);
        localStorage.setItem(LOCALSTORAGE_KEY, foundCharacterId);
      }
      
      return foundCharacterId;
    } catch (err: any) {
      console.error("Error getting character ID by transaction hash:", err);
      return null;
    }
  }, [injectedWallet?.provider]);

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
