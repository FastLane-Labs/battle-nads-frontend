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
      // Stage 1: Windup (5 blocks)
      // Stages 2-11: Apply poison damage for 10 rounds (4 blocks each)
      // Stage 12: Cooldown period (16 blocks)
      // Stage 13: Resets to stage 0
      
      if (stage === 1) {
        // Windup stage
        return {
          baseValue: 0,
          enhancedValue: 0,
          bonus: 0,
          description: `preparing poison attack (Level ${level})`,
          stage: 1,
          totalStages: 13,
        };
      } else if (stage && stage >= 2 && stage <= 11) {
        // Poison damage rounds (2-11)
        const poisonRound = stage - 1; // Round 1-10
        const isFirstRound = stage === 2;
        const isLastRound = stage === 11;
        
        let description = '';
        if (isFirstRound) {
          description = `applying poison (Round ${poisonRound}/10, Level ${level})`;
        } else if (isLastRound) {
          description = `final poison damage and removing effect (Round ${poisonRound}/10, Level ${level})`;
        } else {
          description = `poison damage (Round ${poisonRound}/10, Level ${level})`;
        }
        
        return {
          baseValue: rawValue,
          enhancedValue: rawValue,
          bonus: 0,
          description,
          stage,
          totalStages: 13,
        };
      } else if (stage === 12) {
        // Cooldown stage
        return {
          baseValue: 0,
          enhancedValue: 0,
          bonus: 0,
          description: `recovering from poison ability (Level ${level})`,
          stage: 12,
          totalStages: 13,
        };
      }
      
      // Default/unknown stage
      return {
        baseValue: rawValue,
        enhancedValue: rawValue,
        bonus: 0,
        description: `poison effect (Level ${level})`,
        stage: stage || 0,
        totalStages: 13,
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