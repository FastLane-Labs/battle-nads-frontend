import React, { useState } from "react";
import { Box, Text, Flex, Badge, Button, useToast } from "@chakra-ui/react";
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
import { POLICY_ID } from '@/config/env';

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

  // State for action buttons
  const [isReplenishing, setIsReplenishing] = useState(false);
  const [isDirectFunding, setIsDirectFunding] = useState(false);

  // Calculate shortfall amounts for display
  const shortfallEth =
    shortfall && shortfall > BigInt(0) ? ethers.formatEther(shortfall) : "0";

  // committed balance replensish amounts
  const shortfallNum = parseFloat(shortfallEth) * 3;
  const safeReplenishAmount = (shortfallNum * 2).toFixed(4);

  // Function to replenish session key balance using contract client
  const handleReplenishBalance = async (useMinimalAmount: boolean = false) => {
    if (!client?.replenishGasBalance) {
      toast({
        title: "Error",
        description: "Replenish function not available",
        status: "error",
        isClosable: true,
      });
      return;
    }

    try {
      setIsReplenishing(true);

      if (!injectedWallet?.address) {
        throw new Error("Owner wallet not connected.");
      }

      // Validate the shortfall (already in wei)
      if (!shortfall || shortfall <= BigInt(0)) {
        throw new Error("No balance shortfall detected.");
      }

      // Convert owner balance to BigInt for comparison
      const ownerBalanceWei = ethers.parseEther(ownerBalance);
      const unbondedBalanceWei = ethers.parseEther(unbondedBalance);

      // Calculate replenish amount based on option chosen using the same logic as UI display
      let targetAmount: bigint;
      const ownerBondedBalanceWei = ethers.parseEther(bondedBalance);
      if (useMinimalAmount) {
        // Minimal: shortfallNum amount (shortfall * 3)
        const shortfallNumWei = ethers.parseEther(shortfallNum.toString());
        targetAmount = shortfallNumWei + ownerBondedBalanceWei;
      } else {
        // Safe: safeReplenishAmount (shortfall + balance, but used on top up)
        const shortfallNumWei = ethers.parseEther(shortfallNum.toString());
        targetAmount = (shortfallNumWei + ownerBondedBalanceWei) * BigInt(2);
      }

      
      // Calculate safe replenish amount
      let replenishAmountWei: bigint;
      if (ownerBalanceWei < targetAmount) {
        const safeBalance =
          ownerBalanceWei - ethers.parseEther(MIN_SAFE_OWNER_BALANCE);
        replenishAmountWei = safeBalance > 0 ? safeBalance : BigInt(0);
      } else {
        replenishAmountWei = targetAmount;
      }

      const replenishAmountEth = ethers.formatEther(replenishAmountWei);
      if (replenishAmountWei <= BigInt(0)) {
        throw new Error(
          "Replenish amount zero or wallet has insufficient funds."
        );
      }

      if (useMinimalAmount) {
        // Call the contract method
        await client.replenishGasBalance(replenishAmountWei);

        toast({
          title: "Success",
          description: `Replenish transaction sent for ${replenishAmountEth} MON`,
          status: "success",
          isClosable: true,
        });

      } else {
        const safeBalance = unbondedBalanceWei;
        const maxBalance = targetAmount * BigInt(5760); // 60 min * 24 hours * 4

        let cappedBalance: bigint;
        if (safeBalance < maxBalance) {
          cappedBalance = safeBalance;
        } else {
          cappedBalance = maxBalance;
        }

        await client.setMinBondedBalance(BigInt(POLICY_ID), targetAmount, cappedBalance, BigInt(200_000));

        const cappedAmountEth = ethers.formatEther(cappedBalance);

        toast({
          title: "Success",
          description: `Transaction sent that sets an automatic commitment Top-Up for a max of ${cappedAmountEth} ShMON per day.`,
          status: "success",
          isClosable: true,
        });
      }

      
    } catch (error: any) {
      console.error("Error replenishing balance:", error);
      toast({
        title: "Error",
        description: `Replenish failed: ${error.message || String(error)}`,
        status: "error",
        isClosable: true,
      });
    } finally {
      setIsReplenishing(false);
    }
  };

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
        {/* Session Key Wallet */}
        <div className="flex w-full justify-between gap-2">
          <Flex align="center" gap={1}>
            <h2 className="text-sm font-medium gold-text-light">Session Key</h2>
            <Badge colorScheme="purple" size="xs">
              MON
            </Badge>
          </Flex>
          <div className="font-semibold text-amber-300 text-sm">
            {parseFloat(sessionKeyBalance).toFixed(4)}
          </div>
        </div>

        {/* Bonded MONAD Balance (Using ownerCommittedAmount) */}
        <div className="flex w-full justify-between gap-2">
          <Flex align="center" gap={1}>
            <h2 className="text-sm font-medium gold-text-light">Committed</h2>
            <Badge colorScheme="yellow" size="xs">
              shMON
            </Badge>
          </Flex>
          <div className="font-semibold text-amber-300 text-sm">
            {parseFloat(bondedBalance).toFixed(4)}
          </div>
        </div>

        {/* Owner Wallet Balance */}
        <div className="flex w-full justify-between gap-2">
          <Flex align="center" gap={1}>
            <h2 className="text-sm font-medium gold-text-light">
              Owner Wallet
            </h2>
            <Badge colorScheme="purple" size="xs">
              MON
            </Badge>
          </Flex>
          <div className="font-semibold text-amber-300 text-sm">
            {parseFloat(ownerBalance).toFixed(4)}
          </div>
        </div>

        {/* Direct Session Key Funding Button - only show if session key is low AND committed balance is NOT low */}
        {sessionKeyAddress && showDirectFunding && !hasShortfall && (
          <Box
            mt={1}
            p={3}
            className="flex flex-col gap-2 card-bg !border-amber-500/15"
          >
            <Text fontWeight="bold" fontSize="sm" className="gold-text-light">
              Low Session Key Balance
            </Text>
            <Text fontSize="sm" className="text-white" mb={2}>
              Your session key has less than {LOW_SESSION_KEY_THRESHOLD} MON.
            </Text>
            <Flex gap={2} width="full">
              <Button
                bg="amber.700"
                _hover={{ bg: "amber.600" }}
                size="sm"
                onClick={() => handleDirectFunding(smallFundingAmount)}
                isLoading={isDirectFunding}
                loadingText="Sending..."
                flex={1}
                isDisabled={!injectedWallet?.signer}
                className="!text-amber-300 font-medium card-bg-dark"
              >
                Send {smallFundingAmount} MON
              </Button>
              <Button
                bg="amber.600"
                _hover={{ bg: "amber.500" }}
                size="sm"
                onClick={() => handleDirectFunding(largeFundingAmount)}
                isLoading={isDirectFunding}
                loadingText="Sending..."
                flex={1}
                isDisabled={!injectedWallet?.signer}
                className="!text-amber-300 font-medium card-bg-dark"
              >
                Send {largeFundingAmount} MON
              </Button>
            </Flex>
          </Box>
        )}

        {/* Balance Shortfall Warning */}
        {hasShortfall && (
          <Box
            mt={1}
            p={3}
            className="flex flex-col gap-2 card-bg !border-red-500/25"
          >
            <Text fontWeight="bold" fontSize="sm" className="text-red-400">
              ⚠️ Character at Risk!
            </Text>
            <Text fontSize="sm" className="text-white" mb={2}>
              Your committed balance is running low.{" "}
              <strong className="text-red-300">
                If it hits zero, your character won't be able to defend itself
                and will likely die!
              </strong>{" "}
              Automate the refill or replenish manually now to keep your character alive.
            </Text>
            <Flex gap={2} width="full">
              <Button
                bg="red.700"
                _hover={{ bg: "red.600" }}
                size="sm"
                onClick={() => handleReplenishBalance(true)}
                isLoading={isReplenishing}
                loadingText="Replenishing..."
                flex={1}
                isDisabled={!client?.replenishGasBalance}
                className="!text-white font-medium"
              >
                🛡️ Manual ({shortfallNum.toFixed(4)})
              </Button>
              <Button
                bg="red.600"
                _hover={{ bg: "red.500" }}
                size="sm"
                onClick={() => handleReplenishBalance(false)}
                isLoading={isReplenishing}
                loadingText="Replenishing..."
                flex={1}
                isDisabled={!client?.replenishGasBalance}
                className="!text-white font-medium"
              >
                🛡️ Automate (ShMON)
              </Button>
            </Flex>
          </Box>
        )}
      </Flex>
    </Box>
  );
};

export default WalletBalances;
