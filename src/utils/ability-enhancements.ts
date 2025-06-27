import { Ability } from "@/types/domain/enums";
import type { CharacterLite } from "./log-helpers";

export interface AbilityEnhancement {
  baseValue: number;
  enhancedValue: number;
  bonus: number;
  description: string;
  stage?: number;
  totalStages?: number;
}

/**
 * Calculate level-based ability enhancements based on Battle Nads ability formulas
 * References the ability documentation for accurate damage/healing calculations
 */
export function calculateAbilityEnhancement(
  abilityId: number,
  actor: CharacterLite,
  rawValue: number,
  stage?: number
): AbilityEnhancement {
  const level = Math.min(actor.level, 50); // Cap at level 50
  
  // Base enhancement calculation based on ability type
  switch (abilityId) {
    case Ability.ShieldBash: {
      // Formula: 50 + (level + strength + dexterity) × 10
      // Assuming strength and dexterity are derived from level for now
      const baseAbilityDamage = 50;
      const levelBonus = (level + level + level) * 10; // Simplified stat calculation
      const enhancedValue = baseAbilityDamage + levelBonus;
      const bonus = enhancedValue - baseAbilityDamage;
      
      return {
        baseValue: baseAbilityDamage,
        enhancedValue,
        bonus,
        description: `+${bonus} enhanced damage (Level ${level})`,
      };
    }
    
    case Ability.Fireball: {
      // Formula: 100 + (level × 30) + (targetHealth ÷ 6)
      const baseAbilityDamage = 100;
      const levelBonus = level * 30;
      // Note: targetHealth bonus would need target info, using rawValue as approximation
      const enhancedValue = baseAbilityDamage + levelBonus;
      const bonus = enhancedValue - baseAbilityDamage;
      
      return {
        baseValue: baseAbilityDamage,
        enhancedValue,
        bonus,
        description: `+${bonus} enhanced damage (Level ${level})`,
      };
    }
    
    case Ability.Smite: {
      // Formula: 50 + (level + luck - 1) × 10
      const baseAbilityDamage = 50;
      const levelBonus = (level + level - 1) * 10; // Simplified luck = level
      const enhancedValue = baseAbilityDamage + levelBonus;
      const bonus = enhancedValue - baseAbilityDamage;
      
      return {
        baseValue: baseAbilityDamage,
        enhancedValue,
        bonus,
        description: `+${bonus} enhanced damage (Level ${level})`,
      };
    }
    
    case Ability.Pray: {
      // Formula: maxHealth ÷ 3 + (10 + luck) × sturdiness
      // Using rawValue as the calculated healing amount
      const estimatedBaseHealing = Math.floor(rawValue * 0.6); // Rough estimate
      const bonus = rawValue - estimatedBaseHealing;
      
      return {
        baseValue: estimatedBaseHealing,
        enhancedValue: rawValue,
        bonus,
        description: `+${bonus} enhanced healing (Level ${level})`,
      };
    }
    
    case Ability.ApplyPoison: {
      // Multi-stage ability with damage over time
      const totalStages = 6; // Damage stages before cooldown
      
      return {
        baseValue: rawValue,
        enhancedValue: rawValue,
        bonus: 0,
        description: `poison damage (Stage ${stage || 1}/${totalStages}, Level ${level})`,
        stage: stage || 1,
        totalStages,
      };
    }
    
    case Ability.ShieldWall:
    case Ability.EvasiveManeuvers:
    case Ability.ChargeUp: {
      // Buff abilities - show enhanced duration/effects
      return {
        baseValue: 0,
        enhancedValue: 0,
        bonus: 0,
        description: `enhanced effects (Level ${level})${stage ? `, Stage ${stage}` : ''}`,
        stage,
      };
    }
    
    case Ability.SingSong:
    case Ability.DoDance: {
      // Flavor abilities with no combat effect
      return {
        baseValue: 0,
        enhancedValue: 0,
        bonus: 0,
        description: `(Level ${level})`,
      };
    }
    
    default: {
      // Unknown ability - show basic level info
      return {
        baseValue: rawValue,
        enhancedValue: rawValue,
        bonus: 0,
        description: `(Level ${level})`,
      };
    }
  }
}

/**
 * Build the enhancement text for the ability message
 */
export function buildEnhancementText(
  enhancement: AbilityEnhancement,
  isTargeted: boolean,
  isSelfTargeted: boolean
): string {
  const { description } = enhancement;
  
  if (isSelfTargeted) {
    return `on themselves with ${description}`;
  } else if (isTargeted) {
    return `with ${description}`;
  } else {
    return `with ${description}`;
  }
}

/**
 * Determine if an ability is self-targeted based on attacker/defender comparison
 */
export function isSelfTargetedAbility(
  raw: any,
  isPlayerAttacker: boolean,
  isPlayerDefender: boolean
): boolean {
  // Self-targeted if:
  // 1. No defender (self-only ability)
  // 2. Both attacker and defender are the same player
  // 3. Defender index is 0 (self-reference)
  return !raw.defender || 
         (isPlayerAttacker && isPlayerDefender) ||
         raw.defender?.index === raw.attacker?.index ||
         raw.defender?.index === 0;
}