import React from 'react';
import { Box, Flex, Progress, Text } from '@chakra-ui/react';
import { domain } from '@/types';
import { AbilityStage } from '@/types/domain/enums';
import { useAbilityTracker } from '@/hooks/game/useAbilityTracker';

const STAGE_COLORS = {
  [AbilityStage.CHARGING]: '#FFA500', // Orange
  [AbilityStage.ACTION]: '#FFD700', // Gold
  [AbilityStage.COOLDOWN]: '#4169E1', // Royal Blue
  [AbilityStage.READY]: '#32CD32', // Lime Green
};

const STAGE_LABELS = {
  [AbilityStage.CHARGING]: 'Charging',
  [AbilityStage.ACTION]: 'Active',
  [AbilityStage.COOLDOWN]: 'Cooldown',
  [AbilityStage.READY]: 'Ready',
};

export const AbilityStatusBar: React.FC = () => {
  const { abilityTracker, isAbilityActive } = useAbilityTracker();

  if (!abilityTracker || !isAbilityActive) {
    return null; // Don't show anything when no ability is active
  }

  const { activeAbility, currentStage, stageProgress, timeRemaining, stageDuration } = abilityTracker;
  const abilityName = domain.Ability[activeAbility];
  const stageColor = STAGE_COLORS[currentStage];
  const stageLabel = STAGE_LABELS[currentStage];

  return (
    <Box className="bg-dark-brown rounded-lg border border-black/40 p-2 mb-2">
      <Flex align="center" gap={3}>
        {/* Ability Name and Stage */}
        <Flex flex="1" align="center" gap={2}>
          <Text className="gold-text-light font-semibold text-sm">{abilityName}</Text>
          <Box 
            px={1.5} 
            py={0.5} 
            borderRadius="sm" 
            bg={stageColor}
            opacity={0.9}
          >
            <Text className="text-black font-bold text-xs uppercase">{stageLabel}</Text>
          </Box>
        </Flex>

        {/* Progress Bar */}
        <Box flex="2">
          <Progress 
            value={stageProgress} 
            size="sm" 
            colorScheme="yellow"
            borderRadius="sm"
            bg="blackAlpha.400"
            sx={{
              '& > div': {
                backgroundColor: stageColor,
              }
            }}
          />
        </Box>

        {/* Time Remaining */}
        <Text className="text-white font-semibold text-sm" minWidth="45px" textAlign="right">
          {timeRemaining.toFixed(1)}s
        </Text>
      </Flex>
    </Box>
  );
};