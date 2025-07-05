import React from "react";
import { Box, Text, Flex, Button } from "@chakra-ui/react";
import { LOW_SESSION_KEY_THRESHOLD } from "@/config/wallet";

interface DirectFundingCardProps {
  sessionKeyAddress: string;
  smallFundingAmount: string;
  largeFundingAmount: string;
  isLoading: boolean;
  disabled: boolean;
  onFund: (amount: string) => Promise<void>;
}

export const DirectFundingCard: React.FC<DirectFundingCardProps> = ({
  sessionKeyAddress,
  smallFundingAmount,
  largeFundingAmount,
  isLoading,
  disabled,
  onFund,
}) => {
  if (!sessionKeyAddress) return null;

  return (
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
          onClick={() => onFund(smallFundingAmount)}
          isLoading={isLoading}
          loadingText="Sending..."
          flex={1}
          isDisabled={disabled}
          className="!text-amber-300 font-medium card-bg-dark"
        >
          Send {smallFundingAmount} MON
        </Button>
        <Button
          bg="amber.600"
          _hover={{ bg: "amber.500" }}
          size="sm"
          onClick={() => onFund(largeFundingAmount)}
          isLoading={isLoading}
          loadingText="Sending..."
          flex={1}
          isDisabled={disabled}
          className="!text-amber-300 font-medium card-bg-dark"
        >
          Send {largeFundingAmount} MON
        </Button>
      </Flex>
    </Box>
  );
};