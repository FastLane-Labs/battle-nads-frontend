import React from "react";
import { Box, Text, CircularProgress, Image } from "@chakra-ui/react";
import { GameTooltip } from '../../ui';

interface AttackButtonProps {
  onClick: () => void;
  isLoading: boolean;
  isDisabled: boolean;
  targetName?: string;
  statusMessage?: string;
}

export const AttackButton: React.FC<AttackButtonProps> = ({
  onClick,
  isLoading,
  isDisabled,
  targetName,
  statusMessage,
}) => {
  return (
    <GameTooltip
      title={targetName ? `Auto-attack ${targetName}` : "Auto-attack Target"}
      status={statusMessage}
      statusType="error"
      placement="top"
    >
        <Box
          as="button"
          onClick={onClick}
          disabled={isDisabled}
          position="relative"
          width="70px"
          height="70px"
          cursor={isDisabled ? "not-allowed" : "pointer"}
          opacity={isDisabled && !isLoading ? 0.4 : 1}
          border="2px solid"
          borderColor="red.600"
          borderRadius="md"
          transition="all 0.2s"
          _hover={{
            borderColor: !isDisabled ? "red.400" : "red.600",
            transform: !isDisabled ? "scale(1.05)" : "none"
          }}
        >
          {/* Background image - using weapon.png */}
          <div 
            style={{
              width: '100%',
              height: '100%',
              backgroundImage: 'url("/assets/buttons/weapon.png")',
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center'
            }}
            className={`${isDisabled ? 'opacity-50' : 'hover:opacity-90'}`}
          />

          {/* Loading state */}
          {isLoading && (
            <Box
              position="absolute"
              top="0"
              left="0"
              width="100%"
              height="100%"
              bg="rgba(0, 0, 0, 0.6)"
              display="flex"
              alignItems="center"
              justifyContent="center"
              zIndex="2"
              borderRadius="md"
            >
              <CircularProgress isIndeterminate size="30px" color="red.300" />
            </Box>
          )}
        </Box>
    </GameTooltip>
  );
};
