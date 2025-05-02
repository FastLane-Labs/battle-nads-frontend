/**
 * EquipmentTooltip Component
 * 
 * NOTE: This component is currently not in active use. It's prepared for the future
 * implementation of the equipment stat comparison feature (nice-to-have requirement).
 * 
 * Purpose:
 * - Displays visual comparison between current equipment and potential new equipment
 * - Shows stat differences with color-coded indicators (green for improvements, red for downgrades)
 * 
 * To implement:
 * 1. Enhance the Select tooltips in EquipmentPanel.tsx to use this component
 * 2. Complete the stat comparison logic in getEquipmentStatDiff in useEquipment.ts
 * 3. Pass comparison data to this tooltip component
 */

import React from 'react';
import { Box, Text, Flex, Badge } from '@chakra-ui/react';

interface StatDiff {
  statName: string;
  currentValue: number;
  newValue: number;
  difference: number;
}

interface EquipmentTooltipProps {
  itemName: string;
  statDiffs: StatDiff[];
}

export const EquipmentTooltip: React.FC<EquipmentTooltipProps> = ({ 
  itemName, 
  statDiffs 
}) => {
  return (
    <Box p={2} maxW="200px">
      <Text fontWeight="bold" mb={1}>{itemName}</Text>
      {statDiffs.map((stat) => (
        <Flex key={stat.statName} justify="space-between" fontSize="xs" mb={1}>
          <Text>{stat.statName}</Text>
          <Flex align="center">
            <Text>{stat.currentValue}</Text>
            <Text mx={1}>→</Text>
            <Text>{stat.newValue}</Text>
            {stat.difference !== 0 && (
              <Badge 
                ml={1} 
                colorScheme={stat.difference > 0 ? "green" : "red"}
                fontSize="2xs"
              >
                {stat.difference > 0 ? `+${stat.difference}` : stat.difference}
              </Badge>
            )}
          </Flex>
        </Flex>
      ))}
    </Box>
  );
}; 