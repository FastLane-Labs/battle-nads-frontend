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
const ENTRYPOINT_ADDRESS = "0xbD4511F188B606e5a74A62b7b0F516d0139d76D5";
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
  const { currentWallet, signer, provider, address, ownerWallet, sessionWallet } = useWallet();

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

  // Provide the owner EOA signer for operations that require ownership (createCharacter, updateSessionKey)
  const getOwnerSigner = useCallback(async () => {
    console.log("getOwnerSigner called, ownerWallet state:", 
      JSON.stringify({
        connected: ownerWallet.connected,
        address: ownerWallet.address,
        hasSigner: !!ownerWallet.signer
      })
    );
    
    // First try to use the ownerWallet.signer if available
    if (ownerWallet.connected && ownerWallet.signer) {
      console.log("Using ownerWallet.signer from WalletProvider");
      return ownerWallet.signer;
    }
    
    // If we don't have a signer but have an address, try to get a signer directly from window.ethereum
    if (ownerWallet.connected && ownerWallet.address) {
      console.log("Owner wallet connected but no signer, trying to get signer directly from MetaMask");
      
      try {
        // Direct connection to MetaMask as fallback
        if (window.ethereum) {
          console.log("Found window.ethereum, creating Web3Provider");
          const provider = new ethers.BrowserProvider(window.ethereum);
          
          // Request accounts access
          console.log("Requesting accounts from MetaMask");
          const accounts = await provider.send("eth_requestAccounts", []);
          
          if (accounts && accounts.length > 0) {
            console.log("Got accounts from MetaMask:", accounts);
            // Get the signer from the provider
            console.log("Getting signer from provider");
            const signer = await provider.getSigner();
            const signerAddress = await signer.getAddress();
            
            console.log("Obtained signer with address:", signerAddress);
            return signer;
          }
        }
      } catch (err) {
        console.error("Error getting signer directly from MetaMask:", err);
      }
    }
    
    // If we still don't have a signer, throw an error
    console.error("Failed to get owner signer, ownerWallet:", ownerWallet);
    throw new Error('No connected owner wallet found. Please connect your MetaMask wallet first.');
  }, [ownerWallet]);
  
  // Provide the embedded wallet signer for game operations (movement, combat, etc.)
  const getSessionSigner = useCallback(async () => {
    if (!sessionWallet.connected) {
      throw new Error('No connected session wallet found. Please connect your embedded wallet first.');
    }
    
    console.log("Getting session wallet signer for game operation:", sessionWallet.address);
    
    // If we already have a signer with provider, use it
    if (sessionWallet.signer && sessionWallet.provider) {
      console.log("Using existing session wallet signer with provider");
      return sessionWallet.signer;
    }
    
    // If we have a signer but no provider, create one
    if (sessionWallet.signer && !sessionWallet.provider) {
      console.log("Session wallet signer has no provider, creating one");
      
      try {
        // For local session wallet, we need to create a provider and connect it to the signer
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        
        // Create a new signer with the provider
        const connectedSigner = new ethers.Wallet(
          // @ts-ignore - Access private key from local wallet
          sessionWallet.signer.privateKey, 
          provider
        );
        
        console.log("Successfully created signer with provider for session wallet");
        return connectedSigner;
      } catch (err) {
        console.error("Error creating provider for session wallet:", err);
        throw new Error("Failed to create provider for session wallet. Please try refreshing the page.");
      }
    }
    
    // If we have a local session wallet, try to recreate it from localStorage
    try {
      const localWalletStr = localStorage.getItem('local_session_wallet');
      if (localWalletStr) {
        console.log("Recreating local session wallet from localStorage");
        const localWallet = JSON.parse(localWalletStr);
        
        // Create provider and wallet
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const wallet = new ethers.Wallet(localWallet.privateKey, provider);
        
        console.log("Created local wallet with provider from localStorage");
        return wallet;
      }
    } catch (err) {
      console.error("Error recreating local session wallet:", err);
    }
    
    // If everything else fails, throw an error
    throw new Error('Session wallet signer not available or missing provider. Please refresh and try again.');
  }, [sessionWallet]);

  // Replace existing createCharacter with version that explicitly uses owner EOA
  const createCharacter = useCallback(async (
    name: string,
    strength: number,
    vitality: number,
    dexterity: number,
    quickness: number,
    sturdiness: number,
    luck: number,
    onStageChange?: (stage: 'preparing' | 'transaction' | 'lookingUp' | 'complete') => void
  ) => {
    setLoading(true);
    setError(null);
    
    if (onStageChange) onStageChange('preparing');

    try {
      // For character creation, we need the owner wallet (typically Metamask)
      const ownerSigner = await getOwnerSigner();
      console.log("Character creation using owner address:", await ownerSigner.getAddress());
      const entrypoint = new ethers.Contract(ENTRYPOINT_ADDRESS, ENTRYPOINT_ABI, ownerSigner);

      // Get required buy-in amount and add 10% buffer to handle gas fluctuations
      const estimatedBuyIn = await entrypoint.estimateBuyInAmountInMON();
      const buyInAmount = estimatedBuyIn * BigInt(110) / BigInt(100); // Add 10% buffer
      console.log(`Required buy-in amount: ${ethers.formatEther(buyInAmount)} MON`);

      // Get the session wallet address (either from Privy or our local fallback)
      let sessionKeyAddress: string | null = null;
      
      // First check if our sessionWallet is connected 
      if (sessionWallet.connected && sessionWallet.address) {
        sessionKeyAddress = sessionWallet.address;
        console.log("Using connected session wallet as session key:", sessionKeyAddress);
      }
      // Then try to find an embedded wallet from Privy
      else if (privy.user?.linkedAccounts) {
        const embeddedWallet = privy.user.linkedAccounts.find(
          account => account.type === 'wallet' && 
                    'walletClientType' in account && 
                    account.walletClientType === 'privy'
        );
        
        if (embeddedWallet && 'address' in embeddedWallet) {
          sessionKeyAddress = embeddedWallet.address;
          console.log("Using Privy embedded wallet as session key:", sessionKeyAddress);
        }
      }
      // Finally check localStorage for our local fallback wallet
      else {
        try {
          const localWalletStr = localStorage.getItem('local_session_wallet');
          if (localWalletStr) {
            const localWallet = JSON.parse(localWalletStr);
            sessionKeyAddress = localWallet.address;
            console.log("Using local fallback wallet as session key:", sessionKeyAddress);
          }
        } catch (e) {
          console.error("Error reading local wallet from localStorage:", e);
        }
      }
      
      // If no session key found, throw an error - we need both wallets
      if (!sessionKeyAddress) {
        throw new Error("No session wallet found. Please connect or create a session wallet first.");
      }
      
      const sessionKeyDeadline = MAX_SAFE_UINT256;

      // Debug log to help diagnose issues
      console.log("Character creation parameters:", {
        name,
        stats: { strength, vitality, dexterity, quickness, sturdiness, luck },
        sum: strength + vitality + dexterity + quickness + sturdiness + luck,
        sessionKey: sessionKeyAddress, 
        deadline: sessionKeyDeadline
      });

      const txOptions = {
        value: buyInAmount,
        gasLimit: 3_000_000, // Increased gas limit to ensure success
      };

      if (onStageChange) onStageChange('transaction');
      console.log("Sending character creation transaction...");
      
      const tx = await entrypoint.createCharacter(
        name,
        strength,
        vitality,
        dexterity,
        quickness,
        sturdiness,
        luck,
        sessionKeyAddress, // Using the session wallet address as session key
        sessionKeyDeadline,
        txOptions
      );
      
      console.log("Transaction sent, waiting for confirmation. Hash:", tx.hash);
      const receipt = await tx.wait();
      console.log("Transaction confirmed in block:", receipt.blockNumber);

      // Store transaction hash for fallback manual lookup if needed
      localStorage.setItem('lastCharacterCreationTx', tx.hash);

      // Attempt to parse logs for the CharacterCreated event
      let newCharacterId: string | null = null;
      try {
        const topic = ethers.id('CharacterCreated(bytes32,address)');
        const log = receipt.logs.find(l => l.topics[0] === topic);
        if (log) {
          newCharacterId = ethers.zeroPadValue(log.topics[1], 32);
          console.log("Character ID found in logs:", newCharacterId);
        }
      } catch (err) {
        console.warn('Could not parse CharacterCreated event:', err);
      }

      // If we didn't find the character ID in the logs, wait and attempt multiple lookups
      if (!newCharacterId) {
        if (onStageChange) onStageChange('lookingUp');
        
        // Wait periods in milliseconds for each attempt
        const waitPeriods = [5000, 5000, 10000]; // 5sec, 10sec, 20sec total
        const walletAddress = await ownerSigner.getAddress();
        
        for (let attempt = 0; attempt < waitPeriods.length; attempt++) {
          // Log that we're waiting before the lookup attempt
          console.log(`Character ID not found in logs. Waiting ${waitPeriods[attempt]/1000} seconds before lookup attempt ${attempt + 1}...`);
          
          // Wait for the specified period
          await new Promise(resolve => setTimeout(resolve, waitPeriods[attempt]));
          
          // Now try to get the character ID
          try {
            console.log(`Lookup attempt ${attempt + 1}: Checking for character IDs owned by:`, walletAddress);
            
            // Use read-only provider for this query to avoid issues
            const roProvider = getReadOnlyProvider();
            const readContract = new ethers.Contract(
              ENTRYPOINT_ADDRESS,
              ["function getPlayerCharacterIDs(address) view returns (bytes32[])"],
              roProvider
            );
            
            const characterIDs = await readContract.getPlayerCharacterIDs(walletAddress);
            console.log(`Lookup attempt ${attempt + 1}: Character IDs returned:`, characterIDs);
            
            if (characterIDs && characterIDs.length > 0) {
              newCharacterId = characterIDs[characterIDs.length - 1];
              console.log(`Lookup attempt ${attempt + 1}: Found character ID:`, newCharacterId);
              break; // Exit the retry loop if we found the ID
            } else {
              console.log(`Lookup attempt ${attempt + 1}: No character IDs found for address:`, walletAddress);
            }
          } catch (lookupErr) {
            console.error(`Lookup attempt ${attempt + 1} failed:`, lookupErr);
            // Continue to the next attempt
          }
        }
      }

      if (!newCharacterId) {
        // If all lookup attempts failed, show helpful message but don't throw error
        console.warn('Character created successfully but unable to detect character ID after multiple attempts. Transaction hash:', tx.hash);
        return null;
      }

      if (onStageChange) onStageChange('complete');
      setCharacterId(newCharacterId);
      localStorage.setItem('battleNadsCharacterId', newCharacterId);
      return newCharacterId;
    } catch (err: any) {
      console.error("Error creating character:", err);
      
      // Provide more helpful error messages based on the error
      let errorMessage = err.message || 'Error creating character';
      
      if (errorMessage.includes('execution reverted')) {
        errorMessage = 'Contract rejected the transaction. Please check your character stats and ensure they meet the requirements.';
        
        // Add specific advice based on common issues
        if (errorMessage.includes('require(false)')) {
          errorMessage += ' This often means you need to have exact attribute points allocation (typically totaling 32).';
        }
      } else if (errorMessage.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds to create character. The contract requires additional MON for character creation.';
      }
      
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [getOwnerSigner, getReadOnlyProvider, privy.user, sessionWallet]);

  // Update moveCharacter to use embedded wallet/session key
  const moveCharacter = useCallback(async (characterID: string, direction: string) => {
    setLoading(true);
    setError(null);

    try {
      // Movement should use the embedded wallet (session key)
      console.log("Using session key for move operation");
      const sessionSigner = await getSessionSigner();
      const entrypoint = new ethers.Contract(ENTRYPOINT_ADDRESS, ENTRYPOINT_ABI, sessionSigner);

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
        return true;
      }
      return false;
    } catch (err: any) {
      console.error(`Error moving ${direction}:`, err);
      setError(err.message || `Error moving ${direction}`);
      return false;
    } finally {
      setLoading(false);
    }
  }, [getSessionSigner]);

  // Update getPlayerCharacterID to use read-only provider
  const getPlayerCharacterID = useCallback(async (ownerAddress: string) => {
    if (!ownerAddress || ownerAddress === '0x0000000000000000000000000000000000000000') {
      console.warn('Invalid owner address provided to getPlayerCharacterID:', ownerAddress);
      return null;
    }

    console.log('Starting getPlayerCharacterID call for address:', ownerAddress);
    
    // Create a promise that rejects after a timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Timeout: getPlayerCharacterID took too long to respond'));
      }, 10000); // 10 second timeout
    });
    
    try {
      // Race the contract call against the timeout
      const result = await Promise.race([
        (async () => {
          try {
            const roProvider = getReadOnlyProvider();
            
            if (!roProvider) {
              throw new Error('Failed to get read-only provider in getPlayerCharacterID');
            }
            
            console.log('Got provider, creating contract instance with address:', ENTRYPOINT_ADDRESS);
            const gettersContract = new ethers.Contract(
              ENTRYPOINT_ADDRESS,
              ["function getPlayerCharacterID(address) view returns (bytes32)"],
              roProvider
            );
            
            console.log('Making contract call to getPlayerCharacterID...');
            const cID = await gettersContract.getPlayerCharacterID(ownerAddress);
            console.log('Contract call complete, raw result:', cID);
            
            if (!cID || cID === '0x0000000000000000000000000000000000000000000000000000000000000000') {
              console.log('No character found for address:', ownerAddress);
              return null;
            }
            
            console.log('Character found for address:', ownerAddress, 'Character ID:', cID);
            return cID;
          } catch (err) {
            console.error('Inner error in getPlayerCharacterID call:', err);
            throw err; // Re-throw to be caught by the outer try-catch
          }
        })(),
        timeoutPromise
      ]);
      
      // Only update state if we got a valid result
      if (result) {
        setCharacterId(result);
        localStorage.setItem('battleNadsCharacterId', result);
      }
      
      return result;
    } catch (err) {
      // This will catch both timeout errors and contract call errors
      console.error('Error in getPlayerCharacterID:', err);
      // Don't set global error state for this function as it's used in initialization
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

  // Attack a target - using session key/embedded wallet
  const attackTarget = useCallback(async (characterId: string, targetIndex: number) => {
    setLoading(true);
    setError(null);

    try {
      // Combat should use the embedded wallet (session key)
      console.log("Using session key for attack operation");
      const sessionSigner = await getSessionSigner();
      
      const entrypoint = new ethers.Contract(
        ENTRYPOINT_ADDRESS,
        ENTRYPOINT_ABI,
        sessionSigner
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
  }, [getSessionSigner]);

  // Equip a weapon - using session key/embedded wallet
  const equipWeapon = useCallback(async (characterId: string, weaponId: number) => {
    setLoading(true);
    setError(null);

    try {
      // Equipment changes should use the embedded wallet (session key)
      console.log("Using session key for equip weapon operation");
      const sessionSigner = await getSessionSigner();
      
      const entrypoint = new ethers.Contract(
        ENTRYPOINT_ADDRESS,
        ENTRYPOINT_ABI,
        sessionSigner
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
  }, [getSessionSigner]);
   
  // Equip armor - using session key/embedded wallet
  const equipArmor = useCallback(async (characterId: string, armorId: number) => {
    setLoading(true);
    setError(null);

    try {
      // Equipment changes should use the embedded wallet (session key)
      console.log("Using session key for equip armor operation");
      const sessionSigner = await getSessionSigner();
      
      const entrypoint = new ethers.Contract(
        ENTRYPOINT_ADDRESS,
        ENTRYPOINT_ABI,
        sessionSigner
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
  }, [getSessionSigner]);

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

  return {
    // Include both signer getters for flexibility
    getOwnerSigner,
    getSessionSigner,
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