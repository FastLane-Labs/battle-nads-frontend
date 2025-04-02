import { atom, selector } from 'recoil';
import { 
  BattleNad, 
  GameState, 
  AreaInfo, 
  Position
} from '../types/gameTypes';

// Main GameState atom - single source of truth for all blockchain state
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
    
    return character.position;
  },
});

// Get all characters in the current area
export const charactersInAreaSelector = selector<BattleNad[]>({
  key: 'charactersInArea',
  get: ({ get }) => {
    const state = get(gameStateAtom);
    return state.charactersInArea || [];
  }
});

// Get all monsters in the current area
export const monstersInAreaSelector = selector<BattleNad[]>({
  key: 'monstersInArea',
  get: ({ get }) => {
    const charactersInArea = get(charactersInAreaSelector);
    return charactersInArea.filter(character => character.stats.isMonster);
  },
});

// Get all players in the current area
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
    const state = get(gameStateAtom);
    return state.combatants;
  },
});

// Get non-combatants in the area
export const noncombatantsSelector = selector<BattleNad[]>({
  key: 'noncombatants',
  get: ({ get }) => {
    const state = get(gameStateAtom);
    return state.noncombatants;
  },
});

// Get area information
export const areaInfoSelector = selector<AreaInfo | null>({
  key: 'areaInfo',
  get: ({ get }) => {
    const state = get(gameStateAtom);
    return state.areaInfo;
  },
});

// Get movement options
export const movementOptionsSelector = selector({
  key: 'movementOptions',
  get: ({ get }) => {
    const state = get(gameStateAtom);
    return state.movementOptions;
  },
});

// Get combat status
export const isInCombatSelector = selector<boolean>({
  key: 'isInCombat',
  get: ({ get }) => {
    const state = get(gameStateAtom);
    return state.isInCombat;
  },
});

// Get equipment information
export const equipmentInfoSelector = selector({
  key: 'equipmentInfo',
  get: ({ get }) => {
    const state = get(gameStateAtom);
    return state.equipmentInfo;
  },
});

// Get loading state
export const loadingSelector = selector<boolean>({
  key: 'loading',
  get: ({ get }) => {
    const state = get(gameStateAtom);
    return state.loading || false;
  },
});

// Get error state
export const errorSelector = selector<string | null>({
  key: 'error',
  get: ({ get }) => {
    const state = get(gameStateAtom);
    return state.error || null;
  },
});

// Combat stats selector
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

// Helper functions (no changes needed, as they operate on state but don't manage it)
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