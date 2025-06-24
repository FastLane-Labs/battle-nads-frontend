import { Ability } from '@/types/domain';

export interface AbilityMetadata {
  name: string;
  description: string;
  requiresTarget: boolean;
}

export const ABILITY_METADATA: Record<Ability, AbilityMetadata> = {
  [Ability.None]: {
    name: 'None',
    description: 'No ability',
    requiresTarget: false,
  },

  // Bard Abilities
  [Ability.SingSong]: {
    name: 'Sing Song',
    description: 'A melodic tune that hopefully entertains nearby enemies but probably not.',
    requiresTarget: false,
  },
  [Ability.DoDance]: {
    name: 'Do Dance',
    description: 'An energetic dance performance that might confuse enemies but will most likely just make you look silly.',
    requiresTarget: true,
  },

  // Warrior Abilities
  [Ability.ShieldBash]: {
    name: 'Shield Bash',
    description: 'A powerful strike with your shield that can stun the target and deal moderate damage.',
    requiresTarget: true,
  },
  [Ability.ShieldWall]: {
    name: 'Shield Wall',
    description: 'Raises a defensive barrier that increases your defense for several turns.',
    requiresTarget: false,
  },

  // Rogue Abilities
  [Ability.EvasiveManeuvers]: {
    name: 'Evasive Maneuvers',
    description: 'Enhances your agility and evasion, making you much harder to hit for a duration.',
    requiresTarget: false,
  },
  [Ability.ApplyPoison]: {
    name: 'Apply Poison',
    description: 'Hurl a vial of deadly poison at the target, causing damage over time.',
    requiresTarget: true,
  },

  // Monk Abilities
  [Ability.Pray]: {
    name: 'Pray',
    description: 'Channel divine energy to heal yourself and restore health through meditation.',
    requiresTarget: false,
  },
  [Ability.Smite]: {
    name: 'Smite',
    description: 'Channels divine energy to strike down an enemy with holy damage.',
    requiresTarget: true,
  },

  // Sorcerer Abilities
  [Ability.Fireball]: {
    name: 'Fireball',
    description: 'Hurls a blazing orb of fire at your target, dealing magical damage.',
    requiresTarget: true,
  },
  [Ability.ChargeUp]: {
    name: 'Charge Up',
    description: 'Temporarily reduces your defense while charging up, but guarantees critical hits on your next attacks.',
    requiresTarget: false,
  },
};

/**
 * Gets the metadata for a specific ability
 */
export function getAbilityMetadata(ability: Ability): AbilityMetadata {
  return ABILITY_METADATA[ability] || ABILITY_METADATA[Ability.None];
}

/**
 * Gets just the description for a specific ability
 */
export function getAbilityDescription(ability: Ability): string {
  return getAbilityMetadata(ability).description;
}

/**
 * Checks if an ability requires a target
 */
export function abilityRequiresTarget(ability: Ability): boolean {
  return getAbilityMetadata(ability).requiresTarget;
} 