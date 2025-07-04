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
    return (
      <Box 
        className="bg-dark-brown rounded-lg border border-black/40 p-3 mb-3"
        minHeight="80px"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Text className="gray-text text-sm">No active ability</Text>
      </Box>
    );
  }

  const { activeAbility, currentStage, stageProgress, timeRemaining, stageDuration } = abilityTracker;
  const abilityName = domain.Ability[activeAbility];
  const stageColor = STAGE_COLORS[currentStage];
  const stageLabel = STAGE_LABELS[currentStage];

  return (
    <Box className="bg-dark-brown rounded-lg border border-black/40 p-3 mb-3">
      {/* Ability Name and Stage */}
      <Flex justify="space-between" align="center" mb={2}>
        <Text className="gold-text-light font-semibold text-lg">{abilityName}</Text>
        <Box 
          px={2} 
          py={1} 
          borderRadius="md" 
          bg={stageColor}
          opacity={0.9}
        >
          <Text className="text-black font-bold text-sm uppercase">{stageLabel}</Text>
        </Box>
      </Flex>

      {/* Progress Bar */}
      <Box mb={2}>
        <Progress 
          value={stageProgress} 
          size="lg" 
          colorScheme="yellow"
          borderRadius="md"
          bg="blackAlpha.400"
          sx={{
            '& > div': {
              backgroundColor: stageColor,
            }
          }}
        />
      </Box>

      {/* Time Remaining and Stage Duration */}
      <Flex justify="space-between" align="center">
        <Text className="gray-text text-sm">
          Time Remaining: <span className="text-white font-semibold">{timeRemaining.toFixed(1)}s</span>
        </Text>
        <Text className="gray-text text-sm">
          Total: <span className="text-white font-semibold">{stageDuration.toFixed(1)}s</span>
        </Text>
      </Flex>

      {/* Visual Timeline (optional enhancement) */}
      <Box mt={3} position="relative" height="20px">
        <Flex 
          position="absolute" 
          width="100%" 
          height="100%" 
          align="center"
          borderRadius="md"
          overflow="hidden"
          bg="blackAlpha.400"
        >
          {/* Charging Phase */}
          <Box 
            flex="1" 
            height="100%" 
            bg={currentStage === AbilityStage.CHARGING ? STAGE_COLORS[AbilityStage.CHARGING] : 'gray.600'}
            opacity={currentStage === AbilityStage.CHARGING ? 0.8 : 0.3}
            borderRight="1px solid"
            borderColor="blackAlpha.600"
          />
          {/* Action Phase */}
          <Box 
            flex="0.5" 
            height="100%" 
            bg={currentStage === AbilityStage.ACTION ? STAGE_COLORS[AbilityStage.ACTION] : 'gray.600'}
            opacity={currentStage === AbilityStage.ACTION ? 0.8 : 0.3}
            borderRight="1px solid"
            borderColor="blackAlpha.600"
          />
          {/* Cooldown Phase */}
          <Box 
            flex="2" 
            height="100%" 
            bg={currentStage === AbilityStage.COOLDOWN ? STAGE_COLORS[AbilityStage.COOLDOWN] : 'gray.600'}
            opacity={currentStage === AbilityStage.COOLDOWN ? 0.8 : 0.3}
          />
        </Flex>
        {/* Stage Labels on Timeline */}
        <Flex 
          position="absolute" 
          width="100%" 
          height="100%" 
          align="center"
          px={2}
        >
          <Text fontSize="xs" className="text-white/80 font-semibold" flex="1" textAlign="center">Charge</Text>
          <Text fontSize="xs" className="text-white/80 font-semibold" flex="0.5" textAlign="center">Act</Text>
          <Text fontSize="xs" className="text-white/80 font-semibold" flex="2" textAlign="center">Cooldown</Text>
        </Flex>
      </Box>
    </Box>
  );
};