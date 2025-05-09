import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast, Box, CloseButton, Button, Text, VStack } from '@chakra-ui/react';
import { useQueryClient } from '@tanstack/react-query';
import { useWallet } from '@/providers/WalletProvider';
import { useBattleNads } from './useBattleNads';
import { useBattleNadsClient } from '../contracts/useBattleNadsClient';
import { ethers } from 'ethers';
import { DIRECT_FUNDING_AMOUNT, MIN_SAFE_OWNER_BALANCE } from '@/config/wallet';

// Utility function to check if an error is due to insufficient balance
export const isInsufficientBalanceError = (error: Error | null): boolean => {
  if (!error) return false;
  const errorMessage = error.message.toLowerCase();
  return (
    errorMessage.includes('insufficient balance') || 
    errorMessage.includes('signer had insufficient balance') ||
    errorMessage.includes('insufficient funds')
  );
};

interface UseInsufficientBalanceHandlerProps {
  actionName?: string; // What action was being attempted (e.g., "Move" or "Shield Bash")
}

/**
 * Hook for handling insufficient balance errors and providing a funding UI
 * 
 * @param options Configuration options for the handler
 * @returns Object containing error handler function and state
 */
export const useInsufficientBalanceHandler = ({
  actionName = 'perform this action'
}: UseInsufficientBalanceHandlerProps = {}) => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { injectedWallet } = useWallet();
  const { client } = useBattleNadsClient();
  const [showFundingPrompt, setShowFundingPrompt] = useState(false);
  const [fundingErrorReason, setFundingErrorReason] = useState<string>('');
  const [isFunding, setIsFunding] = useState(false);
  const activeToastIdRef = useRef<string | number | null>(null);
  
  // Get owner address from wallet
  const owner = injectedWallet?.address || null;
  
  // Get game state to access session key data
  const { gameState } = useBattleNads(owner);
  const sessionKeyAddress = gameState?.sessionKeyData?.key;
  
  // Function to handle direct funding of session key
  const handleFundSessionKey = useCallback(async () => {
    if (!injectedWallet?.signer) {
      toast({
        title: 'Cannot Fund Session Key',
        description: 'Owner wallet signer not available',
        status: 'error',
        duration: 5000,
      });
      return;
    }
    
    try {
      setIsFunding(true);
      
      if (!sessionKeyAddress || sessionKeyAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error('Session key not available.');
      }
      
      if (!injectedWallet.address) {
        throw new Error('Owner wallet not connected.');
      }
      
      // Check that the provider exists before trying to use it
      if (!injectedWallet.signer.provider) {
        throw new Error('Provider not available. Please check your wallet connection.');
      }
      
      // Get owner balance directly from signer provider
      const ownerBalance = await injectedWallet.signer.provider.getBalance(injectedWallet.address);
      
      // Calculate transfer amount
      const transferAmount = ethers.parseEther(DIRECT_FUNDING_AMOUNT);
      
      // Ensure owner has enough funds (including a safety buffer for gas)
      if (ownerBalance < transferAmount + ethers.parseEther(MIN_SAFE_OWNER_BALANCE)) {
        throw new Error(`Insufficient owner funds. Need ${DIRECT_FUNDING_AMOUNT} MON + gas.`);
      }
      
      // Transfer funds directly to session key
      const tx = await injectedWallet.signer.sendTransaction({
        to: sessionKeyAddress,
        value: transferAmount,
      });
      
      await tx.wait();
      
      // Handle success
      handleFundingSuccess();
    } catch (error) {
      console.error('Error funding session key:', error);
      toast({
        title: 'Funding Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsFunding(false);
    }
  }, [injectedWallet, sessionKeyAddress, toast]);
  
  // Check if the error is an insufficient balance error and show prompt if needed
  const handleError = useCallback((error: Error | null) => {
    if (error && isInsufficientBalanceError(error)) {
      // Set state to show funding prompt
      setFundingErrorReason(
        `Your session key has insufficient funds to ${actionName}.`
      );
      setShowFundingPrompt(true);
      return true; // Error was handled
    }
    
    // Not an insufficient funds error
    return false; // Error was not handled
  }, [actionName]);
  
  // Function to handle successful funding
  const handleFundingSuccess = useCallback(() => {
    // Close any active funding prompt
    if (activeToastIdRef.current) {
      toast.close(activeToastIdRef.current);
    }
    
    // Clear funding prompt state
    setShowFundingPrompt(false);
    setFundingErrorReason('');
    
    // Show success message
    toast({
      title: 'Funding Complete',
      description: 'Session key has been funded. You can now continue playing!',
      status: 'success',
      duration: 3000,
    });

    // Invalidate queries to refetch game state
    if (owner) {
      queryClient.invalidateQueries({ queryKey: ['uiSnapshot', owner] });
    }
  }, [toast, queryClient, owner]);
  
  // Close the funding prompt
  const closeFundingPrompt = useCallback(() => {
    if (activeToastIdRef.current) {
      toast.close(activeToastIdRef.current);
      activeToastIdRef.current = null;
    }
    setShowFundingPrompt(false);
    setFundingErrorReason('');
  }, [toast]);
  
  // Render the funding prompt as a toast
  useEffect(() => {
    // If we should show the prompt and session key is available
    if (showFundingPrompt && sessionKeyAddress) {
      // Close any existing toast first
      if (activeToastIdRef.current) {
        toast.close(activeToastIdRef.current);
      }
      
      // Create a unique toast ID to reference later
      const toastId = `funding-toast-${Date.now()}`;
      activeToastIdRef.current = toastId;
      
      // Show toast with the funding UI
      toast({
        id: toastId,
        position: 'bottom',
        duration: null, // Keep open until user interaction
        isClosable: true,
        containerStyle: {
          width: '320px',
          maxWidth: '320px',
          margin: '0 auto',
        },
        render: () => (
          <Box 
            width="100%" 
            position="relative"
            borderRadius="md" 
            bg="blue.50"
            p="4"
            boxShadow="0 4px 6px rgba(0, 0, 0, 0.1)"
          >
            {/* Custom Close Button */}
            <CloseButton 
              position="absolute"
              top="2"
              right="2"
              size="sm"
              onClick={closeFundingPrompt}
              color="gray.700"
              bg="transparent"
              _hover={{ bg: "blue.100" }}
              aria-label="Close"
            />
            
            {/* Funding Prompt UI */}
            <VStack spacing={3} align="stretch">
              <Text fontWeight="bold" fontSize="md" color="blue.800">
                Session Key Needs Funds
              </Text>
              <Text fontSize="sm" color="blue.800">
                {fundingErrorReason}
              </Text>
              <Button
                colorScheme="blue"
                size="sm"
                onClick={handleFundSessionKey}
                isLoading={isFunding}
                loadingText="Sending..."
                width="full"
                isDisabled={!injectedWallet?.signer}
              >
                Send {DIRECT_FUNDING_AMOUNT} MON to Session Key
              </Button>
            </VStack>
          </Box>
        ),
      });
      
      // Cleanup function to close toast if component unmounts
      return () => {
        if (activeToastIdRef.current) {
          toast.close(activeToastIdRef.current);
          activeToastIdRef.current = null;
        }
      };
    }
  }, [showFundingPrompt, sessionKeyAddress, fundingErrorReason, toast, closeFundingPrompt, handleFundSessionKey, isFunding, injectedWallet]);
  
  return {
    handleError,
    handleFundingSuccess,
    closeFundingPrompt,
    showFundingPrompt,
    fundingErrorReason,
    isFunding,
  };
}; 