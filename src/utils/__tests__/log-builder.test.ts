import { enrichLog, getAbilityName, type LogEntryRaw } from '../log-builder';
import { LogType, CharacterClass, Ability } from '@/types/domain/enums';
import type { EventParticipant } from '@/types/domain/dataFeed';

describe('log-builder', () => {
  const mockPlayer: EventParticipant = {
    id: 'player-1',
    name: 'John',
    index: 1,
  };

  const mockMonster: EventParticipant = {
    id: 'monster-1',
    name: 'Slime',
    index: 2,
  };

  const mockPlayerCharacter = {
    class: CharacterClass.Warrior,
    index: 1,
    level: 13,
    name: 'John',
    weaponId: 10,
  };

  const mockMonsterCharacter = {
    class: CharacterClass.Basic,
    index: 1, // Slime
    level: 5,
    name: 'Slime',
  };

  describe('enrichLog - Combat', () => {
    it('should enrich player vs monster combat correctly', () => {
      const rawLog: LogEntryRaw = {
        logIndex: 123,
        blocknumber: 1000n,
        timestamp: Date.now(),
        type: LogType.Combat,
        attacker: mockPlayer,
        defender: mockMonster,
        areaId: 5n,
        isPlayerInitiated: true,
        details: {
          hit: true,
          critical: true,
          damageDone: 574,
        },
        displayMessage: 'raw message',
        actor: mockPlayerCharacter,
        target: mockMonsterCharacter,
      };

      const result = enrichLog(rawLog, 1, undefined, undefined, 'John'); // playerIndex = 1, playerCharacterName = 'John'

      expect(result.text).toContain('You critically strike Slime');
      expect(result.text).toContain('for 574 damage');
      expect(result.text).toContain('**CRITICAL HIT!**');
    });

    it('should enrich monster vs player combat correctly', () => {
      const rawLog: LogEntryRaw = {
        logIndex: 124,
        blocknumber: 1000n,
        timestamp: Date.now(),
        type: LogType.Combat,
        attacker: mockMonster,
        defender: mockPlayer,
        areaId: 5n,
        isPlayerInitiated: false,
        details: {
          hit: true,
          critical: false,
          damageDone: 32,
        },
        displayMessage: 'raw message',
        actor: mockMonsterCharacter,
        target: mockPlayerCharacter,
      };

      const result = enrichLog(rawLog, 1, undefined, undefined, 'John'); // playerIndex = 1, playerCharacterName = 'John'

      expect(result.text).toContain('Slime');
      expect(result.text).toContain('you'); // Player is target
      expect(result.text).toContain('for 32 damage');
      expect(result.text).not.toContain('**CRITICAL HIT!**');
    });

    it('should show proper titles for other players', () => {
      const otherPlayer: EventParticipant = {
        id: 'player-2',
        name: 'Alice',
        index: 3,
      };

      const otherPlayerCharacter = {
        class: CharacterClass.Bard,
        index: 3,
        level: 25,
        name: 'Alice',
      };

      const rawLog: LogEntryRaw = {
        logIndex: 125,
        blocknumber: 1000n,
        timestamp: Date.now(),
        type: LogType.Combat,
        attacker: otherPlayer,
        defender: mockMonster,
        areaId: 5n,
        isPlayerInitiated: false,
        details: {
          hit: true,
          damageDone: 100,
        },
        displayMessage: 'raw message',
        actor: otherPlayerCharacter,
        target: mockMonsterCharacter,
      };

      const result = enrichLog(rawLog, 1); // Current player index = 1

      expect(result.text).toContain('the Loud Alice'); // Bard level 25 title
      expect(result.text).toContain('strikes Slime'); // Third person uses "strikes" // Third person uses "strikes"
    });

    it('should handle target death', () => {
      const rawLog: LogEntryRaw = {
        logIndex: 126,
        blocknumber: 1000n,
        timestamp: Date.now(),
        type: LogType.Combat,
        attacker: mockPlayer,
        defender: mockMonster,
        areaId: 5n,
        isPlayerInitiated: true,
        details: {
          hit: true,
          damageDone: 100,
          targetDied: true,
        },
        displayMessage: 'raw message',
        actor: mockPlayerCharacter,
        target: mockMonsterCharacter,
      };

      const result = enrichLog(rawLog, 1, undefined, undefined, 'John');

      expect(result.text).toContain('**Slime falls!**');
    });

    it('should use deterministic monster verbs', () => {
      const rawLog: LogEntryRaw = {
        logIndex: 100,
        blocknumber: 1000n,
        timestamp: Date.now(),
        type: LogType.Combat,
        attacker: mockMonster,
        defender: mockPlayer,
        areaId: 5n,
        isPlayerInitiated: false,
        details: {
          hit: true,
          damageDone: 25,
        },
        displayMessage: 'raw message',
        actor: mockMonsterCharacter,
        target: mockPlayerCharacter,
      };

      const result1 = enrichLog(rawLog, 1, undefined, undefined, 'John');
      const result2 = enrichLog(rawLog, 1, undefined, undefined, 'John');

      expect(result1.text).toBe(result2.text); // Should be deterministic
      expect(result1.text).toMatch(/sloshes acidic goo at|oozes toward|splashes/);
    });

    it('should not include weapon text for monster attacks', () => {
      const beastCharacter = {
        class: CharacterClass.Basic,
        index: 59, // The Beast
        level: 50,
        name: 'The Beast',
      };

      const rawLog: LogEntryRaw = {
        logIndex: 200,
        blocknumber: 1000n,
        timestamp: Date.now(),
        type: LogType.Combat,
        attacker: {
          id: 'beast-1',
          name: 'The Beast',
          index: 10,
        },
        defender: mockPlayer,
        areaId: 5n,
        isPlayerInitiated: false,
        details: {
          hit: true,
          damageDone: 100,
        },
        displayMessage: 'raw message',
        actor: beastCharacter,
        target: mockPlayerCharacter,
      };

      const result = enrichLog(rawLog, 1, undefined, undefined, 'John');

      expect(result.text).toContain('The Beast');
      expect(result.text).toContain('you');
      expect(result.text).toContain('for 100 damage');
      expect(result.text).not.toContain('with bare hands');
      // Monster attacks shouldn't show weapon text at the end, but the verb itself might contain "with"
      expect(result.text).not.toContain('with claws.');
      expect(result.text).not.toContain('with fangs.');
      expect(result.text).toMatch(/embodies primal terror against|stalks with ancient hunger|devours with endless appetite/);
    });
  });

  describe('enrichLog - Ability', () => {
    it('should enrich player ability use correctly', () => {
      const rawLog: LogEntryRaw = {
        logIndex: 127,
        blocknumber: 1000n,
        timestamp: Date.now(),
        type: LogType.Ability,
        attacker: mockPlayer,
        defender: mockMonster,
        areaId: 5n,
        isPlayerInitiated: true,
        details: {
          damageDone: 200,
        },
        displayMessage: 'raw message',
        actor: mockPlayerCharacter,
        target: mockMonsterCharacter,
      };

      const result = enrichLog(rawLog, 1, undefined, undefined, 'John');

      expect(result.text).toContain('You use Ability **Mighty Blow**');
      expect(result.text).toContain('against Slime');
      expect(result.text).toContain('(Level 13)');
    });

    it('should handle self-targeted abilities', () => {
      const rawLog: LogEntryRaw = {
        logIndex: 128,
        blocknumber: 1000n,
        timestamp: Date.now(),
        type: LogType.Ability,
        attacker: mockPlayer,
        areaId: 5n,
        isPlayerInitiated: true,
        details: {
          healthHealed: 50,
        },
        displayMessage: 'raw message',
        actor: mockPlayerCharacter,
      };

      const result = enrichLog(rawLog, 1, undefined, undefined, 'John');

      expect(result.text).toContain('You use Ability **Mighty Blow**');
      expect(result.text).toContain('on themselves');
      expect(result.text).toContain('(Level 13)');
    });

    it('should use provided ability name over signature', () => {
      const rawLog: LogEntryRaw = {
        logIndex: 129,
        blocknumber: 1000n,
        timestamp: Date.now(),
        type: LogType.Ability,
        attacker: mockPlayer,
        defender: mockMonster,
        areaId: 5n,
        isPlayerInitiated: true,
        details: {
          damageDone: 150,
        },
        displayMessage: 'raw message',
        actor: mockPlayerCharacter,
        target: mockMonsterCharacter,
        ability: 'Shield Bash',
      };

      const result = enrichLog(rawLog, 1, undefined, undefined, 'John');

      expect(result.text).toContain('You use Ability **Shield Bash**');
      expect(result.text).not.toContain('Mighty Blow');
    });
  });

  describe('enrichLog - Area Movement', () => {
    it('should enrich EnteredArea correctly', () => {
      const rawLog: LogEntryRaw = {
        logIndex: 130,
        blocknumber: 1000n,
        timestamp: Date.now(),
        type: LogType.EnteredArea,
        attacker: mockPlayer,
        areaId: 42n,
        isPlayerInitiated: true,
        details: {},
        displayMessage: 'raw message',
        actor: mockPlayerCharacter,
      };

      const result = enrichLog(rawLog, 1, undefined, undefined, 'John');

      expect(result.text).toBe('You entered the area (42).');
    });

    it('should enrich LeftArea correctly', () => {
      const rawLog: LogEntryRaw = {
        logIndex: 131,
        blocknumber: 1000n,
        timestamp: Date.now(),
        type: LogType.LeftArea,
        attacker: mockPlayer,
        areaId: 42n,
        isPlayerInitiated: true,
        details: {},
        displayMessage: 'raw message',
        actor: mockPlayerCharacter,
      };

      const result = enrichLog(rawLog, 1, undefined, undefined, 'John');

      expect(result.text).toBe('You left the area (42).');
    });

    it('should show other player names in area events', () => {
      const otherPlayer: EventParticipant = {
        id: 'player-3',
        name: 'Bob',
        index: 4,
      };

      const otherPlayerCharacter = {
        class: CharacterClass.Rogue,
        index: 4,
        level: 15,
        name: 'Bob',
      };

      const rawLog: LogEntryRaw = {
        logIndex: 132,
        blocknumber: 1000n,
        timestamp: Date.now(),
        type: LogType.EnteredArea,
        attacker: otherPlayer,
        areaId: 42n,
        isPlayerInitiated: false,
        details: {},
        displayMessage: 'raw message',
        actor: otherPlayerCharacter,
      };

      const result = enrichLog(rawLog, 1); // Current player index = 1

      expect(result.text).toBe('Shadow Blade Bob entered the area (42).');
    });
  });

  describe('enrichLog - InstigatedCombat', () => {
    it('should enrich combat initiation correctly', () => {
      const rawLog: LogEntryRaw = {
        logIndex: 133,
        blocknumber: 1000n,
        timestamp: Date.now(),
        type: LogType.InstigatedCombat,
        attacker: mockPlayer,
        defender: mockMonster,
        areaId: 5n,
        isPlayerInitiated: true,
        details: {},
        displayMessage: 'raw message',
        actor: mockPlayerCharacter,
        target: mockMonsterCharacter,
      };

      const result = enrichLog(rawLog, 1, undefined, undefined, 'John');

      expect(result.text).toBe('You initiated combat with Slime!');
    });
  });

  describe('enrichLog - Ascend', () => {
    it('should enrich level up correctly', () => {
      const rawLog: LogEntryRaw = {
        logIndex: 134,
        blocknumber: 1000n,
        timestamp: Date.now(),
        type: LogType.Ascend,
        attacker: mockPlayer,
        areaId: 5n,
        isPlayerInitiated: true,
        details: {
          experience: 500,
        },
        displayMessage: 'raw message',
        actor: mockPlayerCharacter,
      };

      const result = enrichLog(rawLog, 1, undefined, undefined, 'John');

      expect(result.text).toBe('You gained 500 experience and advanced to the next level!');
    });

    it('should handle missing experience', () => {
      const rawLog: LogEntryRaw = {
        logIndex: 135,
        blocknumber: 1000n,
        timestamp: Date.now(),
        type: LogType.Ascend,
        attacker: mockPlayer,
        areaId: 5n,
        isPlayerInitiated: true,
        details: {},
        displayMessage: 'raw message',
        actor: mockPlayerCharacter,
      };

      const result = enrichLog(rawLog, 1, undefined, undefined, 'John');

      expect(result.text).toBe('You gained 0 experience and advanced to the next level!');
    });
  });

  describe('enrichLog - Fallbacks', () => {
    it('should return original displayMessage when attacker missing', () => {
      const rawLog: LogEntryRaw = {
        logIndex: 136,
        blocknumber: 1000n,
        timestamp: Date.now(),
        type: LogType.Combat,
        areaId: 5n,
        isPlayerInitiated: false,
        details: {},
        displayMessage: 'original message',
      };

      const result = enrichLog(rawLog, 1);

      expect(result.text).toBe('original message');
    });

    it('should return original displayMessage for Chat type', () => {
      const rawLog: LogEntryRaw = {
        logIndex: 137,
        blocknumber: 1000n,
        timestamp: Date.now(),
        type: LogType.Chat,
        areaId: 5n,
        isPlayerInitiated: false,
        details: {},
        displayMessage: 'chat message',
      };

      const result = enrichLog(rawLog, 1);

      expect(result.text).toBe('chat message');
    });

    it('should return original displayMessage for unknown types', () => {
      const rawLog: LogEntryRaw = {
        logIndex: 138,
        blocknumber: 1000n,
        timestamp: Date.now(),
        type: 999 as LogType,
        areaId: 5n,
        isPlayerInitiated: false,
        details: {},
        displayMessage: 'unknown message',
      };

      const result = enrichLog(rawLog, 1);

      expect(result.text).toBe('unknown message');
    });
  });

  describe('getAbilityName', () => {
    it('should return correct ability names', () => {
      expect(getAbilityName(Ability.SingSong)).toBe('Sing Song');
      expect(getAbilityName(Ability.ShieldBash)).toBe('Shield Bash');
      expect(getAbilityName(Ability.EvasiveManeuvers)).toBe('Evasive Maneuvers');
      expect(getAbilityName(Ability.ApplyPoison)).toBe('Apply Poison');
      expect(getAbilityName(Ability.Pray)).toBe('Pray');
      expect(getAbilityName(Ability.Smite)).toBe('Smite');
      expect(getAbilityName(Ability.Fireball)).toBe('Fireball');
      expect(getAbilityName(Ability.ChargeUp)).toBe('Charge Up');
    });

    it('should return fallback for unknown abilities', () => {
      expect(getAbilityName(999)).toBe('Unknown Ability');
    });
  });

  describe('enrichLog - Edge Cases', () => {
    it('should handle missing playerIndex gracefully', () => {
      const rawLog: LogEntryRaw = {
        logIndex: 139,
        blocknumber: 1000n,
        timestamp: Date.now(),
        type: LogType.Combat,
        attacker: mockPlayer,
        defender: mockMonster,
        areaId: 5n,
        isPlayerInitiated: true,
        details: {
          damageDone: 100,
          hit: true,
        },
        displayMessage: 'raw message',
        actor: mockPlayerCharacter,
        target: mockMonsterCharacter,
      };

      const result = enrichLog(rawLog); // No playerIndex

      expect(result.text).toContain('Count John'); // Should show name with title, not "You"
      expect(result.text).toContain('strikes Slime'); // Third person uses "strikes"
    });

    it('should handle null playerIndex', () => {
      const rawLog: LogEntryRaw = {
        logIndex: 140,
        blocknumber: 1000n,
        timestamp: Date.now(),
        type: LogType.Combat,
        attacker: mockPlayer,
        defender: mockMonster,
        areaId: 5n,
        isPlayerInitiated: true,
        details: {
          damageDone: 100,
          hit: true,
        },
        displayMessage: 'raw message',
        actor: mockPlayerCharacter,
        target: mockMonsterCharacter,
      };

      const result = enrichLog(rawLog, null);

      expect(result.text).toContain('Count John'); // Should show name with title, not "You"
      expect(result.text).toContain('strikes Slime'); // Third person uses "strikes"
    });

    it('should handle missing actor/target gracefully', () => {
      const rawLog: LogEntryRaw = {
        logIndex: 141,
        blocknumber: 1000n,
        timestamp: Date.now(),
        type: LogType.Combat,
        attacker: mockPlayer,
        defender: mockMonster,
        areaId: 5n,
        isPlayerInitiated: true,
        details: {
          damageDone: 100,
          hit: true,
        },
        displayMessage: 'raw message',
        // No actor/target provided
      };

      const result = enrichLog(rawLog, 1, undefined, undefined, 'John');

      // Without actor/target data, it creates CharacterLite with Null class from participants
      // Player detection still works based on name matching
      expect(result.text).toContain('You strike Slime');
      expect(result.text).toContain('for 100 damage');
      expect(result.text).toContain('with bare hands'); // Default weapon for Null class
    });
  });

  describe('enrichLog - Enhanced Ability System', () => {
    it('should extract ability ID from lootedWeaponID and show enhancements', () => {
      const rawLog: LogEntryRaw = {
        logIndex: 200,
        blocknumber: 1000n,
        timestamp: Date.now(),
        type: LogType.Ability,
        attacker: {
          id: 'player-1',
          name: 'You',
          index: 1,
        },
        defender: {
          id: 'monster-1',
          name: 'Goblin',
          index: 2,
        },
        areaId: 5n,
        isPlayerInitiated: true,
        details: {
          damageDone: 250,
          lootedWeaponID: 3, // Shield Bash ability ID
          lootedArmorID: 1,  // Stage 1
          hit: true,
        },
        displayMessage: 'raw message',
        actor: {
          class: CharacterClass.Warrior,
          index: 1,
          level: 15,
          name: 'Test Warrior',
        },
        target: {
          class: CharacterClass.Basic,
          index: 2,
          level: 5,
          name: 'Goblin',
        },
      };

      const result = enrichLog(rawLog, 1, undefined, undefined, 'TestPlayer');

      expect(result.text).toContain('You use Ability **Shield Bash** against Goblin');
      expect(result.text).toContain('enhanced damage (Level 15)');
    });

    it('should handle multi-stage abilities with stage information', () => {
      const rawLog: LogEntryRaw = {
        logIndex: 201,
        blocknumber: 1000n,
        timestamp: Date.now(),
        type: LogType.Ability,
        attacker: {
          id: 'player-1',
          name: 'Alice',
          index: 3,
        },
        defender: {
          id: 'monster-1',
          name: 'Elite Ogre',
          index: 4,
        },
        areaId: 5n,
        isPlayerInitiated: true,
        details: {
          damageDone: 15,
          lootedWeaponID: 6, // Apply Poison ability ID
          lootedArmorID: 3,  // Stage 3 of 6
          hit: true,
        },
        displayMessage: 'raw message',
        actor: {
          class: CharacterClass.Rogue,
          index: 3,
          level: 20,
          name: 'Alice',
        },
        target: {
          class: CharacterClass.Elite,
          index: 4,
          level: 12,
          name: 'Elite Ogre',
        },
      };

      const result = enrichLog(rawLog, 1, undefined, undefined, 'TestPlayer');

      expect(result.text).toContain('uses Ability **Apply Poison** against');
      expect(result.text).toContain('poison damage (Stage 3/6, Level 20)');
    });

    it('should handle self-targeted abilities correctly', () => {
      const rawLog: LogEntryRaw = {
        logIndex: 202,
        blocknumber: 1000n,
        timestamp: Date.now(),
        type: LogType.Ability,
        attacker: {
          id: 'player-1',
          name: 'You',
          index: 1,
        },
        defender: {
          id: 'player-1',
          name: 'You',
          index: 1, // Same as attacker
        },
        areaId: 5n,
        isPlayerInitiated: true,
        details: {
          healthHealed: 150,
          lootedWeaponID: 7, // Pray ability ID
          lootedArmorID: 2,  // Stage 2 (healing stage)
          hit: true,
        },
        displayMessage: 'raw message',
        actor: {
          class: CharacterClass.Monk,
          index: 1,
          level: 12,
          name: 'Test Monk',
        },
        target: {
          class: CharacterClass.Monk,
          index: 1,
          level: 12,
          name: 'Test Monk',
        },
      };

      const result = enrichLog(rawLog, 1, undefined, undefined, 'TestPlayer');

      expect(result.text).toContain('You use Ability **Pray**');
      expect(result.text).toContain('on themselves');
      expect(result.text).toContain('enhanced healing (Level 12)');
    });

    it('should fallback to getAbilityName when lootedWeaponID is missing', () => {
      const rawLog: LogEntryRaw = {
        logIndex: 203,
        blocknumber: 1000n,
        timestamp: Date.now(),
        type: LogType.Ability,
        attacker: {
          id: 'player-1',
          name: 'You',
          index: 1,
        },
        areaId: 5n,
        isPlayerInitiated: true,
        details: {
          healthHealed: 50,
          // No lootedWeaponID
        },
        displayMessage: 'raw message',
        ability: 'Crescendo', // Fallback ability name
        actor: {
          class: CharacterClass.Bard,
          index: 1,
          level: 8,
          name: 'Test Bard',
        },
      };

      const result = enrichLog(rawLog, 1, undefined, undefined, 'TestPlayer');

      expect(result.text).toContain('You use Ability **Crescendo**');
      expect(result.text).toContain('(Level 8)');
    });
  });
});