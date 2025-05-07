import React, { useState } from 'react';
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
import { useWallet } from '@/providers/WalletProvider';
import { useWalletBalances } from '@/hooks/useWalletBalances';
import { useBattleNadsClient } from '@/hooks/contracts/useBattleNadsClient';
import { useBattleNads } from '@/hooks/game/useBattleNads';
import { 
  DIRECT_FUNDING_AMOUNT, 
  LOW_SESSION_KEY_THRESHOLD,
  MIN_SAFE_OWNER_BALANCE
} from '@/config/wallet';

const WalletBalances: React.FC = () => {
  const { injectedWallet } = useWallet();
  const { client } = useBattleNadsClient();
  const toast = useToast();
  
  // Use the owner address from the wallet
  const owner = injectedWallet?.address || null;
  
  // Get all balance data from the hook
  const { 
    ownerBalance, 
    sessionKeyBalance, 
    bondedBalance,
    shortfall,
    isLoading,
    hasShortfall
  } = useWalletBalances(owner);
  
  // Get gameState directly from useBattleNads
  const { gameState, error: gameStateError } = useBattleNads(owner);
  
  // State for action buttons
  const [isReplenishing, setIsReplenishing] = useState(false);
  const [isDirectFunding, setIsDirectFunding] = useState(false);
  
  // Function to replenish session key balance using contract client
  const handleReplenishBalance = async () => {
    if (!client?.replenishGasBalance) {
      toast({ title: 'Error', description: 'Replenish function not available', status: 'error' });
      return;
    }
    
    try {
      setIsReplenishing(true);
      
      if (!injectedWallet?.address) {
        throw new Error('Owner wallet not connected.');
      }
      
      // Convert shortfall to BigInt if it's not already
      const shortfallBigInt = typeof shortfall === 'number' 
        ? BigInt(Math.round(shortfall)) 
        : shortfall;
      
      // Validate the shortfall
      if (!shortfallBigInt || shortfallBigInt <= BigInt(0)) {
        throw new Error("No balance shortfall detected.");
      }
      
      // Convert owner balance to BigInt for comparison
      const ownerBalanceWei = ethers.parseEther(ownerBalance);
      
      // Calculate safe replenish amount
      let replenishAmountWei: bigint;
      if (ownerBalanceWei < shortfallBigInt) {
        const safeBalance = ownerBalanceWei - ethers.parseEther(MIN_SAFE_OWNER_BALANCE); 
        replenishAmountWei = safeBalance > 0 ? safeBalance : BigInt(0);
      } else {
        replenishAmountWei = shortfallBigInt;
      }
      
      const replenishAmountEth = ethers.formatEther(replenishAmountWei);
      if (replenishAmountWei <= BigInt(0)) { 
        throw new Error("Replenish amount zero or wallet has insufficient funds.");
      }
      
      // Call the contract method
      await client.replenishGasBalance(replenishAmountWei); 
      
      toast({ title: 'Success', description: `Replenish transaction sent for ${replenishAmountEth} MON`, status: 'success' });
    } catch (error: any) {
      console.error('Error replenishing balance:', error);
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
      
      // Get session key address from gameState
      const sessionKeyAddress = gameState?.sessionKeyData?.key;
      if (!sessionKeyAddress) {
         throw new Error('Session key not available.');
      }
      
      if (!injectedWallet?.address) {
        throw new Error('Owner wallet not connected.');
      }
      
      // Convert owner balance to BigInt for comparison
      const ownerBalanceWei = ethers.parseEther(ownerBalance);
      
      const transferAmount = ethers.parseEther(DIRECT_FUNDING_AMOUNT);
      if (ownerBalanceWei < transferAmount + ethers.parseEther(MIN_SAFE_OWNER_BALANCE)) {
        throw new Error(`Insufficient owner funds. Need ${DIRECT_FUNDING_AMOUNT} MON + gas.`);
      }
      
      const tx = await injectedWallet.signer.sendTransaction({
        to: sessionKeyAddress,
        value: transferAmount,
      });
      
      await tx.wait();
      
      toast({ title: 'Success', description: `Sent ${DIRECT_FUNDING_AMOUNT} MON to session key`, status: 'success' });
    } catch (error: any) {
      console.error('Error in direct funding:', error);
      toast({ title: 'Error', description: `Direct funding failed: ${error.message || String(error)}`, status: 'error' });
    } finally {
      setIsDirectFunding(false);
    }
  };

  // Show loading state if data is not ready
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
  
  // Handle error state
  if (gameStateError) {
     return (
      <Box p={4} borderWidth="1px" borderRadius="lg" bg="red.900" color="white">
        <Text>Error loading game data: {gameStateError ? gameStateError.message : 'Unknown error'}</Text>
      </Box>
    );
  }

  // Parse numeric values for comparison
  const sessionKeyBalanceNum = parseFloat(sessionKeyBalance);
  
  // Determine if direct funding should be offered
  const showDirectFunding = sessionKeyBalanceNum < LOW_SESSION_KEY_THRESHOLD;
  const sessionKeyAddress = gameState?.sessionKeyData?.key;
  
  return (
    <Box borderWidth="1px" borderRadius="lg" bg="gray.800" color="white" className='px-3 pt-1 pb-2 flex gap-4'>
      <Text fontSize="md" fontWeight="bold" mb={2}>Gas Balances</Text>

      <Flex direction="column" gap={1} className='w-72'>
        {/* Session Key Wallet */}
        <div className='flex w-full justify-between gap-2'>
          <Flex align="center" gap={1}>
            <h2 className='text-sm font-medium'>Session Key</h2>
            <Badge colorScheme="purple" size="sm">MON</Badge>
          </Flex>
          <div className='text-lg font-medium'>
            {parseFloat(sessionKeyBalance).toFixed(4)} MON
          </div>
        </div>

        {/* Bonded MONAD Balance (Using ownerCommittedAmount) */}
        <div className='flex w-full justify-between gap-2'>
          <Flex align="center" gap={1}>
            <h2 className='text-sm font-medium'>Committed</h2>
            <Badge colorScheme="orange" size="sm">MON</Badge>
            </Flex>
          <div className='text-lg font-medium'>
          {parseFloat(bondedBalance).toFixed(4)} MON
          </div>
        </div>
        
        {/* Owner Wallet Balance */}
        <div className='flex w-full justify-between gap-2'>
          <Flex align="center" gap={1}>
            <h2 className='text-sm font-medium'>Owner Wallet</h2>
            <Badge colorScheme="blue" size="sm">MON</Badge>
            </Flex>
          <div className='text-lg font-medium'>
          {parseFloat(ownerBalance).toFixed(4)} MON
          </div>
        </div>

        {/* Direct Session Key Funding Button */}
        {sessionKeyAddress && showDirectFunding && (
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
        {hasShortfall && (
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
              Your app-committed balance is running low - gasless transactions may stop working.
            </Text>
            <Button
              colorScheme="yellow"
              size="sm"
              onClick={handleReplenishBalance}
              isLoading={isReplenishing}
              loadingText="Replenishing..."
              width="full"
              isDisabled={!client?.replenishGasBalance} // Disable if function unavailable
            >
              Replenish Committed Balance
            </Button>
          </Box>
        )}
      </Flex>
    </Box>
  );
};

export default WalletBalances; 