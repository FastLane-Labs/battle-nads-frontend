import { atom, selector } from 'recoil';
import { BattleNad, GameState, BattleArea, BattleInstance } from '../utils/types';

// Atoms

// The main game state atom
export interface GameState {
  characterId: string | null;
  character: BattleNad | null;
  charactersInArea: BattleNad[];
  loading: boolean;
  error: string | null;
}

export const gameStateAtom = atom<GameState>({
  key: 'gameState',
  default: {
    characterId: null,
    character: null,
    charactersInArea: [],
    loading: false,
    error: null
  }
});

// Selectors

// Get the player character
export const playerCharacterSelector = selector<BattleNad | null>({
  key: 'playerCharacter',
  get: ({ get }) => {
    const state = get(gameStateAtom);
    return state.character;
  }
});

// Get the current player location
export const playerLocationSelector = selector<{ depth: number; x: number; y: number } | null>({
  key: 'playerLocation',
  get: ({ get }) => {
    const character = get(playerCharacterSelector);
    if (!character) return null;
    
    return {
      depth: character.stats.depth,
      x: character.stats.x,
      y: character.stats.y,
    };
  },
});

// Get the characters in the current area
export const charactersInAreaSelector = selector<BattleNad[]>({
  key: 'charactersInArea',
  get: ({ get }) => {
    const state = get(gameStateAtom);
    return state.charactersInArea;
  }
});

// Get the monsters in the current area
export const monstersInAreaSelector = selector<BattleNad[]>({
  key: 'monstersInArea',
  get: ({ get }) => {
    const charactersInArea = get(charactersInAreaSelector);
    return charactersInArea.filter(character => character.stats.isMonster);
  },
});

// Get the players in the current area
export const playersInAreaSelector = selector<BattleNad[]>({
  key: 'playersInArea',
  get: ({ get }) => {
    const charactersInArea = get(charactersInAreaSelector);
    return charactersInArea.filter(character => !character.stats.isMonster);
  },
});

// Get the characters the player is in combat with
export const combatantsSelector = selector<BattleNad[]>({
  key: 'combatants',
  get: ({ get }) => {
    const character = get(playerCharacterSelector);
    const charactersInArea = get(charactersInAreaSelector);
    
    if (!character || character.stats.combatants === 0) {
      return [];
    }
    
    // Convert combatantBitMap to a binary string for bit checking
    const combatantBitMap = character.stats.combatantBitMap.toString(2).padStart(64, '0');
    
    return charactersInArea.filter((c, index) => {
      // Check if the bit at position 'index' is set in the bitmap
      return combatantBitMap[63 - index] === '1';
    });
  },
});

// Combat state selectors
export const combatStatsSelector = selector({
  key: 'combatStats',
  get: ({ get }) => {
    const character = get(playerCharacterSelector);
    if (!character) return null;

    return {
      health: character.stats.health,
      maxHealth: 1000 + (character.stats.vitality * 100) + (character.stats.sturdiness * 20),
      level: character.stats.level,
      experience: character.stats.experience,
      experienceToNextLevel: (character.stats.level * 100) + (character.stats.level * character.stats.level * 5),
      weapon: character.weapon,
      armor: character.armor,
    };
  },
});

export const selectCombatants = (instance: BattleInstance): BattleNad[] => 
  instance.combatants.filter((id: BattleNad | null) => id !== null);

export const selectMonsters = (instance: BattleInstance): BattleNad[] =>
  instance.combatants.filter((id: BattleNad | null) => id && id.stats.isMonster);

export const selectPlayers = (instance: BattleInstance): BattleNad[] =>
  instance.combatants.filter((id: BattleNad | null) => id && !id.stats.isMonster);

export const selectCombatantAtPosition = (instance: BattleInstance, x: number, y: number): BattleNad | undefined =>
  instance.combatants.find((id: BattleNad | null) => id && id.stats.x === x && id.stats.y === y);

export const selectCombatantById = (instance: BattleInstance, id: string): BattleNad | undefined =>
  instance.combatants.find((combatant: BattleNad | null) => combatant && combatant.id === id);

export const selectCombatantIndex = (instance: BattleInstance, id: string): number =>
  instance.combatants.findIndex((combatant: BattleNad | null) => combatant && combatant.id === id);

// Error handling
export class GameError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'GameError';
  }
}

export const validateMove = (
  character: BattleNad,
  targetX: number,
  targetY: number,
  area: BattleArea
): void => {
  if (targetX < 0 || targetX > 50 || targetY < 0 || targetY > 50) {
    throw new GameError('Move out of bounds', 'OUT_OF_BOUNDS');
  }
  if (area.monsterCount > 0) {
    throw new GameError('Cannot move while in combat', 'IN_COMBAT');
  }
};

export const validateAttack = (
  attacker: BattleNad,
  target: BattleNad,
  area: BattleArea
): void => {
  if (!target) {
    throw new GameError('No target selected', 'NO_TARGET');
  }
  if (target.stats.isMonster === attacker.stats.isMonster) {
    throw new GameError('Cannot attack same type', 'INVALID_TARGET');
  }
  if (area.monsterCount === 0) {
    throw new GameError('No monsters in area', 'NO_MONSTERS');
  }
};

// Combat calculations
export const calculateDamage = (attacker: BattleNad, defender: BattleNad): number => {
  const baseDamage = attacker.weapon.baseDamage;
  const strengthBonus = attacker.stats.strength * 2;
  const dexterityBonus = attacker.stats.dexterity;
  const armorReduction = defender.armor.armorFactor;
  
  let damage = baseDamage + strengthBonus + dexterityBonus;
  damage = Math.max(0, damage - armorReduction);
  
  return Math.floor(damage);
};

export const calculateHitChance = (attacker: BattleNad, defender: BattleNad): number => {
  const baseHitChance = 75; // 75% base hit chance
  const attackerBonus = attacker.stats.dexterity * 2;
  const defenderBonus = defender.stats.quickness;
  
  return Math.min(95, Math.max(5, baseHitChance + attackerBonus - defenderBonus));
};

// State updates
export const updateCombatState = (
  attacker: BattleNad,
  defender: BattleNad,
  damage: number
): { attacker: BattleNad; defender: BattleNad } => {
  const newDefender = { ...defender };
  newDefender.stats.health = Math.max(0, defender.stats.health - damage);
  
  return {
    attacker,
    defender: newDefender
  };
}; 