/**
 * Game data types for Battle Nads
 */

export interface CharacterStats {
  level: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  strength: number;
  vitality: number;
  dexterity: number;
  quickness: number;
  sturdiness: number;
  luck: number;
  x: number;
  y: number;
  depth: number;
  experience?: number;
  index?: number;
  isMonster?: boolean;
}

export interface Equipment {
  id: string;
  name: string;
  stats?: any;
}

export interface Character {
  id: string;
  name: string;
  stats: CharacterStats;
  weapon?: Equipment;
  armor?: Equipment;
  position: {
    x: number;
    y: number;
    depth: number;
  };
  isPlayer?: boolean;
}

export interface AreaInfo {
  playerCount: number;
  monsterCount: number;
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

export interface GameState {
  character: Character | null;
  combatants: Character[];
  noncombatants: Character[];
  areaInfo: AreaInfo | null;
  movementOptions: MovementOptions | null;
  isInCombat: boolean;
  equipmentInfo: any | null;
} 