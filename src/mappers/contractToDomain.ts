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

// Helper to format event messages based on Log type and data
function formatEventMessage(log: contract.Log): string {
  const logTypeNum = Number(log.logType); // Convert BigInt/number to number
  switch (logTypeNum) {
    case domain.LogType.Combat:
      // Basic combat log example - Needs refinement based on actual meaning
      let combatMsg = `Combat: P${log.mainPlayerIndex} vs P${log.otherPlayerIndex}.`;
      if (log.hit) combatMsg += ` Hit${log.critical ? ' (Crit!)' : ''}.`;
      if (log.damageDone > 0) combatMsg += ` Dealt ${log.damageDone} dmg.`;
      if (log.healthHealed > 0) combatMsg += ` Healed ${log.healthHealed} HP.`;
      if (log.targetDied) combatMsg += ` Target died.`;
      if (log.lootedWeaponID > 0) combatMsg += ` Looted Wpn ${log.lootedWeaponID}.`;
      if (log.lootedArmorID > 0) combatMsg += ` Looted Arm ${log.lootedArmorID}.`;
      if (log.experience > 0) combatMsg += ` Gained ${log.experience} XP.`;
      return combatMsg;
    case domain.LogType.InstigatedCombat:
      return `Combat Started: P${log.mainPlayerIndex} attacked P${log.otherPlayerIndex}.`;
    case domain.LogType.EnteredArea:
      // Assuming index might relate to player index or area?
      return `Movement: P${log.index} entered area.`; 
    case domain.LogType.LeftArea:
      return `Movement: P${log.index} left area.`;
    case domain.LogType.Ability:
      return `Ability used by P${log.index}.`; 
    case domain.LogType.Sepukku:
      return `Death: P${log.index} died.`; 
    case domain.LogType.Chat:
      return `Chat Event`;
    case domain.LogType.Unknown:
    default:
      // Use number version in fallback message
      return `System Event (Type ${logTypeNum}): Data ${JSON.stringify(log)}`; 
  }
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
  rawLog: string
): domain.ChatMessage {
  return {
    characterName: "Other",
    message: rawLog,
    timestamp: Date.now() // Add current time as real timestamp
  };
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

  (raw.dataFeeds || []).forEach(feed => {
    const blockTimestamp = Number(feed.blockNumber || 0); // Use feed's block number

    // Map Chat Logs for this feed
    (feed.chatLogs || []).forEach(chatString => {
      let senderName = "System"; // Default sender
      let messageContent = chatString;

      // Basic sender parsing (adjust if format differs)
      if (typeof chatString === 'string' && chatString.includes(":")) { // Check it's a string first
          const colonIndex = chatString.indexOf(":");
          // Ensure colon is present and not the first character
          if (colonIndex > 0) { 
              const potentialSender = chatString.substring(0, colonIndex).trim();
              // Basic check if sender looks reasonable (e.g., not empty)
              if (potentialSender) { 
                  senderName = potentialSender;
                  messageContent = chatString.substring(colonIndex + 1).trim();
              } else {
                // Malformed (e.g., ": message"), keep default sender, use whole string as message
                messageContent = chatString; 
              }
          } else {
             // Malformed (e.g., ": message"), keep default sender, use whole string as message
             messageContent = chatString;
          }
      } // else: No colon found or not a string, keep default sender "System"

      allChatMessages.push({
          characterName: senderName,
          message: messageContent,
          timestamp: blockTimestamp 
      });
    });

    // Map Event Logs for this feed
    (feed.logs || []).forEach(log => {
      const logTypeNum = Number(log.logType); 
      // --- DEBUG LOGGING ---
      console.log("[Mapper] Raw Event Log:", log);
      // --- END DEBUG --- 
      const messageContent = formatEventMessage(log); 
      // --- DEBUG LOGGING ---
      console.log(`[Mapper] Formatted Event Message (Type: ${logTypeNum}):`, messageContent);
      // --- END DEBUG --- 

      allEventLogs.push({
        message: messageContent, 
        timestamp: blockTimestamp,          
        // Use the number version for the check and the cast
        type: (logTypeNum !== undefined && !isNaN(logTypeNum) && domain.LogType[logTypeNum] !== undefined) ? 
              (logTypeNum as domain.LogType) : 
              domain.LogType.Unknown 
      });
    });
  });

  // Sort combined logs by timestamp (block number)
  allChatMessages.sort((a, b) => a.timestamp - b.timestamp);
  allEventLogs.sort((a, b) => a.timestamp - b.timestamp);
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