import React from "react";
import { Flex, Badge, Box, Button, Tooltip } from "@chakra-ui/react";

interface BalanceDisplayProps {
  label: string;
  balance: string;
  tokenType: "MON" | "shMON";
  precision?: number;
  actionLink?: {
    label: string;
    url: string;
  };
  actionButton?: {
    label: string;
    onClick: () => void | Promise<void>;
    disabled?: boolean;
    tooltip?: string;
    icon?: React.ReactNode;
    isLoading?: boolean;
  };
}

export const BalanceDisplay: React.FC<BalanceDisplayProps> = ({
  label,
  balance,
  tokenType,
  precision = 4,
  actionLink,
  actionButton,
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
        {actionLink && (
          <Box
            as="a"
            href={actionLink.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-0.5 ml-2 rounded-md bg-amber-900/30 border border-amber-700/50 hover:bg-amber-900/50 hover:border-amber-600 transition-all duration-200 group"
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
        {actionButton && (
          <Tooltip label={actionButton.tooltip} placement="top" hasArrow>
            <Box display="inline-block" ml={2}>
              <Button
                size="xs"
                onClick={actionButton.onClick}
                isDisabled={actionButton.disabled}
                isLoading={actionButton.isLoading}
                loadingText={actionButton.label}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md transition-all duration-200 ${
                  actionButton.disabled 
                    ? 'bg-gray-700/30 border-gray-600/50 cursor-not-allowed opacity-60' 
                    : 'bg-purple-900/30 border border-purple-700/50 hover:bg-purple-900/50 hover:border-purple-600 hover:-translate-y-[1px]'
                }`}
                _hover={actionButton.disabled ? {} : undefined}
                height="auto"
                minHeight="auto"
                fontWeight="medium"
              >
                {actionButton.icon && (
                  <span className="text-sm">{actionButton.icon}</span>
                )}
                <span className={`text-xs font-medium ${
                  actionButton.disabled ? 'text-gray-400' : 'text-purple-300'
                }`}>
                  {actionButton.label}
                </span>
              </Button>
            </Box>
          </Tooltip>
        )}
      </Flex>
      <div className="font-semibold text-amber-300 text-sm">
        {formattedBalance}
      </div>
    </div>
  );
};