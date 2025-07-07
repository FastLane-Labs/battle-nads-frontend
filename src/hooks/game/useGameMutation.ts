import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { useToast } from '@chakra-ui/react';
import { useBattleNadsClient } from '../contracts/useBattleNadsClient';
import { invalidateSnapshot } from '../utils';
import { useWallet } from '@/providers/WalletProvider';
import { clearContractPollingCache } from './useContractPolling';

export interface GameMutationOptions<TData, TVariables> {
  /** Custom success message or function to generate success message */
  successMessage?: string | ((data: TData, variables: TVariables) => string);
  /** Custom error message or function to generate error message */
  errorMessage?: string | ((error: Error, variables: TVariables) => string);
  /** Whether to show success toast (default: true) */
  showSuccessToast?: boolean;
  /** Whether to show error toast (default: true) */
  showErrorToast?: boolean;
  /** Whether to invalidate UI snapshot queries (default: true) */
  invalidateSnapshot?: boolean;
  /** Whether to clear polling cache for fresh data (default: false, true for combat actions) */
  clearPollingCache?: boolean;
  /** Custom query keys to invalidate */
  invalidateQueries?: string[][];
  /** Custom success handler */
  onSuccess?: (data: TData, variables: TVariables) => void | Promise<void>;
  /** Custom error handler */
  onError?: (error: Error, variables: TVariables) => void;
  /** Toast success duration (default: 3000) */
  successDuration?: number;
  /** Toast error duration (default: 5000) */
  errorDuration?: number;
  /** Mutation key for caching */
  mutationKey?: string[];
}

export interface TransactionMutationOptions<TData, TVariables> extends GameMutationOptions<TData, TVariables> {
  /** Whether to show transaction confirmation flow (default: false) */
  showTransactionFlow?: boolean;
  /** Custom transaction description */
  transactionDescription?: string | ((variables: TVariables) => string);
}

/**
 * Enhanced useGameMutation for operations that result in blockchain transactions
 * Provides transaction confirmation flow with loading states
 */
export function useGameTransactionMutation<TData extends { hash: string; wait: (confirmations?: number) => Promise<any> }, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: TransactionMutationOptions<TData, TVariables> & { characterId?: string | null } = {}
) {
  const {
    successMessage = 'Transaction completed successfully',
    errorMessage = 'Transaction failed',
    showSuccessToast = true,
    showErrorToast = true,
    showTransactionFlow = false,
    transactionDescription = 'Transaction',
    invalidateSnapshot: shouldInvalidateSnapshot = true,
    invalidateQueries = [],
    onSuccess: customOnSuccess,
    onError: customOnError,
    successDuration = 4000,
    errorDuration = 7000,
    mutationKey,
    characterId,
  } = options;

  const toast = useToast();
  const queryClient = useQueryClient();
  const { client } = useBattleNadsClient();
  const { injectedWallet, embeddedWallet } = useWallet();
  const owner = injectedWallet?.address || null;

  // Defensive check for toast context
  if (!toast) {
    console.error('[useGameTransactionMutation] Toast context not available - ChakraProvider may be missing');
  }
  // Character ID passed from calling context to avoid circular dependency

  return useMutation<TData, Error, TVariables>({
    mutationKey,
    mutationFn: async (variables) => {
      if (!client) {
        throw new Error('Client missing');
      }
      return mutationFn(variables);
    },
    onSuccess: async (data, variables) => {
      if (showTransactionFlow) {
        // Show initial transaction sent toast
        const description = typeof transactionDescription === 'function' 
          ? transactionDescription(variables) 
          : transactionDescription;
        
        const loadingToastId = `tx-${data.hash}`;
        toast?.({
          id: loadingToastId,
          title: 'Transaction Sent',
          description: `${description}: ${data.hash.slice(0, 6)}...${data.hash.slice(-4)}. Waiting for confirmation...`,
          status: 'loading',
          duration: null,
          isClosable: true,
        });

        try {
          // Wait for transaction confirmation
          await data.wait(1);
          toast?.close?.(loadingToastId);
          
          if (showSuccessToast) {
            const message = typeof successMessage === 'function' 
              ? successMessage(data, variables) 
              : successMessage;
            toast?.({
              title: 'Transaction Confirmed',
              description: message,
              status: 'success',
              duration: successDuration,
              isClosable: true,
            });
          }
        } catch (waitError: any) {
          toast?.close?.(loadingToastId);
          if (showErrorToast && toast) {
            toast?.({
              title: 'Transaction Failed',
              description: `Failed to confirm transaction ${data.hash}: ${waitError.message}`,
              status: 'error',
              duration: errorDuration,
              isClosable: true,
            });
          }
          throw waitError;
        }
      } else if (showSuccessToast) {
        // Simple success toast for non-transaction flow
        const message = typeof successMessage === 'function' 
          ? successMessage(data, variables) 
          : successMessage;
        toast?.({
          title: 'Success',
          description: message,
          status: 'success',
          duration: successDuration,
          isClosable: true,
        });
      }

      // Clear polling cache if requested (for combat actions that might trigger level-ups)
      if (options.clearPollingCache) {
        clearContractPollingCache();
      }

      // Invalidate queries
      if (shouldInvalidateSnapshot && owner) {
        invalidateSnapshot(queryClient, owner, embeddedWallet?.address);
      }
      
      for (const queryKey of invalidateQueries) {
        queryClient.invalidateQueries({ queryKey });
      }

      // Custom success handler
      if (customOnSuccess) {
        await customOnSuccess(data, variables);
      }
    },
    onError: (error, variables) => {
      if (showErrorToast && toast) {
        const message = typeof errorMessage === 'function' 
          ? errorMessage(error, variables) 
          : errorMessage;
        toast?.({
          title: 'Error',
          description: message || error.message || 'An unknown error occurred',
          status: 'error',
          duration: errorDuration,
          isClosable: true,
        });
      }

      // Custom error handler
      if (customOnError) {
        customOnError(error, variables);
      }
    },
  });
}

/**
 * Standard useGameMutation for regular game operations
 * Simplified version without transaction confirmation flow
 */
export function useGameMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: GameMutationOptions<TData, TVariables> & { characterId?: string | null } = {}
) {
  const {
    successMessage = 'Operation completed successfully',
    errorMessage = 'Operation failed',
    showSuccessToast = true,
    showErrorToast = true,
    invalidateSnapshot: shouldInvalidateSnapshot = true,
    invalidateQueries = [],
    onSuccess: customOnSuccess,
    onError: customOnError,
    successDuration = 3000,
    errorDuration = 5000,
    mutationKey,
    characterId,
  } = options;

  const toast = useToast();
  const queryClient = useQueryClient();
  const { client } = useBattleNadsClient();
  const { injectedWallet, embeddedWallet } = useWallet();
  const owner = injectedWallet?.address || null;

  // Defensive check for toast context
  if (!toast) {
    console.error('[useGameMutation] Toast context not available - ChakraProvider may be missing');
  }
  // Character ID passed from calling context to avoid circular dependency

  return useMutation<TData, Error, TVariables>({
    mutationKey,
    mutationFn: async (variables) => {
      if (!client) {
        throw new Error('Client missing');
      }
      return mutationFn(variables);
    },
    onSuccess: async (data, variables) => {
      if (showSuccessToast && toast) {
        const message = typeof successMessage === 'function' 
          ? successMessage(data, variables) 
          : successMessage;
        toast?.({
          title: 'Success',
          description: message,
          status: 'success',
          duration: successDuration,
          isClosable: true,
        });
      }

      // Clear polling cache if requested (for combat actions that might trigger level-ups)
      if (options.clearPollingCache) {
        clearContractPollingCache();
      }

      // Invalidate queries
      if (shouldInvalidateSnapshot && owner) {
        invalidateSnapshot(queryClient, owner, embeddedWallet?.address);
      }
      
      for (const queryKey of invalidateQueries) {
        queryClient.invalidateQueries({ queryKey });
      }

      // Custom success handler
      if (customOnSuccess) {
        await customOnSuccess(data, variables);
      }
    },
    onError: (error, variables) => {
      if (showErrorToast && toast) {
        const message = typeof errorMessage === 'function' 
          ? errorMessage(error, variables) 
          : errorMessage;
        toast?.({
          title: 'Error',
          description: message || error.message || 'An unknown error occurred',
          status: 'error',
          duration: errorDuration,
          isClosable: true,
        });
      }

      // Custom error handler
      if (customOnError) {
        customOnError(error, variables);
      }
    },
  });
}

/**
 * Utility function to create optimistic mutation states
 * Useful for mutations that need immediate UI feedback
 */
export function useOptimisticMutation<TData, TVariables, TOptimisticState>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: GameMutationOptions<TData, TVariables> & {
    optimisticUpdate: (variables: TVariables) => TOptimisticState;
    revertOptimistic: () => void;
  }
) {
  const { optimisticUpdate, revertOptimistic, ...mutationOptions } = options;

  const mutation = useGameMutation(mutationFn, {
    ...mutationOptions,
    onSuccess: async (data, variables) => {
      // Custom success handler first, then user's
      if (mutationOptions.onSuccess) {
        await mutationOptions.onSuccess(data, variables);
      }
    },
    onError: (error, variables) => {
      // Revert optimistic update on error
      revertOptimistic();
      // Then user's error handler
      if (mutationOptions.onError) {
        mutationOptions.onError(error, variables);
      }
    },
  });

  const mutateWithOptimistic = (variables: TVariables) => {
    // Apply optimistic update immediately
    optimisticUpdate(variables);
    // Then perform mutation
    mutation.mutate(variables);
  };

  return {
    ...mutation,
    mutate: mutateWithOptimistic,
  };
}