import { Ability, CharacterClass } from '@/types/domain/enums';
import {
  calculateAbilityEnhancement,
  buildEnhancementText,
  isSelfTargetedAbility,
} from '../ability-enhancements';
import type { CharacterLite } from '../log-helpers';

describe('ability-enhancements', () => {
  const mockCharacter: CharacterLite = {
    class: CharacterClass.Warrior,
    index: 1,
    level: 15,
    name: 'Test Warrior',
    weaponId: 10,
    armorId: 5,
  };

  describe('calculateAbilityEnhancement', () => {
    it('should calculate Shield Bash enhancement correctly', () => {
      const result = calculateAbilityEnhancement(Ability.ShieldBash, mockCharacter, 50, 1);

      expect(result.baseValue).toBe(50);
      expect(result.enhancedValue).toBe(500); // 50 + (15 + 15 + 15) * 10
      expect(result.bonus).toBe(450);
      expect(result.description).toBe('+450 enhanced damage (Level 15)');
    });

    it('should calculate Fireball enhancement correctly', () => {
      const result = calculateAbilityEnhancement(Ability.Fireball, mockCharacter, 100, 1);

      expect(result.baseValue).toBe(100);
      expect(result.enhancedValue).toBe(550); // 100 + (15 * 30)
      expect(result.bonus).toBe(450);
      expect(result.description).toBe('+450 enhanced damage (Level 15)');
    });

    it('should calculate Smite enhancement correctly', () => {
      const result = calculateAbilityEnhancement(Ability.Smite, mockCharacter, 50, 1);

      expect(result.baseValue).toBe(50);
      expect(result.enhancedValue).toBe(340); // 50 + (15 + 15 - 1) * 10
      expect(result.bonus).toBe(290);
      expect(result.description).toBe('+290 enhanced damage (Level 15)');
    });

    it('should calculate Pray enhancement correctly', () => {
      const healingValue = 200;
      const result = calculateAbilityEnhancement(Ability.Pray, mockCharacter, healingValue, 2);

      expect(result.enhancedValue).toBe(healingValue);
      expect(result.description).toContain('enhanced healing (Level 15)');
    });

    it('should handle Apply Poison with stage information', () => {
      const result = calculateAbilityEnhancement(Ability.ApplyPoison, mockCharacter, 25, 3);

      expect(result.description).toBe('poison damage (Stage 3/6, Level 15)');
      expect(result.stage).toBe(3);
      expect(result.totalStages).toBe(6);
    });

    it('should handle buff abilities', () => {
      const result = calculateAbilityEnhancement(Ability.ShieldWall, mockCharacter, 0, 1);

      expect(result.description).toBe('enhanced effects (Level 15), Stage 1');
    });

    it('should handle flavor abilities', () => {
      const result = calculateAbilityEnhancement(Ability.SingSong, mockCharacter, 0);

      expect(result.description).toBe('(Level 15)');
      expect(result.bonus).toBe(0);
    });

    it('should cap level at 50', () => {
      const highLevelCharacter: CharacterLite = {
        ...mockCharacter,
        level: 75, // Above cap
      };

      const result = calculateAbilityEnhancement(Ability.ShieldBash, highLevelCharacter, 50, 1);

      expect(result.description).toContain('(Level 50)'); // Should be capped
    });

    it('should handle unknown abilities gracefully', () => {
      const result = calculateAbilityEnhancement(999, mockCharacter, 100);

      expect(result.baseValue).toBe(100);
      expect(result.enhancedValue).toBe(100);
      expect(result.bonus).toBe(0);
      expect(result.description).toBe('(Level 15)');
    });
  });

  describe('buildEnhancementText', () => {
    const mockEnhancement = {
      baseValue: 50,
      enhancedValue: 150,
      bonus: 100,
      description: '+100 enhanced damage (Level 10)',
    };

    it('should build text for self-targeted abilities', () => {
      const result = buildEnhancementText(mockEnhancement, true, true);
      expect(result).toBe('on themselves with +100 enhanced damage (Level 10)');
    });

    it('should build text for targeted abilities', () => {
      const result = buildEnhancementText(mockEnhancement, true, false);
      expect(result).toBe('with +100 enhanced damage (Level 10)');
    });

    it('should build text for non-targeted abilities', () => {
      const result = buildEnhancementText(mockEnhancement, false, false);
      expect(result).toBe('with +100 enhanced damage (Level 10)');
    });
  });

  describe('isSelfTargetedAbility', () => {
    const mockRaw = {
      attacker: { id: 'player-1', name: 'John', index: 1 },
      defender: { id: 'monster-1', name: 'Goblin', index: 2 },
    };

    it('should detect self-targeted when no defender', () => {
      const rawNoDefender = { ...mockRaw, defender: undefined };
      const result = isSelfTargetedAbility(rawNoDefender, true, false);
      expect(result).toBe(true);
    });

    it('should detect self-targeted when both attacker and defender are player', () => {
      const result = isSelfTargetedAbility(mockRaw, true, true);
      expect(result).toBe(true);
    });

    it('should detect self-targeted when defender index is 0', () => {
      const rawSelfRef = {
        ...mockRaw,
        defender: { ...mockRaw.defender, index: 0 },
      };
      const result = isSelfTargetedAbility(rawSelfRef, true, false);
      expect(result).toBe(true);
    });

    it('should detect self-targeted when attacker and defender have same index', () => {
      const rawSameIndex = {
        ...mockRaw,
        defender: { ...mockRaw.defender, index: 1 }, // Same as attacker
      };
      const result = isSelfTargetedAbility(rawSameIndex, true, false);
      expect(result).toBe(true);
    });

    it('should not detect self-targeted for normal abilities', () => {
      const result = isSelfTargetedAbility(mockRaw, true, false);
      expect(result).toBe(false);
    });
  });
});