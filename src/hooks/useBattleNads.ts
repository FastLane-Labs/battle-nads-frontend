import { useState, useCallback, useEffect, useRef } from 'react';
import * as ethers from 'ethers';
import { useWallet } from '../providers/WalletProvider';
import { useContracts } from './useContracts';
import { getCharacterLocalStorageKey, isValidCharacterId } from '../utils/getCharacterLocalStorageKey';

/**
 * Safely stringifies objects containing BigInt values
 * @param obj - The object to stringify
 * @returns A JSON string representation of the object with BigInts converted to strings
 */
const safeStringify = (obj: any): string => {
  return JSON.stringify(obj, (_, value) => 
    typeof value === 'bigint' ? value.toString() : value
  );
};

// Constants
const RPC_URL = "https://rpc-testnet.monadinfra.com/rpc/Dp2u0HD0WxKQEvgmaiT4dwCeH9J14C24";
// Gas limit constants from the smart contract
const MIN_EXECUTION_GAS = BigInt(900000); // From Constants.sol
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

// Function to process data feeds from the contract
const processDataFeeds = (dataFeeds: any[], highestProcessedBlock: number): DataFeed[] => {
  if (!dataFeeds || dataFeeds.length === 0) {
    return [];
  }
  
  // Add debug logging for data feed processing
  console.log(`[processDataFeeds] Processing ${dataFeeds.length} data feeds with highestProcessedBlock: ${highestProcessedBlock}`);
  if (dataFeeds.length > 0) {
    const firstFeed = dataFeeds[0];
    console.log(`[processDataFeeds] First data feed structure:`, {
      hasChatLogsArray: firstFeed && Array.isArray(firstFeed.chatLogs),
      chatLogsLength: firstFeed && Array.isArray(firstFeed.chatLogs) ? firstFeed.chatLogs.length : 0,
      chatLogsContent: firstFeed && Array.isArray(firstFeed.chatLogs) && firstFeed.chatLogs.length > 0 ? firstFeed.chatLogs : 'empty',
      keys: firstFeed ? Object.keys(firstFeed) : []
    });
  }
  
  // Filter out data feeds from blocks we've already processed
  const newDataFeeds = dataFeeds.filter(feed => {
    const blockNumber = Number(feed.blockNumber);
    const isNew = blockNumber > highestProcessedBlock;
    if (!isNew && blockNumber > 0) {
      console.log(`[processDataFeeds] Skipping already processed block ${blockNumber}`);
    }
    return isNew;
  });
  
  console.log(`[processDataFeeds] After filtering: ${newDataFeeds.length}/${dataFeeds.length} data feeds are new`);
  
  return newDataFeeds.map(feed => {
    const blockNumber = Number(feed.blockNumber);
    
    // Process logs array
    const logs = Array.isArray(feed.logs) 
      ? feed.logs.map((log: any) => {
          // Ensure we capture all relevant fields, especially for chat logs
          const processedLog: Log = {
            logType: Number(log.logType),
            source: log.source,
            message: log.message,
            characterID: log.characterID, 
            characterName: log.characterName,
            x: log.x !== undefined ? Number(log.x) : undefined,
            y: log.y !== undefined ? Number(log.y) : undefined,
            depth: log.depth !== undefined ? Number(log.depth) : undefined,
            extraData: log.extraData,
            // Ensure we capture the index field for chat logs - this is critical for matching
            index: log.index !== undefined ? Number(log.index) : undefined
          };
          
          // Add special debug for chat logs
          if (processedLog.logType === LogType.Chat) {
            console.log(`[processDataFeeds] Chat log processed: Index=${processedLog.index}, Speaker=${processedLog.characterName}`);
          }
          
          return processedLog;
        })
      : [];
    
    // Process chatLogs array if it exists
    const chatLogs = Array.isArray(feed.chatLogs) ? feed.chatLogs : [];
    
    // Log any chat logs found
    if (chatLogs.length > 0) {
      console.log(`[processDataFeeds] Found ${chatLogs.length} chat logs in feed with block ${blockNumber}:`, chatLogs);
      
      // Check for matching between chat events and content
      const chatEvents = logs.filter((log: Log) => log.logType === LogType.Chat);
      if (chatEvents.length === chatLogs.length) {
        console.log(`[processDataFeeds] Perfect match between ${chatEvents.length} chat events and ${chatLogs.length} chat contents`);
      } else {
        console.log(`[processDataFeeds] Mismatch: ${chatEvents.length} chat events vs ${chatLogs.length} chat contents`);
      }
    }
    
    return { blockNumber, logs, chatLogs };
  });
};

// Add TypeScript definitions for the new data structures
export enum LogType {
  Combat = 0,
  InstigatedCombat = 1,
  EnteredArea = 2,
  LeftArea = 3,
  Chat = 4,
  Sepukku = 5
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
  index?: number;
}

export interface DataFeed {
  blockNumber: number;
  logs: Log[];
  chatLogs?: string[];
}

export interface ChatMessage {
  characterName: string;
  message: string;
  timestamp?: number;
}

export const useBattleNads = (options: { role?: 'provider' | 'consumer' } = { role: 'consumer' }) => {
  // Generate a unique instance ID for tracking this hook instance
  const instanceIdRef = useRef<string>(`useBattleNads-${Math.random().toString(36).substring(2, 9)}`);

  const { injectedWallet, embeddedWallet } = useWallet();
  const { readContract, injectedContract, embeddedContract, error: contractError } = useContracts();

  // Keep minimal state for the hook itself
  const [characterId, setCharacterId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(contractError);
  
  // Use ref to track initialization status and prevent multiple initializations
  const initializedRef = useRef(false);

  // Add state for data feeds
  const [dataFeeds, setDataFeeds] = useState<DataFeed[]>([]);
  const [eventLogs, setEventLogs] = useState<Log[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [lastFetchedBlock, setLastFetchedBlock] = useState<number>(0);
  const [highestSeenBlock, setHighestSeenBlock] = useState<number>(0);

  // Set this instance as the provider if the role is provider and no provider exists yet
  useEffect(() => {
    if (options.role === 'provider' && !gameDataCache.isProvider) {
      gameDataCache.isProvider = true;
    }
  }, [options.role]);

  // Initialize highestSeenBlock on mount if not set yet
  useEffect(() => {
    const initializeHighestBlock = async () => {
      if (highestSeenBlock === 0 && readContract) {
        try {
          // Get the current block and set highestSeenBlock to a few blocks before
          // to avoid missing very recent messages
          const provider = new ethers.JsonRpcProvider(RPC_URL);
          const currentBlock = await provider.getBlockNumber();
          // Set to a few blocks back to avoid missing recent transactions
          const initialBlock = Math.max(0, currentBlock - 10);
          console.log(`[useBattleNads] Initializing highestSeenBlock to ${initialBlock} (current block: ${currentBlock})`);
          setHighestSeenBlock(initialBlock);
        } catch (err) {
          console.error('[useBattleNads] Failed to initialize highestSeenBlock:', err);
        }
      }
    };
    
    initializeHighestBlock();
  }, [highestSeenBlock, readContract]);

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

  // Helper function to ensure transaction receipt
  const ensureReceipt = (receipt: any, operationName: string) => {
    if (!receipt) {
      throw new Error(`No receipt returned for ${operationName} operation`);
    }
    return receipt;
  };

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
      if (lastFetchedBlock > 0) {
        console.log(`[getCurrentBlockNumber] Using lastFetchedBlock as fallback: ${lastFetchedBlock}`);
        return lastFetchedBlock;
      }
      // Return a reasonable default if everything fails
      console.log(`[getCurrentBlockNumber] Using default block number`);
      return 0;
    }
  }, [lastFetchedBlock]);

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
  const getFullFrontendData = useCallback(async (characterIdOrOwnerAddress?: string, startBlockOverride?: number) => {
    // Return cached data if this is not the provider and cache exists
    if (options.role !== 'provider' && gameDataCache.data) {
      return gameDataCache.data;
    }

    try {
      setLoading(true);
      
      // For getFullFrontendData, we need an owner address, not a character ID
      const ownerAddress = characterIdOrOwnerAddress || getOwnerWalletAddress() || '';
      
      if (!ownerAddress) {
        setError("No owner address available");
        return null;
      }
      
      if (!readContract) {
        setError("No contract available");
        return null;
      }

      // Calculate start block - use override or lastFetchedBlock or global fallback or 0
      let startBlock;
      if (startBlockOverride !== undefined) {
        startBlock = startBlockOverride;
      } else if (lastFetchedBlock > 0) {
        startBlock = lastFetchedBlock;
      } else if ((window as any).lastKnownBlockNumber) {
        startBlock = (window as any).lastKnownBlockNumber;
      } else {
        startBlock = 0;
      }
      
      // Log the start block being used
      console.log(`[getFullFrontendData] Fetching data with start block: ${startBlock}`);
      
      let response;
      try {
        // Add logging for detailed debugging of contract call parameters
        console.log(`[getFullFrontendData] Making contract call with parameters:`, {
          ownerAddress,
          startBlock,
          contractAddress: readContract.target
        });
        
        // Call contract method
        response = await readContract.getFullFrontendData(ownerAddress, startBlock);
        
        // Check response type and add detailed logging
        console.log(`[getFullFrontendData] Contract response type: ${typeof response}`);
        
        // Log top-level structure of the response
        if (typeof response === 'object') {
          console.log(`[getFullFrontendData] Top level keys: ${Object.keys(response)}`);
        }
        
        // Log specific fields we're interested in for debugging
        if (response) {
          // Handle both array and object response formats
          let sessionKey = null;
          let characterID = null;
          let sessionKeyBalance = null;
          
          // Check if response is array-like
          if (Array.isArray(response)) {
            sessionKey = response[1];
            characterID = response[0];
            sessionKeyBalance = response[2];
          } else {
            // Assume object format
            sessionKey = response.sessionKey;
            characterID = response.characterID;
            sessionKeyBalance = response.sessionKeyBalance;
          }
          
          console.log(`[getFullFrontendData] Session key from contract: ${sessionKey} (${typeof sessionKey})`);
          
          // Add detailed logging if we have a zero session key with valid character ID
          if (sessionKey === '0x0000000000000000000000000000000000000000' && 
              characterID && 
              characterID !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
            console.log(`[getFullFrontendData] ZERO SESSION KEY ISSUE DETECTED:`, {
              ownerAddress,
              startBlock,
              characterID,
              contractAddress: readContract.target
            });
          }
          
          // Log session key balance
          console.log(`[getFullFrontendData] Session key balance from contract: ${sessionKeyBalance} (${typeof sessionKeyBalance})`);
        }
      } catch (callError) {
        console.error(`[getFullFrontendData] Contract call error:`, callError);
        setError(`Contract call failed: ${callError instanceof Error ? callError.message : String(callError)}`);
        return null;
      }
      
      // Debug check for chatLogs in response
      if (response && response.dataFeeds) {
        // Check if the response contains dataFeeds
        const dataFeeds = response.dataFeeds;
        let foundChatLogs = false;
        
        if (Array.isArray(dataFeeds)) {
          for (const feed of dataFeeds) {
            if (feed && Array.isArray(feed.chatLogs) && feed.chatLogs.length > 0) {
              console.log(`[getFullFrontendData] Found ${feed.chatLogs.length} chat messages in dataFeed:`, feed.chatLogs);
              foundChatLogs = true;
              break;
            }
          }
          
          if (!foundChatLogs) {
            console.log(`[getFullFrontendData] No chat messages found in ${dataFeeds.length} data feeds`);
          }
        }
      }
      
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
          // Extract basic scalar values first - these are unlikely to cause decoding errors
          if (response.length > 0) result.characterID = response[0];
          if (response.length > 1) result.sessionKey = response[1];
          if (response.length > 2) result.sessionKeyBalance = response[2] || BigInt(0);
          if (response.length > 3) result.bondedShMonadBalance = response[3] || BigInt(0);
          if (response.length > 4) result.balanceShortfall = response[4] || BigInt(0);
          if (response.length > 5) result.unallocatedAttributePoints = response[5] || 0;
          
          // Debug logging to see what we're getting from the blockchain
          console.log('[getFullFrontendData] Raw session key balance from blockchain:', 
            response.length > 2 ? response[2].toString() : 'undefined');
            
          // Add special debug logging for zero address session key with valid character ID
          const isZeroAddress = response.length > 1 && 
            response[1] === '0x0000000000000000000000000000000000000000';
          const hasValidCharacterID = response.length > 0 && 
            response[0] && 
            response[0] !== '0x0000000000000000000000000000000000000000000000000000000000000000';
            
          if (isZeroAddress && hasValidCharacterID) {
            console.error('======== SESSION KEY DEBUGGING ========');
            console.error('ISSUE DETECTED: Zero address session key with valid character ID');
            console.error('Owner address used for query:', ownerAddress);
            console.error('Start block used for query:', startBlock);
            console.error('Response structure: Array with', response.length, 'elements');
            console.error('Character ID:', response[0]);
            console.error('Session key (zero address):', response[1]);
            console.error('Session key balance:', response.length > 2 ? response[2].toString() : 'undefined');
            console.error('Bonded shMONAD balance:', response.length > 3 ? response[3].toString() : 'undefined');
            console.error('Balance shortfall:', response.length > 4 ? response[4].toString() : 'undefined');
            console.error('Unallocated attribute points:', response.length > 5 ? response[5].toString() : 'undefined');
            console.error('======================================');
          }
          
          // Check if we're getting a block number instead of a balance
          // Block numbers on most chains are large but < 1 billion, so we can perform a sanity check
          if (response.length > 2 && typeof response[2] === 'bigint' && response[2] > BigInt(100000) && response[2] < BigInt(10000000000)) {
            console.warn('[getFullFrontendData] Received suspiciously large value that might be a block number:', response[2].toString());
            
            // If the value looks like a block number, override it with a safer default
            result.sessionKeyBalance = BigInt(0);
            
            // Let's try to get the actual balance using ethers directly if we have the session key
            if (response.length > 1 && response[1] && typeof response[1] === 'string') {
              try {
                const provider = new ethers.JsonRpcProvider(RPC_URL);
                const actualBalance = await provider.getBalance(response[1]);
                console.log('[getFullFrontendData] Retrieved actual session key balance:', actualBalance.toString());
                result.sessionKeyBalance = actualBalance;
              } catch (balanceErr) {
                console.error('[getFullFrontendData] Error getting actual session key balance:', balanceErr);
              }
            }
          }
          
          // Handle complex types in a separate try/catch to avoid losing the balance data
          try {
            if (response.length > 6) result.character = response[6];
            if (response.length > 7) result.combatants = Array.isArray(response[7]) ? response[7] : [];
            if (response.length > 8) result.noncombatants = Array.isArray(response[8]) ? response[8] : [];
            if (response.length > 9) result.miniMap = response[9] || [];
            if (response.length > 10) result.equipableWeaponIDs = Array.isArray(response[10]) ? response[10] : [];
            if (response.length > 11) result.equipableWeaponNames = Array.isArray(response[11]) ? response[11] : [];
            if (response.length > 12) result.equipableArmorIDs = Array.isArray(response[12]) ? response[12] : [];
            if (response.length > 13) result.equipableArmorNames = Array.isArray(response[13]) ? response[13] : [];
            if (response.length > 14) result.dataFeeds = Array.isArray(response[14]) ? response[14] : [];
          } catch (complexFieldErr) {
            console.error(`Error processing complex fields: ${complexFieldErr instanceof Error ? complexFieldErr.message : String(complexFieldErr)}`);
          }
        } else if (typeof response === 'object' && response !== null) {
          // Object format (ethers.js structured data)
          // First extract scalar values that are less likely to cause issues
          try {
            if ('characterID' in response) result.characterID = response.characterID;
            if ('sessionKey' in response) result.sessionKey = response.sessionKey;
            if ('sessionKeyBalance' in response) result.sessionKeyBalance = response.sessionKeyBalance || BigInt(0);
            if ('bondedShMonadBalance' in response) result.bondedShMonadBalance = response.bondedShMonadBalance || BigInt(0);
            if ('balanceShortfall' in response) result.balanceShortfall = response.balanceShortfall || BigInt(0);
            if ('unallocatedAttributePoints' in response) result.unallocatedAttributePoints = response.unallocatedAttributePoints || 0;
            
            // Debug logging to see what we're getting from the blockchain
            console.log('[getFullFrontendData] Raw session key balance from object response:', 
              response.sessionKeyBalance ? response.sessionKeyBalance.toString() : 'undefined');
            
            // Add special debug logging for zero address session key with valid character ID
            const isZeroAddress = response.sessionKey === '0x0000000000000000000000000000000000000000';
            const hasValidCharacterID = response.characterID && 
              response.characterID !== '0x0000000000000000000000000000000000000000000000000000000000000000';
              
            if (isZeroAddress && hasValidCharacterID) {
              console.error('======== SESSION KEY DEBUGGING (Object Format) ========');
              console.error('ISSUE DETECTED: Zero address session key with valid character ID');
              console.error('Owner address used for query:', ownerAddress);
              console.error('Start block used for query:', startBlock);
              console.error('Character ID:', response.characterID);
              console.error('Session key (zero address):', response.sessionKey);
              console.error('Session key balance:', response.sessionKeyBalance ? response.sessionKeyBalance.toString() : 'undefined');
              console.error('Bonded shMONAD balance:', response.bondedShMonadBalance ? response.bondedShMonadBalance.toString() : 'undefined');
              console.error('Balance shortfall:', response.balanceShortfall ? response.balanceShortfall.toString() : 'undefined');
              console.error('Unallocated attribute points:', response.unallocatedAttributePoints || 'undefined');
              console.error('=================================================');
            }
            
            // Trust the session key balance from the blockchain directly
            // The contract already retrieves this correctly with: sessionKeyBalance = address(sessionKey).balance;
            if (response.sessionKeyBalance) {
              result.sessionKeyBalance = response.sessionKeyBalance;
            } else if (response.sessionKey && typeof response.sessionKey === 'string') {
              // Only as a fallback if we didn't get the balance but we have the session key
              try {
                const provider = new ethers.JsonRpcProvider(RPC_URL);
                const actualBalance = await provider.getBalance(response.sessionKey);
                console.log('[getFullFrontendData] Retrieved fallback session key balance:', actualBalance.toString());
                result.sessionKeyBalance = actualBalance;
              } catch (balanceErr) {
                console.error('[getFullFrontendData] Error getting fallback session key balance:', balanceErr);
                result.sessionKeyBalance = BigInt(0);
              }
            } else {
              result.sessionKeyBalance = BigInt(0);
            }
          } catch (scalarErr) {
            console.error(`Error extracting scalar values: ${scalarErr instanceof Error ? scalarErr.message : String(scalarErr)}`);
          }
          
          // Then try to handle complex fields
          try {
            // Assign more complex properties
            if ('character' in response) result.character = response.character;
            if ('combatants' in response) result.combatants = Array.isArray(response.combatants) ? response.combatants : [];
            if ('noncombatants' in response) result.noncombatants = Array.isArray(response.noncombatants) ? response.noncombatants : [];
            if ('miniMap' in response) result.miniMap = response.miniMap || [];
            if ('equipableWeaponIDs' in response) result.equipableWeaponIDs = Array.isArray(response.equipableWeaponIDs) ? response.equipableWeaponIDs : [];
            if ('equipableWeaponNames' in response) result.equipableWeaponNames = Array.isArray(response.equipableWeaponNames) ? response.equipableWeaponNames : [];
            if ('equipableArmorIDs' in response) result.equipableArmorIDs = Array.isArray(response.equipableArmorIDs) ? response.equipableArmorIDs : [];
            if ('equipableArmorNames' in response) result.equipableArmorNames = Array.isArray(response.equipableArmorNames) ? response.equipableArmorNames : [];
            if ('dataFeeds' in response) result.dataFeeds = Array.isArray(response.dataFeeds) ? response.dataFeeds : [];
          } catch (complexObjErr) {
            console.error(`Error processing complex object fields: ${complexObjErr instanceof Error ? complexObjErr.message : String(complexObjErr)}`);
          }
        }
        
        if (result.characterID) {
          const isHex = /^0x[0-9a-f]{64}$/i.test(result.characterID);
          
          if (!isHex && typeof result.characterID === 'string' && result.characterID.startsWith('0x')) {
            // Pad if too short
            if (result.characterID.length < 66) {
              result.characterID = result.characterID.padEnd(66, '0');
            }
          }
        } else if (characterId) {
          // Use fallback from state if available
          result.characterID = characterId;
        } else {
          // Try to get from localStorage
          try {
            const storageKey = getCharacterLocalStorageKey(ownerAddress);
            if (storageKey && localStorage.getItem(storageKey) !== null) {
              const storedId = localStorage.getItem(storageKey);
              if (storedId) {
                result.characterID = storedId;
              }
            }
          } catch (storageErr) {
            setError(`Error checking localStorage: ${storageErr instanceof Error ? storageErr.message : String(storageErr)}`);
          }
        }
      } catch (parseErr) {
        setError(`Error processing contract data: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`);
        return null;
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
      
      // Update the current block for next time
      try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const currentBlock = await provider.getBlockNumber();
        console.log(`[getFullFrontendData] Updating lastFetchedBlock from ${lastFetchedBlock} to ${currentBlock}`);
        setLastFetchedBlock(currentBlock);
        
        // Store in component state and also in a global variable for immediate access
        (window as any).lastKnownBlockNumber = currentBlock;
      } catch (blockErr) {
        setError(`Could not get current block: ${blockErr instanceof Error ? blockErr.message : String(blockErr)}`);
      }
      
      // Store characterID in state if it's valid and not already stored
      if (result.characterID && (!characterId || characterId !== result.characterID)) {
        setCharacterId(result.characterID);
       
        // Store in localStorage for persistence
        try {
          const storageKey = getCharacterLocalStorageKey(ownerAddress);
          if (storageKey) {
            localStorage.setItem(storageKey, result.characterID);
            
            // Only dispatch event if the character ID is valid (non-zero address)
            const isValidId = result.characterID !== '0x0000000000000000000000000000000000000000000000000000000000000000';
            
            if (isValidId) {
              // Also dispatch a characterIDChanged event to notify components
              const characterChangedEvent = new CustomEvent('characterIDChanged', {
                detail: { characterId: result.characterID, owner: ownerAddress }
              });
              window.dispatchEvent(characterChangedEvent);
              console.log(`[getFullFrontendData] Dispatched characterIDChanged event with ID: ${result.characterID}`);
            }
          }
        } catch (storageErr) {
          setError(`Failed to save character ID to localStorage: ${storageErr instanceof Error ? storageErr.message : String(storageErr)}`);
        }
      }
      
      // Process data feeds for chat and event logging
      if (Array.isArray(result.dataFeeds) && result.dataFeeds.length > 0) {
        try {
          const processedDataFeeds = processDataFeeds(result.dataFeeds, highestSeenBlock);
          setDataFeeds(processedDataFeeds);
          
          // Find the highest block number among processed feeds for tracking
          if (processedDataFeeds.length > 0) {
            const maxBlockNumber = Math.max(...processedDataFeeds.map(feed => feed.blockNumber));
            if (maxBlockNumber > highestSeenBlock) {
              console.log(`[getFullFrontendData] Updating highestSeenBlock from ${highestSeenBlock} to ${maxBlockNumber}`);
              setHighestSeenBlock(maxBlockNumber);
            }
          }
          
          // Extract and collate event logs from all data feeds
          const allLogs = processedDataFeeds.flatMap(feed => feed.logs || []);
          if (allLogs.length > 0) {
            // Only keep non-chat logs for the event log display
            setEventLogs(prev => [...allLogs.filter(log => log.logType !== LogType.Chat), ...prev]);
          }
          
          // Process chat messages by combining chat events with their content
          // First, collect all chat logs and chat events from all data feeds
          const chatEvents = allLogs.filter(log => log.logType === LogType.Chat);
          const chatContents = processedDataFeeds.flatMap(feed => feed.chatLogs || []);
          
          console.log(`[useBattleNads] Found ${chatEvents.length} chat events and ${chatContents.length} chat contents`);
          
          // Create properly attributed chat messages
          const processedChatMessages: ChatMessage[] = [];
          
          // Only process if we have both chat events and contents
          if (chatEvents.length > 0 && chatContents.length > 0) {
            // Match chat events with chat contents by index
            // Each chat event should have an index that corresponds to the chat content
            for (let i = 0; i < Math.min(chatEvents.length, chatContents.length); i++) {
              const chatEvent = chatEvents[i];
              const chatContent = chatContents[i];
              
              if (chatEvent && chatContent) {
                // Use the character name from the event and the message from the content
                processedChatMessages.push({
                  characterName: chatEvent.characterName || 'Unknown',
                  message: typeof chatContent === 'string' ? chatContent : 
                          (typeof chatContent === 'object' && 'message' in chatContent) ? 
                          (chatContent as {message: string}).message : String(chatContent),
                  timestamp: Date.now()
                });
              }
            }
            
            if (processedChatMessages.length > 0) {
              console.log(`[useBattleNads] Processed ${processedChatMessages.length} combined chat messages`);
              setChatMessages(prev => [...prev, ...processedChatMessages]);
            }
          } else if (chatContents.length > 0) {
            // Fallback: If we only have chat contents but no events, process them directly
            console.log('[useBattleNads] Processing chat contents without matching events');
            
            // Parse and map chat logs to the right format
            for (const chatLog of chatContents) {
              if (!chatLog) continue;
              
              let message: ChatMessage;
              
              // Try to parse the chat log if it's in a string format
              if (typeof chatLog === 'object' && 'characterName' in chatLog && 'message' in chatLog) {
                message = {
                  characterName: (chatLog as {characterName?: string}).characterName || 'Unknown',
                  message: (chatLog as {message?: string}).message || '',
                  timestamp: Date.now()
                };
              } else if (typeof chatLog === 'string') {
                // Try to parse it as JSON if it's a string
                try {
                  const parsed = JSON.parse(chatLog);
                  message = {
                    characterName: parsed.characterName || parsed.name || 'Unknown',
                    message: parsed.message || parsed.text || '',
                    timestamp: Date.now()
                  };
                } catch {
                  // If parsing fails, use the string as the message
                  message = {
                    characterName: 'System',
                    message: chatLog,
                    timestamp: Date.now()
                  };
                }
              } else {
                // Fallback for any other format
                message = {
                  characterName: 'Unknown',
                  message: String(chatLog) || '',
                  timestamp: Date.now()
                };
              }
              
              processedChatMessages.push(message);
            }
            
            if (processedChatMessages.length > 0) {
              console.log('[useBattleNads] Processed chat messages without events:', processedChatMessages);
              setChatMessages(prev => [...prev, ...processedChatMessages]);
            }
          }
        } catch (dataFeedErr) {
          setError(`Error processing data feeds: ${dataFeedErr instanceof Error ? dataFeedErr.message : String(dataFeedErr)}`);
        }
      }
      
      // Update cache with the result
      gameDataCache.data = result;
      gameDataCache.lastUpdated = new Date();
      setLoading(false);
      
      // Convert BigInt values to strings to avoid JSON serialization issues
      const safeResult = convertBigIntToString(result);
      return safeResult;
    } catch (err) {
      setError(`Unexpected error in getFullFrontendData: ${err instanceof Error ? err.message : String(err)}`);
      setLoading(false);
      return null;
    }
  }, [characterId, lastFetchedBlock, options.role, readContract, getOwnerWalletAddress, setCharacterId, setDataFeeds, setEventLogs, setChatMessages, setError, setLoading, highestSeenBlock]);

  // Implement moveCharacter function
  const moveCharacter = useCallback(async (characterId: string, direction: string) => {
    try {
      console.log(`[moveCharacter] Moving character ${characterId} in direction ${direction}`);
      
      if (!embeddedWallet?.signer || !embeddedWallet?.address) {
        throw new Error('Session key wallet not available or not properly set up. Please reload the page and try again.');
      }
      
      if (!embeddedContract) {
        throw new Error('Session key wallet not available. Please connect your wallet and try again.');
      }
      
      // Create transaction options
        const txOptions = { 
        gasLimit: MOVEMENT_GAS_LIMIT
      };
      
      let tx;
        switch (direction.toLowerCase()) {
        case 'north':
            tx = await embeddedContract.moveNorth(characterId, txOptions);
          break;
        case 'south':
            tx = await embeddedContract.moveSouth(characterId, txOptions);
          break;
        case 'east':
            tx = await embeddedContract.moveEast(characterId, txOptions);
          break;
        case 'west':
            tx = await embeddedContract.moveWest(characterId, txOptions);
          break;
        case 'up':
            tx = await embeddedContract.moveUp(characterId, txOptions);
          break;
        case 'down':
            tx = await embeddedContract.moveDown(characterId, txOptions);
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
  }, [embeddedContract, embeddedWallet]);

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

  // Implement sendChatMessage function
  const sendChatMessage = useCallback(async (message: string) => {
    try {
      console.log(`[sendChatMessage] Sending chat message: "${message}"`);
      
      if (!embeddedWallet?.signer || !embeddedWallet?.address) {
        throw new Error('Session key wallet not available or not properly set up. Please reload the page and try again.');
      }
      
      if (!embeddedContract) {
        throw new Error('Contract not available. Please connect your wallet and try again.');
      }
      
      if (!characterId) {
        throw new Error('No character ID available. Please reload the page and try again.');
      }
      
      // Create transaction options with a higher gas limit for chat
      const txOptions = { 
        gasLimit: MIN_EXECUTION_GAS // Standard gas limit for chat
      };
      
      console.log(`[sendChatMessage] Sending with character ID: ${characterId}, message: "${message}", gas limit: ${txOptions.gasLimit}`);
      
      // Call the zoneChat method - this is the actual method name in the contract
      console.log(`[sendChatMessage] Executing contract call...`);
      const tx = await embeddedContract.zoneChat(characterId, message, txOptions);
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
  }, [embeddedContract, embeddedWallet, characterId]);

  // Function to reset the block tracking for fetching historical data
  const resetBlockTracking = useCallback((blocksToGoBack = 20) => {
    if (lastFetchedBlock > 0) {
      const newBlockNum = Math.max(0, lastFetchedBlock - blocksToGoBack);
      console.log(`[useBattleNads] Resetting block tracking from ${highestSeenBlock} to ${newBlockNum}`);
      setHighestSeenBlock(newBlockNum);
    }
  }, [lastFetchedBlock, highestSeenBlock]);

  // Return all the functions and state that components need
  return {
    characterId,
    loading,
    error,
    dataFeeds,
    eventLogs,
    chatMessages,
    lastFetchedBlock,
    highestSeenBlock,
    getOwnerWalletAddress,
    getPlayerCharacterID,
    getPlayerCharacters,
    createCharacter,
    getCharacterIdByTransactionHash,
    getEstimatedBuyInAmount,
    getFullFrontendData,
    moveCharacter,
    replenishGasBalance,
    sendChatMessage,
    resetBlockTracking,
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
    characterId 
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
  const getCurrentSessionKey = async (characterId: string): Promise<string | null> => {
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
      let sessionKey: string | null = null;
      
      if (Array.isArray(sessionKeyData)) {
        // Handle array response [key, expiration]
        sessionKey = sessionKeyData[0];
      } else if (sessionKeyData && typeof sessionKeyData === 'object') {
        // Handle object response {key, expiration}
        sessionKey = sessionKeyData.key;
      }
      
      if (sessionKey && typeof sessionKey === 'string') {
        console.log(`[getCurrentSessionKey] Current session key: ${sessionKey}`);
        return sessionKey;
      }
      
      console.log('[getCurrentSessionKey] No valid session key found');
      return null;
    } catch (err) {
      console.error("[getCurrentSessionKey] Error:", err);
      return null;
    }
  };
  
  return {
    moveCharacter,
    sendChatMessage,
    updateSessionKey,
    getCurrentSessionKey
  };
}; 