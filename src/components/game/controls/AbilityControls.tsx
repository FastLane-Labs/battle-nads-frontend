import React from 'react';
import { Box, HStack, Text, Spinner, useToast } from '@chakra-ui/react';
import { useAbilityCooldowns, AbilityStatus } from '@/hooks/game/useAbilityCooldowns';
import { AbilityButton } from './AbilityButton';
import { domain } from '@/types';

interface AbilityControlsProps {
  characterId: string | null;
  isInCombat: boolean;
  selectedTargetIndex?: number | null; // Optional: passed down if needed
}

export const AbilityControls: React.FC<AbilityControlsProps> = ({ characterId, isInCombat, selectedTargetIndex }) => {
  const {
    abilities,
    useAbility,
    isUsingAbility,
    abilityError,
    isLoading: isLoadingAbilities, // Rename to avoid conflict
    error: hookError,
  } = useAbilityCooldowns(characterId);

  const toast = useToast(); // Initialize toast

  const handleAbilityClick = (abilityIndex: domain.Ability) => {
    // Determine if ability requires a target
    const requiresTarget = requiresTargetCheck(abilityIndex); 
    
    if (requiresTarget && (selectedTargetIndex === undefined || selectedTargetIndex === null)) {
      // Show toast message
      toast({ 
        title: "Target Required",
        description: `Please select a target to use the ${domain.Ability[abilityIndex]} ability.`,
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      console.warn(`Ability ${abilityIndex} requires a target, but none selected.`);
      return;
    }
    
    // Pass targetIndex (or 0 if not needed/available) to the hook's function
    useAbility(abilityIndex, requiresTarget ? selectedTargetIndex ?? 0 : 0);
  };

  if (isLoadingAbilities) {
    return <Spinner size="md" />; 
  }

  // Only show loading error if the initial query failed
  if (hookError) { 
    return <Text color="red.500">Error loading abilities.</Text>;
  }

  if (!abilities || abilities.length === 0) {
    return <Text fontSize="sm" color="gray.500">No abilities available.</Text>;
  }

  return (
    <HStack spacing={4} align="center" justify="center" width="100%">
      {abilities.map((status) => {
        // Determine if the button action should be disabled
        const isActionDisabled = !isInCombat || !status.isReady;
        return (
          <AbilityButton
            key={status.ability}
            status={status}
            onClick={() => handleAbilityClick(status.ability)}
            isMutationLoading={isUsingAbility && abilities.some(a => a.ability === status.ability)}
            isActionDisabled={isActionDisabled}
          />
        );
      })}
    </HStack>
  );
};

// Placeholder function - needs actual implementation based on ability logic
const requiresTargetCheck = (ability: domain.Ability): boolean => {
  switch (ability) {
    case domain.Ability.ShieldBash:
    case domain.Ability.ApplyPoison:
    case domain.Ability.Smite:
    case domain.Ability.Fireball:
      return true;
    case domain.Ability.ShieldWall:
    case domain.Ability.EvasiveManeuvers:
    case domain.Ability.Pray:
    case domain.Ability.ChargeUp:
    case domain.Ability.SingSong:
    case domain.Ability.DoDance:
    default:
      return false;
  }
}; 