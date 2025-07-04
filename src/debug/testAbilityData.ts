/**
 * Debug utility to test ability data from contract
 * This helps verify what data structure we're receiving
 */

import { contract, domain } from '@/types';

export function debugAbilityData(character: contract.Character | null) {
  if (!character) {
    console.log('[DEBUG] No character data');
    return;
  }

  console.log('[DEBUG] Character ability data investigation:', {
    hasActiveAbility: !!character.activeAbility,
    activeAbilityType: typeof character.activeAbility,
    activeAbilityIsArray: Array.isArray(character.activeAbility),
    activeAbilityKeys: character.activeAbility && typeof character.activeAbility === 'object' 
      ? Object.keys(character.activeAbility) 
      : 'not an object',
  });

  if (character.activeAbility) {
    const ability = character.activeAbility;
    console.log('[DEBUG] ActiveAbility details:', {
      raw: ability,
      ability: ability.ability,
      abilityName: ability.ability ? domain.Ability[ability.ability] : 'None',
      stage: ability.stage,
      stageName: ability.stage ? domain.AbilityStage[ability.stage] : 'READY',
      targetIndex: ability.targetIndex,
      taskAddress: ability.taskAddress,
      targetBlock: ability.targetBlock?.toString(),
      isDefaultValues: ability.ability === 0 && 
                       ability.stage === 0 && 
                       ability.targetIndex === 0 &&
                       (ability.taskAddress === '0x0000000000000000000000000000000000000000' || !ability.taskAddress) &&
                       (ability.targetBlock === BigInt(0) || !ability.targetBlock)
    });
  }

  // Also check if there's ability data in stats or elsewhere
  if (character.stats) {
    console.log('[DEBUG] Character stats that might contain ability info:', {
      class: character.stats.class,
      className: domain.CharacterClass[character.stats.class],
      buffs: character.stats.buffs,
      debuffs: character.stats.debuffs,
      index: character.stats.index
    });
  }

  // Check activeTask as it might be related
  if (character.activeTask) {
    console.log('[DEBUG] ActiveTask data (might be related to abilities):', {
      hasTaskError: character.activeTask.hasTaskError,
      pending: character.activeTask.pending,
      taskDelay: character.activeTask.taskDelay,
      executorDelay: character.activeTask.executorDelay,
      taskAddress: character.activeTask.taskAddress,
      targetBlock: character.activeTask.targetBlock?.toString()
    });
  }
}

export function debugCombatantAbilities(combatants: contract.CharacterLite[]) {
  if (!combatants || combatants.length === 0) {
    console.log('[DEBUG] No combatants');
    return;
  }

  console.log('[DEBUG] Combatant abilities:');
  combatants.forEach((combatant, index) => {
    console.log(`[DEBUG] Combatant ${index} (${combatant.name}):`, {
      ability: combatant.ability,
      abilityName: combatant.ability ? domain.Ability[combatant.ability] : 'None',
      abilityStage: combatant.abilityStage,
      abilityTargetBlock: combatant.abilityTargetBlock?.toString()
    });
  });
}