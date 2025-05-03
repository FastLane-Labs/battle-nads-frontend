/**
 * Mapper utility to convert contract types to domain types
 * This centralizes all transformation logic between the contract and domain layers
 */

import { contract, domain } from '@/types';

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
function mapCharacterStats(stats: contract.BattleNadStats): domain.CharacterStats {
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
  
  // --- Corrected Weapon Mapping ---
  const weapon: domain.Weapon = {
    // Use the numeric ID from stats
    id: Number(rawCharacter.stats.weaponID),
    // Use the name directly from the nested weapon struct
    name: rawCharacter.weapon.name,
    // Map actual stats, converting from BigInt/string to number
    baseDamage: Number(rawCharacter.weapon.baseDamage),
    bonusDamage: Number(rawCharacter.weapon.bonusDamage),
    accuracy: Number(rawCharacter.weapon.accuracy),
    speed: Number(rawCharacter.weapon.speed) 
  };
  
  // --- Corrected Armor Mapping ---
  const armor: domain.Armor = {
    // Use the numeric ID from stats
    id: Number(rawCharacter.stats.armorID),
    // Use the name directly from the nested armor struct
    name: rawCharacter.armor.name,
    // Map actual stats, converting from BigInt/string to number
    armorFactor: Number(rawCharacter.armor.armorFactor),
    armorQuality: Number(rawCharacter.armor.armorQuality),
    flexibility: Number(rawCharacter.armor.flexibility),
    weight: Number(rawCharacter.armor.weight)
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
    maxHealth: Number(rawCharacter.maxHealth),
    buffs: mapStatusEffects(Number(rawCharacter.stats.buffs)),
    debuffs: mapStatusEffects(Number(rawCharacter.stats.debuffs)),
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
    index: Number(rawCharacter.index),
    name: rawCharacter.name,
    class: rawCharacter.class as domain.CharacterClass,
    level: Number(rawCharacter.level),
    health: Number(rawCharacter.health),
    maxHealth: Number(rawCharacter.maxHealth),
    buffs: [], // Would parse from bitmap
    debuffs: [], // Would parse from bitmap
    ability: {
      ability: rawCharacter.ability as domain.Ability,
      stage: Number(rawCharacter.abilityStage),
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
  rawData: contract.SessionKeyData | null,
  owner: string | null
): domain.SessionKeyData | null {
  if (!rawData) {
    return null;
  }

  // Convert all BigInt values to strings to avoid serialization issues
  return {
    owner: rawData.owner,
    key: rawData.key,
    balance: String(rawData.balance),
    targetBalance: String(rawData.targetBalance),
    ownerCommittedAmount: String(rawData.ownerCommittedAmount),
    ownerCommittedShares: String(rawData.ownerCommittedShares),
    expiry: String(rawData.expiration)
  };
}

/**
 * Helper function to find character name by index
 * TODO: Implement actual lookup logic
 */
function findCharacterNameByIndex(
  index: number, 
  combatants: contract.CharacterLite[], 
  noncombatants: contract.CharacterLite[]
): string {
  // Combine lists for easier lookup
  const allCharacters = [...combatants, ...noncombatants];
  const character = allCharacters.find(c => Number(c.index) === index); // Convert bigint index
  return character ? character.name : `Index ${index}`;
}

/**
 * Maps contract data to domain world snapshot
 * Works with both raw PollFrontendDataRaw and extended PollFrontendDataReturn
 * NOTE: Does not include 'movementOptions', which must be calculated separately.
 */
export function contractToWorldSnapshot(
  raw: contract.PollFrontendDataReturn | null,
  owner: string | null = null
): Omit<domain.WorldSnapshot, 'movementOptions'> | null {
  
  if (!raw) {
    return null;
  }

  // --- Process DataFeeds directly for Logs and Chat Messages ---
  const allChatMessages: domain.ChatMessage[] = [];
  const allEventLogs: domain.EventMessage[] = [];
  
  // Pre-extract character lists for efficient lookup
  const combatants = raw.combatants || [];
  const noncombatants = raw.noncombatants || [];

  (raw.dataFeeds || []).forEach(feed => {
    const blockTimestamp = Number(feed.blockNumber || 0); // Use feed's block number

    // Map Event Logs (including Chat type) for this feed
    (feed.logs || []).forEach(log => {
      const logTypeNum = Number(log.logType);
      const logIndex = Number(log.index);
      const mainPlayerIdx = Number(log.mainPlayerIndex);
      const otherPlayerIdx = Number(log.otherPlayerIndex);
      
      // --- TODO: Implement mapping based on logTypeNum ---
      switch (logTypeNum) {
        case domain.LogType.Chat: {
          // --- TODO: Create domain.ChatMessage ---
          const senderName = findCharacterNameByIndex(mainPlayerIdx, combatants, noncombatants);
          // Placeholder for actual chat message content (how is it stored in Log?)
          // Need to figure out where the message string comes from for LogType.Chat
          const messageContent = `Chat from ${senderName} (Content Missing)`; 
          /* allChatMessages.push({
            logIndex: logIndex,
            timestamp: blockTimestamp,
            sender: { id: 'TBD', name: senderName, index: mainPlayerIdx }, 
            message: messageContent
          }); */
          break;
        }
        default: {
          // --- TODO: Create domain.EventMessage ---
          const attackerName = findCharacterNameByIndex(mainPlayerIdx, combatants, noncombatants);
          const defenderName = findCharacterNameByIndex(otherPlayerIdx, combatants, noncombatants); // Might be 0 if no defender
          const messageContent = `Event ${logTypeNum} Attacker: ${attackerName} Defender: ${defenderName} (Details TBD)`;
          /* allEventLogs.push({
            logIndex: logIndex,
            timestamp: blockTimestamp,
            type: logTypeNum as domain.LogType,
            attacker: { id: 'TBD', name: attackerName, index: mainPlayerIdx },
            defender: (otherPlayerIdx > 0) ? { id: 'TBD', name: defenderName, index: otherPlayerIdx } : undefined,
            isPlayerInitiated: false, // TODO: Determine this
            details: { ...log }, // Placeholder
            displayMessage: messageContent // Optional pre-formatted string
          }); */
          break;
        }
      }
    });
  });

  // Sort combined logs by timestamp (block number) then log index
  allChatMessages.sort((a, b) => a.timestamp === b.timestamp ? a.logIndex - b.logIndex : a.timestamp - b.timestamp);
  allEventLogs.sort((a, b) => a.timestamp === b.timestamp ? a.logIndex - b.logIndex : a.timestamp - b.timestamp);
  // -----------------------------------------------------------

  // Map session key data (assuming this doesn't depend on dataFeeds structure)
  const mappedSessionKeyData = mapSessionKeyData(raw.sessionKeyData, owner);

  // Create the domain world snapshot using the processed logs (excluding movementOptions)
  const partialWorldSnapshot: Omit<domain.WorldSnapshot, 'movementOptions'> = {
    characterID: raw.characterID || '',
    sessionKeyData: mappedSessionKeyData,
    character: mapCharacter(raw.character),
    combatants: raw.combatants?.map(mapCharacterLite) || [],
    noncombatants: raw.noncombatants?.map(mapCharacterLite) || [],
    eventLogs: allEventLogs,       // Use processed event logs
    chatLogs: allChatMessages,      // Use processed chat logs
    balanceShortfall: Number(raw.balanceShortfall || 0),
    unallocatedAttributePoints: Number(raw.unallocatedAttributePoints || 0),
    lastBlock: Number(raw.endBlock || 0)
  };
  
  // Store equipment data separately (as before)
  const equipmentData = {
    equipableWeaponIDs: raw.equipableWeaponIDs,
    equipableWeaponNames: raw.equipableWeaponNames,
    equipableArmorIDs: raw.equipableArmorIDs,
    equipableArmorNames: raw.equipableArmorNames,
  };

  // Debugging logs (can be removed later)
  console.log(`[contractToDomain] Processed ${allChatMessages.length} chat messages.`);
  console.log(`[contractToDomain] Processed ${allEventLogs.length} event logs.`);
  
  return partialWorldSnapshot;
}