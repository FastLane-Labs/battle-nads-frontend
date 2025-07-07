import React from "react";
import { Box, Text, Flex, Button, IconButton } from "@chakra-ui/react";

interface ShortfallWarningCardProps {
  shortfallAmount: string;
  isLoading: boolean;
  disabled: boolean;
  onManualReplenish: () => Promise<void>;
  onAutomateReplenish: () => Promise<void>;
  onDismiss?: () => void;
}

export const ShortfallWarningCard: React.FC<ShortfallWarningCardProps> = ({
  shortfallAmount,
  isLoading,
  disabled,
  onManualReplenish,
  onAutomateReplenish,
  onDismiss,
}) => {
  return (
    <Box
      mt={1}
      p={3}
      className="flex flex-col gap-2 card-bg !border-red-500/25 relative"
    >
      {onDismiss && (
        <IconButton
          aria-label="Dismiss warning"
          icon={<span>✕</span>}
          size="xs"
          position="absolute"
          top={2}
          right={2}
          onClick={onDismiss}
          variant="ghost"
          className="!text-gray-400 hover:!text-white"
          _hover={{ bg: "whiteAlpha.100" }}
        />
      )}
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
          onClick={onManualReplenish}
          isLoading={isLoading}
          loadingText="Replenishing..."
          flex={1}
          isDisabled={disabled}
          className="!text-white font-medium"
        >
          🛡️ Manual ({shortfallAmount})
        </Button>
        <Button
          bg="red.600"
          _hover={{ bg: "red.500" }}
          size="sm"
          onClick={onAutomateReplenish}
          isLoading={isLoading}
          loadingText="Replenishing..."
          flex={1}
          isDisabled={disabled}
          className="!text-white font-medium"
        >
          🛡️ Automate (ShMON)
        </Button>
      </Flex>
    </Box>
  );
};