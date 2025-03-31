export interface Position {
  x: number;
  y: number;
}

export interface BattleNadStats {
  strength: number;
  vitality: number;
  dexterity: number;
  quickness: number;
  sturdiness: number;
  luck: number;
  depth: number;
  x: number;
  y: number;
  index: number;
  health: number;
  sumOfCombatantLevels?: number;
  combatants?: number;
  nextTargetIndex?: number;
  combatantBitMap: number;
  weaponID?: number;
  armorID?: number;
  level: number;
  experience: number;
  unallocatedPoints: number;
  isMonster?: boolean;
}

export interface Weapon {
  name: string;
  baseDamage: number;
  bonusDamage: number;
  accuracy: number;
  speed: number;
}

export interface Armor {
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

export interface BattleNad {
  id: string;
  stats: BattleNadStats;
  weapon: Weapon;
  armor: Armor;
  inventory: Inventory;
  activeTask: string;
  owner: string;
}

export interface Character extends BattleNad {}

export interface Combatant {
  id: string;
  position: Position;
  health: number;
  maxHealth: number;
  isMonster: boolean;
}

export interface ParticleEffect {
  id: number;
  x: number;
  y: number;
  type: 'damage' | 'heal';
  value: number;
}

export interface BattleArea {
  playerCount: number;
  sumOfPlayerLevels: number;
  playerBitMap: number;
  monsterCount: number;
  sumOfMonsterLevels: number;
  monsterBitMap: number;
  depth: number;
  x: number;
  y: number;
  update: boolean;
}

export interface BattleInstance {
  area: BattleArea;
  combatants: BattleNad[];
}

export interface GameState {
  characterId: string | null;
  character: Character | null;
  charactersInArea: BattleNad[];
  loading: boolean;
  error: string | null;
} 