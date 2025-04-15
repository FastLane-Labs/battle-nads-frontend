import { BattleNad, CharacterStats, Weapon, Armor, GameState, AreaInfo, MovementOptions, Position, LogType, Log } from '../types/gameTypes';

/**
 * Converts raw character data from the blockchain into a structured Character object
 */
export function convertCharacterData(rawCharacter: any): BattleNad {
  // Extract the character ID (usually at index 0)
  const id = rawCharacter[0] || rawCharacter.id || '';
  
  // Debug logging to help diagnose the issue
  console.log(`[convertCharacterData] Raw character data for name extraction:`, {
    id: id,
    isObject: typeof rawCharacter === 'object',
    hasNameProp: typeof rawCharacter === 'object' && 'name' in rawCharacter,
    nameValue: typeof rawCharacter === 'object' ? rawCharacter.name : 'not an object',
    index8Value: Array.isArray(rawCharacter) ? rawCharacter[8] : 'not an array',
    keys: typeof rawCharacter === 'object' ? Object.keys(rawCharacter) : 'not an object'
  });
  
  // Enhanced name extraction with fallbacks
  let name;
  if (typeof rawCharacter === 'object') {
    // Try various paths to find the name
    name = rawCharacter.name || // Direct property
           (rawCharacter[8] && typeof rawCharacter[8] === 'string' ? rawCharacter[8] : null) || // Array index
           (rawCharacter.characterName) || // Alternative property name
           (rawCharacter.stats && rawCharacter.stats.name) || // Maybe in stats?
           'Unknown Character'; // Default
    
    // Log found name
    console.log(`[convertCharacterData] Extracted name: "${name}" from character with ID: ${id}`);
  } else {
    name = 'Unknown Character';
    console.log(`[convertCharacterData] Couldn't extract name: rawCharacter is not an object`);
  }
  
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
    nextTargetIndex: Number(rawCharacter.stats?.nextTargetIndex || 0),
    weaponID: Number(rawCharacter.stats?.weaponID || 0),
    armorID: Number(rawCharacter.stats?.armorID || 0)
  };
  
  // Apply cap to health using calculateMaxHealth
  stats.health = Math.min(stats.health, calculateMaxHealth(stats));
  
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
  
  // Extract tracker if available
  const tracker = rawCharacter.tracker ? {
    updateStats: Boolean(rawCharacter.tracker.updateStats || false),
    updateInventory: Boolean(rawCharacter.tracker.updateInventory || false),
    updateActiveTask: Boolean(rawCharacter.tracker.updateActiveTask || false),
    updateOwner: Boolean(rawCharacter.tracker.updateOwner || false),
    died: Boolean(rawCharacter.tracker.died || false)
  } : undefined;
  
  // Extract log if available
  const log = rawCharacter.log ? {
    logType: Number(rawCharacter.log.logType || 0) as LogType,
    index: Number(rawCharacter.log.index || 0),
    mainPlayerIndex: Number(rawCharacter.log.mainPlayerIndex || 0),
    otherPlayerIndex: Number(rawCharacter.log.otherPlayerIndex || 0),
    hit: Boolean(rawCharacter.log.hit || false),
    critical: Boolean(rawCharacter.log.critical || false),
    damageDone: Number(rawCharacter.log.damageDone || 0),
    healthHealed: Number(rawCharacter.log.healthHealed || 0),
    targetDied: Boolean(rawCharacter.log.targetDied || false),
    lootedWeaponID: Number(rawCharacter.log.lootedWeaponID || 0),
    lootedArmorID: Number(rawCharacter.log.lootedArmorID || 0),
    experience: Number(rawCharacter.log.experience || 0),
    value: Number(rawCharacter.log.value || 0)
  } as Log : undefined;
  
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
    isPlayer: !stats.isMonster,
    tracker,
    log
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
    playerBitMap: typeof rawAreaInfo.playerBitMap !== 'undefined' ? Number(rawAreaInfo.playerBitMap) : undefined,
    monsterBitMap: typeof rawAreaInfo.monsterBitMap !== 'undefined' ? Number(rawAreaInfo.monsterBitMap) : undefined,
    depth: typeof rawAreaInfo.depth !== 'undefined' ? Number(rawAreaInfo.depth) : undefined,
    x: typeof rawAreaInfo.x !== 'undefined' ? Number(rawAreaInfo.x) : undefined,
    y: typeof rawAreaInfo.y !== 'undefined' ? Number(rawAreaInfo.y) : undefined,
    update: typeof rawAreaInfo.update !== 'undefined' ? Boolean(rawAreaInfo.update) : undefined,
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
  
  // Check if it's the new format from getFullFrontendData with balance fields
  if (frontendDataRaw && 
      (frontendDataRaw.characterID !== undefined || 
       frontendDataRaw.sessionKeyBalance !== undefined || 
       frontendDataRaw.bondedShMonadBalance !== undefined)) {
    // This is already the new format from getFullFrontendData, return as is
    return frontendDataRaw;
  }
  
  // If data is array-like, convert to structured object for old getFrontendData response
  if (Array.isArray(frontendDataRaw) || (typeof frontendDataRaw === 'object' && frontendDataRaw[0] !== undefined)) {
    // Typically for array-like blockchain return values from getFrontendData:
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

// Constants from the smart contract
const HEALTH_BASE = 1000;
const MONSTER_HEALTH_BASE = 300;
const VITALITY_HEALTH_MODIFIER = 100;
const STURDINESS_HEALTH_MODIFIER = 20;
const MONSTER_VITALITY_HEALTH_MODIFIER = 40;
const MONSTER_STURDINESS_HEALTH_MODIFIER = 40;

/**
 * Calculate the max health for a character based on their stats
 * Implementation based on Character.sol _maxHealth function
 */
export const calculateMaxHealth = (stats: any): number => {
  if (!stats) return 0;
  
  // Convert any potential BigInt values to numbers
  const vitality = typeof stats.vitality === 'bigint' ? Number(stats.vitality) : Number(stats.vitality || 0);
  const sturdiness = typeof stats.sturdiness === 'bigint' ? Number(stats.sturdiness) : Number(stats.sturdiness || 0);
  const isMonster = Boolean(stats.isMonster);
  
  // Base health depends on whether it's a monster or player
  const baseHealth = isMonster ? MONSTER_HEALTH_BASE : HEALTH_BASE;
  
  // Calculate max health according to the formula in Character.sol
  let maxHealth = baseHealth + (vitality * VITALITY_HEALTH_MODIFIER) + (sturdiness * STURDINESS_HEALTH_MODIFIER);
  
  // Monsters have 2/3 of the calculated health
  if (isMonster) {
    maxHealth = Math.floor(maxHealth * 2 / 3);
  }
  
  // Cap at uint16 max value (65535)
  if (maxHealth > 65535 - 1) maxHealth = 65535 - 1;
  
  return maxHealth;
}; 