export interface BattleNadStats {
  // Core Attributes
  strength: number;
  vitality: number;
  dexterity: number;
  quickness: number;
  sturdiness: number;
  luck: number;

  // Location
  depth: number;
  x: number;
  y: number;
  index: number;

  // Combat Properties
  health: number;
  sumOfCombatantLevels: number;
  combatants: number;
  nextTargetIndex: number;
  combatantBitMap: number;

  // Equipment
  weaponID: number;
  armorID: number;

  // Leveling
  level: number;
  experience: number;

  // Type
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

export interface BattleNad {
  id: string;
  stats: BattleNadStats;
  weapon: Weapon;
  armor: Armor;
  inventory: Inventory;
  activeTask: string;
  owner: string;
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
  currentCharacter: BattleNad | null;
  currentArea: BattleArea | null;
  currentInstance: BattleInstance | null;
  isInCombat: boolean;
  combatants: BattleNad[];
} 