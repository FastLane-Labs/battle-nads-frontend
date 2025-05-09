import { useState } from 'react';
import { Box, Text, Button, useToast } from '@chakra-ui/react';
import { useWallet } from '@/providers/WalletProvider';
import { useBattleNadsClient } from '@/hooks/contracts/useBattleNadsClient';
import { useBattleNads } from '@/hooks/game/useBattleNads';
import { ethers } from 'ethers';
import { DIRECT_FUNDING_AMOUNT, MIN_SAFE_OWNER_BALANCE } from '@/config/wallet';
// Default amount to send when funding a session key
export const DEFAULT_FUNDING_AMOUNT = 0.01;

interface SessionKeyFundingPromptProps {
  isOpen: boolean;
  onClose: () => void;
  characterId?: string;
  reason?: string;
  onSuccess?: () => void;
  /** When true, uses a more compact layout with no padding/borders (for toast context) */
  inToast?: boolean;
}

/**
 * A component that prompts the user to fund their session key
 * Can be shown anywhere in the app where insufficient funds errors occur
 */
export const SessionKeyFundingPrompt: React.FC<SessionKeyFundingPromptProps> = ({
  isOpen,
  onClose,
  characterId,
  reason = "Your session key has insufficient funds",
  onSuccess,
  inToast = false
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { injectedWallet } = useWallet();
  const { client } = useBattleNadsClient();
  const toast = useToast();
  
  // Get owner address from wallet
  const owner = injectedWallet?.address || null;
  
  // Get game state to access session key address
  const { gameState } = useBattleNads(owner);
  
  // Only show if the component is open and we have a wallet
  if (!isOpen || !injectedWallet?.address) {
    return null;
  }

  const handleFundSessionKey = async () => {
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
      setIsLoading(true);
      console.log("Starting session key funding process...");

      // Get session key address from gameState
      const sessionKeyAddress = gameState?.sessionKeyData?.key;
      console.log("Session key address:", sessionKeyAddress);
      
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
      console.log("Owner balance:", ethers.formatEther(ownerBalance), "ETH");
      
      // Calculate transfer amount
      const transferAmount = ethers.parseEther(DIRECT_FUNDING_AMOUNT);
      console.log("Transfer amount:", ethers.formatEther(transferAmount), "ETH");
      
      // Ensure owner has enough funds (including a safety buffer for gas)
      if (ownerBalance < transferAmount + ethers.parseEther(MIN_SAFE_OWNER_BALANCE)) {
        throw new Error(`Insufficient owner funds. Need ${DIRECT_FUNDING_AMOUNT} MON + gas.`);
      }
      
      console.log("Sending transaction to fund session key...");
      // Transfer funds directly to session key
      const tx = await injectedWallet.signer.sendTransaction({
        to: sessionKeyAddress,
        value: transferAmount,
      });
      
      console.log("Transaction sent:", tx.hash);
      console.log("Waiting for confirmation...");
      
      await tx.wait();
      console.log("Transaction confirmed!");
      
      // Close the prompt and trigger success callback
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error('Error funding session key:', error);
      toast({
        title: 'Funding Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Determine the style based on whether we're in a toast or not
  const boxProps = inToast ? {
    // No padding or background since the toast already has these
    p: 0,
    bg: "transparent",
    border: "none",
    borderRadius: "none",
    mb: 0
  } : {
    // Standard styling for inline rendering
    p: 3,
    bg: "blue.100",
    border: "1px",
    borderColor: "blue.300",
    borderRadius: "md",
    mb: 4
  };

  return (
    <Box {...boxProps}>
      <Text fontWeight="bold" fontSize="sm" color="blue.800">
        Session Key Needs Funds
      </Text>
      <Text fontSize="sm" color="blue.800" mb={2}>
        {reason}
      </Text>
      <Button
        colorScheme="blue"
        size="sm"
        onClick={handleFundSessionKey}
        isLoading={isLoading}
        loadingText="Sending..."
        width="full"
        isDisabled={!injectedWallet?.signer}
      >
        Send {DIRECT_FUNDING_AMOUNT} MON to Session Key
      </Button>
    </Box>
  );
};

export default SessionKeyFundingPrompt; 