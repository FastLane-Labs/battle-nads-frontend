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
import { useBattleNads } from '../hooks/game/useBattleNads';
import { useBattleNadsClient } from '../hooks/contracts/useBattleNadsClient';

const MONAD_RPC_URL = "https://rpc-testnet.monadinfra.com/rpc/Dp2u0HD0WxKQEvgmaiT4dwCeH9J14C24";
const LOW_SESSION_KEY_THRESHOLD = 0.16; // Show direct funding button when balance is below 0.16 ETH
const DIRECT_FUNDING_AMOUNT = "0.3"; // Amount to transfer directly to session key

// Implement React.memo to prevent unnecessary re-renders
const WalletBalances: React.FC = memo(() => {
  const { injectedWallet, embeddedWallet, sessionKey } = useWallet();
  const { client } = useBattleNadsClient();
  
  // State needed for useBattleNads hook
  const [ownerAddress, setOwnerAddress] = useState<string>('');
  
  // Initialize owner address from wallet - BEFORE calling useBattleNads
  useEffect(() => {
    if (injectedWallet?.address && !ownerAddress) {
      setOwnerAddress(injectedWallet.address);
    }
  }, [injectedWallet?.address, ownerAddress]);
  
  // Call useBattleNads with ownerAddress
  const { gameState, isLoading: isGameStateLoading, error: gameStateError } = useBattleNads(ownerAddress || null);
  
  // Destructure needed contract interaction methods from the client
  const { 
    replenishGasBalance, 
    updateSessionKey // Use correct method name
  } = client || {}; 
  
  // Generate unique instance ID for this component for debugging
  const instanceId = useRef<string>(`WalletBalances-${Math.random().toString(36).substring(2, 9)}`);
  const renderCount = useRef<number>(0);
  
  // State for balances and loading/error states
  const [ownerBalance, setOwnerBalance] = useState<string>('0');
  // Session key balance is NOT directly available in gameState, manage separately if needed
  const [sessionKeyBalance, setSessionKeyBalance] = useState<string | null>(null); 
  // Bonded balance is NOT directly available in gameState, manage separately if needed
  const [bondedBalance, setBondedBalance] = useState<string>('N/A'); 
  const [isLoading, setIsLoading] = useState(true); // Combined loading state
  const [isRefreshingOwner, setIsRefreshingOwner] = useState(false);
  const [isReplenishing, setIsReplenishing] = useState(false);
  const [isDirectFunding, setIsDirectFunding] = useState(false);
  // Balance shortfall IS available in gameState
  const [balanceShortfall, setBalanceShortfall] = useState<bigint | null>(null);
  
  const toast = useToast();

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
  const fetchOwnerBalance = useCallback(async () => {
    if (!injectedWallet?.address) return; // Exit if no address
    try {
      setIsRefreshingOwner(true);
      const provider = new ethers.JsonRpcProvider(MONAD_RPC_URL);
      const balance = await provider.getBalance(injectedWallet.address);
      const formattedBalance = ethers.formatEther(balance);
      setOwnerBalance(formattedBalance);
    } catch (error) {
      console.error(`[WalletBalances ${instanceId.current}] Error fetching owner balance:`, error);
      setOwnerBalance('Error'); // Indicate error fetching owner balance
    } finally {
      setIsRefreshingOwner(false);
    }
  }, [injectedWallet?.address, instanceId]);

  // Function to fetch session key balance (example - might need adjustment)
  const fetchSessionKeyBalance = useCallback(async () => {
    if (!sessionKey) return;
    try {
      const provider = new ethers.JsonRpcProvider(MONAD_RPC_URL);
      const balance = await provider.getBalance(sessionKey);
      setSessionKeyBalance(ethers.formatEther(balance));
    } catch (error) {
       console.error(`[WalletBalances ${instanceId.current}] Error fetching session key balance:`, error);
       setSessionKeyBalance('Error');
    }
  }, [sessionKey, instanceId]);

  // Fetch balances on component mount and when wallets/session key change
  useEffect(() => {
    fetchOwnerBalance();
    fetchSessionKeyBalance(); // Fetch session key balance too
  }, [fetchOwnerBalance, fetchSessionKeyBalance]);

  // Function to replenish session key balance using contract client
  const handleReplenishBalance = async () => {
    if (!replenishGasBalance) {
      toast({ title: 'Error', description: 'Replenish function not available', status: 'error' });
      return;
    }
    try {
      setIsReplenishing(true);
      
      if (!injectedWallet?.address) {
        throw new Error('Owner wallet not connected.');
      }
      
      const provider = new ethers.JsonRpcProvider(MONAD_RPC_URL);
      const ownerBalanceWei = await provider.getBalance(injectedWallet.address);
      
      // Use the shortfall from gameState
      let replenishAmountWei: bigint;
      
      if (balanceShortfall && balanceShortfall > BigInt(0)) {
        if (ownerBalanceWei < balanceShortfall) {
          const safeBalance = ownerBalanceWei - ethers.parseEther("0.001"); 
          replenishAmountWei = safeBalance > 0 ? safeBalance : BigInt(0);
        } else {
          replenishAmountWei = balanceShortfall;
        }
      } else {
        throw new Error("No balance shortfall detected from game state.");
      }
      
      const replenishAmountEth = ethers.formatEther(replenishAmountWei);
      if (replenishAmountWei <= BigInt(0)) { 
        throw new Error("Replenish amount zero or wallet has insufficient funds.");
      }
      
      // Call the contract method
      await replenishGasBalance(replenishAmountWei); 
      
      toast({ title: 'Success', description: `Replenish transaction sent for ${replenishAmountEth} MON`, status: 'success' });
      
      // Optimistically clear shortfall and refetch balances after a delay
      setBalanceShortfall(null); 
      setTimeout(() => {
        fetchOwnerBalance();
        fetchSessionKeyBalance();
      }, 5000); // Refetch after 5s
      
    } catch (error: any) {
      console.error(`[WalletBalances ${instanceId.current}] Error replenishing balance:`, error);
      toast({ title: 'Error', description: `Replenish failed: ${error.message || String(error)}`, status: 'error' });
    } finally {
      setIsReplenishing(false);
    }
  };

  // Function to directly fund session key from owner wallet
  const handleDirectFunding = async () => {
    if (!injectedWallet?.signer) {
       toast({ title: 'Error', description: 'Owner wallet signer not available', status: 'error' });
       return;
    }
    try {
      setIsDirectFunding(true);
      
      if (!sessionKey) {
         throw new Error('Session key not available.');
      }
      
      if (!injectedWallet?.address) {
        throw new Error('Owner wallet not connected.');
      }
      
      const provider = new ethers.JsonRpcProvider(MONAD_RPC_URL);
      const ownerBalanceWei = await provider.getBalance(injectedWallet.address);
      
      const transferAmount = ethers.parseEther(DIRECT_FUNDING_AMOUNT);
      if (ownerBalanceWei < transferAmount + ethers.parseEther("0.001")) {
        throw new Error(`Insufficient owner funds. Need ${DIRECT_FUNDING_AMOUNT} MON + gas.`);
      }
      
      const tx = await injectedWallet.signer.sendTransaction({
        to: sessionKey,
        value: transferAmount,
      });
      
      await tx.wait();
      
      toast({ title: 'Success', description: `Sent ${DIRECT_FUNDING_AMOUNT} MON to session key`, status: 'success' });
      
      setTimeout(() => {
        fetchOwnerBalance();
        fetchSessionKeyBalance();
      }, 5000); // Refetch after 5s
      
    } catch (error: any) {
      console.error(`[WalletBalances ${instanceId.current}] Error in direct funding:`, error);
      toast({ title: 'Error', description: `Direct funding failed: ${error.message || String(error)}`, status: 'error' });
    } finally {
      setIsDirectFunding(false);
    }
  };

  // Update local balance shortfall state from gameState
  useEffect(() => {
    let newShortfall: bigint | null = null;
    if (gameState?.balanceShortfall !== undefined) {
       // Ensure we treat it as bigint
       const shortfallBigInt = BigInt(gameState.balanceShortfall);
       newShortfall = shortfallBigInt > BigInt(0) ? shortfallBigInt : null;
    } else if (gameState) {
       // If gameState exists but has no shortfall, newShortfall remains null
       newShortfall = null;
    }

    // Only update state if the value has actually changed
    if (newShortfall !== balanceShortfall) {
       setBalanceShortfall(newShortfall); // Now type-safe
       console.log(`[WalletBalances ${instanceId.current}] Balance shortfall updated:`, newShortfall);
    }
    
    // Update loading state based on game state loading
    if (!isGameStateLoading) {
       setIsLoading(false);
    }

  }, [gameState, isGameStateLoading, balanceShortfall]); // Depend on gameState and its loading status
  
  // Handle combined loading state (initial load or game state polling load)
  const showLoading = isLoading || (isGameStateLoading && !gameState); // Show loading initially or if polling fails first time

  if (showLoading) {
    return (
      <Box p={4} borderWidth="1px" borderRadius="lg" bg="gray.800" color="white">
        <Flex justify="center" align="center" minH="100px">
          <Spinner mr={3} />
          <Text>Loading wallet balances...</Text>
        </Flex>
      </Box>
    );
  }
  
  // Handle error state
  if (gameStateError) {
     return (
      <Box p={4} borderWidth="1px" borderRadius="lg" bg="red.900" color="white">
        <Text>Error loading game data: {gameStateError}</Text>
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
            {sessionKeyBalance === null ? <Spinner size="xs"/> : 
             sessionKeyBalance === 'Error' ? <Text color="red.300">Error</Text> : 
             `${parseFloat(sessionKeyBalance).toFixed(4)} MON`}
          </StatNumber>
        </Stat>
        
        {/* Bonded shMONAD Balance (Placeholder) */}
        <Stat size="sm">
          <StatLabel>
            <Flex align="center" gap={1}>
              <Text fontSize="sm">Bonded Balance</Text>
              <Badge colorScheme="orange" size="sm">shMONAD</Badge>
            </Flex>
          </StatLabel>
          <StatNumber fontSize="lg">
             <Text color="gray.500">{bondedBalance}</Text> {/* Display N/A or Error */}
          </StatNumber>
        </Stat>

        {/* Owner Wallet Balance */}
        <Stat size="sm">
          <StatLabel>
            <Flex align="center" gap={1}>
              <Text fontSize="sm">Owner Wallet</Text>
               <Badge colorScheme="blue" size="sm">MON</Badge>
               {isRefreshingOwner && <Spinner size="xs" ml={2}/>}
            </Flex>
          </StatLabel>
          <StatNumber fontSize="md">
            {ownerBalance === 'Error' ? <Text color="red.300">Error</Text> : 
             `${parseFloat(ownerBalance).toFixed(4)} MON`}
          </StatNumber>
        </Stat>

        {/* Direct Session Key Funding Button */}
        {sessionKey && sessionKeyBalance !== null && sessionKeyBalance !== 'Error' && parseFloat(sessionKeyBalance) < LOW_SESSION_KEY_THRESHOLD && (
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
              isDisabled={!injectedWallet?.signer} // Disable if no signer
            >
              Send {DIRECT_FUNDING_AMOUNT} MON to Session Key
            </Button>
          </Box>
        )}

        {/* Balance Shortfall Warning */}
        {balanceShortfall && balanceShortfall > BigInt(0) && (
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
              isDisabled={!replenishGasBalance} // Disable if function unavailable
            >
              Commit More ShMONAD
            </Button>
          </Box>
        )}
      </Flex>
    </Box>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for memo - prevent re-renders unless necessary
  // For simplicity, let React handle updates based on hook dependencies
  return true;
});

export default WalletBalances; 