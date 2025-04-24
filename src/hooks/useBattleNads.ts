import { useState, useCallback, useEffect, useRef } from 'react';
import * as ethers from 'ethers';
import { useWallet } from '../providers/WalletProvider';
import { useContracts } from './useContracts';
import { useEmbeddedContract } from './useEmbeddedContract';
import { getCharacterLocalStorageKey, isValidCharacterId } from '../utils/getCharacterLocalStorageKey';
import { LogType, Log, DataFeed, ChatMessage, PollResponse, SessionKeyData, EventMessage, CharacterClass, BattleNadUnformatted, BattleNadLiteUnformatted, BattleNad, BattleNadLite, Ability, AbilityTracker, GameState, StatusEffect } from '../types/gameTypes';
import { useSetRecoilState, useRecoilValue } from 'recoil';

// Constants
const RPC_URL = "https://rpc-testnet.monadinfra.com/rpc/Dp2u0HD0WxKQEvgmaiT4dwCeH9J14C24";
// Gas limit constants from the smart contract
const MIN_EXECUTION_GAS = BigInt(950000); // From Constants.sol
const MOVEMENT_GAS_LIMIT = MIN_EXECUTION_GAS + BigInt(550000); // Double gas limit only for movement

// Flag to control debug logging (set to false in production)
const DEBUG_MODE = false;

// Debug logger that only logs when debugging is enabled
const debugLog = (...args: any[]) => {
  if (DEBUG_MODE) {
    console.log(...args);
  }
};

// Add global cache for game data
const gameDataCache = {
  data: null as any,
  lastUpdated: null as Date | null,
  isProvider: false, // Tracks if the provider instance has been created
};

export const useBattleNads = (options: { role?: 'provider' | 'consumer'; suppressEvents?: boolean } = { role: 'consumer', suppressEvents: false }) => {
  const { injectedWallet, embeddedWallet } = useWallet();
  const { readContract, injectedContract, embeddedContract, error: contractError } = useContracts();

  // Keep minimal state for the hook itself
  const [characterId, setCharacterId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(contractError);
  
  // Use ref to track initialization status and prevent multiple initializations
  const initializedRef = useRef(false);

  const { moveNorth, moveSouth, moveEast, moveWest, moveUp, moveDown, zoneChat, attack, equipWeapon, equipArmor, allocatePoints } = useEmbeddedContract();
  
  // Set this instance as the provider if the role is provider and no provider exists yet
  useEffect(() => {
    if (options.role === 'provider' && !gameDataCache.isProvider) {
      gameDataCache.isProvider = true;
    }
  }, [options.role]);

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

  const processDataFeeds = (dataFeeds: DataFeed[], lastBlock: number) : DataFeed[] => {
    const processedDataFeeds: DataFeed[] = [];
    for (const feed of dataFeeds) {
      const processedFeed = { ...feed };
      processedFeed.logs = processedFeed.logs.filter((log: Log) => feed.blockNumber > lastBlock);
    }
    return processedDataFeeds;
  }

  const getAbilityName = (ability: Ability) : string => {
    switch (ability) {
      case Ability.SingSong:
        return 'Sing Song'; 
      case Ability.DoDance:
        return 'Do Dance';
      case Ability.ShieldBash:
        return 'Shield Bash';
      case Ability.ShieldWall:
        return 'Shield Wall';
      case Ability.EvasiveManeuvers:
        return 'Evasive Maneuvers';
      case Ability.ApplyPoison:
        return 'Apply Poison';
      case Ability.Pray:
        return 'Pray';
      case Ability.Smite:
        return 'Smite';
      case Ability.Fireball:
        return 'Fireball';
      case Ability.ChargeUp:
        return 'Charge Up';
      default:
        return 'Unknown';
    }
  }

  const getBuffsFromBitmap = (bitmap: number) : StatusEffect[] => {
    const buffs : StatusEffect[] = [];
    if (bitmap & (1 << StatusEffect.ChargedUp)) {
      buffs.push(StatusEffect.ChargedUp);
    }
    if (bitmap & (1 << StatusEffect.Evasion)) {
      buffs.push(StatusEffect.Evasion);
    }
    if (bitmap & (1 << StatusEffect.Praying)) {
      buffs.push(StatusEffect.Praying);
    }
    if (bitmap & (1 << StatusEffect.ShieldWall)) {
      buffs.push(StatusEffect.ShieldWall);
    }
    return buffs;
  }

  const getDebuffsFromBitmap = (bitmap: number) : StatusEffect[] => {
    const debuffs : StatusEffect[] = [];
    if (bitmap & (1 << StatusEffect.ChargingUp)) {
      debuffs.push(StatusEffect.ChargingUp);
    }
    if (bitmap & (1 << StatusEffect.Cursed)) {
      debuffs.push(StatusEffect.Cursed);
    }
    if (bitmap & (1 << StatusEffect.Poisoned)) {
      debuffs.push(StatusEffect.Poisoned);
    }
    if (bitmap & (1 << StatusEffect.Stunned)) {
      debuffs.push(StatusEffect.Stunned);
    }
    return debuffs;
  }

  const formatBattleNad = (unformatted: BattleNadUnformatted, availableWeapons: string[], availableArmors: string[]) : BattleNad => {
    const battleNad : BattleNad = {
      id: unformatted.id,
      index: unformatted.stats.index,
      name: unformatted.name,
      class: unformatted.stats.class,
      level: unformatted.stats.level,
      health: unformatted.stats.health,
      maxHealth: unformatted.maxHealth,
      buffs: getBuffsFromBitmap(unformatted.stats.buffs),
      debuffs: getDebuffsFromBitmap(unformatted.stats.debuffs),
      stats: unformatted.stats,
      weapon: unformatted.weapon,
      armor: unformatted.armor,
      availableWeapons: availableWeapons,
      availableArmors: availableArmors,
      position: {
        x: unformatted.stats.x,
        y: unformatted.stats.y,
        depth: unformatted.stats.depth
      },
      owner: unformatted.owner,
      activeTask: unformatted.activeTask,
      ability: unformatted.activeAbility,
      inventory: unformatted.inventory,
      unspentAttributePoints: unformatted.stats.unspentAttributePoints,
      isInCombat: unformatted.stats.combatants > 0,
      isDead: unformatted.stats.health <= 0
    }
    return battleNad;
  }

  const formatBattleNadLite = (unformatted: BattleNadLiteUnformatted, isHostile: boolean) : BattleNadLite => {
    const battleNadLite : BattleNadLite = {
      id: unformatted.id,
      index: unformatted.index,
      name: unformatted.name,
      class: unformatted.class,
      level: unformatted.level,
      health: unformatted.health,
      maxHealth: unformatted.maxHealth,
      buffs: getBuffsFromBitmap(unformatted.buffs),
      debuffs: getDebuffsFromBitmap(unformatted.debuffs),
      weaponName: unformatted.weaponName,
      armorName: unformatted.armorName,
      ability: {
        ability: unformatted.ability,
        stage: unformatted.abilityStage,
        targetIndex: 0,
        taskAddress: '',
        targetBlock: unformatted.abilityTargetBlock
      } as AbilityTracker,
      isMonster: unformatted.class == CharacterClass.Basic || unformatted.class == CharacterClass.Elite || unformatted.class == CharacterClass.Boss,
      isHostile: isHostile,
      isDead: unformatted.isDead,
    }
    return battleNadLite;
  }

  const getEmptyBattleNadLite = () : BattleNadLite => {
    return {
      id: '',
      index: 0,
      name: '',
      class: CharacterClass.Basic,
      level: 0,
      health: 0,
      maxHealth: 0,
      buffs: [],
      debuffs: [],
      ability: {
        ability: Ability.None,
        stage: 0,
        targetIndex: 0,
        taskAddress: '',
        targetBlock: 0
      },
      weaponName: '',
      armorName: '',
      isMonster: false,
      isHostile: false,
      isDead: false 
    }
  }

  const checkPositionForUpdate = (character: BattleNad | null, update: BattleNadUnformatted) : boolean => {
    if (character == null) {
      return true;
    }
    if (character.position.x != update.stats.x) {
      return true;
    }

    if (character.position.y != update.stats.y) {
      return true;
    }

    if (character.position.depth != update.stats.depth) {
      return true;
    }

    return false;
  }

  const checkCombatDataForUpdate = (character: BattleNad | null, update: BattleNadUnformatted) : boolean => {
    if (character == null) {
      return true;
    }
    if (character.health != update.stats.health) {
      return true;
    }

    if (character.ability.stage != update.activeAbility.stage) {
      return true;
    }

    if (character.ability.targetIndex != update.activeAbility.targetIndex) {
      return true;
    }

    if (character.ability.ability != update.activeAbility.ability) {
      return true;
    }
    
    if (character.ability.targetBlock != update.activeAbility.targetBlock) {
      return true;
    }
    
    if (character.stats.buffs != update.stats.buffs) {
      return true;
    }

    if (character.stats.debuffs != update.stats.debuffs) {
      return true;
    }
    
    return false;
  }
  
  const checkForCharacterStatsUpdate = (character: BattleNad | null, update: BattleNadUnformatted) : boolean => {
    if (character == null) {
      return true;
    }

    if (character?.id != update.id) {
      return true;
    }

    if (character.name != update.name) {
      return true;
    }

    if (character.class != update.stats.class) {
      return true;
    }

    if (character.level != update.stats.level) {
      return true;
    }

    if (character.maxHealth != update.maxHealth) {
      return true;
    }

    if (character.stats.unspentAttributePoints != update.stats.unspentAttributePoints) {
      return true;
    }

    if (character.stats.experience != update.stats.experience) {
      return true;
    }
    
    if (character.inventory.weaponBitmap != update.inventory.weaponBitmap) {
      return true;
    }

    if (character.inventory.armorBitmap != update.inventory.armorBitmap) {
      return true;
    }

    if (character.inventory.balance != update.inventory.balance) {
      return true;
    }

    if (character.weapon.id != update.weapon.id) {
      return true;
    }

    if (character.armor.id != update.armor.id) {
      return true;
    }
    return false;
  }

  const checkForLiteStatsUpdate = (character: BattleNadLite, update: BattleNadLiteUnformatted) : boolean => {
    if (character?.id != update.id) {
      return true;
    }

    if (character.name != update.name) {
      return true;
    }

    if (character.class != update.class) {
      return true;
    }

    if (character.level != update.level) {
      return true;
    }

    if (character.maxHealth != update.maxHealth) {
      return true;
    }

    if (character.weaponName != update.weaponName) {
      return true;
    }

    if (character.armorName != update.armorName) {
      return true;
    }

    if (character.isDead != update.isDead) {
      return true;
    }
    return false;
  }

  const checkLiteCombatDataForUpdate = (character: BattleNadLite, update: BattleNadLiteUnformatted, isHostile: boolean) : boolean => {
    if (character.health != update.health) {
      return true;
    }

    if (character.ability.stage != update.abilityStage) {
      return true;
    }

    if (character.ability.ability != update.ability) {
      return true;
    }
    
    if (character.ability.targetBlock != update.abilityTargetBlock) {
      return true;
    }

    if (character.isHostile != isHostile) {
      return true;
    }
    /*
    // TODO: Add buff / debuff detection back in. 
    if (character.stats.buffs != update.stats.buffs) {
      return true;
    }

    if (character.stats.debuffs != update.stats.debuffs) {
      return true;
    }
    */
    return false;
  }
  

  // Function to convert BigInt values in an object to strings
  const convertBigIntToString = (obj: any): any => {
    if (obj === null || obj === undefined) {
      return obj;
    }
    
    if (typeof obj === 'bigint') {
      return obj.toString();
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => convertBigIntToString(item));
    }
    
    if (typeof obj === 'object') {
      return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => [key, convertBigIntToString(value)])
      );
    }
    
    return obj;
  };

  /**
   * Get the owner wallet address, with additional fallbacks
   * This is used to determine the address to use for contract calls
   */
  const getOwnerWalletAddress = useCallback(() => {
    // First check if we have a cached address in localStorage
    const cachedAddress = localStorage.getItem('lastKnownOwnerAddress');
    
    // Default to the injectedWallet from context
    let ownerAddress = injectedWallet?.address;
    
    // If the injectedWallet appears to be a session key (has walletClientType 'privy'), check alternatives
    if (injectedWallet?.walletClientType === 'privy') {
      // Try to get signer address directly from window.ethereum as backup
      if (window.ethereum && (window.ethereum as any).selectedAddress) {
        ownerAddress = (window.ethereum as any).selectedAddress;
      } else if (window.ethereum && (window.ethereum as any).address) {
        ownerAddress = (window.ethereum as any).address;
      }
    }
    
    // If we still don't have an address but have ethereum provider, try to request accounts
    if (!ownerAddress && window.ethereum) {
      // This is async so it won't help for this call, but it will prime for next time
      try {
        window.ethereum.request({ method: 'eth_requestAccounts' })
          .then((accounts: string[]) => {
            if (accounts && accounts.length > 0) {
              localStorage.setItem('lastKnownOwnerAddress', accounts[0]);
            }
          })
          .catch((err: any) => {
            console.warn('Failed to request accounts:', err);
          });
      } catch (err) {
        console.warn('Error requesting accounts:', err);
      }
    }
    
    // If we still have no address, use cached value as fallback
    if (!ownerAddress && cachedAddress) {
      ownerAddress = cachedAddress;
    }
    
    // If we found an address, cache it for future use
    if (ownerAddress) {
      localStorage.setItem('lastKnownOwnerAddress', ownerAddress);
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
      
      // FIRST PRIORITY: Check localStorage but ensure it's not the zero address
      const storedCharacterId = localStorage.getItem(storageKey);
      if (storedCharacterId && isValidCharacterId(storedCharacterId)) {
        console.log(`Using stored character ID from localStorage for ${ownerAddress}:`, storedCharacterId);
        setCharacterId(storedCharacterId);
        return storedCharacterId;
      } else if (storedCharacterId && !isValidCharacterId(storedCharacterId)) {
        console.log(`Found invalid zero-address character ID in localStorage for ${ownerAddress}, removing it`);
        localStorage.removeItem(storageKey);
      }
      
      // SECOND PRIORITY: Only if no valid localStorage value, check the blockchain using owner address
      debugLog("No valid character in localStorage, checking blockchain...");
      
      if (!readContract) {
        console.warn("No read contract available to check for character ID");
        return null;
      }
      
      const characterIdFromChain = await readContract.getPlayerCharacterID(ownerAddress);
      
      // If valid character ID returned (not zero address), store it
      if (characterIdFromChain && isValidCharacterId(characterIdFromChain)) {
        debugLog(`Found valid character ID on blockchain for ${ownerAddress}:`, characterIdFromChain);
        setCharacterId(characterIdFromChain);
        localStorage.setItem(storageKey, characterIdFromChain);
        return characterIdFromChain;
      } else if (characterIdFromChain) {
        // We got a character ID from the chain, but it's the zero address
        console.log(`Found zero-address character ID on blockchain for ${ownerAddress} - this indicates no character exists`);
      }
      
      return null;
    } catch (err) {
      console.error('Error in getPlayerCharacterID:', err);
      return null;
    }
  }, [getOwnerWalletAddress, readContract]);

  // Add new function to get all characters for a player
  const getPlayerCharacters = useCallback(async (addressToCheck?: string): Promise<any[]> => {
    try {
      // Get the owner wallet address
      const ownerAddress = addressToCheck || getOwnerWalletAddress();
      
      if (!ownerAddress || !ethers.isAddress(ownerAddress)) {
        console.warn("No valid owner address available to check for character IDs");
        return [];
      }
      
      if (!readContract) {
        console.warn("No read contract available to check for character IDs");
        return [];
      }
      
      // Use getPlayerCharacterIDs to get all character IDs for this address
      let characterIds;
      try {
        characterIds = await readContract.getPlayerCharacterIDs(ownerAddress);
      } catch (err) {
        console.error('Error fetching character IDs:', err);
        return [];
      }
      
      if (!characterIds || characterIds.length === 0) {
        return [];
      }
      
      console.log(`Found ${characterIds.length} characters for address ${ownerAddress}`);
      
      // For each character ID, fetch the full character data
      const characters = await Promise.all(
        characterIds.map(async (id: string) => {
          try {
            if (readContract.getBattleNad) {
              const character = await readContract.getBattleNad(id);
              return { id, ...character };
            } else {
              // Fallback to use getFrontendData if getBattleNad is not available
              const data = await readContract.getFrontendData(id);
              return { id, ...data.character };
            }
          } catch (err) {
            console.error(`Error fetching data for character ${id}:`, err);
            return { id, error: true };
          }
        })
      );
      
      return characters.filter(c => !c.error);
    } catch (err) {
      console.error('Error in getPlayerCharacters:', err);
      return [];
    }
  }, [getOwnerWalletAddress, readContract]);

  // Add a helper function to get the current block number
  const getCurrentBlockNumber = useCallback(async (): Promise<number> => {
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const currentBlock = await provider.getBlockNumber();
      console.log(`[getCurrentBlockNumber] Current block number: ${currentBlock}`);
      return currentBlock;
    } catch (err) {
      console.error('[getCurrentBlockNumber] Error getting current block number:', err);
      // Return last fetched block as fallback if available
      
      // Return a reasonable default if everything fails
      console.log(`[getCurrentBlockNumber] Using default block number`);
      return 0;
    }
  }, []);

  // Add the createCharacter function
  const createCharacter = useCallback(async (
    name: string,
    strength: number,
    vitality: number,
    dexterity: number,
    quickness: number,
    sturdiness: number,
    luck: number,
    sessionKey?: string,
    sessionKeyDeadline?: bigint
  ): Promise<string | null> => {
    try {
      console.log(`[createCharacter] Creating character "${name}" with stats:`, {
        strength, vitality, dexterity, quickness, sturdiness, luck
      });
      
      if (!injectedWallet?.signer || !injectedWallet?.address) {
        throw new Error('Owner wallet not available or not properly set up. Please connect your wallet and try again.');
      }
      
      if (!injectedContract) {
        throw new Error('Contract not available. Please connect your wallet and try again.');
      }
      
      if (!readContract) {
        throw new Error('Read contract not available. Please connect your wallet and try again.');
      }
      
      // If sessionKey is not provided, try to use embedded wallet
      let sessionKeyAddress = sessionKey;
      if (!sessionKeyAddress && embeddedWallet?.address) {
        sessionKeyAddress = embeddedWallet.address;
        console.log(`[createCharacter] Using embedded wallet as session key: ${sessionKeyAddress}`);
      }
      
      if (!sessionKeyAddress) {
        throw new Error('No session key available. Please provide a session key or connect an embedded wallet.');
      }
      
      // Set deadline to current block + 70000 if not provided
      let deadline = sessionKeyDeadline;
      if (!deadline) {
        // Get current block number
        const currentBlock = await getCurrentBlockNumber();
        // Add 70,000 blocks (≈ 7 days worth of blocks)
        deadline = BigInt(currentBlock + 70000);
        console.log(`[createCharacter] Setting deadline to current block (${currentBlock}) + 70000 = ${deadline}`);
      }
      
      // Get estimated buy-in amount and double it for the transaction value
      const estimatedBuyInAmount = await readContract.estimateBuyInAmountInMON();
      // Convert to BigInt to ensure proper multiplication
      const buyInAmountBigInt = BigInt(estimatedBuyInAmount.toString());
      const txValue = buyInAmountBigInt * BigInt(2);
      
      console.log(`[createCharacter] Estimated buy-in amount: ${estimatedBuyInAmount.toString()}`);
      console.log(`[createCharacter] Transaction value (2x buy-in): ${txValue.toString()}`);
      console.log(`[createCharacter] Creating character with session key: ${sessionKeyAddress}, deadline: ${deadline}`);
      
      // Setup transaction options with the value parameter
      const txOptions = {
        value: txValue
      };
      
      // Call the contract function with transaction options
      const tx = await injectedContract.createCharacter(
        name,
        BigInt(strength),
        BigInt(vitality),
        BigInt(dexterity),
        BigInt(quickness),
        BigInt(sturdiness),
        BigInt(luck),
        sessionKeyAddress,
        deadline,
        txOptions
      );
      
      console.log(`[createCharacter] Transaction sent: ${tx.hash}`);
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error('No receipt returned from transaction');
      }
      console.log(`[createCharacter] Character created: ${receipt.hash}, gas used: ${receipt.gasUsed.toString()}`);
      
      // Try to get character ID after creation
      try {
        // Wait a bit for blockchain state to update
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Get character ID
        const characterId = await getPlayerCharacterID(injectedWallet.address);
        if (characterId && isValidCharacterId(characterId)) {
          console.log(`[createCharacter] New character ID: ${characterId}`);
          
          // Explicitly update state
          setCharacterId(characterId);
          
          // Get wallet-specific localStorage key and update storage
          const storageKey = getCharacterLocalStorageKey(injectedWallet.address);
          if (storageKey) {
            localStorage.setItem(storageKey, characterId);
            console.log(`[createCharacter] Saved character ID to localStorage using key: ${storageKey}`);
          }
          
          // Also use a fixed key for backwards compatibility
          localStorage.setItem('battleNadsCharacterId', characterId);
          console.log(`[createCharacter] Saved character ID to localStorage with fixed key for compatibility`);
          
          // Broadcast an event when character is created - this helps with UI updates
          const characterCreatedEvent = new CustomEvent('characterCreated', { 
            detail: { characterId, owner: injectedWallet.address }
          });
          window.dispatchEvent(characterCreatedEvent);
          console.log(`[createCharacter] Dispatched characterCreated event`);
          
          return characterId;
        } else {
          console.warn(`[createCharacter] Retrieved character ID is invalid or zero address: ${characterId}`);
        }
      } catch (err) {
        console.error('[createCharacter] Error getting character ID after creation:', err);
        // We'll continue anyway since the transaction completed
      }
      
      // Return the transaction hash as a fallback
      return tx.hash;
    } catch (err: any) {
      console.error("[createCharacter] Error:", err);
      
      // Provide better error message for common issues
      if (err.message && err.message.includes('insufficient funds')) {
        throw new Error('Insufficient funds in your wallet. Please add more funds.');
      } else if (err.message && err.message.includes('execution reverted')) {
        throw new Error('Character creation rejected by the contract.');
      } else if (err.message && err.message.includes('nonce too low')) {
        throw new Error('Transaction error: Please reload the page and try again.');
      } else {
        throw new Error(err.message || "Error creating character");
      }
    }
  }, [injectedContract, injectedWallet, embeddedWallet, readContract, getPlayerCharacterID, getCurrentBlockNumber]);

  // Add getCharacterIdByTransactionHash to look up character ID by transaction hash
  const getCharacterIdByTransactionHash = useCallback(async (txHash: string): Promise<string | null> => {
    try {
      console.log(`[getCharacterIdByTransactionHash] Looking up character ID for transaction: ${txHash}`);
      
      if (!txHash || !txHash.startsWith('0x')) {
        throw new Error('Invalid transaction hash');
      }
      
      if (!readContract) {
        throw new Error('Contract not available for reading');
      }
      
      // Get the true owner wallet address
      const ownerAddress = getOwnerWalletAddress();
      
      if (!ownerAddress) {
        throw new Error('No owner wallet address available');
      }
      
      // Create a provider to look up the transaction
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      
      // Get transaction receipt
      const receipt = await provider.getTransactionReceipt(txHash);
      
      if (!receipt) {
        throw new Error('Transaction not found or still pending');
      }
      
      // Get character ID after transaction confirmation
      const characterId = await getPlayerCharacterID(ownerAddress);
      
      if (characterId) {
        console.log(`[getCharacterIdByTransactionHash] Found character ID: ${characterId}`);
        return characterId;
      }
      
      console.log(`[getCharacterIdByTransactionHash] No character ID found for transaction: ${txHash}`);
      return null;
    } catch (err) {
      console.error('[getCharacterIdByTransactionHash] Error:', err);
      throw err;
    }
  }, [readContract, getOwnerWalletAddress, getPlayerCharacterID]);

  // Add function to get estimated buy-in amount in MON
  const getEstimatedBuyInAmount = useCallback(async (): Promise<ethers.BigNumberish> => {
    try {
      if (!readContract) {
        throw new Error("Contract not available for reading");
      }
      
      const amount = await readContract.estimateBuyInAmountInMON();
      return amount;
    } catch (err) {
      console.error("[getEstimatedBuyInAmount] Error:", err);
      throw new Error(`Failed to get estimated buy-in amount: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [readContract]);

  // Get full frontend data including chat/event logs
  const pollForFrontendData = useCallback(async (gameState: GameState) : Promise<GameState> => {
    // Return cached data if this is not the provider and cache exists
    if (options.role !== 'provider') {
      return gameState;
    }

    try {
      setLoading(true);
      
      // For pollForFrontendData, we need an owner address, not a character ID
      const ownerAddress = gameState.owner || getOwnerWalletAddress() || '';
      if (ownerAddress != gameState.owner) {
        gameState.owner = ownerAddress;
        gameState.updates.owner = true;
      }

      if (!readContract) {
        setError("No contract available");
        gameState.updates.error = true;
        return gameState;
      }

      let startBlock = gameState.lastBlock;
      if (startBlock == 0) {
        startBlock = await getCurrentBlockNumber();
        if (startBlock != 0) {
          startBlock -= 1;
        }
      }
      
      console.log(`[pollForFrontendData] Final startBlock: ${startBlock}`);
      
      let result : PollResponse;
      try {
        // Remove detailed parameter logging
        result = await readContract.pollForFrontendData(ownerAddress, startBlock);
      } catch (callError) {
        console.error(`[pollForFrontendData] Contract call error:`, callError);
        setError(`Contract call failed: ${callError instanceof Error ? callError.message : String(callError)}`);
        gameState.updates.error = true;
        return gameState;
      }

      if (result.endBlock <= startBlock) {
        console.log(`[pollForFrontendData] End block is less than or equal to start block, returning early`);
        return gameState;
      }

      // Emit events for balance updates so other components can react to them
      if (!options.suppressEvents) {
        dispatchEvent(new CustomEvent('sessionKeyBalanceUpdated', { 
          detail: { balance: result.sessionKeyData.balance } 
        }));
      }
      
      if (result.characterID != gameState.character?.id) {
        gameState.updates.character = true;
        setCharacterId(result.characterID);
      }
      
      // Store characterID in state if it's valid and not already stored
      if (result.characterID && (!characterId || characterId !== result.characterID)) {
        setCharacterId(result.characterID);

        // Only dispatch event if the character ID is valid (non-zero address)
        const isValidId = result.characterID !== '0x0000000000000000000000000000000000000000000000000000000000000000';
            
        if (isValidId && !options.suppressEvents) {
          // Also dispatch a characterIDChanged event to notify components
          const characterChangedEvent = new CustomEvent('characterIDChanged', {
            detail: { characterId: result.characterID, owner: ownerAddress }
          });
          window.dispatchEvent(characterChangedEvent);
          console.log(`[getFullFrontendData] Dispatched characterIDChanged event with ID: ${result.characterID}`);
        }
      }

      // Check for updates to the character
      if (checkPositionForUpdate(gameState.character, result.character)) {
        gameState.updates.position = true;
      }

      if (checkCombatDataForUpdate(gameState.character, result.character)) {
        gameState.updates.combat = true;
      }
      
      if (checkForCharacterStatsUpdate(gameState.character, result.character)) {
        gameState.updates.character = true;
      }

      if (gameState.updates.character || gameState.updates.combat || gameState.updates.position) {
        gameState.character = formatBattleNad(result.character, result.equipableWeaponNames, result.equipableArmorNames);
      }
      if (gameState.updates.position) {
        gameState.position = {
          x: result.character.stats.x,
          y: result.character.stats.y,
          depth: result.character.stats.depth
        };
        gameState.updates.movementOptions = true;
      }

      // Check for updates to the others
      let friendlyIndex : number = 0;
      let hostileIndex : number = 0;
      let loadedExisting : boolean = false;
      let loadedNew : boolean = false;
      let existingBattleNadLite : BattleNadLite;
      let newBattleNadLite : BattleNadLiteUnformatted;
      
      // There's no 0 index in the others array
      for (let i = 1; i < 65; i++) {
        loadedExisting = false;
        loadedNew = false;

        if (gameState.others[i] != null) {
          if (gameState.others[i].index  == i) {
            loadedExisting = true;
          }
        }
        
        if (result.combatants.length > hostileIndex && result.combatants[hostileIndex] != null) {
          if (result.combatants[hostileIndex].index == i) {
            newBattleNadLite = result.combatants[hostileIndex];
            if (!loadedExisting) {
              gameState.updates.others[i] = true;
              gameState.others[i] = formatBattleNadLite(newBattleNadLite, true);
            } else {
              existingBattleNadLite = gameState.others[i];
              if (checkForLiteStatsUpdate(existingBattleNadLite, newBattleNadLite) || checkLiteCombatDataForUpdate(existingBattleNadLite, newBattleNadLite, true)) {
                gameState.updates.others[i] = true;
                gameState.others[i] = formatBattleNadLite(newBattleNadLite, true);
              }
            }
            hostileIndex++;
            continue;
          }
        }

        if (result.noncombatants.length > friendlyIndex && result.noncombatants[friendlyIndex] != null) {
          if (result.noncombatants[friendlyIndex].index == i) {
            newBattleNadLite = result.noncombatants[friendlyIndex];
            if (!loadedExisting) {
              gameState.updates.others[i] = true;
              gameState.others[i] = formatBattleNadLite(newBattleNadLite, false);
            } else {
              existingBattleNadLite = gameState.others[i];
              if (checkForLiteStatsUpdate(existingBattleNadLite, newBattleNadLite) || checkLiteCombatDataForUpdate(existingBattleNadLite, newBattleNadLite, false)) {
                gameState.updates.others[i] = true;
                gameState.others[i] = formatBattleNadLite(newBattleNadLite, false);
              }
            }
            friendlyIndex++;
            continue;
          }
        }

        if (loadedExisting && !loadedNew) {
          gameState.updates.others[i] = true;
          gameState.others[i] = getEmptyBattleNadLite();
          continue;
        }
      }
      
      if (result.dataFeeds.length > 0) {
     
        const processedDataFeeds : DataFeed[] = processDataFeeds(result.dataFeeds, startBlock);
      
        for (let j = 0; j < processedDataFeeds.length; j++) {
          const dataFeed = processedDataFeeds[j];
          if (dataFeed.logs.length == 0) {
            continue;
          }

          const logs = dataFeed.logs || [];
          const chatLogs = dataFeed.chatLogs || [];
          let chatLogCount : number = 0;
          
          // Match chat events with chat contents by index
          // Each chat event should have an index that corresponds to the chat content
          for (let i = 0; i < logs.length; i++) {
            const log = logs[i];

            let characterName : string;
            let weaponName : string;
            let otherArmorName : string;
            let otherWeaponName : string;
            let otherName: string;
            if (log.mainPlayerIndex == gameState.character?.index) {
              characterName = gameState.character?.name || 'Unknown';
              weaponName = gameState.character?.weapon.name || 'pointy reference of badness';
            } else {
              characterName = gameState.others[log.mainPlayerIndex]?.name || 'Unknown';
              weaponName = gameState.others[log.mainPlayerIndex]?.weaponName || 'pointy reference of badness';
            }

            if (log.otherPlayerIndex != 0) {
              if (log.otherPlayerIndex == gameState.character?.index) {
                otherName = gameState.character?.name || 'Unknown';
                otherArmorName = gameState.character?.armor.name || 'Unknown';
                otherWeaponName = gameState.character?.weapon.name || 'Unknown';  
              } else {
                otherName = gameState.others[log.otherPlayerIndex]?.name || 'Unknown';
                otherArmorName = gameState.others[log.otherPlayerIndex]?.armorName || 'Unknown';
                otherWeaponName = gameState.others[log.otherPlayerIndex]?.weaponName || 'Unknown';
              }
            } else {
              otherName = '';
              otherArmorName = '';
              otherWeaponName = '';
            }

            if (log.logType == LogType.Chat) {
              const chatContent = chatLogs[chatLogCount];
              chatLogCount++;
              
              // Use the character name from the event and the message from the content
              gameState.chatLogs.push({
                characterName: characterName,
                message: typeof chatContent === 'string' ? chatContent : 
                        (typeof chatContent === 'object' && 'message' in chatContent) ? 
                        (chatContent as {message: string}).message : String(chatContent),
                timestamp: Date.now()
              });
              gameState.updates.eventLogs = true;

            } else {
              let message : string;

              if (log.logType == LogType.Ability) {
                message = `${characterName} reached stage ${log.lootedArmorID} of ${getAbilityName(log.lootedWeaponID)}`;
                if (otherName != '') {
                  message += ` targeting ${otherName}`;
                }
                if (log.hit) {
                  message += ` and hit`;
                  if (log.critical) {
                    message += ` critically`;
                  }
                  if (log.damageDone > 0) {
                    message += ` and did ${log.damageDone} damage`;
                  }
                } else {
                  message += ` but missed`;
                }
                if (log.healthHealed > 0) {
                  message += `.  They recovered ${log.healthHealed} health`;
                }
                message += `.`;
              } else if (log.logType == LogType.Combat) {
                message = `${characterName} attacked ${otherName} with their ${weaponName}`;
             
                if (log.hit) {
                  message += ` and hit`;
                
                  if (log.critical) {
                    message += ` critically`;
                  }
                  if (log.damageDone > 0) {
                    message += ` for ${log.damageDone} damage`;
                  }
                } else {
                  message += ` but missed`;
                }
                message += `.`;
                if (log.targetDied) {
                  message += ` ${otherName} was killed by ${characterName}`;
                  if (log.lootedWeaponID != 0) {
                    message += ` and looted their ${otherWeaponName}`;
                    if (log.lootedArmorID != 0) {
                      message += ` and ${otherArmorName}`;
                    }
                  }
                  if (log.lootedArmorID != 0) {
                    message += ` and looted their ${otherArmorName}`;
                  }
                  message += `!`;
                }
                if (log.healthHealed > 0) {
                  message += `  ${characterName} recovered ${log.healthHealed} health.`;
                }
              } else if (log.logType == LogType.Sepukku) {
                message = `${characterName} has ascended to mainnet - their shMonad gold is no longer in the BattleNad universe!`;
              } else if (log.logType == LogType.EnteredArea) {
                message = `${characterName} has entered the area!`;
              } else if (log.logType == LogType.LeftArea) {
                message = `${characterName} has left the area!`; // This will probably say "unknown!" beause their char name was already pruned TODO: fix
              } else if (log.logType == LogType.InstigatedCombat) {
                message = `${characterName} initiated combat with ${otherName}!`; // This will probably say "unknown!" beause their char name was already pruned TODO: fix
              } else {
                message = '';
              }

              gameState.eventLogs.push({
                message: message,
                timestamp: Date.now()
              });
              gameState.updates.eventLogs = true;
            }
          }
        }
      }

      if (result.sessionKeyData) {
        if (result.sessionKeyData.expiration != gameState.sessionKey.expiration) {
          gameState.updates.sessionKey = true;
          gameState.sessionKey = result.sessionKeyData;
        } else if (result.sessionKeyData.balance != gameState.sessionKey.balance) {
          gameState.updates.sessionKey = true;
          gameState.sessionKey = result.sessionKeyData;
        } else if (result.sessionKeyData.targetBalance != gameState.sessionKey.targetBalance) {
          gameState.updates.sessionKey = true;
          gameState.sessionKey = result.sessionKeyData;
        } else if (result.sessionKeyData.ownerCommittedAmount != gameState.sessionKey.ownerCommittedAmount) {
          gameState.updates.sessionKey = true;
          gameState.sessionKey = result.sessionKeyData;
        } else if (result.sessionKeyData.ownerCommittedShares != gameState.sessionKey.ownerCommittedShares) {
          gameState.updates.sessionKey = true;
          gameState.sessionKey = result.sessionKeyData;
        } else if (result.sessionKeyData.owner != gameState.sessionKey.owner) {
          gameState.updates.sessionKey = true;
          gameState.updates.owner = true;
          gameState.sessionKey = result.sessionKeyData;
        }
      }
      gameState.lastBlock = Number(result.endBlock);
      gameState.updates.lastBlock = true;
      
      // Update cache with the result
      gameDataCache.data = result;
      gameDataCache.lastUpdated = new Date();
      setLoading(false);

      return gameState;
    } catch (err) {
      setError(`Unexpected error in getFullFrontendData: ${err instanceof Error ? err.message : String(err)}`);
      setLoading(false);
      gameState.updates.error = true;
      return gameState;
    }
  }, [characterId, options.role, readContract, getOwnerWalletAddress, setCharacterId, setError, setLoading]);

  // Implement moveCharacter function
  const moveCharacter = useCallback(async (characterId: string, direction: string) => {
    try {
      console.log(`[moveCharacter] Moving character ${characterId} in direction ${direction}`);
      
      if (!embeddedWallet?.signer || !embeddedWallet?.address) {
        throw new Error('Session key wallet not available or not properly set up. Please reload the page and try again.');
      }
      
      let tx;
      switch (direction.toLowerCase()) {
        case 'north':
          tx = await moveNorth(characterId);
          break;
        case 'south':
          tx = await moveSouth(characterId);
          break;
        case 'east':
          tx = await moveEast(characterId);
          break;
        case 'west':
          tx = await moveWest(characterId);
          break;
        case 'up':
          tx = await moveUp(characterId);
          break;
        case 'down':
          tx = await moveDown(characterId);
          break;
        default:
          throw new Error(`Invalid direction: ${direction}`);
      }
      
      console.log(`[moveCharacter] Transaction sent: ${tx.hash}`);
      
      // Wait for transaction to be mined
      try {
        const receipt = await tx.wait();
        if (receipt) {
          console.log(`[moveCharacter] Move completed: ${receipt.hash}, gas used: ${receipt.gasUsed.toString()}`);
          return receipt;
        } else {
          throw new Error('No receipt returned from transaction');
        }
      } catch (receiptErr) {
        console.error('[moveCharacter] Error getting transaction receipt:', receiptErr);
        throw new Error(`Movement succeeded but error occurred while waiting for confirmation: ${receiptErr instanceof Error ? receiptErr.message : String(receiptErr)}`);
      }
    } catch (err: any) {
      console.error("[moveCharacter] Error:", err);
      
      // Get session key info to check if it's expired
      try {
        if (readContract) {
          // Directly get session key data from the contract
          const sessionKeyData = await readContract.getCurrentSessionKey(characterId);
          
          // Parse the session key data
          let sessionKey = null;
          if (Array.isArray(sessionKeyData)) {
            sessionKey = {
              key: sessionKeyData[0],
              expiration: Number(sessionKeyData[1])
            };
          } else if (sessionKeyData && typeof sessionKeyData === 'object') {
            sessionKey = {
              key: sessionKeyData.key,
              expiration: Number(sessionKeyData.expiration)
            };
          }
          
          // Check if session key is expired
          if (sessionKey) {
            let highestSeenBlock : number = await getCurrentBlockNumber();
            if (sessionKey.expiration < highestSeenBlock) {
              console.error("[moveCharacter] SESSION KEY EXPIRED! Transaction failed because the session key expired. Please update your session key.", {
                sessionKeyExpiration: sessionKey.expiration,
                currentBlock: highestSeenBlock
              });
              throw new Error('Your session key has expired. Please update your session key to continue playing.');
            }
          }
        }
      } catch (sessionKeyErr) {
        console.warn("[moveCharacter] Failed to check session key expiration:", sessionKeyErr);
      }
      
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
  }, [embeddedContract, embeddedWallet, readContract]);



  // Implement replenishGasBalance function
  const replenishGasBalance = useCallback(async (amount?: string) => {
    try {
      console.log(`[replenishGasBalance] Replenishing gas balance ${amount ? `with ${amount} MON` : ''}`);
      
      if (!injectedWallet?.signer || !injectedWallet?.address) {
        throw new Error('Owner wallet not available or not properly set up. Please connect your wallet and try again.');
      }
      
      if (!injectedContract) {
        throw new Error('Contract not available. Please connect your wallet and try again.');
      }
      
      // Set up transaction options
      const txOptions: any = {};
      
      // If amount is provided, convert it to wei and set as value
      if (amount) {
        txOptions.value = ethers.parseEther(amount);
      }
      
      // Call the contract function
      const tx = await injectedContract.replenishGasBalance(txOptions);
      console.log(`[replenishGasBalance] Transaction sent: ${tx.hash}`);
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error('No receipt returned from transaction');
      }
      console.log(`[replenishGasBalance] Transaction completed: ${receipt.hash}, gas used: ${receipt.gasUsed.toString()}`);
      return receipt;
    } catch (err: any) {
      console.error("[replenishGasBalance] Error:", err);
      
      // Provide better error message for common issues
      if (err.message && err.message.includes('insufficient funds')) {
        throw new Error('Insufficient funds in your wallet. Please add more funds.');
      } else if (err.message && err.message.includes('execution reverted')) {
        throw new Error('Transaction rejected by the contract.');
      } else if (err.message && err.message.includes('nonce too low')) {
        throw new Error('Transaction error: Please reload the page and try again.');
      } else {
        throw new Error(err.message || "Error replenishing gas balance");
      }
    }
  }, [injectedContract, injectedWallet]);

  const changeAttackTarget = useCallback(async (characterId: string, targetIndex: number) => {
    let tx: ethers.TransactionResponse | undefined;
    try {
      console.log(`[changeAttackTarget] Changing attack target for character ${characterId} to target index ${targetIndex}`);
      
      if (!embeddedWallet?.signer || !embeddedWallet?.address) {
        throw new Error('Session key wallet not available or not properly set up. Please reload the page and try again.');
      }
      
      if (!characterId) {
        throw new Error('No character ID available. Please reload the page and try again.');
      }
      
      tx = await attack(characterId, targetIndex);
      console.log(`[changeAttackTarget] Transaction sent: ${tx.hash}`);

    } catch (err: any) {
      console.error("[changeAttackTarget] Error:", err);
    }

    if (tx) {
      try {
        const receipt = await tx.wait();
        if (receipt) {
          console.log(`[changeAttackTarget] Transaction completed: ${receipt.hash}, gas used: ${receipt.gasUsed.toString()}`);
          return receipt;
        } else {
          throw new Error('No receipt returned from transaction');
        }
      } catch (receiptErr) {
        console.error('[changeAttackTarget] Error getting transaction receipt:', receiptErr);
        throw new Error(`[changeAttackTarget] Error occurred while waiting for confirmation: ${receiptErr instanceof Error ? receiptErr.message : String(receiptErr)}`);
      }
    }
  }, [attack, embeddedWallet]);

  const changeEquippedWeapon = useCallback(async (characterId: string, weaponId: number) => {
    let tx: ethers.TransactionResponse | undefined;
    try {
      console.log(`[equipWeapon] Equipping weapon ${weaponId} for character ${characterId}`);
      
      if (!embeddedWallet?.signer || !embeddedWallet?.address) {
        throw new Error('Session key wallet not available or not properly set up. Please reload the page and try again.');
      }
      
      if (!characterId) {
        throw new Error('No character ID available. Please reload the page and try again.');
      }
      
      tx = await equipWeapon(characterId, weaponId);
      console.log(`[equipWeapon] Transaction sent: ${tx.hash}`);

    } catch (err: any) {
      console.error("[equipWeapon] Error:", err);
    }

    if (tx) {
      try {
        const receipt = await tx.wait();
        if (receipt) {
          console.log(`[equipWeapon] Transaction completed: ${receipt.hash}, gas used: ${receipt.gasUsed.toString()}`);
          return receipt;
        } else {
          throw new Error('No receipt returned from transaction');
        }
      } catch (receiptErr) {
        console.error('[equipWeapon] Error getting transaction receipt:', receiptErr);
        throw new Error(`[equipWeapon] Error occurred while waiting for confirmation: ${receiptErr instanceof Error ? receiptErr.message : String(receiptErr)}`);
      }
    }
  }, [equipWeapon, embeddedWallet]);

  const changeEquippedArmor = useCallback(async (characterId: string, armorId: number) => {
    let tx: ethers.TransactionResponse | undefined;
    try {
      console.log(`[equipArmor] Equipping armor ${armorId} for character ${characterId}`);
      
      if (!embeddedWallet?.signer || !embeddedWallet?.address) {
        throw new Error('Session key wallet not available or not properly set up. Please reload the page and try again.');
      }
      
      if (!characterId) {
        throw new Error('No character ID available. Please reload the page and try again.');
      }
      
      tx = await equipArmor(characterId, armorId);
      console.log(`[equipArmor] Transaction sent: ${tx.hash}`);

    } catch (err: any) {
      console.error("[equipArmor] Error:", err);
    }

    if (tx) {
      try {
        const receipt = await tx.wait();
        if (receipt) {
          console.log(`[equipArmor] Transaction completed: ${receipt.hash}, gas used: ${receipt.gasUsed.toString()}`);
          return receipt;
        } else {
          throw new Error('No receipt returned from transaction');
        }
      } catch (receiptErr) {
        console.error('[equipArmor] Error getting transaction receipt:', receiptErr);
        throw new Error(`[equipArmor] Error occurred while waiting for confirmation: ${receiptErr instanceof Error ? receiptErr.message : String(receiptErr)}`);
      }
    }
  }, [equipArmor, embeddedWallet]);

  const assignNewPoints = useCallback(async (characterId: string, strength: bigint, vitality: bigint, dexterity: bigint, quickness: bigint, sturdiness: bigint, luck: bigint) => {
    let tx: ethers.TransactionResponse | undefined;
    try {
      console.log(`[allocatePoints] Allocating points for character ${characterId}`);
      
      if (!embeddedWallet?.signer || !embeddedWallet?.address) {
        throw new Error('Session key wallet not available or not properly set up. Please reload the page and try again.');
      }
      
      if (!characterId) {
        throw new Error('No character ID available. Please reload the page and try again.');
      }   

      tx = await allocatePoints(characterId, strength, vitality, dexterity, quickness, sturdiness, luck);
      console.log(`[allocatePoints] Transaction sent: ${tx.hash}`);

    } catch (err: any) {
      console.error("[allocatePoints] Error:", err);
    }

    if (tx) {
      try {
        const receipt = await tx.wait();
        if (receipt) {
          console.log(`[allocatePoints] Transaction completed: ${receipt.hash}, gas used: ${receipt.gasUsed.toString()}`);
        } else {
          throw new Error('No receipt returned from transaction');
        }
      } catch (receiptErr) {
        console.error('[allocatePoints] Error getting transaction receipt:', receiptErr);
        throw new Error(`[allocatePoints] Error occurred while waiting for confirmation: ${receiptErr instanceof Error ? receiptErr.message : String(receiptErr)}`);
      }
    }
  }, [allocatePoints, embeddedWallet]);

  // Implement sendChatMessage function
  const sendChatMessage = useCallback(async (message: string) => {
    try {
      console.log(`[sendChatMessage] Sending chat message: "${message}"`);
      
      if (!embeddedWallet?.signer || !embeddedWallet?.address) {
        throw new Error('Session key wallet not available or not properly set up. Please reload the page and try again.');
      }
      
      if (!characterId) {
        throw new Error('No character ID available. Please reload the page and try again.');
      }
      
      // Call the zoneChat method - this is the actual method name in the contract
      console.log(`[sendChatMessage] Executing contract call...`);
      
      const tx = await zoneChat(characterId, message);
      console.log(`[sendChatMessage] Transaction sent: ${tx.hash}`);
      
      // Wait for transaction to be mined
      console.log(`[sendChatMessage] Waiting for transaction confirmation...`);
      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error('No receipt returned from transaction');
      }
      console.log(`[sendChatMessage] Message sent: ${receipt.hash}, gas used: ${receipt.gasUsed.toString()}`);
      console.log(`[sendChatMessage] Chat message sent successfully. It should appear in the next data poll (within 5 seconds).`);
      
      return receipt;
    } catch (err: any) {
      console.error("[sendChatMessage] Error:", err);
      
      // Handle transaction errors more specifically
      const errorMessage = err.message || "Unknown error";
      
      // Log full error details for debugging
      console.error("[sendChatMessage] Detailed error:", {
        error: err,
        message: errorMessage,
        code: err.code,
        reason: err.reason,
        data: err.data,
        transaction: err.transaction,
        receipt: err.receipt
      });
      
      // Check for specific error conditions
      if (errorMessage.includes('method not found')) {
        console.error("[sendChatMessage] Contract method not found. Check the correct method name for sending chat messages.");
        throw new Error('Chat functionality not available: method not found in contract');
      } else if (errorMessage.includes('insufficient funds')) {
        throw new Error('Insufficient funds in your wallet. Please add more funds or replenish your gas balance.');
      } else if (errorMessage.includes('execution reverted')) {
        // Try to extract a more specific reason from the error
        const revertReason = err.reason || (err.data ? `Error with data: ${err.data}` : 'Transaction reverted by the contract');
        throw new Error(`Message rejected: ${revertReason}`);
      } else if (errorMessage.includes('nonce too low')) {
        throw new Error('Transaction error: Please reload the page and try again.');
      } else if (errorMessage.includes('Transaction failed')) {
        // Special handling for the generic "Transaction failed" error
        throw new Error('Transaction failed. This may be due to low gas balance or contract restrictions. Please check console for details.');
      } else {
        throw new Error(`Error sending chat message: ${errorMessage}`);
      }
    }
  }, [embeddedContract, embeddedWallet, characterId, readContract]);


  // Return all the functions and state that components need
  return {
    characterId,
    loading,
    error,
    getOwnerWalletAddress,
    getPlayerCharacterID,
    getPlayerCharacters,
    createCharacter,
    getCharacterIdByTransactionHash,
    getEstimatedBuyInAmount,
    pollForFrontendData,
    moveCharacter,
    replenishGasBalance,
    sendChatMessage,
    changeAttackTarget,
    changeEquippedWeapon,
    changeEquippedArmor,
    assignNewPoints,
    getCurrentBlockNumber
  };
};

// Add specialized hooks that leverage the central cache
export const useCharacterData = () => {
  const [characterData, setCharacterData] = useState(gameDataCache.data?.characterID ? 
    { id: gameDataCache.data.characterID } : null);
  
  // Listen for game data updates
  useEffect(() => {
    const handleGameDataUpdate = (event: CustomEvent) => {
      if (event.detail?.characterID) {
        setCharacterData({ id: event.detail.characterID });
      }
    };
    
    window.addEventListener('gameDataUpdated', handleGameDataUpdate as EventListener);
    
    // If we already have cached data, use it
    if (gameDataCache.data?.characterID) {
      setCharacterData({ id: gameDataCache.data.characterID });
    }
    
    return () => window.removeEventListener('gameDataUpdated', handleGameDataUpdate as EventListener);
  }, []);

  return {
    characterId: characterData?.id || null,
    loading: !characterData && !gameDataCache.data,
  };
};

export const useWalletBalances = () => {
  const [balances, setBalances] = useState({
    sessionKeyBalance: gameDataCache.data?.sessionKeyBalance || BigInt(0),
    bondedShMonadBalance: gameDataCache.data?.bondedShMonadBalance || BigInt(0),
    balanceShortfall: gameDataCache.data?.balanceShortfall || BigInt(0),
  });
  
  // Listen for game data updates
  useEffect(() => {
    const handleGameDataUpdate = (event: CustomEvent) => {
      setBalances({
        sessionKeyBalance: event.detail?.sessionKeyBalance || BigInt(0),
        bondedShMonadBalance: event.detail?.bondedShMonadBalance || BigInt(0),
        balanceShortfall: event.detail?.balanceShortfall || BigInt(0),
      });
    };
    
    window.addEventListener('gameDataUpdated', handleGameDataUpdate as EventListener);
    
    // If we already have cached data, use it
    if (gameDataCache.data) {
      setBalances({
        sessionKeyBalance: gameDataCache.data.sessionKeyBalance || BigInt(0),
        bondedShMonadBalance: gameDataCache.data.bondedShMonadBalance || BigInt(0),
        balanceShortfall: gameDataCache.data.balanceShortfall || BigInt(0),
      });
    }
    
    return () => window.removeEventListener('gameDataUpdated', handleGameDataUpdate as EventListener);
  }, []);
  
  return balances;
};

export const useGameActions = () => {
  const { 
    moveCharacter, 
    sendChatMessage: battleNadsSendChatMessage,
    characterId, 
    getCurrentBlockNumber
  } = useBattleNads();
  const { 
    injectedWallet, 
    embeddedWallet 
  } = useWallet();
  const { 
    injectedContract, 
    readContract 
  } = useContracts();
  
  // Reuse the existing sendChatMessage function
  const sendChatMessage = (message: string) => {
    if (!message.trim()) return;
    
    // If we have the battleNads sendChatMessage function, use it
    if (battleNadsSendChatMessage && characterId) {
      try {
        return battleNadsSendChatMessage(message);
      } catch (err) {
        console.error("Error sending chat message:", err);
      }
    } else {
      // Fallback to just logging
      console.log('Sending chat message to blockchain:', message);
    }
  };
  
  // Add updateSessionKey function that uses the contract
  const updateSessionKey = async (sessionKey?: string) => {
    try {
      console.log('[updateSessionKey] Updating session key');
      
      if (!injectedWallet?.signer || !injectedWallet?.address) {
        throw new Error('Owner wallet not available. Please connect your wallet and try again.');
      }
      
      if (!injectedContract) {
        throw new Error('Contract not available. Please connect your wallet and try again.');
      }
      
      if (!readContract) {
        throw new Error('Read contract not available. Please connect your wallet and try again.');
      }
      
      // Use provided session key or embedded wallet as fallback
      const sessionKeyToUse = sessionKey || embeddedWallet?.address;
      
      if (!sessionKeyToUse) {
        throw new Error('No session key provided and no embedded wallet available');
      }
      
      console.log(`[updateSessionKey] Using session key: ${sessionKeyToUse}`);
      
      // Create a provider to get current block number
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const currentBlock = await provider.getBlockNumber();
      
      // Set deadline to current block + 70000 (≈ 7 days worth of blocks)
      const sessionKeyDeadline = BigInt(currentBlock + 70000);
      console.log(`[updateSessionKey] Setting deadline to current block (${currentBlock}) + 70000 = ${sessionKeyDeadline}`);
      
      // Get estimated buy-in amount and double it for the transaction value
      const estimatedBuyInAmount = await readContract.estimateBuyInAmountInMON();
      // Convert to BigInt to ensure proper multiplication
      const buyInAmountBigInt = BigInt(estimatedBuyInAmount.toString());
      const txValue = buyInAmountBigInt * BigInt(2);
      
      console.log(`[updateSessionKey] Estimated buy-in amount: ${estimatedBuyInAmount.toString()}`);
      console.log(`[updateSessionKey] Transaction value (2x buy-in): ${txValue.toString()}`);
      
      // Setup transaction options with the value parameter and gas limit
      const txOptions = {
        value: txValue,
        gasLimit: 950000
      };
      
      // Call the contract function with transaction options
      const tx = await injectedContract.updateSessionKey(
        sessionKeyToUse,
        sessionKeyDeadline,
        txOptions
      );
      
      console.log(`[updateSessionKey] Transaction sent: ${tx.hash}`);
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error('No receipt returned from transaction');
      }
      
      console.log(`[updateSessionKey] Session key updated: ${receipt.hash}, gas used: ${receipt.gasUsed.toString()}`);
      return { success: true, hash: receipt.hash };
    } catch (err) {
      console.error("[updateSessionKey] Error:", err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : String(err) 
      };
    }
  };
  
  // Add getCurrentSessionKey function that uses the contract
  const getCurrentSessionKey = async (characterId: string): Promise<{ key: string; expiration: number } | null> => {
    try {
      console.log(`[getCurrentSessionKey] Fetching session key for character: ${characterId}`);
      
      if (!characterId) {
        throw new Error('No character ID provided');
      }
      
      if (!readContract) {
        throw new Error('Contract not available for reading');
      }
      
      // Call the contract function
      const sessionKeyData = await readContract.getCurrentSessionKey(characterId);
      
      // Handle different response formats
      let sessionKey: { key: string; expiration: number } | null = null;
      
      if (Array.isArray(sessionKeyData)) {
        // Handle array response [key, expiration]
        sessionKey = {
          key: sessionKeyData[0],
          expiration: Number(sessionKeyData[1])
        };
      } else if (sessionKeyData && typeof sessionKeyData === 'object') {
        // Handle object response {key, expiration}
        sessionKey = {
          key: sessionKeyData.key,
          expiration: Number(sessionKeyData.expiration)
        };
      }
      
      if (sessionKey && typeof sessionKey.key === 'string') {
        console.log(`[getCurrentSessionKey] Current session key: ${sessionKey.key}, expires at block: ${sessionKey.expiration}`);
        
        // Check if session key is expired
        const currentBlock = await getCurrentBlockNumber();
        if (currentBlock && sessionKey.expiration < currentBlock) {
          console.warn(`[getCurrentSessionKey] SESSION KEY EXPIRED! Expiration block: ${sessionKey.expiration}, Current block: ${currentBlock}`);
          
          // Dispatch the sessionKeyUpdateNeeded event
          const sessionKeyUpdateEvent = new CustomEvent('sessionKeyUpdateNeeded', {
            detail: { 
              characterId,
              owner: injectedWallet?.address,
              currentSessionKey: sessionKey.key,
              embeddedWalletAddress: embeddedWallet?.address,
              reason: 'expired' // Add reason so UI can show appropriate message
            }
          });
          
          window.dispatchEvent(sessionKeyUpdateEvent);
        }
        
        return sessionKey;
      }
      
      console.log('[getCurrentSessionKey] No valid session key found');
      return null;
    } catch (err) {
      console.error("[getCurrentSessionKey] Error:", err);
      return null;
    }
  };
  
  // Add helper function to check if the session key is expired
  const isSessionKeyExpired = async (characterId: string): Promise<boolean> => {
    try {
      const sessionKey = await getCurrentSessionKey(characterId);
      if (!sessionKey) return true; // Consider null session key as expired
      const currentBlock = await getCurrentBlockNumber();
      return currentBlock > 0 && sessionKey.expiration < currentBlock;
    } catch (err) {
      console.error("[isSessionKeyExpired] Error:", err);
      return true; // Consider error as expired to be safe
    }
  };
  
  return {
    moveCharacter,
    sendChatMessage,
    updateSessionKey,
    getCurrentSessionKey,
    isSessionKeyExpired
  };
}; 