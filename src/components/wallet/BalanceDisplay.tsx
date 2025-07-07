import React from "react";
import { Flex, Badge, Box } from "@chakra-ui/react";

interface BalanceDisplayProps {
  label: string;
  balance: string;
  tokenType: "MON" | "shMON";
  precision?: number;
  actionLink?: {
    label: string;
    url: string;
  };
}

export const BalanceDisplay: React.FC<BalanceDisplayProps> = ({
  label,
  balance,
  tokenType,
  precision = 4,
  actionLink,
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
      <div className="flex items-center gap-2">
        <div className="font-semibold text-amber-300 text-sm">
          {formattedBalance}
        </div>
        {actionLink && (
          <Box
            as="a"
            href={actionLink.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-900/30 border border-amber-700/50 hover:bg-amber-900/50 hover:border-amber-600 transition-all duration-200 group"
            _hover={{ transform: "translateY(-1px)" }}
          >
            <span className="text-xs font-medium text-amber-300 group-hover:text-amber-200">
              Get More
            </span>
            <svg
              className="w-3 h-3 text-amber-400 group-hover:text-amber-300"
              fill="none"
              strokeWidth="2"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Box>
        )}
      </div>
    </div>
  );
};