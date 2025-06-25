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
    expect(result.current?.levelProgress.currentExp).toBe(95); // XP within current level (200 - 105)
    expect(result.current?.levelProgress.requiredExp).toBe(220);
    expect(result.current?.experienceToNextLevel).toBe(125); // 220 - 95
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
    expect(result.current?.experienceToNextLevel).toBe(25); // 220 - 195
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
    expect(result.current?.levelProgress.currentExp).toBe(75); // XP within level 3 (400 - 325)
    expect(result.current?.experienceToNextLevel).toBe(270); // 345 - 75
  });
});

describe('useExperienceProgress', () => {
  it('should calculate experience progress from raw values', () => {
    const { result } = renderHook(() => useExperienceProgress(200, 2));
    
    expect(result.current.currentLevel).toBe(2);
    expect(result.current.totalExperience).toBe(200); // Uses raw input value
    expect(result.current.levelProgress.currentExp).toBe(95); // XP within current level (200 - 105)
    expect(result.current.levelProgress.requiredExp).toBe(220);
    expect(result.current.experienceToNextLevel).toBe(125); // 220 - 95
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
    expect(result.current.experienceToNextLevel).toBe(25); // 220 - 195
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
    // Level 8 character with 947 total XP
    // Cumulative XP for levels 1-7: 105+220+345+480+625+780+945 = 3500
    // So 947 total XP means they're actually at a much lower level than 8
    // But if they're level 8 in the contract, we calculate progress within level 8
    const { result } = renderHook(() => useExperienceProgress(947, 8));
    
    expect(result.current.currentLevel).toBe(8);
    expect(result.current.totalExperience).toBe(947);
    
    // Calculate cumulative XP needed to reach level 8 (levels 1-7)
    // Level 1: 105, Level 2: 220, Level 3: 345, Level 4: 480, Level 5: 625, Level 6: 780, Level 7: 945
    // Cumulative for levels 1-7: 3500
    // Since total XP (947) < cumulative for previous levels (3500), XP within level 8 should be 0
    expect(result.current.levelProgress.currentExp).toBe(0); // Max(0, 947 - 3500) = 0
    expect(result.current.levelProgress.requiredExp).toBe(1120); // Level 8 requirement: 8*100 + 8²*5 = 1120
    expect(result.current.experienceToNextLevel).toBe(1120); // 1120 - 0
    expect(result.current.levelProgress.percentage).toBe(0); // Should show 0% progress
  });
});