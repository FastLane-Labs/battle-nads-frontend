import { 
  Character as BattleNad, // Alias Character to BattleNad for compatibility
  CharacterLite as BattleNadLite, // Alias CharacterLite
  CharacterClass, 
  Position, 
  CharacterStats, 
  Weapon, 
  Armor, 
  StatusEffect, 
  AbilityState // Import AbilityState if needed
} from '../types/domain'; // Corrected import path
import { ui } from '../types'; // Import UI types if needed for GameState

// Assuming GameState is a UI type
type GameState = ui.GameState;

/**
 * Calculates the maximum health of a character based on game mechanics.
 * This should match the formula used in the smart contract.
 */
export const calculateMaxHealth = (stats: CharacterStats | null | undefined): number => {
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
  if (!character) return { x: 0, y: 0, depth: 1 }; // Return default position
  
  // Use character.position directly if available, otherwise default
  return character.position || { x: 0, y: 0, depth: 1 }; 
};

/**
 * Converts raw character data from the contract to the frontend BattleNad (domain.Character) format
 * NOTE: This function seems redundant given the mappers in src/mappers. 
 * Consider replacing usage of this function with direct use of mapCharacter from mappers.
 */
export const convertCharacterData = (data: any): BattleNad => {
  console.warn("convertCharacterData is deprecated. Use mapCharacter from src/mappers instead.");
  // Provide a basic default structure if data is missing
  const defaultStats: CharacterStats = {
    strength: 0, vitality: 0, dexterity: 0, quickness: 0, sturdiness: 0, luck: 0, experience: 0, unspentAttributePoints: 0
  };
  const defaultPosition: Position = { x: 0, y: 0, depth: 1 };
  const defaultWeapon: Weapon = { id: 0, name: 'None', baseDamage: 0, bonusDamage: 0, accuracy: 0, speed: 0 };
  const defaultArmor: Armor = { id: 0, name: 'None', armorFactor: 0, armorQuality: 0, flexibility: 0, weight: 0 };
  const defaultAbility: AbilityState = { ability: 0, stage: 0, targetIndex: 0, taskAddress: '', targetBlock: 0 };
  const defaultInventory = { weaponBitmap: 0, armorBitmap: 0, balance: 0, weaponIDs: [], armorIDs: [], weaponNames: [], armorNames: [] };

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
      stats: defaultStats,
      weapon: defaultWeapon,
      armor: defaultArmor,
      inventory: defaultInventory,
      position: defaultPosition,
      owner: '',
      activeTask: '',
      ability: defaultAbility,
      isInCombat: false,
      isDead: false
    };
  }
  
  const stats = data.stats ? {
    strength: Number(data.stats.strength || 0),
    vitality: Number(data.stats.vitality || 0),
    dexterity: Number(data.stats.dexterity || 0),
    quickness: Number(data.stats.quickness || 0),
    sturdiness: Number(data.stats.sturdiness || 0),
    luck: Number(data.stats.luck || 0),
    experience: Number(data.stats.experience || 0),
    unspentAttributePoints: Number(data.stats.unspentAttributePoints || 0)
  } : defaultStats;

  const position = data.position || data.stats ? { // Prefer position, fallback to stats fields
    x: Number(data.position?.x ?? data.stats?.x ?? 0),
    y: Number(data.position?.y ?? data.stats?.y ?? 0),
    depth: Number(data.position?.depth ?? data.stats?.depth ?? 1)
  } : defaultPosition;
  
  const weapon = data.weapon ? {
      id: Number(data.weapon.id || 0),
      name: data.weapon.name || 'Unknown Weapon',
      baseDamage: Number(data.weapon.baseDamage || data.weapon.damage || 0),
      bonusDamage: Number(data.weapon.bonusDamage || 0),
      accuracy: Number(data.weapon.accuracy || 0),
      speed: Number(data.weapon.speed || 0)
  } : defaultWeapon;

  const armor = data.armor ? {
      id: Number(data.armor.id || 0),
      name: data.armor.name || 'Unknown Armor',
      armorFactor: Number(data.armor.armorFactor || data.armor.defense || 0),
      armorQuality: Number(data.armor.armorQuality || 0),
      flexibility: Number(data.armor.flexibility || 0),
      weight: Number(data.armor.weight || 0)
  } : defaultArmor;

  // Convert the raw data to our BattleNad (domain.Character) format
  return {
    id: data.id?.toString() || '',
    index: Number(data.index || data.stats?.index || 0),
    name: data.name || 'Unnamed Character',
    class: Number(data.class ?? data.stats?.class ?? CharacterClass.Bard),
    level: Number(data.level ?? data.stats?.level ?? 1),
    health: Number(data.health ?? data.stats?.health ?? 100),
    maxHealth: Number(data.maxHealth ?? calculateMaxHealth(stats) ?? 100),
    // Buffs/Debuffs need proper parsing if data.buffs/debuffs is a bitmap
    buffs: Array.isArray(data.buffs) ? data.buffs : [], 
    debuffs: Array.isArray(data.debuffs) ? data.debuffs : [], 
    stats,
    weapon,
    armor,
    // Inventory needs proper mapping if source data exists
    inventory: data.inventory ? { 
      weaponBitmap: Number(data.inventory.weaponBitmap || 0),
      armorBitmap: Number(data.inventory.armorBitmap || 0),
      balance: Number(data.inventory.balance || 0),
      weaponIDs: data.inventory.weaponIDs || [],
      armorIDs: data.inventory.armorIDs || [],
      weaponNames: data.inventory.weaponNames || [],
      armorNames: data.inventory.armorNames || []
     } : defaultInventory,
    position,
    owner: String(data.owner || ''),
    activeTask: String(data.activeTask || ''),
    ability: data.ability || defaultAbility,
    // No unspentAttributePoints directly on Character, it's in stats
    isInCombat: Boolean(data.isInCombat || data.stats?.combatantBitMap || false), // Check stats bitmap too
    isDead: Boolean(data.isDead || data.tracker?.died || false) // Check tracker
  };
};

/**
 * Helper to parse status effects bitmap into an array of StatusEffect
 * NOTE: This seems redundant with mapStatusEffects in mappers.
 */
const parseStatusEffects = (bitmap: number): StatusEffect[] => {
  console.warn("parseStatusEffects is deprecated. Use mapStatusEffects from src/mappers instead.");
  const effects: StatusEffect[] = [];
  for (let i = 0; i < 8; i++) { // Assuming 8 possible effects
    if ((bitmap & (1 << i)) !== 0) {
      // Map bit position to enum value (needs correct mapping)
      const effect = (i + 1) as StatusEffect; // Example: adjust based on actual enum values
      if (StatusEffect[effect]) { // Check if the enum value is valid
         effects.push(effect);
      }
    }
  }
  return effects;
};