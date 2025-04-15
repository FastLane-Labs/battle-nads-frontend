import React, { useEffect, useState, useCallback, useRef, memo } from 'react';
import { 
  Box, 
  Text, 
  Flex, 
  Badge, 
  Stat, 
  StatLabel, 
  StatNumber, 
  Button,
  Tooltip,
  Spinner,
  useToast
} from '@chakra-ui/react';
import { ethers } from 'ethers';
import { useWallet } from '../providers/WalletProvider';
import { useBattleNads, useWalletBalances as useBalances, useCharacterData, useGameActions } from '../hooks/useBattleNads';
import { useGameData } from '../providers/GameDataProvider';

const MONAD_RPC_URL = "https://rpc-testnet.monadinfra.com/rpc/Dp2u0HD0WxKQEvgmaiT4dwCeH9J14C24";
const LOW_SESSION_KEY_THRESHOLD = 0.16; // Show direct funding button when balance is below 0.16 ETH
const DIRECT_FUNDING_AMOUNT = "0.3"; // Amount to transfer directly to session key

// Implement React.memo to prevent unnecessary re-renders
const WalletBalances: React.FC = memo(() => {
  const { injectedWallet, embeddedWallet, sessionKey } = useWallet();
  const battleNads = useBattleNads();
  const { 
    replenishGasBalance = async () => { console.error("replenishGasBalance not available"); },
    setSessionKeyToEmbeddedWallet = async () => { console.error("setSessionKeyToEmbeddedWallet not available"); },
    getCurrentSessionKey = async () => { return null; }
  } = battleNads as any; // Cast to any to avoid typescript errors
  
  const { characterId } = useCharacterData();
  const walletBalances = useBalances();
  const { gameData, lastUpdated: dataLastUpdated } = useGameData();
  
  // Generate unique instance ID for this component for debugging
  const instanceId = useRef<string>(`WalletBalances-${Math.random().toString(36).substring(2, 9)}`);
  const renderCount = useRef<number>(0);
  
  const [ownerBalance, setOwnerBalance] = useState<string>('0');
  const [sessionKeyBalance, setSessionKeyBalance] = useState<string>('0');
  const [bondedBalance, setBondedBalance] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isReplenishing, setIsReplenishing] = useState(false);
  const [isDirectFunding, setIsDirectFunding] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [balanceShortfall, setBalanceShortfall] = useState<bigint | null>(null);
  
  const toast = useToast();

  // Track if we've already processed the current gameData to prevent duplicate processing
  const lastProcessedGameDataRef = useRef<string | null>(null);

  // Register this component instance in the mount effect
  useEffect(() => {
    const timestamp = new Date().toISOString();
    console.log(`[WalletBalances ${timestamp}] Component instance ${instanceId.current} created`);
    
    return () => {
      const cleanupTime = new Date().toISOString();
      console.log(`[WalletBalances ${cleanupTime}] Component instance ${instanceId.current} destroyed`);
    };
  }, []);

  // Function to fetch the owner wallet balance
  const fetchBalances = useCallback(async () => {
    try {
      setIsRefreshing(true);
      
      // Create provider for balance checks
      const provider = new ethers.JsonRpcProvider(MONAD_RPC_URL);
      
      // Get owner wallet balance
      if (injectedWallet?.address) {
        const balance = await provider.getBalance(injectedWallet.address);
        setOwnerBalance(ethers.formatEther(balance));
        
        // Only log the first time or on significant changes
        const formattedBalance = ethers.formatEther(balance);
        if (!ownerBalance || Math.abs(parseFloat(formattedBalance) - parseFloat(ownerBalance)) > 0.01) {
          const timestamp = new Date().toISOString();
          console.log(`[WalletBalances ${timestamp}] ${instanceId.current} Owner balance updated:`, formattedBalance);
        }
      }
      
      setIsRefreshing(false);
    } catch (error) {
      const timestamp = new Date().toISOString();
      console.error(`[WalletBalances ${timestamp}] ${instanceId.current} Error fetching balances:`, error);
      setIsRefreshing(false);
    }
  }, [injectedWallet, instanceId, ownerBalance]);

  // Fetch owner balance on component mount and when wallet changes
  useEffect(() => {
    if (injectedWallet?.address) {
      fetchBalances();
    }
  }, [injectedWallet?.address, fetchBalances]);

  // Function to replenish session key balance
  const handleReplenishBalance = async () => {
    try {
      setIsReplenishing(true);
      
      // First ensure session key is set to embedded wallet if needed
      if (!sessionKey && embeddedWallet?.address) {
        await setSessionKeyToEmbeddedWallet();
      }
      
      if (!injectedWallet?.address) {
        throw new Error('Owner wallet not connected. Please connect your wallet first.');
      }
      
      // Get owner balance
      const provider = new ethers.JsonRpcProvider(MONAD_RPC_URL);
      const ownerBalanceWei = await provider.getBalance(injectedWallet.address);
      
      // Calculate replenish amount - use only the exact contract-reported shortfall
      let replenishAmount: string;
      
      if (balanceShortfall) {
        // Convert balanceShortfall to ethers (it's in wei)
        const shortfallEth = ethers.formatEther(balanceShortfall);
        
        // Owner balance in ETH
        const ownerBalanceEth = ethers.formatEther(ownerBalanceWei);
        
        // Use the exact shortfall amount if owner has enough balance
        if (BigInt(ownerBalanceWei.toString()) < balanceShortfall) {
          // If owner has less than the shortfall, use almost all of owner's balance (leave some for gas)
          const safeBalance = ownerBalanceWei - ethers.parseEther("0.001"); // Leave 0.001 ETH for gas
          replenishAmount = safeBalance > 0 ? ethers.formatEther(safeBalance) : "0";
        } else {
          // Otherwise use the exact shortfall amount
          replenishAmount = shortfallEth;
        }
      } else {
        // Error if no shortfall is detected but button was clicked
        throw new Error("No balance shortfall detected from contract");
      }
      
      // Don't proceed if amount is too small
      if (parseFloat(replenishAmount) < 0.001) {
        throw new Error("Replenish amount too small or wallet has insufficient funds");
      }
      
      // Replenish with calculated amount
      await replenishGasBalance(replenishAmount);
      
      toast({
        title: 'Success',
        description: `Session key balance replenished with ${replenishAmount} MON`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Refresh balances and reset shortfall
      await fetchBalances();
      setBalanceShortfall(null);
      
    } catch (error: any) {
      const timestamp = new Date().toISOString();
      console.error(`[WalletBalances ${timestamp}] ${instanceId.current} Error replenishing balance:`, error);
      toast({
        title: 'Error',
        description: `Failed to replenish balance: ${error.message || String(error)}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsReplenishing(false);
    }
  };

  // Function to directly fund session key from owner wallet
  const handleDirectFunding = async () => {
    try {
      setIsDirectFunding(true);
      
      // First ensure session key is set to embedded wallet if needed
      if (!sessionKey && embeddedWallet?.address) {
        await setSessionKeyToEmbeddedWallet();
      }
      
      if (!injectedWallet?.address) {
        throw new Error('Owner wallet not connected. Please connect your wallet first.');
      }
      
      if (!sessionKey) {
        throw new Error('Session key not set. Please set up a session key first.');
      }
      
      // Get owner balance
      const provider = new ethers.JsonRpcProvider(MONAD_RPC_URL);
      const ownerBalanceWei = await provider.getBalance(injectedWallet.address);
      const ownerBalanceEth = ethers.formatEther(ownerBalanceWei);
      
      // Check if owner has enough balance
      const transferAmount = ethers.parseEther(DIRECT_FUNDING_AMOUNT);
      if (ownerBalanceWei < transferAmount + ethers.parseEther("0.001")) {
        throw new Error(`Insufficient funds in owner wallet. Need at least ${DIRECT_FUNDING_AMOUNT} ETH plus gas.`);
      }
      
      // Create a transaction to send funds directly
      const tx = await injectedWallet.signer?.sendTransaction({
        to: sessionKey,
        value: transferAmount,
      });
      
      if (!tx) {
        throw new Error('Failed to send transaction - signer not available');
      }
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      toast({
        title: 'Success',
        description: `Successfully sent ${DIRECT_FUNDING_AMOUNT} ETH to your session key wallet`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Refresh balances
      await fetchBalances();
      
    } catch (error: any) {
      const timestamp = new Date().toISOString();
      console.error(`[WalletBalances ${timestamp}] ${instanceId.current} Error in direct funding:`, error);
      toast({
        title: 'Error',
        description: `Failed to fund session key: ${error.message || String(error)}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsDirectFunding(false);
    }
  };

  // Update balances from gameData - THIS IS THE PRIMARY DATA SOURCE NOW
  useEffect(() => {
    // Increment render count for logging
    renderCount.current += 1;
    
    if (gameData) {
      // Create a stable identifier for this gameData to prevent duplicate processing
      const gameDataId = gameData.lastUpdated || Date.now().toString();
      
      // Skip processing if we've already processed this exact gameData
      if (lastProcessedGameDataRef.current === gameDataId) {
        return;
      }
      
      // Update our reference to avoid duplicate processing
      lastProcessedGameDataRef.current = gameDataId;
      
      // Only log every 10 renders to reduce console noise
      if (renderCount.current <= 3 || renderCount.current % 20 === 0) {
        const timestamp = new Date().toISOString();
        console.log(`[WalletBalances ${timestamp}] ${instanceId.current} (render #${renderCount.current}) Updating from gameData`);
      }
      
      // Update session key balance - directly use the value from the contract without any special handling
      if (gameData.sessionKeyBalance !== undefined) {
        // Format the balance from Wei to ETH - trust the blockchain value completely
        const formattedBalance = ethers.formatEther(gameData.sessionKeyBalance);
        setSessionKeyBalance(formattedBalance);
      }
      
      // Update bonded balance
      if (gameData.bondedShMonadBalance !== undefined) {
        const formattedBalance = ethers.formatEther(gameData.bondedShMonadBalance);
        setBondedBalance(formattedBalance);
      }
      
      // Update shortfall directly from gameData
      if (gameData.balanceShortfall !== undefined) {
        setBalanceShortfall(gameData.balanceShortfall > 0 ? gameData.balanceShortfall : null);
      }
      
      // Update last updated time
      if (dataLastUpdated) {
        setLastUpdated(dataLastUpdated);
      }
      
      setIsLoading(false);
    } else {
      // Only log the first few times or occasionally
      if (renderCount.current <= 3 || renderCount.current % 20 === 0) {
        const timestamp = new Date().toISOString();
        console.log(`[WalletBalances ${timestamp}] ${instanceId.current} (render #${renderCount.current}) gameData is null or undefined`);
      }
    }
  }, [gameData, dataLastUpdated]);
  
  // REMOVED: Secondary updates via events - These are redundant with GameDataProvider

  // Update state from the specialized hook - Only as a fallback
  useEffect(() => {
    if (walletBalances && !gameData) {
      // Only update if values exist and gameData is not available
      if (walletBalances.sessionKeyBalance) {
        setSessionKeyBalance(ethers.formatEther(walletBalances.sessionKeyBalance));
      }
      
      if (walletBalances.bondedShMonadBalance) {
        setBondedBalance(ethers.formatEther(walletBalances.bondedShMonadBalance));
      }
      
      if (walletBalances.balanceShortfall !== undefined) {
        setBalanceShortfall(walletBalances.balanceShortfall > 0 ? walletBalances.balanceShortfall : null);
      }
      
      if (!lastUpdated) {
        setLastUpdated(new Date());
      }
      
      setIsLoading(false);
    }
  }, [walletBalances, gameData]);

  if (isLoading) {
    return (
      <Box p={4} borderWidth="1px" borderRadius="lg" bg="gray.800" color="white">
        <Flex justify="center" align="center" minH="100px">
          <Spinner mr={3} />
          <Text>Loading wallet balances...</Text>
        </Flex>
      </Box>
    );
  }

  return (
    <Box p={3} borderWidth="1px" borderRadius="lg" bg="gray.800" color="white">
      <Text fontSize="md" fontWeight="bold" mb={2}>Gas Balances</Text>

      <Flex direction="column" gap={3}>
        {/* Session Key Wallet */}
        <Stat size="sm">
          <StatLabel>
            <Flex align="center" gap={1}>
              <Text fontSize="sm">Session Key</Text>
              <Badge colorScheme="purple" size="sm">MON</Badge>
            </Flex>
          </StatLabel>
          <StatNumber fontSize="lg">
            {/* Display the session key balance */}
            {`${parseFloat(sessionKeyBalance).toFixed(4)} MON`}
          </StatNumber>
        </Stat>
        
        {/* Bonded shMONAD Balance */}
        <Stat size="sm">
          <StatLabel>
            <Flex align="center" gap={1}>
              <Text fontSize="sm">Bonded Balance</Text>
              <Badge colorScheme="orange" size="sm">shMONAD</Badge>
            </Flex>
          </StatLabel>
          <StatNumber fontSize="lg">
            {bondedBalance === 'Not available yet' || 
             bondedBalance === 'Error fetching' || 
             bondedBalance === 'Address not set' || 
             bondedBalance === 'Policy ID not set' || 
             bondedBalance === 'Invalid address' || 
             bondedBalance === 'Function not found' || 
             bondedBalance === 'No contract' || 
             bondedBalance === 'Error: undefined result' ? 
              <Tooltip 
                label={`Error: ${bondedBalance}. Check console for details.`}
                hasArrow
                placement="top"
              >
                <Text color="red.300">{bondedBalance}</Text>
              </Tooltip> 
              : 
              `${parseFloat(bondedBalance).toFixed(4)} shMONAD`}
          </StatNumber>
        </Stat>

        {/* Direct Session Key Funding Button */}
        {sessionKey && parseFloat(sessionKeyBalance) < LOW_SESSION_KEY_THRESHOLD && (
          <Box 
            mt={1} 
            p={2} 
            bg="blue.100" 
            border="1px" 
            borderColor="blue.300" 
            borderRadius="md"
          >
            <Text fontWeight="bold" fontSize="sm" color="blue.800">
              Low Session Key Balance
            </Text>
            <Text fontSize="sm" color="blue.800" mb={2}>
              Your session key has less than {LOW_SESSION_KEY_THRESHOLD} MON. Send funds directly?
            </Text>
            <Button
              colorScheme="blue"
              size="sm"
              onClick={handleDirectFunding}
              isLoading={isDirectFunding}
              loadingText="Sending..."
              width="full"
            >
              Send {DIRECT_FUNDING_AMOUNT} MON to Session Key
            </Button>
          </Box>
        )}

        {/* Balance Shortfall Warning */}
        {balanceShortfall && balanceShortfall > 0 && (
          <Box 
            mt={1} 
            p={2} 
            bg="yellow.100" 
            border="1px" 
            borderColor="yellow.300" 
            borderRadius="md"
          >
            <Text fontWeight="bold" fontSize="sm" color="yellow.800">
              Low Gas Balances
            </Text>
            <Text fontSize="sm" color="yellow.800" mb={2}>
              Your app-committed shMONAD balance is running low - gasless transactions may stop working.
            </Text>
            <Button
              colorScheme="yellow"
              size="sm"
              onClick={handleReplenishBalance}
              isLoading={isReplenishing}
              loadingText="Replenishing..."
              width="full"
            >
              Commit More ShMONAD
            </Button>
          </Box>
        )}
      </Flex>
    </Box>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for memo
  // Since we don't have props, we can just return true to prevent re-renders
  return true;
});

export default WalletBalances; 