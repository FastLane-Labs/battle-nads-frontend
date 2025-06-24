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
    expect(result.current?.totalExperience).toBe(200);
    expect(result.current?.levelProgress.currentExp).toBe(95); // 200 - 105 (cumulative to level 1)
    expect(result.current?.levelProgress.requiredExp).toBe(220);
    expect(result.current?.experienceToNextLevel).toBe(125); // 220 - 95
  });

  it('should recalculate when character experience changes', () => {
    const { result, rerender } = renderHook(
      ({ character }) => useCharacterExperience(character),
      { initialProps: { character: mockCharacter } }
    );

    expect(result.current?.totalExperience).toBe(200);

    const updatedCharacter = {
      ...mockCharacter,
      stats: { ...mockCharacter.stats, experience: 300 }
    };

    rerender({ character: updatedCharacter });

    expect(result.current?.totalExperience).toBe(300);
    expect(result.current?.levelProgress.currentExp).toBe(195); // 300 - 105 (into level 2)
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
    expect(result.current?.totalExperience).toBe(400);
  });
});

describe('useExperienceProgress', () => {
  it('should calculate experience progress from raw values', () => {
    const { result } = renderHook(() => useExperienceProgress(200, 2));
    
    expect(result.current.currentLevel).toBe(2);
    expect(result.current.totalExperience).toBe(200);
    expect(result.current.levelProgress.currentExp).toBe(95);
    expect(result.current.levelProgress.requiredExp).toBe(220);
    expect(result.current.experienceToNextLevel).toBe(125);
  });

  it('should recalculate when values change', () => {
    const { result, rerender } = renderHook(
      ({ exp, level }) => useExperienceProgress(exp, level),
      { initialProps: { exp: 200, level: 2 } }
    );

    expect(result.current.totalExperience).toBe(200);

    rerender({ exp: 300, level: 2 });

    expect(result.current.totalExperience).toBe(300);
    expect(result.current.levelProgress.currentExp).toBe(195); // 300 - 105 (into level 2)
  });

  it('should handle level 1 correctly', () => {
    const { result } = renderHook(() => useExperienceProgress(50, 1));
    
    expect(result.current.currentLevel).toBe(1);
    expect(result.current.levelProgress.currentExp).toBe(50);
    expect(result.current.levelProgress.requiredExp).toBe(105);
    expect(result.current.experienceToNextLevel).toBe(55);
  });
});