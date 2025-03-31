export interface BattleNad {
  id: string;
  stats: BattleNadStats;
  weapon: Weapon;
  armor: Armor;
  inventory: Inventory;
  activeTask: string;
  owner: string;
}

export interface BattleNadStats {
  // Character Attributes
  strength: number;
  vitality: number;
  dexterity: number;
  quickness: number;
  sturdiness: number;
  luck: number;
  // Current location / instance
  depth: number;
  x: number;
  y: number;
  index: number;
  // Current Combat Properties
  health: number;
  sumOfCombatantLevels: number;
  combatants: number;
  nextTargetIndex: number;
  combatantBitMap: number;
  // Inventory
  weaponID: number;
  armorID: number;
  // Current Character Leveling Properties
  level: number;
  experience: number;
  // Flag for monsters
  isMonster: boolean;
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
  character: BattleNad | null;
  charactersInArea: BattleNad[];
  loading: boolean;
  error: string | null;
} 