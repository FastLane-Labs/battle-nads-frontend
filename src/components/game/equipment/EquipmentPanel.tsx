import React from 'react';
import { Box, Text, SimpleGrid, Alert, AlertIcon, AlertTitle, AlertDescription, VStack } from '@chakra-ui/react';
import { useEquipment } from '@/hooks/game/useEquipment';
import { EquipmentCard } from './EquipmentCard';

interface EquipmentPanelProps {
  characterId: string | null;
}

export const EquipmentPanel: React.FC<EquipmentPanelProps> = ({ characterId }) => {
  const equipmentHookResult = useEquipment(); // Get the hook results once
  const { weaponError, armorError } = equipmentHookResult;

  // Combine errors for a potential shared display if needed, but card handles specifics
  const combinedError = weaponError && armorError ? "Multiple equipment errors" : weaponError || armorError;

  return (
    <Box>
      <Text fontWeight="bold" mb={2}>Equipment</Text>

      {/* Display combined error centrally if needed, or rely on card errors */}
      {/* 
      {combinedError && !weaponError && !armorError && ( // Example: only show if BOTH fail?
        <Alert status="error" mb={2} fontSize="xs">
          <AlertIcon />
          <AlertTitle mr={2}>Error!</AlertTitle>
          <AlertDescription>{combinedError}</AlertDescription>
        </Alert>
      )}
      */}

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}> {/* Responsive Grid */}
        <EquipmentCard 
          slot="weapon" 
          equipmentHookResult={equipmentHookResult} 
          characterId={characterId} 
        />
        <EquipmentCard 
          slot="armor" 
          equipmentHookResult={equipmentHookResult} 
          characterId={characterId} 
        />
      </SimpleGrid>
    </Box>
  );
}; 