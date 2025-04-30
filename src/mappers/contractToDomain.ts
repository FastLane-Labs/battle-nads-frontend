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

// NEW helper – flattens any number of DataFeed entries
function mergeDataFeeds(feeds: contract.DataFeed[] = []) {
  return feeds.reduce(
    (acc, feed) => {
      acc.eventLogs.push(...(feed.logs ?? []));
      acc.chatLogs.push(...(feed.chatLogs ?? []));
      return acc;
    },
    { eventLogs: [] as contract.Log[], chatLogs: [] as string[] },
  );
}

/**
 * Maps contract data to domain world snapshot
 * Works with both raw PollFrontendDataRaw and extended PollFrontendDataReturn
 */
export function contractToWorldSnapshot(
  raw: contract.PollFrontendDataReturn | null,
  owner: string | null = null
): domain.WorldSnapshot | null {
  
  // If the entire data packet is null, return null
  if (!raw) {
    return null;
  }

  /* --------- Aggregate logs from dataFeeds --------- */
  const { eventLogs: mergedEvents, chatLogs: mergedChats } = mergeDataFeeds(raw.dataFeeds);
  
  // Get movement options
  const movementOptions = raw.movementOptions;
  
  // Debug logs to monitor event and chat log sources and lengths
  console.log(`[contractToDomain] Merged events from dataFeeds length: ${mergedEvents.length}`);
  console.log(`[contractToDomain] Merged chats from dataFeeds length: ${mergedChats.length}`);

  // Map session key data
  const mappedSessionKeyData = mapSessionKeyData(raw.sessionKeyData, owner);

  // Create the domain world snapshot with appropriate types
  const worldSnapshot: domain.WorldSnapshot = {
    characterID: raw.characterID || '',
    sessionKeyData: mappedSessionKeyData,
    character: mapCharacter(raw.character),
    combatants: raw.combatants?.map(mapCharacterLite) || [],
    noncombatants: raw.noncombatants?.map(mapCharacterLite) || [],
    
    /* Always use merged logs from dataFeeds */
    eventLogs: mergedEvents
      .filter(log => log && typeof log.logType !== 'undefined')
      .map(log => {
        console.log(`[contractToDomain] Using merged event log: ${JSON.stringify(log)}`);
        return {
          message: String(log.logType || 'Unknown'),
          timestamp: Number(raw.endBlock),
          type: (log.logType !== undefined) ? 
            (log.logType as domain.LogType) : 
            domain.LogType.Unknown // Use Unknown for undefined types
        };
      }),
    
    chatLogs: mergedChats.map(content => {
      console.log(`[contractToDomain] Using merged chat message: ${content}`);
      return {
        characterName: "Other",
        message: content,
        timestamp: Date.now()
      };
    }),
    
    balanceShortfall: Number(raw.balanceShortfall || 0),
    unallocatedAttributePoints: Number(raw.unallocatedAttributePoints || 0),
    movementOptions,
    lastBlock: Number(raw.endBlock || 0)
  };
  
  // Store equipment data in a separate object - they're not part of the WorldSnapshot type
  const equipmentData = {
    equipableWeaponIDs: raw.equipableWeaponIDs,
    equipableWeaponNames: raw.equipableWeaponNames,
    equipableArmorIDs: raw.equipableArmorIDs,
    equipableArmorNames: raw.equipableArmorNames,
  };

  // For debugging
  console.log(`[contractToDomain] Available equipment not in snapshot: ${JSON.stringify(equipmentData)}`);
  
  // Add owner information from the parameter for reference in UI layers
  if (owner) {
    console.log(`[contractToDomain] Owner passed but not stored in snapshot: ${owner}`);
  }
  
  return worldSnapshot;
}