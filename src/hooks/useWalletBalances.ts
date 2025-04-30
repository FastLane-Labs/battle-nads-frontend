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
  
  // Extract session key and funding data from the game state
  const sessionKeyBalance = gameState?.sessionKey?.balance 
    ? ethers.formatEther(gameState.sessionKey.balance) 
    : '0';
    
  const bondedBalance = gameState?.sessionKey?.ownerCommittedAmount
    ? ethers.formatEther(gameState.sessionKey.ownerCommittedAmount)
    : '0';
    
  const shortfall = gameState?.balanceShortfall || BigInt(0);
  const formattedShortfall = shortfall > 0 ? ethers.formatEther(shortfall) : '0';
  
  // Determine if the session key balance is below threshold
  const targetBalance = gameState?.sessionKey?.targetBalance || BigInt(0);
  const formattedTargetBalance = ethers.formatEther(targetBalance);
  
  return {
    isLoading: isGameLoading,
    ownerBalance,
    sessionKeyBalance,
    bondedBalance,
    shortfall,
    formattedShortfall,
    targetBalance: formattedTargetBalance,
    hasShortfall: shortfall > 0,
  };
} 