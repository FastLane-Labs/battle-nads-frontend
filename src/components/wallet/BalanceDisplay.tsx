import React from "react";
import { Flex, Badge } from "@chakra-ui/react";

interface BalanceDisplayProps {
  label: string;
  balance: string;
  tokenType: "MON" | "shMON";
  precision?: number;
}

export const BalanceDisplay: React.FC<BalanceDisplayProps> = ({
  label,
  balance,
  tokenType,
  precision = 4,
}) => {
  const badgeColor = tokenType === "MON" ? "purple" : "yellow";
  const formattedBalance = parseFloat(balance).toFixed(precision);

  return (
    <div className="flex w-full justify-between gap-2">
      <Flex align="center" gap={1}>
        <h2 className="text-sm font-medium gold-text-light">{label}</h2>
        <Badge colorScheme={badgeColor} size="xs">
          {tokenType}
        </Badge>
      </Flex>
      <div className="font-semibold text-amber-300 text-sm">
        {formattedBalance}
      </div>
    </div>
  );
};