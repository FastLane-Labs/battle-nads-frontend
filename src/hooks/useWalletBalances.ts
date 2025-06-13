import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useBattleNads } from './game/useBattleNads';
import { RPC } from '@/config/env';
import { BALANCE_REFRESH_INTERVAL } from '@/config/wallet';

/**
 * Hook to fetch the owner's wallet balance
 */
function useOwnerBalance(owner: string | null) {
  const [balance, setBalance] = useState<string>('0');
  
  useEffect(() => {
    if (!owner) return;
    
    const fetchBalance = async () => {
      try {
        const provider = new ethers.JsonRpcProvider(RPC);
        const balanceWei = await provider.getBalance(owner);
        setBalance(ethers.formatEther(balanceWei));
      } catch (error) {
        console.error('Error fetching owner balance:', error);
      }
    };
    
    fetchBalance();
    
    // Set up periodic refresh
    const intervalId = setInterval(fetchBalance, BALANCE_REFRESH_INTERVAL);
    return () => clearInterval(intervalId);
  }, [owner]);
  
  return balance;
}

/**
 * Hook for accessing all wallet and session key balances
 * Combines data from useBattleNads with a direct owner balance check
 */
export function useWalletBalances(owner: string | null) {
  // Get game state from useBattleNads (already includes session key data)
  const { gameState, isLoading: isGameLoading } = useBattleNads(owner);
  
  // Get owner wallet balance via direct provider call
  const ownerBalance = useOwnerBalance(owner);
  
  // --- Add Guards: Only format if gameState and sessionKey are valid --- 
  const hasValidSessionKeyData = gameState && gameState.sessionKeyData && gameState.sessionKeyData.key !== '0x0000000000000000000000000000000000000000';
  
  // Extract session key and funding data from the game state
  const sessionKeyBalance = hasValidSessionKeyData
    ? ethers.formatUnits(gameState.sessionKeyData?.balance || BigInt(0), 18) // Use formatUnits here too
    : '0';
    
  const bondedBalance = hasValidSessionKeyData
    ? ethers.formatUnits(gameState.sessionKeyData?.ownerCommittedAmount || BigInt(0), 18) // Use formatUnits here too
    : '0';
    
  const shortfall = hasValidSessionKeyData ? (gameState.balanceShortfall || BigInt(0)) : BigInt(0);
  
  // Only format if shortfall is positive AND session key data was valid
  const formattedShortfall = hasValidSessionKeyData && shortfall > 0 ? ethers.formatEther(shortfall) : '0'; 
  
  // Determine if the session key balance is below threshold
  const targetBalance = hasValidSessionKeyData ? (gameState.sessionKeyData?.targetBalance || BigInt(0)) : BigInt(0);
  const formattedTargetBalance = hasValidSessionKeyData ? ethers.formatUnits(targetBalance, 18) : '0';
  // ---------------------------------------------------------------------

  return {
    isLoading: isGameLoading,
    ownerBalance,
    sessionKeyBalance,
    bondedBalance,
    shortfall: hasValidSessionKeyData ? shortfall : BigInt(0), // Return 0 if no valid session key
    formattedShortfall,
    targetBalance: formattedTargetBalance,
    hasShortfall: hasValidSessionKeyData && shortfall > 0, // Only true if session key is valid
  };
} 