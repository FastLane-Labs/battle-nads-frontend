import { BattleNad, GameState, BattleArea, BattleInstance, Character, Position } from '../types';
import { BattleNadStats, Weapon, Armor, Inventory } from './types';

// Mock character data
export const mockCharacter: Character = {
  id: '1',
  stats: {
    strength: 5,
    vitality: 5,
    dexterity: 5,
    quickness: 5,
    sturdiness: 5,
    luck: 5,
    depth: 0,
    x: 5,
    y: 5,
    index: 0,
    health: 100,
    sumOfCombatantLevels: 0,
    combatants: 0,
    nextTargetIndex: 0,
    combatantBitMap: 0,
    weaponID: 1,
    armorID: 1,
    level: 1,
    experience: 0,
    isMonster: false
  },
  weapon: {
    name: 'Basic Sword',
    baseDamage: 10,
    bonusDamage: 0,
    accuracy: 80,
    speed: 5
  },
  armor: {
    name: 'Basic Armor',
    armorFactor: 5,
    armorQuality: 50,
    flexibility: 5,
    weight: 5
  },
  inventory: {
    weaponBitmap: 1,
    armorBitmap: 1,
    balance: 0
  },
  activeTask: '0x0000',
  owner: '0xPlayerAddress'
};

// Mock monsters in area
export const mockMonster: BattleNad = {
  id: '0x5678',
  stats: {
    strength: 4,
    vitality: 4,
    dexterity: 4,
    quickness: 4,
    sturdiness: 4,
    luck: 4,
    depth: 0,
    x: 6,
    y: 5,
    index: 1,
    health: 300,
    sumOfCombatantLevels: 0,
    combatants: 0,
    nextTargetIndex: 0,
    combatantBitMap: 0,
    weaponID: 0,
    armorID: 0,
    level: 1,
    experience: 0,
    isMonster: true
  },
  weapon: {
    name: 'Claws',
    baseDamage: 5,
    bonusDamage: 0,
    accuracy: 70,
    speed: 1
  },
  armor: {
    name: 'Hide',
    armorFactor: 3,
    armorQuality: 1,
    flexibility: 1,
    weight: 1
  },
  inventory: {
    weaponBitmap: 0,
    armorBitmap: 0,
    balance: 0
  },
  activeTask: '0x0000',
  owner: '0x0000'
};

// Mock players in area
export const mockPlayersInArea: BattleNad[] = [
  {
    id: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    stats: {
      strength: 7,
      vitality: 6,
      dexterity: 9,
      quickness: 8,
      sturdiness: 4,
      luck: 7,
      depth: 1,
      x: 10,
      y: 10,
      index: 5,
      health: 1500,
      sumOfCombatantLevels: 0,
      combatants: 0,
      nextTargetIndex: 0,
      combatantBitMap: 0,
      weaponID: 3,
      armorID: 1,
      level: 5,
      experience: 780,
      isMonster: false
    },
    weapon: {
      name: "Steel Dagger",
      baseDamage: 8,
      bonusDamage: 4,
      accuracy: 85,
      speed: 12
    },
    armor: {
      name: "Chain Mail",
      armorFactor: 10,
      armorQuality: 70,
      flexibility: 5,
      weight: 8
    },
    inventory: {
      weaponBitmap: 10,
      armorBitmap: 3,
      balance: 2000000000000000000
    },
    activeTask: "0x0000000000000000000000000000000000000000",
    owner: "0xOtherPlayerAddress"
  }
];

// Combine all characters in area
export const mockCharactersInArea: BattleNad[] = [
  ...mockPlayersInArea,
  mockMonster
];

// Initial game state with the mock data
export const initialGameState: GameState = {
  characterId: mockCharacter.id,
  character: mockCharacter,
  charactersInArea: mockCharactersInArea,
  loading: false,
  error: null
};

// Mock combat - character that player is fighting
export const mockCombatCharacter: BattleNad = {
  ...mockCharacter,
  stats: {
    ...mockCharacter.stats,
    combatants: 1,
    combatantBitMap: 1024
  }
};

// Methods to simulate contract interactions
export const mockContractMethods = {
  // Movement
  moveNorth: async () => {
    return Promise.resolve({
      ...mockCharacter,
      stats: { ...mockCharacter.stats, y: mockCharacter.stats.y + 1 }
    });
  },
  moveSouth: async () => {
    return Promise.resolve({
      ...mockCharacter,
      stats: { ...mockCharacter.stats, y: mockCharacter.stats.y - 1 }
    });
  },
  moveEast: async () => {
    return Promise.resolve({
      ...mockCharacter,
      stats: { ...mockCharacter.stats, x: mockCharacter.stats.x + 1 }
    });
  },
  moveWest: async () => {
    return Promise.resolve({
      ...mockCharacter,
      stats: { ...mockCharacter.stats, x: mockCharacter.stats.x - 1 }
    });
  },
  
  // Combat
  attack: async () => {
    // Simulate damage to the monster
    const damagedMonster = {
      ...mockMonster,
      stats: {
        ...mockMonster.stats,
        health: mockMonster.stats.health - 200
      }
    };
    
    // Update the character's combat state
    const updatedCharacter = {
      ...mockCombatCharacter
    };
    
    return Promise.resolve({
      character: updatedCharacter,
      target: damagedMonster
    });
  },
  
  // Equipment
  equipWeapon: async (weaponId: number) => {
    return Promise.resolve({
      ...mockCharacter,
      stats: { ...mockCharacter.stats, weaponID: weaponId },
      weapon: {
        name: `Weapon ${weaponId}`,
        baseDamage: 10 + weaponId * 2,
        bonusDamage: 3 + weaponId,
        accuracy: 70 + weaponId * 2,
        speed: 8 + weaponId
      }
    });
  },
  
  equipArmor: async (armorId: number) => {
    return Promise.resolve({
      ...mockCharacter,
      stats: { ...mockCharacter.stats, armorID: armorId },
      armor: {
        name: `Armor ${armorId}`,
        armorFactor: 8 + armorId,
        armorQuality: 70 + armorId * 2,
        flexibility: 10 - armorId,
        weight: 5 + armorId
      }
    });
  },
  
  // Attributes
  allocatePoints: async (
    strength: number,
    vitality: number,
    dexterity: number,
    quickness: number,
    sturdiness: number,
    luck: number
  ) => {
    return Promise.resolve({
      ...mockCharacter,
      stats: {
        ...mockCharacter.stats,
        strength,
        vitality,
        dexterity,
        quickness,
        sturdiness,
        luck
      }
    });
  }
};

export const mockArea: BattleArea = {
  playerCount: 1,
  sumOfPlayerLevels: 1,
  playerBitMap: 1,
  monsterCount: 1,
  sumOfMonsterLevels: 1,
  monsterBitMap: 2,
  depth: 0,
  x: 5,
  y: 5,
  update: false
};

export const mockInstance: BattleInstance = {
  area: mockArea,
  combatants: [mockCharacter, mockMonster]
};

interface MoveResult {
  position: Position;
}

interface AttackResult {
  target: Position;
  damage: number;
}

export const moveCharacter = async (direction: 'up' | 'down' | 'left' | 'right'): Promise<MoveResult> => {
  const newPosition = { x: mockCharacter.stats.x, y: mockCharacter.stats.y };
  
  switch (direction) {
    case 'up':
      newPosition.y = Math.max(0, newPosition.y - 1);
      break;
    case 'down':
      newPosition.y = Math.min(10, newPosition.y + 1);
      break;
    case 'left':
      newPosition.x = Math.max(0, newPosition.x - 1);
      break;
    case 'right':
      newPosition.x = Math.min(10, newPosition.x + 1);
      break;
  }

  return { position: newPosition };
};

export const attackCharacter = async (): Promise<AttackResult> => {
  // Find the closest enemy
  const target = mockMonster;
  const damage = Math.floor(Math.random() * 20) + 10; // Random damage between 10-30

  return {
    target: { x: target.stats.x, y: target.stats.y },
    damage,
  };
}; 