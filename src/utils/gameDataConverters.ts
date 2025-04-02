import { BattleNad, CharacterStats, Weapon, Armor, GameState, AreaInfo, MovementOptions, Position } from '../types/gameTypes';

/**
 * Converts raw character data from the blockchain into a structured Character object
 */
export function convertCharacterData(rawCharacter: any): BattleNad {
  // Extract the character ID (usually at index 0)
  const id = rawCharacter[0] || rawCharacter.id || '';
  
  // Extract the name (usually at index 8)
  const name = rawCharacter[8] || rawCharacter.name || 'Unknown Character';
  
  // Extract position data
  const position: Position = {
    x: Number(rawCharacter.x || (rawCharacter.stats && rawCharacter.stats.x) || 0),
    y: Number(rawCharacter.y || (rawCharacter.stats && rawCharacter.stats.y) || 0),
    depth: Number(rawCharacter.depth || (rawCharacter.stats && rawCharacter.stats.depth) || 1)
  };
  
  // Extract stats
  let stats: CharacterStats = {
    level: Number(rawCharacter.stats?.level || 1),
    health: Number(rawCharacter.stats?.health || rawCharacter.stats?.hp || 0),
    maxHealth: 100 + (Number(rawCharacter.stats?.vitality || 0) * 100) + (Number(rawCharacter.stats?.level || 1) * 50),
    strength: Number(rawCharacter.stats?.strength || 0),
    vitality: Number(rawCharacter.stats?.vitality || 0),
    dexterity: Number(rawCharacter.stats?.dexterity || 0),
    quickness: Number(rawCharacter.stats?.quickness || 0),
    sturdiness: Number(rawCharacter.stats?.sturdiness || 0),
    luck: Number(rawCharacter.stats?.luck || 0),
    x: position.x,
    y: position.y,
    depth: position.depth,
    experience: Number(rawCharacter.stats?.experience || 0),
    unallocatedPoints: Number(rawCharacter.stats?.unallocatedPoints || 0),
    index: Number(rawCharacter.stats?.index || 0),
    isMonster: Boolean(rawCharacter.stats?.isMonster || false),
    combatantBitMap: Number(rawCharacter.stats?.combatantBitMap || 0),
    sumOfCombatantLevels: Number(rawCharacter.stats?.sumOfCombatantLevels || 0),
    combatants: Number(rawCharacter.stats?.combatants || 0),
    nextTargetIndex: Number(rawCharacter.stats?.nextTargetIndex || 0)
  };
  
  // Apply cap to health
  stats.health = Math.min(stats.health, stats.maxHealth);
  
  // Extract weapon equipment
  const weapon: Weapon = rawCharacter.weapon ? {
    id: rawCharacter.weapon.id || '',
    name: rawCharacter.weapon.name || 'Unknown Weapon',
    baseDamage: Number(rawCharacter.weapon.baseDamage || 0),
    bonusDamage: Number(rawCharacter.weapon.bonusDamage || 0),
    accuracy: Number(rawCharacter.weapon.accuracy || 0),
    speed: Number(rawCharacter.weapon.speed || 0)
  } : {
    id: '0',
    name: 'Fists',
    baseDamage: 1,
    bonusDamage: 0,
    accuracy: 90,
    speed: 100
  };
  
  // Extract armor equipment
  const armor: Armor = rawCharacter.armor ? {
    id: rawCharacter.armor.id || '',
    name: rawCharacter.armor.name || 'Unknown Armor',
    armorFactor: Number(rawCharacter.armor.armorFactor || 0),
    armorQuality: Number(rawCharacter.armor.armorQuality || 0),
    flexibility: Number(rawCharacter.armor.flexibility || 0),
    weight: Number(rawCharacter.armor.weight || 0)
  } : {
    id: '0',
    name: 'Clothes',
    armorFactor: 1,
    armorQuality: 0,
    flexibility: 100,
    weight: 1
  };

  // Extract inventory
  const inventory = {
    weaponBitmap: Number(rawCharacter.inventory?.weaponBitmap || 0),
    armorBitmap: Number(rawCharacter.inventory?.armorBitmap || 0),
    balance: Number(rawCharacter.inventory?.balance || 0)
  };
  
  return {
    id,
    name,
    stats,
    weapon,
    armor,
    inventory,
    position,
    owner: rawCharacter.owner || '',
    activeTask: rawCharacter.activeTask || '',
    isMonster: Boolean(stats.isMonster),
    isPlayer: !stats.isMonster
  };
}

/**
 * Converts raw area info data from the blockchain
 */
export function convertAreaInfo(rawAreaInfo: any): AreaInfo | null {
  if (!rawAreaInfo) return null;
  
  return {
    playerCount: Number(rawAreaInfo.playerCount || 0),
    monsterCount: Number(rawAreaInfo.monsterCount || 0),
    sumOfPlayerLevels: Number(rawAreaInfo.sumOfPlayerLevels || 0),
    sumOfMonsterLevels: Number(rawAreaInfo.sumOfMonsterLevels || 0),
    playerBitMap: Number(rawAreaInfo.playerBitMap || 0),
    monsterBitMap: Number(rawAreaInfo.monsterBitMap || 0),
    depth: Number(rawAreaInfo.depth || 0),
    x: Number(rawAreaInfo.x || 0),
    y: Number(rawAreaInfo.y || 0),
    update: Boolean(rawAreaInfo.update || false),
    description: rawAreaInfo.description || ''
  };
}

/**
 * Converts raw movement options
 */
export function createMovementOptions(position: Position): MovementOptions {
  // Default movement options based on position
  // These can be refined based on actual game rules
  return {
    canMoveNorth: position.y < 100,
    canMoveSouth: position.y > 1,
    canMoveEast: position.x < 100,
    canMoveWest: position.x > 1,
    canMoveUp: position.depth < 10,
    canMoveDown: position.depth > 1
  };
}

/**
 * Create a game state object from raw frontend data
 */
export function createGameState(frontendData: any): GameState {
  // Convert main character data
  const character = frontendData.character 
    ? convertCharacterData(frontendData.character) 
    : null;
  
  // Convert combatants and noncombatants
  const combatants = Array.isArray(frontendData.combatants) 
    ? frontendData.combatants.map(convertCharacterData)
    : [];
    
  const noncombatants = Array.isArray(frontendData.noncombatants)
    ? frontendData.noncombatants.map(convertCharacterData)
    : [];
  
  // Extract area info
  let areaInfo = null;
  if (frontendData.miniMap && frontendData.miniMap[2] && frontendData.miniMap[2][2]) {
    areaInfo = convertAreaInfo(frontendData.miniMap[2][2]);
  }
  
  // Calculate if in combat
  const isInCombat = combatants.length > 0;
  
  // Create movement options based on character position
  const movementOptions = character 
    ? createMovementOptions(character.position)
    : null;
  
  return {
    character,
    combatants,
    noncombatants,
    areaInfo,
    movementOptions,
    isInCombat,
    equipmentInfo: frontendData.equipment || null
  };
}

/**
 * Function to safely parse array-like blockchain data
 * Some blockchain data comes as array-like objects or tuples
 */
export function parseFrontendData(frontendDataRaw: any): any {
  // If the data is already in object form with a character property, return it as is
  if (frontendDataRaw && frontendDataRaw.character) {
    return frontendDataRaw;
  }
  
  // If data is array-like, convert to structured object
  if (Array.isArray(frontendDataRaw) || (typeof frontendDataRaw === 'object' && frontendDataRaw[0] !== undefined)) {
    // Typically for array-like blockchain return values:
    // Index 0 is character data
    // Index 1 is combatants
    // Index 2 is noncombatants
    // Index 3 is miniMap
    // Indices 4-8 may contain equipment data
    return {
      character: frontendDataRaw[0],
      combatants: Array.isArray(frontendDataRaw[1]) ? frontendDataRaw[1] : [],
      noncombatants: Array.isArray(frontendDataRaw[2]) ? frontendDataRaw[2] : [],
      miniMap: frontendDataRaw[3],
      equipment: {
        weapons: {
          ids: frontendDataRaw[4] || [],
          names: frontendDataRaw[5] || [],
          currentId: frontendDataRaw[6]
        },
        armor: {
          ids: frontendDataRaw[6] || [],
          names: frontendDataRaw[7] || [],
          currentId: frontendDataRaw[8]
        }
      },
      unallocatedAttributePoints: frontendDataRaw[8]
    };
  }
  
  // Return the original data if we can't parse it
  return frontendDataRaw;
} 