/**
 * Debug utility to test ability data from contract
 * This helps verify what data structure we're receiving
 */

import { contract, domain } from '@/types';

export function debugAbilityData(character: contract.Character | null) {
  // Remove all the verbose logging - only log when there's actually an active ability
  if (character?.activeAbility && 
      character.activeAbility.ability && 
      Number(character.activeAbility.ability) > 0) {
    
    const ability = character.activeAbility;
    console.log('[DEBUG] Active ability detected:', {
      ability: Number(ability.ability),
      stage: Number(ability.stage),
      targetBlock: ability.targetBlock.toString(),
    });
  }
}

export function debugCombatantAbilities(combatants: contract.CharacterLite[]) {
  // Only log if there are combatants with active abilities
  if (!combatants || combatants.length === 0) return;

  const activeCombatants = combatants.filter(c => c.ability && c.ability > 0);
  if (activeCombatants.length > 0) {
    console.log('[DEBUG] Active combatant abilities:', 
      activeCombatants.map(c => ({
        name: c.name,
        ability: domain.Ability[c.ability] || c.ability,
        stage: c.abilityStage
      }))
    );
  }
}