import { useState } from "react";
import { ethers } from "ethers";
import { useToast } from "@chakra-ui/react";
import { useBattleNadsClient } from "@/hooks/contracts/useBattleNadsClient";
import { useWallet } from "@/providers/WalletProvider";
import { MIN_SAFE_OWNER_BALANCE } from "@/config/wallet";
import { 
  TOPUP_MULTIPLIER, 
  SAFE_REPLENISH_MULTIPLIER, 
  MAX_TOPUP_DURATION_BLOCKS,
  DEFAULT_TOPUP_PERIOD_DURATION 
} from '@/config/shmon';
import { POLICY_ID } from '@/config/env';

export const useReplenishment = (
  ownerBalance: string,
  bondedBalance: string,
  unbondedBalance: string,
  shortfall: bigint | null
) => {
  const { injectedWallet } = useWallet();
  const { client } = useBattleNadsClient();
  const toast = useToast();
  const [isReplenishing, setIsReplenishing] = useState(false);

  const handleReplenishBalance = async (useMinimalAmount: boolean = false, skipShortfallCheck: boolean = false) => {
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

      // Validate the shortfall (skip for proactive automation)
      if (!skipShortfallCheck && (!shortfall || shortfall <= BigInt(0))) {
        throw new Error("No balance shortfall detected.");
      }

      // Convert owner balance to BigInt for comparison
      const ownerBalanceWei = ethers.parseEther(ownerBalance);
      const unbondedBalanceWei = ethers.parseEther(unbondedBalance);

      // Calculate amounts
      const ownerBondedBalanceWei = ethers.parseEther(bondedBalance);
      let targetAmount: bigint;
      
      if (skipShortfallCheck && !useMinimalAmount) {
        // For proactive automation without shortfall
        targetAmount = ownerBondedBalanceWei > 0 
          ? ownerBondedBalanceWei * BigInt(2) // 2x current bonded balance
          : ethers.parseEther("0.1"); // Default 0.1 if no bonded balance
      } else {
        // Calculate shortfall amounts
        const actualShortfall = shortfall || BigInt(0);
        const shortfallEth = ethers.formatEther(actualShortfall);
        const shortfallNum = parseFloat(shortfallEth) * TOPUP_MULTIPLIER;
        
        if (useMinimalAmount) {
          // Minimal: shortfallNum amount (shortfall * TOPUP_MULTIPLIER)
          const shortfallNumWei = ethers.parseEther(shortfallNum.toString());
          targetAmount = shortfallNumWei + ownerBondedBalanceWei;
        } else {
          // Safe: safeReplenishAmount (shortfall + balance, but used on top up)
          const shortfallNumWei = ethers.parseEther(shortfallNum.toString());
          targetAmount = (shortfallNumWei + ownerBondedBalanceWei) * BigInt(SAFE_REPLENISH_MULTIPLIER);
        }
      }

      // Handle manual replenishment
      if (useMinimalAmount) {
        let replenishAmountWei: bigint;
        if (ownerBalanceWei < targetAmount) {
          const safeBalance = ownerBalanceWei - ethers.parseEther(MIN_SAFE_OWNER_BALANCE);
          replenishAmountWei = safeBalance > 0 ? safeBalance : BigInt(0);
        } else {
          replenishAmountWei = targetAmount;
        }

        const replenishAmountEth = ethers.formatEther(replenishAmountWei);
        if (replenishAmountWei <= BigInt(0)) {
          throw new Error("Replenish amount zero or wallet has insufficient funds.");
        }

        await client.replenishGasBalance(replenishAmountWei);

        toast({
          title: "Success",
          description: `Replenish transaction sent for ${replenishAmountEth} MON`,
          status: "success",
          isClosable: true,
        });
      } else {
        // Handle automatic top-up configuration
        const safeBalance = unbondedBalanceWei;
        const maxBalance = targetAmount * BigInt(MAX_TOPUP_DURATION_BLOCKS);

        const cappedBalance = safeBalance < maxBalance ? safeBalance : maxBalance;

        await client.setMinBondedBalance(
          BigInt(POLICY_ID), 
          targetAmount, 
          cappedBalance, 
          DEFAULT_TOPUP_PERIOD_DURATION
        );

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

  return {
    handleReplenishBalance,
    isReplenishing,
  };
};