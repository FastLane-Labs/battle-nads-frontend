import { atom, selector } from 'recoil';
import { 
  BattleNad, 
  GameState, 
  AreaInfo, 
  Position
} from '../types/gameTypes';

// Atoms

// The main game state atom
export const gameStateAtom = atom<GameState>({
  key: 'gameState',
  default: {
    character: null,
    combatants: [],
    noncombatants: [],
    charactersInArea: [],
    areaInfo: null,
    movementOptions: null,
    isInCombat: false,
    equipmentInfo: null,
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
export const playerLocationSelector = selector<Position | null>({
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
    return state.charactersInArea || [];
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
      maxHealth: character.stats.maxHealth,
      level: character.stats.level,
      experience: character.stats.experience,
      experienceToNextLevel: (character.stats.level * 100) + (character.stats.level * character.stats.level * 5),
      weapon: character.weapon,
      armor: character.armor,
    };
  },
});

export const selectCombatants = (combatants: BattleNad[]): BattleNad[] => 
  combatants.filter((character: BattleNad | null) => character !== null);

export const selectMonsters = (combatants: BattleNad[]): BattleNad[] =>
  combatants.filter((character: BattleNad | null) => character && character.stats.isMonster);

export const selectPlayers = (combatants: BattleNad[]): BattleNad[] =>
  combatants.filter((character: BattleNad | null) => character && !character.stats.isMonster);

export const selectCombatantAtPosition = (combatants: BattleNad[], x: number, y: number): BattleNad | undefined =>
  combatants.find((character: BattleNad | null) => character && character.stats.x === x && character.stats.y === y);

export const selectCombatantById = (combatants: BattleNad[], id: string): BattleNad | undefined =>
  combatants.find((character: BattleNad | null) => character && character.id === id);

export const selectCombatantIndex = (combatants: BattleNad[], id: string): number =>
  combatants.findIndex((character: BattleNad | null) => character && character.id === id);

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
  area: AreaInfo
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
  area: AreaInfo
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