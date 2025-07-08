import React, { useState, useEffect } from "react";
import { Box, Text, Flex, useToast } from "@chakra-ui/react";
import { ethers } from "ethers";
import { useWallet } from "@/providers/WalletProvider";
import { useWalletBalances } from "@/hooks/wallet/useWalletState";
import { useBattleNadsClient } from "@/hooks/contracts/useBattleNadsClient";
import { useSimplifiedGameState } from "@/hooks/game/useSimplifiedGameState";
import {
  DIRECT_FUNDING_AMOUNT,
  LOW_SESSION_KEY_THRESHOLD,
  MIN_SAFE_OWNER_BALANCE,
  MIN_TRANSACTION_BALANCE,
} from "@/config/wallet";
import { SHMONAD_WEBSITE_URL } from "@/config/env";
import { TOPUP_MULTIPLIER } from '@/config/shmon';
import { BalanceDisplay } from './wallet/BalanceDisplay';
import { DirectFundingCard } from './wallet/DirectFundingCard';
import { ShortfallWarningCard } from './wallet/ShortfallWarningCard';
import { useReplenishment } from '@/hooks/wallet/useReplenishment';

const WalletBalances: React.FC = () => {
  const { injectedWallet } = useWallet();
  const { client } = useBattleNadsClient();
  const toast = useToast();

  // Use the owner address from the wallet
  const owner = injectedWallet?.address || null;
  
  // State for dismissing the shortfall warning
  const [isShortfallDismissed, setIsShortfallDismissed] = useState(false);

  // Get all balance data from the hook
  const {
    ownerBalance,
    sessionKeyBalance,
    bondedBalance,
    unbondedBalance,
    shortfall,
    isLoading,
    hasShortfall,
  } = useWalletBalances(owner);

  // Get gameState directly from useGameState
  const { gameState, error: gameStateError } = useSimplifiedGameState({
    includeActions: false,
    includeHistory: false,
  });

  // State for direct funding
  const [isDirectFunding, setIsDirectFunding] = useState(false);
  
  // Use replenishment hook
  const { handleReplenishBalance, isReplenishing } = useReplenishment(
    ownerBalance,
    bondedBalance,
    unbondedBalance,
    shortfall
  );
  
  // Enhanced replenishment handler with success callback
  const handleReplenishWithCallback = async (useMinimalAmount: boolean) => {
    try {
      await handleReplenishBalance(useMinimalAmount, false); // false = don't skip shortfall check
      // Auto-dismiss the shortfall warning on success
      setIsShortfallDismissed(true);
    } catch (error) {
      // Error is already handled in useReplenishment hook
    }
  };
  
  
  // Reset dismissed state when shortfall status changes
  useEffect(() => {
    if (!hasShortfall) {
      setIsShortfallDismissed(false);
    }
  }, [hasShortfall]);

  // Calculate shortfall amounts for display
  const shortfallEth =
    shortfall && shortfall > BigInt(0) ? ethers.formatEther(shortfall) : "0";
  const shortfallNum = parseFloat(shortfallEth) * TOPUP_MULTIPLIER;

  // Function to directly fund session key from owner wallet
  const handleDirectFunding = async (amount: string) => {
    if (!injectedWallet?.signer) {
      toast({
        title: "Error",
        description: "Owner wallet signer not available",
        status: "error",
        isClosable: true,
      });
      return;
    }

    try {
      setIsDirectFunding(true);

      // Get session key address from gameState
      const sessionKeyAddress = gameState?.sessionKeyData?.key;
      if (!sessionKeyAddress) {
        throw new Error("Session key not available.");
      }

      if (!injectedWallet?.address) {
        throw new Error("Owner wallet not connected.");
      }

      // Convert owner balance to BigInt for comparison
      const ownerBalanceWei = ethers.parseEther(ownerBalance);

      const transferAmount = ethers.parseEther(amount);
      if (
        ownerBalanceWei <
        transferAmount + ethers.parseEther(MIN_SAFE_OWNER_BALANCE)
      ) {
        throw new Error(`Insufficient owner funds. Need ${amount} MON + gas.`);
      }

      const tx = await injectedWallet.signer.sendTransaction({
        to: sessionKeyAddress,
        value: transferAmount,
      });

      await tx.wait();

      toast({
        title: "Success",
        description: `Sent ${amount} MON to session key`,
        status: "success",
        isClosable: true,
      });
    } catch (error: any) {
      console.error("Error in direct funding:", error);
      toast({
        title: "Error",
        description: `Direct funding failed: ${error.message || String(error)}`,
        status: "error",
        isClosable: true,
      });
    } finally {
      setIsDirectFunding(false);
    }
  };

  // Note: Removed loading spinner - balances update in background

  // Handle error state
  if (gameStateError) {
    return (
      <Box p={4} borderWidth="1px" borderRadius="lg" bg="red.900" color="white">
        <Text>
          Error loading game data:{" "}
          {gameStateError ? gameStateError.message : "Unknown error"}
        </Text>
      </Box>
    );
  }

  // Parse numeric values for comparison
  const sessionKeyBalanceNum = parseFloat(sessionKeyBalance);
  const unbondedBalanceNum = parseFloat(unbondedBalance);

  // Determine if direct funding should be offered
  // Show direct funding if session key is low
  const insufficientShmon = hasShortfall && (bondedBalance === '0' || parseFloat(bondedBalance) < parseFloat(shortfallEth));
  const showDirectFunding = sessionKeyBalanceNum < LOW_SESSION_KEY_THRESHOLD;
  const sessionKeyAddress = gameState?.sessionKeyData?.key;
  
  // Determine if automation can be enabled
  // Automation requires some liquid ShMON
  const canAutomate = unbondedBalanceNum > 0;
  const automationTooltip = unbondedBalanceNum === 0 
    ? "Requires shMON" 
    : "Set up automatic gas top-up using liquid shMON";

  // Calculate session key funding amounts for display
  const smallFundingAmount = (parseFloat(DIRECT_FUNDING_AMOUNT) * 0.5).toFixed(
    1
  );
  const largeFundingAmount = DIRECT_FUNDING_AMOUNT;

  return (
    <Box
      borderWidth="1px"
      borderRadius="md"
      color="white"
      className="px-3 pt-1 pb-2 flex flex-col gap-2 border-none overflow-hidden"
    >
      {/* <Text fontSize="md" fontWeight="bold">Gas Balances</Text> */}

      <Flex direction="column" gap={1.5} className="w-auto overflow-visible">
        <BalanceDisplay
          label="Session Key"
          balance={sessionKeyBalance}
          tokenType="MON"
        />
        <BalanceDisplay
          label="Committed"
          balance={bondedBalance}
          tokenType="shMON"
          actionButton={{
            label: "Automate",
            onClick: () => handleReplenishBalance(false, true), // false for not minimal, true to skip shortfall check
            disabled: !canAutomate,
            tooltip: automationTooltip,
            icon: "⚙️",
            isLoading: isReplenishing
          }}
        />
        <BalanceDisplay
          label="Liquid"
          balance={unbondedBalance}
          tokenType="shMON"
          actionLink={{
            label: "Get More ShMON",
            url: SHMONAD_WEBSITE_URL
          }}
        />
        <BalanceDisplay
          label="Owner Wallet"
          balance={ownerBalance}
          tokenType="MON"
        />

        {/* Direct Session Key Funding Button - show if session key is low */}
        {sessionKeyAddress && showDirectFunding && (
          <DirectFundingCard
            sessionKeyAddress={sessionKeyAddress}
            smallFundingAmount={smallFundingAmount}
            largeFundingAmount={largeFundingAmount}
            isLoading={isDirectFunding}
            disabled={!injectedWallet?.signer}
            onFund={handleDirectFunding}
          />
        )}

        {/* Balance Shortfall Warning - show if there's a shortfall */}
        {/* TEMPORARY FIX: Also show warning if committed balance is very low (< 0.01 SHMON) */}
        {(hasShortfall || parseFloat(bondedBalance) < 0.01) && !isShortfallDismissed && (
          <ShortfallWarningCard
            shortfallAmount={hasShortfall ? shortfallNum.toFixed(4) : '0.0050'}
            isLoading={isReplenishing}
            disabled={!client?.replenishGasBalance}
            manualDisabled={!client?.replenishGasBalance || parseFloat(ownerBalance) <= parseFloat(MIN_SAFE_OWNER_BALANCE)}
            automateDisabled={!client?.setMinBondedBalance || unbondedBalanceNum <= 0}
            onManualReplenish={() => handleReplenishWithCallback(true)}
            onAutomateReplenish={() => handleReplenishWithCallback(false)}
            onDismiss={() => setIsShortfallDismissed(true)}
          />
        )}
        
        {/* Low Balance Warning - show when critically low but no specific shortfall */}
        {sessionKeyBalanceNum < MIN_TRANSACTION_BALANCE && !hasShortfall && (
          <Box 
            p={3} 
            borderRadius="md" 
            bg="red.900" 
            borderWidth="1px" 
            borderColor="red.600"
          >
            <Text color="red.300" fontSize="sm" fontWeight="bold">
              ⚠️ Critical: Session key balance too low for transactions
            </Text>
            <Text color="red.200" fontSize="xs" mt={1}>
              Current: {sessionKeyBalance} MON (need {MIN_TRANSACTION_BALANCE} MON)
            </Text>
          </Box>
        )}
      </Flex>
    </Box>
  );
};

export default WalletBalances;
