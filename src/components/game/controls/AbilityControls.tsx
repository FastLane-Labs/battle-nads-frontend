import React from 'react';
import { HStack, Text, Spinner, useToast } from '@chakra-ui/react';
import { useAbilityCooldowns, AbilityStatus } from '@/hooks/game/useAbilityCooldowns';
import { AbilityButton } from './AbilityButton';
import { AttackButton } from './AttackButton';
import { domain } from '@/types';
import { abilityRequiresTarget } from '@/data/abilities';
import { useTransactionBalance } from '@/hooks/game/useTransactionBalance';

interface AbilityControlsProps {
  characterId: string | null;
  isInCombat: boolean;
  selectedTargetIndex: number;
  onAttack?: (targetIndex: number) => Promise<void>;
  isAttacking?: boolean;
  combatants?: domain.CharacterLite[]; // Add combatants to validate target exists
}

export const AbilityControls: React.FC<AbilityControlsProps> = ({ 
  characterId, 
  isInCombat, 
  selectedTargetIndex,
  onAttack,
  isAttacking = false,
  combatants = []
}) => {
  const {
    abilities,
    useAbility,
    isUsingAbility,
    abilityError,
    isLoading: isLoadingAbilities,
    error: hookError,
  } = useAbilityCooldowns(characterId);

  // Transaction balance validation
  const { isTransactionDisabled, insufficientBalanceMessage } = useTransactionBalance();

  const toast = useToast();

  // Helper function to check if the selected target position index corresponds to a valid combatant
  const isValidTarget = (positionIndex: number): boolean => {
    return combatants.some(combatant => combatant.index === positionIndex && !combatant.isDead);
  };

  // Helper function to get target name for display
  const getTargetName = (positionIndex: number): string => {
    const target = combatants.find(combatant => combatant.index === positionIndex);
    return target?.name || `Position ${positionIndex}`;
  };

  const handleAbilityClick = (abilityIndex: domain.Ability) => {
    const requiresTarget = requiresTargetCheck(abilityIndex); 
    
    if (requiresTarget && !isValidTarget(selectedTargetIndex)) {
      toast({ 
        title: "Target Required",
        description: `Please select a valid target to use the ${domain.Ability[abilityIndex]} ability.`,
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    // Use the position index directly for abilities that require targets
    const finalTargetIndex = requiresTarget ? selectedTargetIndex : 0;
    useAbility(abilityIndex, finalTargetIndex);
  };

  const handleAttack = () => {
    if (isValidTarget(selectedTargetIndex) && onAttack && !isAttacking && !isTransactionDisabled) {
      // Pass the position index to the attack function
      onAttack(selectedTargetIndex);
    } else if (!isValidTarget(selectedTargetIndex)) {
      toast({
        title: "Target Required",
        description: "Please select a valid target to attack.",
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
  const hasValidTarget = isValidTarget(selectedTargetIndex);
  const isAttackDisabled = !isInCombat || !hasValidTarget || isAttacking || !onAttack || isTransactionDisabled;
  
  // Get target name for attack button
  const attackTargetName = hasValidTarget ? getTargetName(selectedTargetIndex) : undefined;
  
  // Get status message for attack button
  const attackStatusMessage = !isInCombat 
    ? "Cannot attack outside of combat"
    : !hasValidTarget 
    ? "Select a valid target to attack"
    : isTransactionDisabled
    ? insufficientBalanceMessage || "Insufficient balance"
    : undefined;

  return (
    <HStack spacing={4} align="center" justify="center" width="100%">
      {/* Attack Button */}
      {onAttack && (
        <AttackButton
          onClick={handleAttack}
          isLoading={isAttacking}
          isDisabled={isAttackDisabled}
          targetName={attackTargetName}
          statusMessage={attackStatusMessage}
        />
      )}

      {/* Ability Buttons */}
      {abilities.map((status) => {
        const requiresTarget = requiresTargetCheck(status.ability);
        const hasTarget = isValidTarget(selectedTargetIndex);
        const isActionDisabled = !isInCombat || !status.isReady || (requiresTarget && !hasTarget);
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

const requiresTargetCheck = (ability: domain.Ability): boolean => {
  return abilityRequiresTarget(ability);
}; 