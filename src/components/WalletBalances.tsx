import React, { useState } from "react";
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

  // Determine if direct funding should be offered
  const showDirectFunding = sessionKeyBalanceNum < LOW_SESSION_KEY_THRESHOLD;
  const sessionKeyAddress = gameState?.sessionKeyData?.key;

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
      className="px-3 pt-1 pb-2 flex flex-col gap-2 border-none"
    >
      {/* <Text fontSize="md" fontWeight="bold">Gas Balances</Text> */}

      <Flex direction="column" gap={1.5} className="w-auto">
        <BalanceDisplay
          label="Session Key"
          balance={sessionKeyBalance}
          tokenType="MON"
        />
        <BalanceDisplay
          label="Committed"
          balance={bondedBalance}
          tokenType="shMON"
        />
        <BalanceDisplay
          label="Liquid"
          balance={unbondedBalance}
          tokenType="shMON"
          actionLink={{
            label: "(Get More ShMON)",
            url: SHMONAD_WEBSITE_URL
          }}
        />
        <BalanceDisplay
          label="Owner Wallet"
          balance={ownerBalance}
          tokenType="MON"
        />

        {/* Direct Session Key Funding Button - only show if session key is low AND committed balance is NOT low */}
        {sessionKeyAddress && showDirectFunding && !hasShortfall && (
          <DirectFundingCard
            sessionKeyAddress={sessionKeyAddress}
            smallFundingAmount={smallFundingAmount}
            largeFundingAmount={largeFundingAmount}
            isLoading={isDirectFunding}
            disabled={!injectedWallet?.signer}
            onFund={handleDirectFunding}
          />
        )}

        {/* Balance Shortfall Warning */}
        {hasShortfall && (
          <ShortfallWarningCard
            shortfallAmount={shortfallNum.toFixed(4)}
            isLoading={isReplenishing}
            disabled={!client?.replenishGasBalance}
            onManualReplenish={() => handleReplenishBalance(true)}
            onAutomateReplenish={() => handleReplenishBalance(false)}
          />
        )}
      </Flex>
    </Box>
  );
};

export default WalletBalances;
