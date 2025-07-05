import { useState, useEffect, useMemo } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../../providers/WalletProvider';
import { useContractPolling } from '../game/useContractPolling';
import { RPC } from '@/config/env';
import { 
  BALANCE_REFRESH_INTERVAL, 
  MIN_TRANSACTION_BALANCE,
  LOW_SESSION_KEY_THRESHOLD,
  DIRECT_FUNDING_AMOUNT,
  MIN_SAFE_OWNER_BALANCE 
} from '@/config/wallet';
import { safeFormatEther, safeFormatUnits } from '@/utils/safeNumberConversion';

import { useBattleNadsClient } from "@/hooks/contracts/useBattleNadsClient";

export interface WalletBalanceData {
  // Balance values (formatted strings)
  ownerBalance: string;
  sessionKeyBalance: string;
  bondedBalance: string;
  unbondedBalance: string;
  formattedShortfall: string;
  targetBalance: string;
  
  // Balance values (BigInt)
  shortfall: bigint;
  sessionKeyBalanceBigInt: bigint;
  bondedBalanceBigInt: bigint;
  targetBalanceBigInt: bigint;
  
  // Balance validation states
  hasShortfall: boolean;
  hasSufficientBalance: boolean;
  isTransactionDisabled: boolean;
  isLowBalance: boolean;
  
  // Balance thresholds and validation
  sessionKeyBalanceNum: number;
  minRequiredBalance: number;
  lowBalanceThreshold: number;
  insufficientBalanceMessage: string | null;
  
  // Loading and connection states
  isLoading: boolean;
  isBalanceLoading: boolean;
  hasValidSessionKeyData: boolean;
  isWalletConnected: boolean;
  
  // Wallet addresses
  ownerAddress: string | null;
  sessionKeyAddress: string | null;
  
  // Configuration values
  directFundingAmount: string;
  minSafeOwnerBalance: string;
}

export interface UseWalletStateOptions {
  /** Whether to include transaction validation (default: true) */
  includeTransactionValidation?: boolean;
  /** Whether to auto-refresh balances (default: true) */
  autoRefresh?: boolean;
  /** Custom refresh interval in ms (default: BALANCE_REFRESH_INTERVAL) */
  refreshInterval?: number;
}

/**
 * Consolidated wallet state hook that combines balance fetching and transaction validation
 * Replaces useWalletBalances and useTransactionBalance with a unified interface
 */
export function useWalletState(options: UseWalletStateOptions = {}): WalletBalanceData {
  const {
    includeTransactionValidation = true,
    autoRefresh = true,
    refreshInterval = BALANCE_REFRESH_INTERVAL
  } = options;

  const { client } = useBattleNadsClient();
  const { injectedWallet, embeddedWallet } = useWallet();
  const ownerAddress = injectedWallet?.address ?? null;
  const sessionKeyAddress = embeddedWallet?.address ?? null;
  
  // Get session key and balance data from game data hook (single source of truth)
  // Note: We can't use useGameData here due to circular dependency, so we'll use a prop-based approach
  const { data: rawData, isLoading: isSnapshotLoading } = useContractPolling(ownerAddress);
  
  // Owner balance state (fetched via direct RPC)
  const [ownerBalance, setOwnerBalance] = useState<string>('0');
  const [unbondedBalance, setUnbondedBalance] = useState<string>('0');

  const [isOwnerBalanceLoading, setIsOwnerBalanceLoading] = useState<boolean>(false);

  // Fetch owner balance with optional auto-refresh
  useEffect(() => {
    if (!ownerAddress || !autoRefresh) return;
    
    const fetchOwnerBalance = async () => {
      setIsOwnerBalanceLoading(true);
      try {
        const provider = new ethers.JsonRpcProvider(RPC);
        const balanceWei = await provider.getBalance(ownerAddress);
        setOwnerBalance(ethers.formatEther(balanceWei));

        const balanceUnbondedWei = await client?.balanceOf(ownerAddress);
        if (balanceUnbondedWei) {
          setUnbondedBalance(ethers.formatEther(balanceUnbondedWei));
        }
        
      } catch (error) {
        console.error('[useWalletState] Error fetching owner balance:', error);
      } finally {
        setIsOwnerBalanceLoading(false);
      }
    };
    
    fetchOwnerBalance();
    
    // Set up periodic refresh
    const intervalId = setInterval(fetchOwnerBalance, refreshInterval);
    return () => clearInterval(intervalId);
  }, [ownerAddress, autoRefresh, refreshInterval]);

  // Session key data validation
  const hasValidSessionKeyData = useMemo((): boolean => {
    return Boolean(rawData && 
           rawData.sessionKeyData && 
           rawData.sessionKeyData.key !== '0x0000000000000000000000000000000000000000');
  }, [rawData]);

  // Extract and format session key balance data
  const sessionKeyBalanceBigInt = useMemo(() => {
    if (!hasValidSessionKeyData || !rawData?.sessionKeyData?.balance) return BigInt(0);
    return BigInt(rawData.sessionKeyData.balance);
  }, [hasValidSessionKeyData, rawData]);

  const bondedBalanceBigInt = useMemo(() => {
    if (!hasValidSessionKeyData || !rawData?.sessionKeyData?.ownerCommittedAmount) return BigInt(0);
    return BigInt(rawData.sessionKeyData.ownerCommittedAmount);
  }, [hasValidSessionKeyData, rawData]);

  const targetBalanceBigInt = useMemo(() => {
    if (!hasValidSessionKeyData || !rawData?.sessionKeyData?.targetBalance) return BigInt(0);
    return BigInt(rawData.sessionKeyData.targetBalance);
  }, [hasValidSessionKeyData, rawData]);

  const shortfall = useMemo(() => {
    return hasValidSessionKeyData && rawData ? (rawData.balanceShortfall || BigInt(0)) : BigInt(0);
  }, [hasValidSessionKeyData, rawData]);

  // Format balance values
  const sessionKeyBalance = useMemo(() => {
    return hasValidSessionKeyData ? safeFormatUnits(sessionKeyBalanceBigInt, 18) : '0';
  }, [hasValidSessionKeyData, sessionKeyBalanceBigInt]);

  const bondedBalance = useMemo(() => {
    return hasValidSessionKeyData ? safeFormatUnits(bondedBalanceBigInt, 18) : '0';
  }, [hasValidSessionKeyData, bondedBalanceBigInt]);

  const targetBalance = useMemo(() => {
    return hasValidSessionKeyData ? safeFormatUnits(targetBalanceBigInt, 18) : '0';
  }, [hasValidSessionKeyData, targetBalanceBigInt]);

  const formattedShortfall = useMemo(() => {
    return hasValidSessionKeyData && shortfall > 0 ? safeFormatEther(shortfall) : '0';
  }, [hasValidSessionKeyData, shortfall]);

  // Transaction validation (if enabled)
  const sessionKeyBalanceNum = useMemo(() => {
    return parseFloat(sessionKeyBalance || '0');
  }, [sessionKeyBalance]);

  const hasSufficientBalance = useMemo(() => {
    return includeTransactionValidation ? sessionKeyBalanceNum >= MIN_TRANSACTION_BALANCE : true;
  }, [includeTransactionValidation, sessionKeyBalanceNum]);

  const isLowBalance = useMemo(() => {
    return sessionKeyBalanceNum < LOW_SESSION_KEY_THRESHOLD;
  }, [sessionKeyBalanceNum]);

  const hasShortfall = useMemo((): boolean => {
    return Boolean(hasValidSessionKeyData && shortfall > 0);
  }, [hasValidSessionKeyData, shortfall]);

  // Loading states
  const isLoading = isSnapshotLoading || isOwnerBalanceLoading;
  
  // Transaction disabled state
  const isTransactionDisabled = useMemo(() => {
    return includeTransactionValidation && !isLoading && !hasSufficientBalance;
  }, [includeTransactionValidation, isLoading, hasSufficientBalance]);

  // Insufficient balance message
  const insufficientBalanceMessage = useMemo(() => {
    return isTransactionDisabled
      ? `Insufficient balance: ${sessionKeyBalanceNum.toFixed(4)} shMON (need ${MIN_TRANSACTION_BALANCE} shMON)`
      : null;
  }, [isTransactionDisabled, sessionKeyBalanceNum]);

  // Wallet connection state
  const isWalletConnected = Boolean(injectedWallet);

  return {
    // Balance values (formatted strings)
    ownerBalance,
    sessionKeyBalance,
    bondedBalance,
    unbondedBalance,
    formattedShortfall,
    targetBalance,
    
    // Balance values (BigInt)
    shortfall,
    sessionKeyBalanceBigInt,
    bondedBalanceBigInt,
    targetBalanceBigInt,
    
    // Balance validation states
    hasShortfall,
    hasSufficientBalance,
    isTransactionDisabled,
    isLowBalance,
    
    // Balance thresholds and validation
    sessionKeyBalanceNum,
    minRequiredBalance: MIN_TRANSACTION_BALANCE,
    lowBalanceThreshold: LOW_SESSION_KEY_THRESHOLD,
    insufficientBalanceMessage,
    
    // Loading and connection states
    isLoading,
    isBalanceLoading: isLoading, // Alias for backward compatibility
    hasValidSessionKeyData,
    isWalletConnected,
    
    // Wallet addresses
    ownerAddress,
    sessionKeyAddress,
    
    // Configuration values
    directFundingAmount: DIRECT_FUNDING_AMOUNT,
    minSafeOwnerBalance: MIN_SAFE_OWNER_BALANCE,
  };
}

/**
 * Backward compatibility hooks - these can be used during migration
 * and removed once all consumers are updated to use useWalletState
 */

/**
 * @deprecated Use useWalletState instead
 */
export function useWalletBalances(owner: string | null) {
  const walletState = useWalletState({ 
    includeTransactionValidation: false,
    autoRefresh: true 
  });
  
  // Return interface compatible with old useWalletBalances
  return {
    isLoading: walletState.isLoading,
    ownerBalance: walletState.ownerBalance,
    sessionKeyBalance: walletState.sessionKeyBalance,
    bondedBalance: walletState.bondedBalance,
    unbondedBalance: walletState.unbondedBalance,
    shortfall: walletState.shortfall,
    formattedShortfall: walletState.formattedShortfall,
    targetBalance: walletState.targetBalance,
    hasShortfall: walletState.hasShortfall,
  };
}

/**
 * @deprecated Use useWalletState instead
 */
export function useTransactionBalance() {
  const walletState = useWalletState({ 
    includeTransactionValidation: true,
    autoRefresh: true 
  });
  
  // Return interface compatible with old useTransactionBalance
  return {
    sessionKeyBalance: walletState.sessionKeyBalanceNum,
    hasSufficientBalance: walletState.hasSufficientBalance,
    isTransactionDisabled: walletState.isTransactionDisabled,
    minRequiredBalance: walletState.minRequiredBalance,
    isBalanceLoading: walletState.isBalanceLoading,
    insufficientBalanceMessage: walletState.insufficientBalanceMessage,
  };
}

