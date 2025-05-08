import { useState, useCallback, useEffect } from 'react';
import { useToast, Box, CloseButton } from '@chakra-ui/react';
import { useQueryClient } from '@tanstack/react-query';
import SessionKeyFundingPrompt from '@/components/SessionKeyFundingPrompt';

// Utility function to check if an error is due to insufficient balance
export const isInsufficientBalanceError = (error: Error | null): boolean => {
  if (!error) return false;
  const errorMessage = error.message.toLowerCase();
  return errorMessage.includes('insufficient balance') || 
         errorMessage.includes('signer had insufficient balance');
};

interface UseInsufficientBalanceHandlerProps {
  characterId: string | null;
  actionName?: string; // What action was being attempted (e.g., "Move" or "Shield Bash")
  ownerAddress?: string | null; // Owner address to invalidate queries for
}

export const useInsufficientBalanceHandler = ({ 
  characterId,
  actionName = 'perform this action',
  ownerAddress
}: UseInsufficientBalanceHandlerProps) => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [showFundingPrompt, setShowFundingPrompt] = useState(false);
  const [fundingErrorReason, setFundingErrorReason] = useState<string>('');
  
  // Check if the error is an insufficient balance error and show prompt if needed
  const handleError = useCallback((error: Error | null) => {
    if (error && isInsufficientBalanceError(error)) {
      // Standard toast warning
      toast({
        title: 'Session Key Underfunded',
        description: 'Your session key needs more funds to continue. Please add funds to continue playing.',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      
      // Set state to show funding prompt
      setFundingErrorReason(
        `Your session key has insufficient funds to ${actionName}.`
      );
      setShowFundingPrompt(true);
      return true; // Error was handled
    }
    
    // Not an insufficient funds error
    setShowFundingPrompt(false);
    setFundingErrorReason('');
    return false; // Error was not handled
  }, [toast, actionName]);
  
  // Function to handle successful funding
  const handleFundingSuccess = useCallback(() => {
    // Clear funding prompt
    setShowFundingPrompt(false);
    setFundingErrorReason('');
    
    // Show success message
    toast({
      title: 'Funding Complete',
      description: 'Session key has been funded. You can now continue playing!',
      status: 'success',
      duration: 3000,
    });

    // Invalidate queries to refetch game state after funding
    if (ownerAddress) {
      queryClient.invalidateQueries({ queryKey: ['uiSnapshot', ownerAddress] });
    }
  }, [toast, queryClient, ownerAddress]);
  
  // Close the funding prompt
  const closeFundingPrompt = useCallback(() => {
    setShowFundingPrompt(false);
    setFundingErrorReason('');
  }, []);
  
  // Render the funding prompt as a toast
  useEffect(() => {
    if (showFundingPrompt && characterId) {
      // Create a unique toast ID to reference later
      const toastId = `funding-toast-${Date.now()}`;
      
      // Function to close the toast
      const closeToast = () => {
        toast.close(toastId);
        closeFundingPrompt();
      };
      
      // Show toast with the SessionKeyFundingPrompt component
      toast({
        id: toastId,
        position: 'bottom', // Different position than the warning toast
        duration: 10000,
        isClosable: true,
        containerStyle: {
          width: '320px', // Fixed width to prevent layout shifts
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
          >
            {/* Custom Close Button */}
            <CloseButton 
              position="absolute"
              top="2"
              right="2"
              size="sm"
              onClick={closeToast} 
              color="gray.700"
              bg="transparent"
              _hover={{ bg: "blue.100" }}
              aria-label="Close"
            />
            
            {/* Session funding prompt with toast styling */}
            <SessionKeyFundingPrompt
              isOpen={true}
              onClose={closeToast}
              characterId={characterId}
              reason={fundingErrorReason}
              onSuccess={() => {
                toast.close(toastId);
                handleFundingSuccess();
              }}
              inToast={true}
            />
          </Box>
        ),
      });
      
      // Cleanup function to close toast if component unmounts
      return () => {
        toast.close(toastId);
      };
    }
  }, [showFundingPrompt, characterId, fundingErrorReason, toast, closeFundingPrompt, handleFundingSuccess]);
  
  return {
    handleError,
    handleFundingSuccess,
    closeFundingPrompt,
    showFundingPrompt,
    fundingErrorReason,
  };
}; 