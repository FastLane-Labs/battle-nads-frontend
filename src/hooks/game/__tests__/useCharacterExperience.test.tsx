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
  class: CharacterClass.Warrior,
  level: 2,
  health: 100,
  maxHealth: 100,
  experience: 200,
  weaponName: 'Test Weapon',
  armorName: 'Test Armor',
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
  activeTask: {
    hasTaskError: false,
    pending: false,
    taskDelay: 0,
    executorDelay: 0,
    taskAddress: '0x0000000000000000000000000000000000000000',
    targetBlock: 0
  },
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
    expect(result.current?.experienceToNextLevel).toBe(0); // XP to level 3 (220 - 300, clamped to 0)
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
    expect(result.current?.experienceToNextLevel).toBe(0); // XP to level 4 (345 - 400, clamped to 0)
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
    expect(result.current.experienceToNextLevel).toBe(0); // XP to level 3 (220 - 300, clamped to 0)
  });

  it('should handle level 1 correctly', () => {
    const { result } = renderHook(() => useExperienceProgress(50, 1));
    
    expect(result.current.currentLevel).toBe(1);
    expect(result.current.totalExperience).toBe(50); // No previous levels for level 1
    expect(result.current.levelProgress.currentExp).toBe(50); // XP within level 1 (50 - 0)
    expect(result.current.levelProgress.requiredExp).toBe(105); // Level 1 range (105 - 0)  
    expect(result.current.experienceToNextLevel).toBe(55); // XP to level 2 (105 - 50)
  });

  it('should handle level 3 with realistic XP values', () => {
    // Level 3 character with 280 total XP
    const { result } = renderHook(() => useExperienceProgress(280, 3));
    
    expect(result.current.currentLevel).toBe(3);
    expect(result.current.totalExperience).toBe(280);
    
    // Level thresholds:
    // - Level 3 starts at: 220 total XP
    // - Level 4 starts at: 345 total XP  
    // - Level 3 range: 125 XP (345 - 220)
    // - With 280 total XP: 60 XP within level 3 (280 - 220)
    // - XP to next level: 345 - 280 = 65
    
    expect(result.current.levelProgress.currentExp).toBe(60); // XP within level 3 (280 - 220)
    expect(result.current.levelProgress.requiredExp).toBe(125); // Level 3 range (345 - 220)
    expect(result.current.experienceToNextLevel).toBe(65); // XP to level 4 (345 - 280)
    expect(result.current.levelProgress.percentage).toBe(48); // Progress percentage (60/125 * 100)
  });

  it('should handle level 8 with realistic XP values', () => {
    // Level 8 character with 985 total XP
    const { result } = renderHook(() => useExperienceProgress(985, 8));
    
    expect(result.current.currentLevel).toBe(8);
    expect(result.current.totalExperience).toBe(985);
    
    // Level thresholds:
    // - Level 8 starts at: 945 total XP
    // - Level 9 starts at: 1120 total XP
    // - Level 8 range: 175 XP (1120 - 945)
    // - With 985 total XP: 40 XP within level 8 (985 - 945)
    // - XP to next level: 1120 - 985 = 135
    
    expect(result.current.levelProgress.currentExp).toBe(40); // XP within level 8 (985 - 945)
    expect(result.current.levelProgress.requiredExp).toBe(175); // Level 8 range (1120 - 945)
    expect(result.current.experienceToNextLevel).toBe(135); // XP to level 9 (1120 - 985)
  });
});