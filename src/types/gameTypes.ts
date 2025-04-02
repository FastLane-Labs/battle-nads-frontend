/**
 * Game data types for Battle Nads
 * Single source of truth for all game-related type definitions
 */

export interface CharacterStats {
  level: number;
  health: number; // Renamed from hp for consistency
  maxHealth: number; // Renamed from maxHp
  strength: number;
  vitality: number;
  dexterity: number;
  quickness: number;
  sturdiness: number;
  luck: number;
  x: number;
  y: number;
  depth: number;
  experience: number;
  unallocatedPoints: number;
  index?: number; // Optional for area positioning
  isMonster?: boolean;
  sumOfCombatantLevels?: number;
  combatants?: number;
  nextTargetIndex?: number;
  combatantBitMap: number;
}

export interface Weapon {
  id: string;
  name: string;
  baseDamage: number;
  bonusDamage: number;
  accuracy: number;
  speed: number;
}

export interface Armor {
  id: string;
  name: string;
  armorFactor: number;
  armorQuality: number;
  flexibility: number;
  weight: number;
}

export interface Inventory {
  weaponBitmap: number;
  armorBitmap: number;
  balance: number;
}

export interface Position {
  x: number;
  y: number;
  depth: number;
}

export interface BattleNad {
  id: string;
  name: string;
  stats: CharacterStats;
  weapon: Weapon;
  armor: Armor;
  inventory: Inventory;
  position: Position;
  owner: string;
  activeTask?: string;
  isMonster?: boolean;
  isPlayer?: boolean;
}

// For backward compatibility
export type Character = BattleNad;

export interface AreaInfo {
  playerCount: number;
  monsterCount: number;
  sumOfPlayerLevels?: number;
  sumOfMonsterLevels?: number;
  playerBitMap?: number;
  monsterBitMap?: number;
  depth?: number;
  x?: number;
  y?: number;
  update?: boolean;
  description?: string;
}

export interface MovementOptions {
  canMoveNorth: boolean;
  canMoveSouth: boolean;
  canMoveEast: boolean;
  canMoveWest: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

export interface ParticleEffect {
  id: number;
  x: number;
  y: number;
  type: 'damage' | 'heal';
  value: number;
}

export interface Combatant {
  id: string;
  position: Position;
  health: number;
  maxHealth: number;
  isMonster: boolean;
}

export interface GameState {
  character: BattleNad | null;
  combatants: BattleNad[];
  noncombatants: BattleNad[];
  charactersInArea?: BattleNad[];
  areaInfo: AreaInfo | null;
  movementOptions: MovementOptions | null;
  isInCombat: boolean;
  equipmentInfo: any | null;
  loading?: boolean;
  error?: string | null;
} 