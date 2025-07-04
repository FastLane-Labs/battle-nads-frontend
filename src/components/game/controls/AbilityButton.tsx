import React, { useState, useEffect } from 'react';
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
import { getAbilityMetadata } from '@/data/abilities';
import { useTransactionBalance } from '@/hooks/wallet/useWalletState';
import { GameTooltip } from '../../ui';
import '@/styles/abilities.css';

interface AbilityButtonProps {
  status: AbilityStatus;
  onClick: () => void;
  isMutationLoading: boolean;
  isActionDisabled: boolean;
  isActiveAbility?: boolean;
  targetName?: string;
}

// Function to get a simple icon or text for each ability (fallback)
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

// Function to get the PNG asset path for an ability
const getAbilityImagePath = (ability: domain.Ability): string => {
  const abilityName = domain.Ability[ability];
  return `/assets/abilities/${abilityName}.png`;
};

// Ability-specific cooldown durations in seconds (blocks * 0.5s per block)
const ABILITY_COOLDOWN_DURATIONS: { [key in domain.Ability]?: number } = {
  [domain.Ability.ShieldBash]: 12,       // 24 blocks * 0.5s
  [domain.Ability.ShieldWall]: 12,       // 24 blocks * 0.5s
  [domain.Ability.EvasiveManeuvers]: 9,  // 18 blocks * 0.5s
  [domain.Ability.ApplyPoison]: 32,      // 64 blocks * 0.5s
  [domain.Ability.Pray]: 36,             // 72 blocks * 0.5s
  [domain.Ability.Smite]: 12,            // 24 blocks * 0.5s
  [domain.Ability.Fireball]: 28,         // 56 blocks * 0.5s
  [domain.Ability.ChargeUp]: 18,         // 36 blocks * 0.5s
  [domain.Ability.SingSong]: 0,          // Bard abilities have no cooldown
  [domain.Ability.DoDance]: 0,           // Bard abilities have no cooldown
};

// Component for rendering ability icon with fallback
const AbilityIcon: React.FC<{ ability: domain.Ability }> = ({ ability }) => {
  const [imageError, setImageError] = useState(false);
  const imagePath = getAbilityImagePath(ability);
  const fallbackText = getAbilityIcon(ability);

  if (imageError) {
    return (
      <Text fontSize="lg" fontWeight="bold" className="gold-text-light">
        {fallbackText}
      </Text>
    );
  }

  return (
    <div 
      style={{
        width: '100%',
        height: '100%',
        backgroundImage: `url("${imagePath}")`,
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center'
      }}
    >
      {/* Hidden img element to detect load errors */}
      <img 
        src={imagePath} 
        alt={domain.Ability[ability]}
        style={{ display: 'none' }}
        onError={() => setImageError(true)}
      />
    </div>
  );
};

export const AbilityButton: React.FC<AbilityButtonProps> = ({ status, onClick, isMutationLoading, isActionDisabled, isActiveAbility = false, targetName }) => {
  const { isTransactionDisabled, insufficientBalanceMessage, minRequiredBalance } = useTransactionBalance();
  
  // State for real-time countdown display
  const [displaySecondsLeft, setDisplaySecondsLeft] = useState(status.secondsLeft);
  
  // Debug logging for ability stages
  useEffect(() => {
    console.log(`[AbilityButton] ${domain.Ability[status.ability]} - Stage: ${AbilityStage[status.stage]}, Ready: ${status.isReady}, Seconds Left: ${status.secondsLeft}, Active: ${isActiveAbility}`);
  }, [status.ability, status.stage, status.isReady, status.secondsLeft, isActiveAbility]);
  
  // Update display seconds when status changes
  useEffect(() => {
    setDisplaySecondsLeft(status.secondsLeft);
  }, [status.secondsLeft]);
  
  // Real-time countdown timer
  useEffect(() => {
    if (status.secondsLeft <= 0) return;
    
    const interval = setInterval(() => {
      setDisplaySecondsLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [status.secondsLeft, status.isReady]);
  
  const isCoolingDown = !status.isReady && status.stage === AbilityStage.COOLDOWN && status.secondsLeft > 0;
  const isCharging = !status.isReady && status.stage === AbilityStage.CHARGING && status.secondsLeft > 0;
  const isActive = !status.isReady && status.stage === AbilityStage.ACTION;

  // Overall disabled state: action disabled OR mutation is loading OR insufficient balance
  const isDisabled = isActionDisabled || isMutationLoading || isTransactionDisabled;

  // Calculate cooldown progress percentage (0-100)
  const totalCooldownDuration = status.currentCooldownInitialTotalSeconds ?? ABILITY_COOLDOWN_DURATIONS[status.ability] ?? 60;
  const progress = (isCoolingDown || isCharging) && totalCooldownDuration > 0
    ? Math.min(100, Math.max(0, ((totalCooldownDuration - status.secondsLeft) / totalCooldownDuration) * 100)) // Ensure progress is 0-100
    : 0;

  // Get ability metadata for description
  const abilityMetadata = getAbilityMetadata(status.ability);
  
  // Determine tooltip status message
  const getTooltipStatus = (): string | undefined => {
    if (!status.isReady) {
      return `Status: ${status.description}`;
    }
    if (isTransactionDisabled) {
      return insufficientBalanceMessage || 'Insufficient balance';
    }
    if (isActionDisabled) {
      return 'Cannot use outside combat';
    }
    return undefined;
  };

  // Determine stage-specific CSS classes
  const getStageClasses = (): string => {
    let classes = '';
    if (isCharging) classes += ' ability-charging';
    if (isActive) classes += ' ability-action';
    if (status.isReady && !isDisabled) classes += ' ability-ready';
    if (isActiveAbility) classes += ' ability-active';
    return classes;
  };

  return (
    <GameTooltip
      title={abilityMetadata.name}
      description={abilityMetadata.description}
      status={getTooltipStatus()}
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
          opacity={(isDisabled && !(isCoolingDown || isCharging)) ? 0.4 : 1}
          className={getStageClasses()}
          borderRadius="md"
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
            <AbilityIcon ability={status.ability} />
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

          {/* Cooldown Overlay & Timer - Only show for cooldown, not charging */}
          {isCoolingDown && (
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
                <CircularProgressLabel>
                  <Text fontSize="xs" fontWeight="bold" color="white">
                    {Math.ceil(displaySecondsLeft)}s
                  </Text>
                </CircularProgressLabel>
              </CircularProgress>
            </Box>
          )}
          
          {/* Charging State Timer - No dark overlay to show animation */}
          {isCharging && (
            <Box
              position="absolute"
              top="0"
              left="0"
              width="100%"
              height="100%"
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              zIndex="2"
              pointerEvents="none"
            >
              <Text 
                fontSize="2xl" 
                fontWeight="bold" 
                color="yellow.300"
                textShadow="0 0 10px rgba(0,0,0,0.8)"
              >
                {Math.ceil(displaySecondsLeft)}
              </Text>
              <Text 
                fontSize="xs" 
                fontWeight="bold" 
                color="yellow.300"
                textShadow="0 0 10px rgba(0,0,0,0.8)"
                mt="-1"
              >
                CHARGING
              </Text>
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
          
          {/* Insufficient Balance Indicator */}
          {isTransactionDisabled && status.isReady && !isMutationLoading && (
             <Badge
                position="absolute"
                top="-1"
                left="-1"
                colorScheme="red"
                variant="solid"
                borderRadius="full"
                p={0}
                zIndex="3"
                boxSize="18px"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
               <Tooltip label={`Insufficient balance: need ${minRequiredBalance} MON`} placement="top">
                  <Text fontSize="xs" fontWeight="bold">$</Text>
               </Tooltip>
             </Badge>
          )}
          
          {/* Out of Combat Indicator (if ability is ready but combat required) */}
          {isActionDisabled && status.isReady && !isMutationLoading && !isTransactionDisabled && (
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
          
          {/* Active Ability Badge */}
          {isActiveAbility && isActive && (
            <Box className="ability-active-badge">
              ACTIVE
            </Box>
          )}
          
          {/* Target Name Label */}
          {targetName && (
            <Box className="ability-target-label">
              {targetName}
            </Box>
          )}
        </Box>
    </GameTooltip>
  );
}; 