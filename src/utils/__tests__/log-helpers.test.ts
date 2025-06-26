import {
  formatActorName,
  getPlayerTitle,
  pickAttackVerb,
  getSignatureAbility,
  getWeaponName,
  getArmorName,
  participantToCharacterLite,
  isMonster,
  isPlayer,
  type CharacterLite,
} from '../log-helpers';
import { CharacterClass } from '@/types/domain/enums';
import type { EventParticipant } from '@/types/domain/dataFeed';

describe('log-helpers', () => {
  describe('formatActorName', () => {
    it('should format monster names correctly', () => {
      const slime: CharacterLite = {
        class: CharacterClass.Basic,
        index: 1,
        level: 5,
        name: 'Slime',
      };

      expect(formatActorName(slime)).toBe('Slime');
    });

    it('should format elite monster names correctly', () => {
      const eliteSlime: CharacterLite = {
        class: CharacterClass.Elite,
        index: 1,
        level: 8,
        name: 'Slime',
      };

      expect(formatActorName(eliteSlime)).toBe('Elite Slime');
    });

    it('should format boss monster names correctly for low level', () => {
      const lowBoss: CharacterLite = {
        class: CharacterClass.Boss,
        index: 1,
        level: 10,
        name: 'Slime',
      };

      expect(formatActorName(lowBoss)).toBe('Dungeon Floor Boss');
    });

    it('should format boss monster names correctly for mid level', () => {
      const midBoss: CharacterLite = {
        class: CharacterClass.Boss,
        index: 1,
        level: 25,
        name: 'Slime',
      };

      const result = formatActorName(midBoss);
      expect(result).toMatch(/^(Dread|Nightmare|Infernal) Slime Boss$/);
    });

    it('should format named boss correctly', () => {
      const namedBoss: CharacterLite = {
        class: CharacterClass.Boss,
        index: 1,
        level: 46,
        name: 'Slime',
      };

      expect(formatActorName(namedBoss)).toBe('Molandak');
    });

    it('should format Keone for high level bosses', () => {
      const keone: CharacterLite = {
        class: CharacterClass.Boss,
        index: 1,
        level: 65,
        name: 'Slime',
      };

      expect(formatActorName(keone)).toBe('Keone');
    });

    it('should return "You" for current player', () => {
      const player: CharacterLite = {
        class: CharacterClass.Warrior,
        index: 1,
        level: 13,
        name: 'John',
      };

      expect(formatActorName(player, true)).toBe('You');
    });

    it('should format other players with titles', () => {
      const player: CharacterLite = {
        class: CharacterClass.Warrior,
        index: 1,
        level: 13,
        name: 'John',
      };

      expect(formatActorName(player, false)).toBe('Count John');
    });

    it('should handle players without titles', () => {
      const lowLevelPlayer: CharacterLite = {
        class: CharacterClass.Warrior,
        index: 1,
        level: 3,
        name: 'Newbie',
      };

      expect(formatActorName(lowLevelPlayer, false)).toBe('Sir Newbie');
    });

    it('should handle Sorcerer level 50+ (no title)', () => {
      const maxSorcerer: CharacterLite = {
        class: CharacterClass.Sorcerer,
        index: 1,
        level: 50,
        name: 'Wizard',
      };

      expect(formatActorName(maxSorcerer, false)).toBe('Wizard');
    });
  });

  describe('getPlayerTitle', () => {
    it('should return correct Bard titles', () => {
      const bard: CharacterLite = {
        class: CharacterClass.Bard,
        index: 1,
        level: 13,
        name: 'John',
      };

      expect(getPlayerTitle({ ...bard, level: 3 })).toBe('the Unremarkable');
      expect(getPlayerTitle({ ...bard, level: 6 })).toBe('the Annoying');
      expect(getPlayerTitle({ ...bard, level: 13 })).toBe('the Unfortunate');
      expect(getPlayerTitle({ ...bard, level: 25 })).toBe('the Loud');
      expect(getPlayerTitle({ ...bard, level: 45 })).toBe('the Unforgettable');
      expect(getPlayerTitle({ ...bard, level: 50 })).toBe('the Greatest');
    });

    it('should return correct Warrior titles', () => {
      const warrior: CharacterLite = {
        class: CharacterClass.Warrior,
        index: 1,
        level: 13,
        name: 'John',
      };

      expect(getPlayerTitle({ ...warrior, level: 3 })).toBe('Sir');
      expect(getPlayerTitle({ ...warrior, level: 6 })).toBe('Knight');
      expect(getPlayerTitle({ ...warrior, level: 13 })).toBe('Count');
      expect(getPlayerTitle({ ...warrior, level: 25 })).toBe('Lord');
      expect(getPlayerTitle({ ...warrior, level: 45 })).toBe('Duke');
      expect(getPlayerTitle({ ...warrior, level: 50 })).toBe('Hero-King');
    });

    it('should cap titles at level 50', () => {
      const warrior: CharacterLite = {
        class: CharacterClass.Warrior,
        index: 1,
        level: 99,
        name: 'John',
      };

      expect(getPlayerTitle(warrior)).toBe('Hero-King');
    });

    it('should return empty string for unknown class', () => {
      const unknown: CharacterLite = {
        class: 99 as CharacterClass,
        index: 1,
        level: 13,
        name: 'John',
      };

      expect(getPlayerTitle(unknown)).toBe('');
    });
  });

  describe('pickAttackVerb', () => {
    it('should return deterministic verbs based on logIndex', () => {
      const verb1 = pickAttackVerb(1, 100); // Slime
      const verb2 = pickAttackVerb(1, 100); // Same inputs
      const verb3 = pickAttackVerb(1, 101); // Different logIndex

      expect(verb1).toBe(verb2); // Should be deterministic
      expect(verb1).not.toBe(verb3); // Different inputs should potentially give different results
    });

    it('should return valid verbs for Slime', () => {
      const verb = pickAttackVerb(1, 123);
      const expectedVerbs = ['sloshes acidic goo at', 'oozes toward', 'splashes'];
      
      expect(expectedVerbs).toContain(verb);
    });

    it('should return fallback for unknown monster', () => {
      const verb = pickAttackVerb(999, 123);
      
      expect(verb).toBe('hits');
    });

    it('should handle logIndex undefined', () => {
      const verb = pickAttackVerb(1);
      const expectedVerbs = ['sloshes acidic goo at', 'oozes toward', 'splashes'];
      
      expect(expectedVerbs).toContain(verb);
    });
  });

  describe('getSignatureAbility', () => {
    it('should return correct signature for Bard', () => {
      const bard: CharacterLite = {
        class: CharacterClass.Bard,
        index: 1,
        level: 10,
        name: 'John',
      };

      const ability = getSignatureAbility(bard);
      expect(ability?.name).toBe('Crescendo');
      expect(ability?.power).toBe(40 + 10 * 8); // 120
    });

    it('should return correct signature for Warrior', () => {
      const warrior: CharacterLite = {
        class: CharacterClass.Warrior,
        index: 1,
        level: 20,
        name: 'John',
      };

      const ability = getSignatureAbility(warrior);
      expect(ability?.name).toBe('Mighty Blow');
      expect(ability?.power).toBe(50 + 20 * 10); // 250
    });

    it('should cap ability power at level 50', () => {
      const warrior: CharacterLite = {
        class: CharacterClass.Warrior,
        index: 1,
        level: 99,
        name: 'John',
      };

      const ability = getSignatureAbility(warrior);
      expect(ability?.power).toBe(50 + 50 * 10); // 550, not 50 + 99 * 10
    });

    it('should return undefined for monster classes', () => {
      const monster: CharacterLite = {
        class: CharacterClass.Basic,
        index: 1,
        level: 10,
        name: 'Slime',
      };

      const ability = getSignatureAbility(monster);
      expect(ability).toBeUndefined();
    });
  });

  describe('getWeaponName', () => {
    it('should return correct weapon names', () => {
      expect(getWeaponName(1)).toBe('A Dumb-Looking Stick');
      expect(getWeaponName(50)).toBe('Ultimate Weapon of Ultimate Destiny');
    });

    it('should return fallback for unknown weapon', () => {
      expect(getWeaponName(999)).toBe('Unknown Weapon 999');
    });
  });

  describe('getArmorName', () => {
    it('should return correct armor names', () => {
      expect(getArmorName(1)).toBe('Literally Nothing');
      expect(getArmorName(50)).toBe('Ultimate Armor of Ultimate Protection');
    });

    it('should return fallback for unknown armor', () => {
      expect(getArmorName(999)).toBe('Unknown Armor 999');
    });
  });

  describe('participantToCharacterLite', () => {
    it('should convert participant to CharacterLite', () => {
      const participant: EventParticipant = {
        id: 'test-id',
        name: 'John',
        index: 1,
      };

      const extraData = {
        class: CharacterClass.Warrior,
        level: 13,
        weaponId: 10,
      };

      const result = participantToCharacterLite(participant, extraData);

      expect(result).toEqual({
        class: CharacterClass.Warrior,
        index: 1,
        level: 13,
        name: 'John',
        weaponId: 10,
        armorId: undefined,
      });
    });

    it('should use defaults when no extra data provided', () => {
      const participant: EventParticipant = {
        id: 'test-id',
        name: 'Unknown',
        index: 5,
      };

      const result = participantToCharacterLite(participant);

      expect(result).toEqual({
        class: CharacterClass.Null,
        index: 5,
        level: 1,
        name: 'Unknown',
        weaponId: undefined,
        armorId: undefined,
      });
    });
  });

  describe('isMonster', () => {
    it('should return true for monster classes', () => {
      expect(isMonster({ class: CharacterClass.Basic } as CharacterLite)).toBe(true);
      expect(isMonster({ class: CharacterClass.Elite } as CharacterLite)).toBe(true);
      expect(isMonster({ class: CharacterClass.Boss } as CharacterLite)).toBe(true);
    });

    it('should return false for player classes', () => {
      expect(isMonster({ class: CharacterClass.Bard } as CharacterLite)).toBe(false);
      expect(isMonster({ class: CharacterClass.Warrior } as CharacterLite)).toBe(false);
      expect(isMonster({ class: CharacterClass.Rogue } as CharacterLite)).toBe(false);
      expect(isMonster({ class: CharacterClass.Monk } as CharacterLite)).toBe(false);
      expect(isMonster({ class: CharacterClass.Sorcerer } as CharacterLite)).toBe(false);
    });

    it('should return false for null class', () => {
      expect(isMonster({ class: CharacterClass.Null } as CharacterLite)).toBe(false);
    });
  });

  describe('isPlayer', () => {
    it('should return true for player classes', () => {
      expect(isPlayer({ class: CharacterClass.Bard } as CharacterLite)).toBe(true);
      expect(isPlayer({ class: CharacterClass.Warrior } as CharacterLite)).toBe(true);
      expect(isPlayer({ class: CharacterClass.Rogue } as CharacterLite)).toBe(true);
      expect(isPlayer({ class: CharacterClass.Monk } as CharacterLite)).toBe(true);
      expect(isPlayer({ class: CharacterClass.Sorcerer } as CharacterLite)).toBe(true);
    });

    it('should return false for monster classes', () => {
      expect(isPlayer({ class: CharacterClass.Basic } as CharacterLite)).toBe(false);
      expect(isPlayer({ class: CharacterClass.Elite } as CharacterLite)).toBe(false);
      expect(isPlayer({ class: CharacterClass.Boss } as CharacterLite)).toBe(false);
    });

    it('should return false for null class', () => {
      expect(isPlayer({ class: CharacterClass.Null } as CharacterLite)).toBe(false);
    });
  });
});