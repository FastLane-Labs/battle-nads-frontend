import React from 'react';
import {
  Button,
  Box,
  Text,
  Tooltip,
  CircularProgress,
  CircularProgressLabel,
  Icon,
  Badge,
} from '@chakra-ui/react';
import { WarningIcon } from '@chakra-ui/icons';
import { AbilityStage } from '@/types/domain/enums';
import { AbilityStatus } from '@/hooks/game/useAbilityCooldowns';
import { domain } from '@/types';

interface AbilityButtonProps {
  status: AbilityStatus;
  onClick: () => void;
  isLoading: boolean;
}

// Function to get a simple icon or text for each ability
const getAbilityIcon = (ability: domain.Ability): string => {
  switch (ability) {
    case domain.Ability.ShieldBash: return 'SB';
    case domain.Ability.ShieldWall: return 'SW';
    case domain.Ability.EvasiveManeuvers: return 'EM';
    case domain.Ability.ApplyPoison: return 'AP';
    case domain.Ability.Pray: return 'PR';
    case domain.Ability.Smite: return 'SM';
    case domain.Ability.Fireball: return 'FB';
    case domain.Ability.ChargeUp: return 'CU';
    case domain.Ability.SingSong: return 'SS';
    case domain.Ability.DoDance: return 'DD';
    default: return '?';
  }
}

// TODO: Define these mappings centrally or fetch if dynamic
const ABILITY_COOLDOWN_DURATIONS: { [key in domain.Ability]?: number } = {
  [domain.Ability.ShieldBash]: 10, // Placeholder seconds
  [domain.Ability.ShieldWall]: 30,
  [domain.Ability.EvasiveManeuvers]: 15,
  [domain.Ability.ApplyPoison]: 20,
  [domain.Ability.Pray]: 25,
  [domain.Ability.Smite]: 12,
  [domain.Ability.Fireball]: 8,
  [domain.Ability.ChargeUp]: 5,
  [domain.Ability.SingSong]: 18,
  [domain.Ability.DoDance]: 22,
};

export const AbilityButton: React.FC<AbilityButtonProps> = ({ status, onClick, isLoading }) => {
  const isCoolingDown = !status.isReady && status.stage === AbilityStage.COOLDOWN && status.secondsLeft > 0;
  const isCharging = !status.isReady && status.stage === AbilityStage.CHARGING && status.secondsLeft > 0;
  const isActive = !status.isReady && status.stage === AbilityStage.ACTION;
  const isDisabled = !status.isReady || isLoading;

  // Calculate cooldown progress percentage (0-100)
  const totalCooldownDuration = ABILITY_COOLDOWN_DURATIONS[status.ability] || 60; // Use mapped duration or fallback
  const progress = (isCoolingDown || isCharging) && totalCooldownDuration > 0
    ? ((totalCooldownDuration - status.secondsLeft) / totalCooldownDuration) * 100
    : 0;

  return (
    <Tooltip label={status.description} placement="top" hasArrow>
      <Box position="relative" display="inline-block">
        <Button
          onClick={onClick}
          isDisabled={isDisabled}
          isLoading={isLoading}
          size="md"
          minWidth="60px" // Ensure minimum width
          height="60px" // Ensure square shape
          position="relative"
          overflow="hidden" // Hide parts of progress bar outside button
          variant={isActive ? 'solid' : 'outline'} // Indicate active state
          colorScheme={isActive ? 'green' : 'gray'}
          p={0} // Remove padding to allow progress to fill
          _disabled={{
            cursor: 'not-allowed',
            // Keep visual style even when disabled if cooling/charging
            opacity: (isCoolingDown || isCharging) ? 1 : 0.4, 
          }}
        >
          {/* Content */}
          <Text fontSize="lg" fontWeight="bold">
            {getAbilityIcon(status.ability)}
          </Text>

          {/* Cooldown Overlay & Timer */}
          {(isCoolingDown || isCharging) && (
            <Box
              position="absolute"
              top="0"
              left="0"
              width="100%"
              height="100%"
              display="flex"
              alignItems="center"
              justifyContent="center"
              zIndex={1}
              // Add a subtle background overlay to dim the icon
              bg={isDisabled ? "rgba(0, 0, 0, 0.5)" : "transparent"}
              borderRadius="md" // Match button border radius
            >
              <CircularProgress
                value={Math.min(100, Math.max(0, progress))} // Clamp progress value
                size="100%" // Fill the button
                thickness="6px" // Adjust thickness
                color={isCharging ? 'yellow.400' : 'blue.400'}
                trackColor="transparent" // Make track invisible
                capIsRound // Nicer edges
              >
                <CircularProgressLabel 
                  fontSize="sm" 
                  fontWeight="bold" 
                  color="white"
                  style={{ textShadow: '1px 1px 2px black' }} // Improve readability
                >
                  {status.secondsLeft.toFixed(1)}s
                </CircularProgressLabel>
              </CircularProgress>
            </Box>
          )}
        </Button>

        {/* Gas Shortfall Warning */}
        {status.gasShortfall && (
          <Badge 
            position="absolute" 
            top="-5px" 
            right="-5px" 
            colorScheme="red" 
            borderRadius="full" 
            zIndex={2} 
            p={0} 
            boxSize="18px" // Make badge smaller
            display="flex" 
            alignItems="center" 
            justifyContent="center"
          >
            <Icon as={WarningIcon} color="white" boxSize="10px" />
          </Badge>
        )}
      </Box>
    </Tooltip>
  );
}; 