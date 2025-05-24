import React from 'react';
import { Box, HStack, Text, Spinner, useToast } from '@chakra-ui/react';
import { useAbilityCooldowns, AbilityStatus } from '@/hooks/game/useAbilityCooldowns';
import { AbilityButton } from './AbilityButton';
import { AttackButton } from './AttackButton';
import { domain } from '@/types';

interface AbilityControlsProps {
  characterId: string | null;
  isInCombat: boolean;
  selectedTargetIndex?: number | null;
  onAttack?: (targetIndex: number) => Promise<void>;
  isAttacking?: boolean;
}

export const AbilityControls: React.FC<AbilityControlsProps> = ({ 
  characterId, 
  isInCombat, 
  selectedTargetIndex,
  onAttack,
  isAttacking = false
}) => {
  const {
    abilities,
    useAbility,
    isUsingAbility,
    abilityError,
    isLoading: isLoadingAbilities,
    error: hookError,
  } = useAbilityCooldowns(characterId);

  const toast = useToast();

  const handleAbilityClick = (abilityIndex: domain.Ability) => {
    const requiresTarget = requiresTargetCheck(abilityIndex); 
    
    if (requiresTarget && (selectedTargetIndex === undefined || selectedTargetIndex === null)) {
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
    
    useAbility(abilityIndex, requiresTarget ? selectedTargetIndex ?? 0 : 0);
  };

  const handleAttack = () => {
    if (selectedTargetIndex !== null && selectedTargetIndex !== undefined && onAttack && !isAttacking) {
      onAttack(selectedTargetIndex);
    } else if (selectedTargetIndex === null || selectedTargetIndex === undefined) {
      toast({
        title: "Target Required",
        description: "Please select a target to attack.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  if (isLoadingAbilities) {
    return <Spinner size="md" />; 
  }

  if (hookError) { 
    return <Text color="red.500">Error loading abilities.</Text>;
  }

  if (!abilities || abilities.length === 0) {
    return <Text fontSize="sm" color="gray.500">No abilities available.</Text>;
  }

  // Determine attack button state
  const isAttackDisabled = !isInCombat || selectedTargetIndex === null || isAttacking || !onAttack;
  const attackTooltip = !isInCombat 
    ? "Cannot attack outside of combat"
    : selectedTargetIndex === null 
    ? "Select a target to attack"
    : "Attack selected target";

  return (
    <HStack spacing={4} align="center" justify="center" width="100%">
      {/* Attack Button */}
      {onAttack && (
        <AttackButton
          onClick={handleAttack}
          isLoading={isAttacking}
          isDisabled={isAttackDisabled}
          tooltipLabel={attackTooltip}
        />
      )}

      {/* Ability Buttons */}
      {abilities.map((status) => {
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