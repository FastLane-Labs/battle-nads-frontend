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
      title={targetName ? `Attack ${targetName}` : "Attack"}
      status={statusMessage}
      statusType="error"
      placement="top"
    >
        <Box
          as="button"
          onClick={onClick}
          disabled={isDisabled}
          position="relative"
          width="60px"
          height="60px"
          cursor={isDisabled ? "not-allowed" : "pointer"}
          opacity={isDisabled && !isLoading ? 0.4 : 1}
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
