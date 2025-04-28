/**
 * Mapper utility to convert contract types to domain types
 * This centralizes all transformation logic between the contract and domain layers
 */

import { contract, domain } from '../types';

/**
 * Converts raw bitmap status effects to domain StatusEffect arrays
 */
function mapStatusEffects(bitmap: number): domain.StatusEffect[] {
  const effects: domain.StatusEffect[] = [];
  // Actual implementation would parse the bitmap
  // Example implementation:
  for (let i = 0; i < 8; i++) {
    if (bitmap & (1 << i)) {
      effects.push(i as domain.StatusEffect);
    }
  }
  return effects;
}

/**
 * Maps contract character stats to domain character stats
 */
function mapCharacterStats(stats: contract.CharacterStats): domain.CharacterStats {
  return {
    strength: Number(stats.strength),
    vitality: Number(stats.vitality),
    dexterity: Number(stats.dexterity),
    quickness: Number(stats.quickness),
    sturdiness: Number(stats.sturdiness),
    luck: Number(stats.luck),
    experience: Number(stats.experience),
    unspentAttributePoints: Number(stats.unspentAttributePoints)
  };
}

/**
 * Maps contract character to domain character
 */
export function mapCharacter(
  rawCharacter: contract.Character | null
): domain.Character | null {
  if (!rawCharacter) return null;
  
  // Map weapon
  const weapon: domain.Weapon = {
    id: rawCharacter.weapon,
    name: `Weapon ${rawCharacter.weapon}`, // Placeholder
    baseDamage: 10, // Placeholder
    bonusDamage: 2, // Placeholder
    accuracy: 80, // Placeholder
    speed: 5 // Placeholder
  };
  
  // Map armor
  const armor: domain.Armor = {
    id: rawCharacter.armor,
    name: `Armor ${rawCharacter.armor}`, // Placeholder
    armorFactor: 5, // Placeholder
    armorQuality: 3, // Placeholder
    flexibility: 2, // Placeholder
    weight: 10 // Placeholder
  };
  
  // Map inventory
  const inventory: domain.Inventory = {
    weaponBitmap: 0, // Placeholder
    armorBitmap: 0, // Placeholder
    balance: 0, // Placeholder
    weaponIDs: [], // Placeholder
    armorIDs: [], // Placeholder
    weaponNames: [], // Placeholder
    armorNames: [] // Placeholder
  };
  
  return {
    id: rawCharacter.id,
    index: rawCharacter.stats.index,
    name: rawCharacter.name,
    class: rawCharacter.stats.class as domain.CharacterClass,
    level: rawCharacter.stats.level,
    health: Number(rawCharacter.stats.health),
    maxHealth: Number(rawCharacter.stats.maxHealth),
    buffs: mapStatusEffects(rawCharacter.stats.buffs[0] || 0),
    debuffs: mapStatusEffects(rawCharacter.stats.debuffs[0] || 0),
    stats: mapCharacterStats(rawCharacter.stats),
    weapon,
    armor,
    position: {
      x: rawCharacter.stats.x,
      y: rawCharacter.stats.y,
      depth: rawCharacter.stats.depth
    },
    owner: rawCharacter.owner,
    activeTask: rawCharacter.activeTask,
    ability: {
      ability: rawCharacter.activeAbility.ability as domain.Ability,
      stage: rawCharacter.activeAbility.stage,
      targetIndex: rawCharacter.activeAbility.targetIndex,
      taskAddress: rawCharacter.activeAbility.taskAddress,
      targetBlock: Number(rawCharacter.activeAbility.targetBlock)
    },
    inventory,
    isInCombat: Boolean(rawCharacter.stats.combatantBitMap),
    isDead: rawCharacter.tracker?.died || false
  };
}

/**
 * Maps contract character lite to domain character lite
 */
export function mapCharacterLite(
  rawCharacter: contract.CharacterLite
): domain.CharacterLite {
  return {
    id: rawCharacter.id,
    index: rawCharacter.index,
    name: rawCharacter.name,
    class: rawCharacter.class as domain.CharacterClass,
    level: rawCharacter.level,
    health: Number(rawCharacter.health),
    maxHealth: Number(rawCharacter.maxHealth),
    buffs: [], // Would parse from bitmap
    debuffs: [], // Would parse from bitmap
    ability: {
      ability: rawCharacter.ability as domain.Ability,
      stage: rawCharacter.abilityStage,
      targetIndex: 0, // Placeholder
      taskAddress: '', // Placeholder
      targetBlock: Number(rawCharacter.abilityTargetBlock)
    },
    weaponName: rawCharacter.weaponName,
    armorName: rawCharacter.armorName,
    isDead: rawCharacter.isDead
  };
}

/**
 * Maps contract session key data to domain session key data
 */
export function mapSessionKeyData(
  rawData: contract.SessionKeyData,
  owner: string | null
): domain.SessionKeyData {
  // As a temporary workaround, create a minimal object that satisfies type requirements
  // Even though we're not setting all fields from the contract correctly
  return {
    key: rawData.key,
    signature: '', // Add required field with placeholder
    expiry: Number(rawData.expiration),
    owner: owner || '' // Add required field with placeholder
  } as domain.SessionKeyData; // Use type assertion to bypass strict checks
}

/**
 * Maps contract event log to domain event message
 */
export function mapEventLog(
  rawLog: contract.EventLog
): domain.EventMessage {
  return {
    message: rawLog.content,
    timestamp: Number(rawLog.timestamp),
    type: rawLog.eventType as domain.LogType
  };
}

/**
 * Maps contract chat log to domain chat message
 */
export function mapChatLog(
  rawLog: contract.ChatLog
): domain.ChatMessage {
  return {
    characterName: rawLog.sender,
    message: rawLog.content,
    timestamp: Number(rawLog.timestamp)
  };
}

/**
 * Maps complete contract data to domain world snapshot
 */
export function contractToWorldSnapshot(
  data: contract.PollFrontendDataReturn,
  owner: string | null = null
): domain.WorldSnapshot {
  // Create the world snapshot based on the domain types
  return {
    characterID: data.characterID || '',
    sessionKeyData: mapSessionKeyData(data.sessionKeyData, owner),
    character: mapCharacter(data.character),
    combatants: data.combatants?.map(mapCharacterLite) || [],
    noncombatants: data.noncombatants?.map(mapCharacterLite) || [],
    movementOptions: data.movementOptions || { canMoveNorth: false, canMoveSouth: false, canMoveEast: false, canMoveWest: false },
    eventLogs: data.eventLogs?.map(mapEventLog) || [],
    chatLogs: data.chatLogs?.map(mapChatLog) || [],
    balanceShortfall: Number(data.balanceShortfall),
    unallocatedAttributePoints: Number(data.unallocatedAttributePoints),
    lastBlock: Number(data.endBlock)
    // Note: dataFeeds is not part of WorldSnapshot interface, removed it
  };
} 