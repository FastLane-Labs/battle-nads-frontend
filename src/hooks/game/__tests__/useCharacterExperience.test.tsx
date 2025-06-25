/**
 * Tests for useCharacterExperience hook
 */

import { renderHook } from '@testing-library/react';
import { useCharacterExperience, useExperienceProgress } from '../useCharacterExperience';
import type { Character } from '@/types/domain/character';
import { CharacterClass } from '@/types/domain/enums';

const mockCharacter: Character = {
  id: 'test-character',
  index: 1,
  name: 'Test Character',
  class: CharacterClass.WARRIOR,
  level: 2,
  health: 100,
  maxHealth: 100,
  buffs: [],
  debuffs: [],
  stats: {
    strength: 10,
    vitality: 10,
    dexterity: 10,
    quickness: 10,
    sturdiness: 10,
    luck: 10,
    experience: 200,
    unspentAttributePoints: 0
  },
  weapon: {
    id: 1,
    name: 'Test Weapon',
    baseDamage: 10,
    bonusDamage: 0,
    accuracy: 95,
    speed: 100
  },
  armor: {
    id: 1,
    name: 'Test Armor',
    armorFactor: 5,
    armorQuality: 10,
    flexibility: 8,
    weight: 15
  },
  position: { x: 0, y: 0, depth: 0 },
  areaId: BigInt(1),
  owner: '0x123',
  activeTask: '',
  ability: {
    ability: 0,
    stage: 0,
    targetIndex: 0,
    taskAddress: '0x000',
    targetBlock: 0
  },
  inventory: {
    weaponBitmap: 0,
    armorBitmap: 0,
    balance: 0,
    weaponIDs: [],
    armorIDs: [],
    weaponNames: [],
    armorNames: []
  },
  isInCombat: false,
  isDead: false,
  movementOptions: {
    canMoveNorth: true,
    canMoveSouth: true,
    canMoveEast: true,
    canMoveWest: true,
    canMoveUp: true,
    canMoveDown: true
  }
};

describe('useCharacterExperience', () => {
  it('should return null for null character', () => {
    const { result } = renderHook(() => useCharacterExperience(null));
    expect(result.current).toBeNull();
  });

  it('should calculate experience info for a character', () => {
    const { result } = renderHook(() => useCharacterExperience(mockCharacter));
    
    expect(result.current).not.toBeNull();
    expect(result.current?.currentLevel).toBe(2);
    expect(result.current?.totalExperience).toBe(200); // Contract value as-is
    expect(result.current?.levelProgress.currentExp).toBe(95); // XP within level 2 (200 - 105)
    expect(result.current?.levelProgress.requiredExp).toBe(115); // Level 2 range (220 - 105)
    expect(result.current?.experienceToNextLevel).toBe(20); // XP to level 3 (220 - 200)
  });

  it('should recalculate when character experience changes', () => {
    const { result, rerender } = renderHook(
      ({ character }) => useCharacterExperience(character),
      { initialProps: { character: mockCharacter } }
    );

    expect(result.current?.totalExperience).toBe(200); // Contract value as-is

    const updatedCharacter = {
      ...mockCharacter,
      stats: { ...mockCharacter.stats, experience: 300 }
    };

    rerender({ character: updatedCharacter });

    expect(result.current?.totalExperience).toBe(300); // Contract value as-is
    expect(result.current?.levelProgress.currentExp).toBe(195); // XP within level 2 (300 - 105)
    expect(result.current?.experienceToNextLevel).toBe(0); // Already exceeded level 2 threshold (220)
  });

  it('should recalculate when character level changes', () => {
    const { result, rerender } = renderHook(
      ({ character }) => useCharacterExperience(character),
      { initialProps: { character: mockCharacter } }
    );

    expect(result.current?.currentLevel).toBe(2);

    const leveledUpCharacter = {
      ...mockCharacter,
      level: 3,
      stats: { ...mockCharacter.stats, experience: 400 }
    };

    rerender({ character: leveledUpCharacter });

    expect(result.current?.currentLevel).toBe(3);
    expect(result.current?.totalExperience).toBe(400); // Contract value as-is
    expect(result.current?.levelProgress.currentExp).toBe(180); // XP within level 3 (400 - 220)
    expect(result.current?.experienceToNextLevel).toBe(0); // Already exceeded level 3 threshold (345)
  });
});

describe('useExperienceProgress', () => {
  it('should calculate experience progress from raw values', () => {
    const { result } = renderHook(() => useExperienceProgress(200, 2));
    
    expect(result.current.currentLevel).toBe(2);
    expect(result.current.totalExperience).toBe(200); // Uses raw input value
    expect(result.current.levelProgress.currentExp).toBe(95); // XP within level 2 (200 - 105)
    expect(result.current.levelProgress.requiredExp).toBe(115); // Level 2 range (220 - 105)
    expect(result.current.experienceToNextLevel).toBe(20); // XP to level 3 (220 - 200)
  });

  it('should recalculate when values change', () => {
    const { result, rerender } = renderHook(
      ({ exp, level }) => useExperienceProgress(exp, level),
      { initialProps: { exp: 200, level: 2 } }
    );

    expect(result.current.totalExperience).toBe(200); // Uses raw input value

    rerender({ exp: 300, level: 2 });

    expect(result.current.totalExperience).toBe(300); // Uses raw input value
    expect(result.current.levelProgress.currentExp).toBe(195); // XP within level 2 (300 - 105)
    expect(result.current.experienceToNextLevel).toBe(0); // Already exceeded level 2 threshold (220)
  });

  it('should handle level 1 correctly', () => {
    const { result } = renderHook(() => useExperienceProgress(50, 1));
    
    expect(result.current.currentLevel).toBe(1);
    expect(result.current.totalExperience).toBe(50); // No previous levels for level 1
    expect(result.current.levelProgress.currentExp).toBe(50);
    expect(result.current.levelProgress.requiredExp).toBe(105);
    expect(result.current.experienceToNextLevel).toBe(55);
  });

  it('should handle the reported bug scenario: Level 8 with 947 total XP', () => {
    // GitHub issue #127: Level 8 character with 947 total XP showing wrong progress
    // Based on smart contract logic: level thresholds are absolute XP values
    const { result } = renderHook(() => useExperienceProgress(947, 8));
    
    expect(result.current.currentLevel).toBe(8);
    expect(result.current.totalExperience).toBe(947);
    
    // Smart contract thresholds:
    // - Level 8 threshold: 945 total XP (7*100 + 7²*5)
    // - Level 9 threshold: 1120 total XP (8*100 + 8²*5)
    // - Level 8 range: 175 XP (1120 - 945)
    // - With 947 total XP: 2 XP within level 8 (947 - 945)
    // - Progress: 2/175 = 1.1%
    // - XP to next level: 1120 - 947 = 173
    
    expect(result.current.levelProgress.currentExp).toBe(2); // XP within level 8
    expect(result.current.levelProgress.requiredExp).toBe(175); // Level 8 range
    expect(result.current.experienceToNextLevel).toBe(173); // XP to level 9
    expect(result.current.levelProgress.percentage).toBeCloseTo(1.1, 1); // Progress percentage
  });
});