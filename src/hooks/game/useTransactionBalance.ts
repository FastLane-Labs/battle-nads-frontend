import { useWalletBalances } from '../useWalletBalances';
import { useWallet } from '../../providers/WalletProvider';
import { MIN_TRANSACTION_BALANCE } from '../../config/wallet';

/**
 * Hook that provides transaction balance validation
 * Returns whether the user has sufficient session key balance for transactions
 */
export const useTransactionBalance = () => {
  const { injectedWallet } = useWallet();
  const ownerAddress = injectedWallet?.address ?? null;
  const { sessionKeyBalance, isLoading } = useWalletBalances(ownerAddress);

  // Parse session key balance to number for comparison
  const sessionKeyBalanceNum = parseFloat(sessionKeyBalance || '0');
  
  // Check if balance meets minimum threshold
  const hasSufficientBalance = sessionKeyBalanceNum >= MIN_TRANSACTION_BALANCE;
  
  // Transaction is disabled if insufficient balance and not loading
  const isTransactionDisabled = !isLoading && !hasSufficientBalance;
  
  // Create formatted insufficient balance message
  const insufficientBalanceMessage = isTransactionDisabled
    ? `Insufficient balance: ${sessionKeyBalanceNum.toFixed(4)} MON (need ${MIN_TRANSACTION_BALANCE} MON)`
    : null;
  
  return {
    sessionKeyBalance: sessionKeyBalanceNum,
    hasSufficientBalance,
    isTransactionDisabled,
    minRequiredBalance: MIN_TRANSACTION_BALANCE,
    isBalanceLoading: isLoading,
    insufficientBalanceMessage,
  };
}; 