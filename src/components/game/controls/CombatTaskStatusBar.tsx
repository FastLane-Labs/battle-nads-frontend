import React, { useMemo } from 'react';
import { Box, Flex, Progress, Text, Badge } from '@chakra-ui/react';
import { domain } from '@/types';
import { AVG_BLOCK_TIME_MS } from '@/config/gas';

interface CombatTaskStatusBarProps {
  activeTask: domain.CombatTracker;
  currentBlock: number;
  isInCombat?: boolean; // Add combat state to help determine visibility
}

export const CombatTaskStatusBar: React.FC<CombatTaskStatusBarProps> = ({
  activeTask,
  currentBlock,
  isInCombat = false,
}) => {
  // Check if there's an active task to display
  const hasActiveTask = useMemo(() => {
    return activeTask.pending || 
           activeTask.hasTaskError || 
           (activeTask.targetBlock > 0 && currentBlock < activeTask.targetBlock);
  }, [activeTask, currentBlock]);

  // Show the bar if in combat OR if there's an active task
  // This prevents flickering when task data updates during combat
  const shouldShowBar = useMemo(() => {
    return isInCombat || hasActiveTask;
  }, [isInCombat, hasActiveTask]);

  // Calculate countdown information
  const countdownInfo = useMemo(() => {
    if (activeTask.targetBlock <= 0) {
      return { blocksRemaining: 0, timeRemaining: 0, progress: 0 };
    }

    const blocksRemaining = Math.max(0, activeTask.targetBlock - currentBlock);
    const timeRemaining = blocksRemaining * (AVG_BLOCK_TIME_MS / 1000);
    
    // Progress bar shows remaining time (decreases as time passes)
    // Use a simple approach: show remaining blocks as percentage of typical task duration (5 blocks)
    const estimatedTaskDuration = 5;
    const progress = Math.min(100, Math.max(0, (blocksRemaining / estimatedTaskDuration) * 100));

    return { blocksRemaining, timeRemaining, progress };
  }, [activeTask.targetBlock, currentBlock]);

  // Determine task status and styling
  const taskStatus = useMemo(() => {
    if (activeTask.hasTaskError) {
      return {
        label: 'ERROR',
        color: '#FF4444', // Red
        bgColor: 'red.900',
        borderColor: 'red.500',
      };
    }
    
    if (activeTask.pending) {
      return {
        label: 'PENDING',
        color: '#FFA500', // Orange
        bgColor: 'orange.900',
        borderColor: 'orange.500',
      };
    }
    
    if (countdownInfo.blocksRemaining > 0) {
      return {
        label: 'EXECUTING',
        color: '#4169E1', // Royal Blue
        bgColor: 'blue.900',
        borderColor: 'blue.500',
      };
    }
    
    return {
      label: 'READY',
      color: '#32CD32', // Lime Green
      bgColor: 'green.900',
      borderColor: 'green.500',
    };
  }, [activeTask.hasTaskError, activeTask.pending, countdownInfo.blocksRemaining]);

  // Don't render if not in combat and no active task
  if (!shouldShowBar) {
    return null;
  }

  // If in combat but no active task, show a "Ready" state
  const displayStatus = hasActiveTask ? taskStatus : {
    label: 'READY',
    color: '#32CD32', // Lime Green
    bgColor: 'green.900',
    borderColor: 'green.500',
  };

  return (
    <Box 
      p={2}
      borderRadius="md"
      mb={2}
      className="bg-dark-brown"
      borderColor={displayStatus.borderColor}
      borderWidth="1px"
    >
      <Flex align="center" gap={2} fontSize="sm">
        {/* Task Status Badge */}
        <Badge 
          px={1.5} 
          py={0.5} 
          borderRadius="sm" 
          bg={displayStatus.color}
          color="black"
          opacity={0.9}
          fontSize="xs"
        >
          <Text className="font-bold uppercase">{displayStatus.label}</Text>
        </Badge>

        {/* Progress Bar (only show for executing tasks with active task) */}
        {hasActiveTask && countdownInfo.blocksRemaining > 0 && !activeTask.hasTaskError && (
          <Box flex="1" px={2}>
            <Progress 
              value={countdownInfo.progress} 
              size="sm" 
              borderRadius="sm"
              bg="blackAlpha.400"
              sx={{
                '& > div': {
                  backgroundColor: displayStatus.color,
                }
              }}
            />
          </Box>
        )}

        {/* Countdown Timer (only show for executing tasks with active task) */}
        {hasActiveTask && countdownInfo.blocksRemaining > 0 && !activeTask.hasTaskError && (
          <Text className="text-white font-medium" minWidth="40px" textAlign="right" fontSize="xs">
            {countdownInfo.timeRemaining.toFixed(1)}s
          </Text>
        )}

        {/* Task Delays Display (only show when there's an active task) */}
        {hasActiveTask && (activeTask.taskDelay > 0 || activeTask.executorDelay > 0) && (
          <Flex gap={1}>
            {activeTask.taskDelay > 0 && (
              <Badge colorScheme="yellow" variant="outline" fontSize="xs">
                +{activeTask.taskDelay}
              </Badge>
            )}
            {activeTask.executorDelay > 0 && (
              <Badge colorScheme="yellow" variant="outline" fontSize="xs">
                +{activeTask.executorDelay}
              </Badge>
            )}
          </Flex>
        )}

        {/* Error Message (only show when there's an active task with error) */}
        {hasActiveTask && activeTask.hasTaskError && (
          <Text className="text-red-300 font-medium" flex="1" fontSize="xs">
            Attack to restart combat
          </Text>
        )}
      </Flex>
    </Box>
  );
}; 