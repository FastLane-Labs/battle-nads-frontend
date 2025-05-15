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
  Image,
} from '@chakra-ui/react';
import { WarningIcon } from '@chakra-ui/icons';
import { AbilityStage } from '@/types/domain/enums';
import { AbilityStatus } from '@/hooks/game/useAbilityCooldowns';
import { domain } from '@/types';

interface AbilityButtonProps {
  status: AbilityStatus;
  onClick: () => void;
  isMutationLoading: boolean;
  isActionDisabled: boolean;
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

export const AbilityButton: React.FC<AbilityButtonProps> = ({ status, onClick, isMutationLoading, isActionDisabled }) => {
  const isCoolingDown = !status.isReady && status.stage === AbilityStage.COOLDOWN && status.secondsLeft > 0;
  const isCharging = !status.isReady && status.stage === AbilityStage.CHARGING && status.secondsLeft > 0;
  const isActive = !status.isReady && status.stage === AbilityStage.ACTION;

  // Overall disabled state: action disabled OR mutation is loading
  const isDisabled = isActionDisabled || isMutationLoading;

  // Calculate cooldown progress percentage (0-100)
  const totalCooldownDuration = status.currentCooldownInitialTotalSeconds ?? ABILITY_COOLDOWN_DURATIONS[status.ability] ?? 60;
  const progress = (isCoolingDown || isCharging) && totalCooldownDuration > 0
    ? Math.min(100, Math.max(0, ((totalCooldownDuration - status.secondsLeft) / totalCooldownDuration) * 100)) // Ensure progress is 0-100
    : 0;

  // Tooltip message refinement
  let tooltipLabel = status.description;
  if (isActionDisabled && !status.isReady) {
      // Already handled by status.description potentially
  } else if (isActionDisabled && status.isReady) {
      tooltipLabel = `${domain.Ability[status.ability].replace(/([A-Z])/g, ' $1').trim()} (Cannot use outside combat)`;
  }

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
          opacity={(isDisabled && !(isCoolingDown || isCharging)) ? 0.4 : 1}
        >
          {/* Background image */}
          <Image
            src="/assets/buttons/square-btn.png"
            alt="Button background"
            position="absolute"
            top="0"
            left="0"
            width="100%"
            height="100%"
            zIndex="0"
          />

          {/* Content */}
          <Box
            position="absolute"
            top="0"
            left="0"
            width="100%"
            height="100%"
            display="flex"
            alignItems="center"
            justifyContent="center"
            zIndex="1"
          >
            <Text 
              fontSize="lg" 
              fontWeight="bold" 
              className={isActive ? "text-green-200" : "gold-text-light"}

            >
              {getAbilityIcon(status.ability)}
            </Text>
          </Box>

          {/* Loading state */}
          {isMutationLoading && (
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
              <CircularProgress isIndeterminate size="30px" color="blue.300" />
            </Box>
          )}

          {/* Cooldown Overlay & Timer */}
          {(isCoolingDown || isCharging) && (
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
            >
              <CircularProgress
                value={progress}
                size="50px"
                thickness="6px"
                color="teal.300"
                trackColor="transparent"
              >
              </CircularProgress>
            </Box>
          )}

          {/* Gas Shortfall Indicator */}
          {status.gasShortfall && !status.isReady && (
             <Badge
                position="absolute"
                top="-1"
                right="-1"
                colorScheme="orange"
                variant="solid"
                borderRadius="full"
                p={0}
                zIndex="3"
                boxSize="18px"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
               <Tooltip label="Cooldown paused - Gas needed" placement="top">
                  <WarningIcon color="white" boxSize="10px" />
                </Tooltip>
             </Badge>
          )}
          
          {/* Out of Combat Indicator (if ability is ready but combat required) */}
          {isActionDisabled && status.isReady && !isMutationLoading && (
             <Badge
                position="absolute"
                bottom="-1"
                right="-1"
                colorScheme="gray"
                variant="solid"
                borderRadius="full"
                p={0}
                zIndex="3"
                boxSize="18px"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
               <Tooltip label="Combat required" placement="top">
                  <Text fontSize="xs" fontWeight="bold">⚔</Text>
               </Tooltip>
             </Badge>
          )}
        </Box>
      </Box>
    </Tooltip>
  );
}; 