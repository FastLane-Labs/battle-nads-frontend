import React from "react";
import { Box, Text, Tooltip, CircularProgress, Image } from "@chakra-ui/react";

interface AttackButtonProps {
  onClick: () => void;
  isLoading: boolean;
  isDisabled: boolean;
  tooltipLabel?: string;
}

export const AttackButton: React.FC<AttackButtonProps> = ({
  onClick,
  isLoading,
  isDisabled,
  tooltipLabel = "Attack selected target",
}) => {
  return (
    <Tooltip label={tooltipLabel} placement="top" hasArrow>
      <Box position="relative" display="inline-block">
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
      </Box>
    </Tooltip>
  );
};
