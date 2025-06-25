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
    expect(result.current?.levelProgress.currentExp).toBe(0); // XP within level 2 (200 - 220, clamped to 0)
    expect(result.current?.levelProgress.requiredExp).toBe(125); // Level 2 range (345 - 220)
    expect(result.current?.experienceToNextLevel).toBe(145); // XP to level 3 (345 - 200)
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
    expect(result.current?.levelProgress.currentExp).toBe(80); // XP within level 2 (300 - 220)
    expect(result.current?.experienceToNextLevel).toBe(45); // XP to level 3 (345 - 300)
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
    expect(result.current?.levelProgress.currentExp).toBe(55); // XP within level 3 (400 - 345)
    expect(result.current?.experienceToNextLevel).toBe(80); // XP to level 4 (480 - 400)
  });
});

describe('useExperienceProgress', () => {
  it('should calculate experience progress from raw values', () => {
    const { result } = renderHook(() => useExperienceProgress(200, 2));
    
    expect(result.current.currentLevel).toBe(2);
    expect(result.current.totalExperience).toBe(200); // Uses raw input value
    expect(result.current.levelProgress.currentExp).toBe(0); // XP within level 2 (200 - 220, clamped to 0)
    expect(result.current.levelProgress.requiredExp).toBe(125); // Level 2 range (345 - 220)
    expect(result.current.experienceToNextLevel).toBe(145); // XP to level 3 (345 - 200)
  });

  it('should recalculate when values change', () => {
    const { result, rerender } = renderHook(
      ({ exp, level }) => useExperienceProgress(exp, level),
      { initialProps: { exp: 200, level: 2 } }
    );

    expect(result.current.totalExperience).toBe(200); // Uses raw input value

    rerender({ exp: 300, level: 2 });

    expect(result.current.totalExperience).toBe(300); // Uses raw input value
    expect(result.current.levelProgress.currentExp).toBe(80); // XP within level 2 (300 - 220)
    expect(result.current.experienceToNextLevel).toBe(45); // XP to level 3 (345 - 300)
  });

  it('should handle level 1 correctly', () => {
    const { result } = renderHook(() => useExperienceProgress(50, 1));
    
    expect(result.current.currentLevel).toBe(1);
    expect(result.current.totalExperience).toBe(50); // No previous levels for level 1
    expect(result.current.levelProgress.currentExp).toBe(0); // XP within level 1 (50 - 105, clamped to 0)
    expect(result.current.levelProgress.requiredExp).toBe(115); // Level 1 range (220 - 105)  
    expect(result.current.experienceToNextLevel).toBe(170); // XP to level 2 (220 - 50)
  });

  it('should handle level 3 with realistic XP values', () => {
    // Level 3 character with 280 total XP
    const { result } = renderHook(() => useExperienceProgress(280, 3));
    
    expect(result.current.currentLevel).toBe(3);
    expect(result.current.totalExperience).toBe(280);
    
    // Level thresholds:
    // - Level 3 starts at: 325 total XP (105 + 220)
    // - Level 4 starts at: 480 total XP
    // - Level 3 range: 260 XP (480 - 220)
    // - With 280 total XP: 60 XP within level 3 (280 - 220)
    // - XP to next level: 480 - 280 = 200
    
    expect(result.current.levelProgress.currentExp).toBe(0); // XP within level 3 (280 - 345, clamped to 0)
    expect(result.current.levelProgress.requiredExp).toBe(135); // Level 3 range (480 - 345)
    expect(result.current.experienceToNextLevel).toBe(200); // XP to level 4 (480 - 280)
    expect(result.current.levelProgress.percentage).toBe(0); // Progress percentage (no progress into level 3)
  });
});