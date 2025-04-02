import { Character, CharacterStats, Equipment, GameState, AreaInfo, MovementOptions } from '../types/gameTypes';

/**
 * Converts raw character data from the blockchain into a structured Character object
 */
export function convertCharacterData(rawCharacter: any): Character {
  // Extract the character ID (usually at index 0)
  const id = rawCharacter[0] || rawCharacter.id || '';
  
  // Extract the name (usually at index 8)
  const name = rawCharacter[8] || rawCharacter.name || 'Unknown Character';
  
  // Extract position data
  const position = {
    x: Number(rawCharacter.x || (rawCharacter.stats && rawCharacter.stats.x) || 0),
    y: Number(rawCharacter.y || (rawCharacter.stats && rawCharacter.stats.y) || 0),
    depth: Number(rawCharacter.depth || (rawCharacter.stats && rawCharacter.stats.depth) || 1)
  };
  
  // Extract stats
  let stats: CharacterStats = {
    level: Number(rawCharacter.stats?.level || 1),
    hp: Number(rawCharacter.stats?.hp || rawCharacter.stats?.health || 0),
    maxHp: Number(rawCharacter.stats?.maxHp || 100),
    mp: Number(rawCharacter.stats?.mp || 0),
    maxMp: Number(rawCharacter.stats?.maxMp || 100),
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
    index: Number(rawCharacter.stats?.index || 0),
    isMonster: Boolean(rawCharacter.stats?.isMonster || false)
  };
  
  // Extract weapon equipment
  const weapon: Equipment | undefined = rawCharacter.weapon ? {
    id: rawCharacter.weapon.id || '',
    name: rawCharacter.weapon.name || 'Unknown Weapon',
    stats: rawCharacter.weapon.stats
  } : undefined;
  
  // Extract armor equipment
  const armor: Equipment | undefined = rawCharacter.armor ? {
    id: rawCharacter.armor.id || '',
    name: rawCharacter.armor.name || 'Unknown Armor',
    stats: rawCharacter.armor.stats
  } : undefined;
  
  return {
    id,
    name,
    stats,
    weapon,
    armor,
    position,
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
    description: rawAreaInfo.description || ''
  };
}

/**
 * Converts raw movement options
 */
export function createMovementOptions(position: { x: number, y: number, depth: number }): MovementOptions {
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