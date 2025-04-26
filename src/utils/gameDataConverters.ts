import { BattleNad, BattleNadLite, GameState, CharacterClass, Position, CharacterStats, Weapon, Armor, StatusEffect } from '../types/gameTypes';

/**
 * Calculates the maximum health of a character based on game mechanics.
 * This should match the formula used in the smart contract.
 */
export const calculateMaxHealth = (stats: any): number => {
  if (!stats) return 100; // Default max health
  
  // Base health is 100
  const baseHealth = 100;
  
  // Vitality provides 5 health per point
  const vitalityBonus = Number(stats.vitality || 0) * 5;
  
  // Sturdiness provides 2 health per point
  const sturdinessBonus = Number(stats.sturdiness || 0) * 2;
  
  // Calculate max health based on these factors
  return baseHealth + vitalityBonus + sturdinessBonus;
};

/**
 * Extracts position data from a character object
 */
export const extractPositionFromCharacter = (character: BattleNad | null): Position => {
  if (!character) return { x: 0, y: 0, depth: 1 };
  
  return {
    x: Number(character.position?.x || 0),
    y: Number(character.position?.y || 0),
    depth: Number(character.position?.depth || 1)
  };
};

/**
 * Converts raw character data from the contract to the frontend BattleNad format
 */
export const convertCharacterData = (data: any): BattleNad => {
  // Default empty character if no data
  if (!data) {
    return {
      id: '',
      index: 0,
      name: 'Unknown',
      class: CharacterClass.Bard,
      level: 1,
      health: 100,
      maxHealth: 100,
      buffs: [],
      debuffs: [],
      stats: {
        unspentAttributePoints: 0,
        buffs: 0,
        debuffs: 0,
        experience: 0,
        strength: 0,
        vitality: 0,
        dexterity: 0,
        quickness: 0,
        sturdiness: 0,
        luck: 0
      },
      weapon: {
        id: '0',
        name: 'None',
        baseDamage: 0,
        bonusDamage: 0,
        accuracy: 0,
        speed: 0
      },
      armor: {
        id: '0',
        name: 'None',
        armorFactor: 0,
        armorQuality: 0,
        flexibility: 0,
        weight: 0
      },
      availableWeapons: [],
      availableArmors: [],
      inventory: {
        weaponBitmap: 0,
        armorBitmap: 0,
        balance: 0
      },
      position: { x: 0, y: 0, depth: 1 },
      owner: '',
      activeTask: '',
      ability: {
        ability: 0,
        stage: 0,
        targetIndex: 0,
        taskAddress: '',
        targetBlock: 0
      },
      unspentAttributePoints: 0,
      isInCombat: false,
      isDead: false
    };
  }
  
  // Convert the raw data to our BattleNad format
  return {
    id: data.id?.toString() || '',
    index: Number(data.index || 0),
    name: data.name || 'Unnamed Character',
    class: Number(data.class || data.stats?.class || CharacterClass.Bard),
    level: Number(data.level || data.stats?.level || 1),
    health: Number(data.health || data.stats?.health || 100),
    maxHealth: Number(data.maxHealth || calculateMaxHealth(data.stats) || 100),
    buffs: (data.buffs ? parseStatusEffects(data.buffs) : []),
    debuffs: (data.debuffs ? parseStatusEffects(data.debuffs) : []),
    stats: {
      unspentAttributePoints: Number(data.stats?.unspentAttributePoints || 0),
      buffs: Number(data.stats?.buffs || 0),
      debuffs: Number(data.stats?.debuffs || 0),
      experience: Number(data.stats?.experience || 0),
      strength: Number(data.stats?.strength || 0),
      vitality: Number(data.stats?.vitality || 0),
      dexterity: Number(data.stats?.dexterity || 0),
      quickness: Number(data.stats?.quickness || 0),
      sturdiness: Number(data.stats?.sturdiness || 0),
      luck: Number(data.stats?.luck || 0)
    },
    weapon: data.weapon ? {
      id: String(data.weapon.id || '0'),
      name: data.weapon.name || 'Unknown Weapon',
      baseDamage: Number(data.weapon.baseDamage || data.weapon.damage || 0),
      bonusDamage: Number(data.weapon.bonusDamage || 0),
      accuracy: Number(data.weapon.accuracy || 0),
      speed: Number(data.weapon.speed || 0)
    } : {
      id: '0',
      name: 'None',
      baseDamage: 0,
      bonusDamage: 0,
      accuracy: 0,
      speed: 0
    },
    armor: data.armor ? {
      id: String(data.armor.id || '0'),
      name: data.armor.name || 'Unknown Armor',
      armorFactor: Number(data.armor.armorFactor || data.armor.defense || 0),
      armorQuality: Number(data.armor.armorQuality || 0),
      flexibility: Number(data.armor.flexibility || 0),
      weight: Number(data.armor.weight || 0)
    } : {
      id: '0',
      name: 'None',
      armorFactor: 0,
      armorQuality: 0,
      flexibility: 0,
      weight: 0
    },
    availableWeapons: Array.isArray(data.availableWeapons) ? data.availableWeapons : [],
    availableArmors: Array.isArray(data.availableArmors) ? data.availableArmors : [],
    inventory: {
      weaponBitmap: Number(data.inventory?.weaponBitmap || 0),
      armorBitmap: Number(data.inventory?.armorBitmap || 0),
      balance: Number(data.inventory?.balance || 0)
    },
    position: {
      x: Number(data.position?.x || data.stats?.x || 0),
      y: Number(data.position?.y || data.stats?.y || 0),
      depth: Number(data.position?.depth || data.stats?.depth || 1)
    },
    owner: String(data.owner || ''),
    activeTask: String(data.activeTask || ''),
    ability: data.ability || {
      ability: 0,
      stage: 0,
      targetIndex: 0,
      taskAddress: '',
      targetBlock: 0
    },
    unspentAttributePoints: Number(data.unspentAttributePoints || data.stats?.unspentAttributePoints || 0),
    isInCombat: Boolean(data.isInCombat || false),
    isDead: Boolean(data.isDead || data.tracker?.died || false)
  };
};

/**
 * Helper to parse status effects bitmap into an array of StatusEffect
 */
const parseStatusEffects = (bitmap: number): StatusEffect[] => {
  const effects: StatusEffect[] = [];
  
  // Check each bit position
  for (let i = 0; i < 8; i++) {
    const mask = 1 << i;
    if ((bitmap & mask) !== 0) {
      effects.push(i + 1 as StatusEffect); // +1 because StatusEffect.None = 0
    }
  }
  
  return effects;
};

/**
 * Creates a game state object from frontend data
 */
export const createGameState = (data: any): GameState => {
  return {
    owner: data.owner || null,
    character: data.player ? convertCharacterData(data.player) : null,
    others: Array.isArray(data.combatants) 
      ? data.combatants.map((c: any) => convertToBattleNadLite(c))
      : [],
    position: data.position || {
      x: 0,
      y: 0,
      depth: 1
    },
    movementOptions: data.movementOptions || {
      canMoveNorth: false,
      canMoveSouth: false,
      canMoveEast: false,
      canMoveWest: false,
      canMoveUp: false,
      canMoveDown: false
    },
    eventLogs: data.eventLogs || [],
    chatLogs: data.chatLogs || [],
    updates: data.updates || {
      owner: false,
      character: false,
      sessionKey: false,
      others: [],
      position: false,
      combat: false,
      movementOptions: false,
      eventLogs: false,
      chatLogs: false,
      lastBlock: false,
      error: false
    },
    sessionKey: data.sessionKey || {
      owner: '',
      key: '',
      balance: BigInt(0),
      targetBalance: BigInt(0),
      ownerCommittedAmount: BigInt(0),
      ownerCommittedShares: BigInt(0),
      expiration: 0
    },
    lastBlock: data.lastBlock || 0
  };
};

/**
 * Convert character data to BattleNadLite format
 */
const convertToBattleNadLite = (data: any): BattleNadLite => {
  if (!data) {
    return {
      id: '',
      index: 0,
      name: 'Unknown',
      class: CharacterClass.Bard,
      level: 1,
      health: 100,
      maxHealth: 100,
      buffs: [],
      debuffs: [],
      ability: {
        ability: 0,
        stage: 0,
        targetIndex: 0,
        taskAddress: '',
        targetBlock: 0
      },
      weaponName: 'None',
      armorName: 'None',
      isMonster: false,
      isHostile: false,
      isDead: false
    };
  }
  
  return {
    id: data.id?.toString() || '',
    index: Number(data.index || 0),
    name: data.name || 'Unnamed Character',
    class: Number(data.class || data.stats?.class || CharacterClass.Bard),
    level: Number(data.level || data.stats?.level || 1),
    health: Number(data.health || data.stats?.health || 100),
    maxHealth: Number(data.maxHealth || calculateMaxHealth(data.stats) || 100),
    buffs: (data.buffs ? parseStatusEffects(data.buffs) : []),
    debuffs: (data.debuffs ? parseStatusEffects(data.debuffs) : []),
    ability: data.ability || {
      ability: 0,
      stage: 0,
      targetIndex: 0,
      taskAddress: '',
      targetBlock: 0
    },
    weaponName: data.weaponName || 'None',
    armorName: data.armorName || 'None',
    isMonster: Boolean(data.isMonster || (data.class && data.class < CharacterClass.Warrior)),
    isHostile: Boolean(data.isHostile || false),
    isDead: Boolean(data.isDead || false)
  };
};

/**
 * Parses data received from the frontend into a structured format
 */
export const parseFrontendData = (data: any): any => {
  if (!data) return null;
  
  // Extract and structure the data
  return {
    characterID: data.characterID,
    sessionKey: data.sessionKey,
    sessionKeyBalance: data.sessionKeyBalance,
    character: data.character,
    area: data.area,
    dataFeeds: data.dataFeeds,
    combatants: data.combatants || [],
    items: data.items || []
  };
}; 