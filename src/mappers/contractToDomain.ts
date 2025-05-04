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
 * Helper function to find character name and ID by index
 */
function findCharacterParticipantByIndex(
  index: number, 
  combatants: contract.CharacterLite[], 
  noncombatants: contract.CharacterLite[]
): domain.EventParticipant | null {
  if (index <= 0) return null; // Index 0 usually means no participant
  // Combine lists for easier lookup
  const allCharacters = [...combatants, ...noncombatants];
  // IMPORTANT: Contract CharacterLite.index is uint256, often large, need to compare safely
  const character = allCharacters.find(c => BigInt(c.index) === BigInt(index)); 
  
  if (character) {
    return {
      id: character.id,
      name: character.name,
      index: index // Use the original index passed in
    };
  }
  return null; // Or return a default participant like { id: 'unknown', name: `Index ${index}`, index: index }
}

/**
 * Maps contract data to domain world snapshot
 * Works with both raw PollFrontendDataRaw and extended PollFrontendDataReturn
 * NOTE: Does not include 'movementOptions', which must be calculated separately.
 */
export function contractToWorldSnapshot(
  raw: contract.PollFrontendDataReturn | null,
  owner: string | null = null,
  ownerCharacterId?: string // Optional: Pass player's character ID for isPlayerInitiated flag
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
    // Keep track of chat log index within the current block
    let blockChatLogIndex = 0; 
    (feed.logs || []).forEach(log => {
      const logTypeNum = Number(log.logType);
      const logIndex = Number(log.index); // Overall index within block logs
      const mainPlayerIdx = Number(log.mainPlayerIndex);
      const otherPlayerIdx = Number(log.otherPlayerIndex);
      
      switch (logTypeNum) {
        case domain.LogType.Chat: {
          const sender = findCharacterParticipantByIndex(mainPlayerIdx, combatants, noncombatants);
          const messageContent = feed.chatLogs?.[blockChatLogIndex] ?? "[Chat message content unavailable]";
          blockChatLogIndex++;
          
          if (sender) {
            allChatMessages.push({
              logIndex: logIndex,
              blocknumber: feed.blockNumber,
              timestamp: blockTimestamp,
              sender: sender, 
              message: messageContent
              // isOptimistic flag is added later by the state management hook
            });
          } else {
             // Log potentially? Or handle system messages differently if they use LogType.Chat
             console.warn(`[Mapper] Chat log found but sender index ${mainPlayerIdx} not resolved.`);
          }
          break;
        }
        // Add specific cases for other LogTypes if distinct details are needed
        case domain.LogType.EnteredArea:
        case domain.LogType.LeftArea: { 
          const participant = findCharacterParticipantByIndex(mainPlayerIdx, combatants, noncombatants);
          const isPlayer = !!ownerCharacterId && !!participant && participant.id === ownerCharacterId;
          const displayMessage = `Movement: ${participant?.name || `Index ${mainPlayerIdx}`} ${logTypeNum === domain.LogType.EnteredArea ? 'entered' : 'left'} area.`;
          allEventLogs.push({
            logIndex: logIndex,
            timestamp: blockTimestamp,
            type: logTypeNum as domain.LogType,
            attacker: participant || undefined,
            // No defender for movement
            isPlayerInitiated: isPlayer, // Movement is initiated by the participant
            details: { value: log.value }, // Any relevant value?
            displayMessage: displayMessage
          });
          break;
        } 
        case domain.LogType.Ability: { 
          const caster = findCharacterParticipantByIndex(mainPlayerIdx, combatants, noncombatants);
          // Target might be in otherPlayerIndex or derived from log.value?
          // For now, assume otherPlayerIndex holds target if applicable
          const target = findCharacterParticipantByIndex(otherPlayerIdx, combatants, noncombatants);
          const isPlayer = !!ownerCharacterId && !!caster && caster.id === ownerCharacterId;
          let displayMessage = `Ability: ${caster?.name || `Index ${mainPlayerIdx}`} used ability`;
          if (target) displayMessage += ` on ${target.name}`;
          // TODO: Add more ability-specific details if available in log.value or other fields
          displayMessage += `.`; 

          allEventLogs.push({
            logIndex: logIndex,
            timestamp: blockTimestamp,
            type: logTypeNum as domain.LogType,
            attacker: caster || undefined,
            defender: target || undefined, 
            isPlayerInitiated: isPlayer, 
            details: { value: log.value }, // Ability details might be packed here
            displayMessage: displayMessage
          });
          break;
        } 
        case domain.LogType.Sepukku: { 
           const participant = findCharacterParticipantByIndex(mainPlayerIdx, combatants, noncombatants);
           const isPlayer = !!ownerCharacterId && !!participant && participant.id === ownerCharacterId;
           const displayMessage = `Death: ${participant?.name || `Index ${mainPlayerIdx}`} died.`; 
            allEventLogs.push({
              logIndex: logIndex,
              timestamp: blockTimestamp,
              type: logTypeNum as domain.LogType,
              attacker: participant || undefined, // The one who died is the primary participant here
              isPlayerInitiated: isPlayer, // Action initiated by the participant
              details: { targetDied: true, value: log.value },
              displayMessage: displayMessage
            });
          break;
        }
        case domain.LogType.Combat:
        case domain.LogType.InstigatedCombat: // Treat InstigatedCombat similarly for event structure
        default: { // Handle combat and any other unknown types
          const attacker = findCharacterParticipantByIndex(mainPlayerIdx, combatants, noncombatants);
          const defender = findCharacterParticipantByIndex(otherPlayerIdx, combatants, noncombatants);
          const isPlayerInitiated = !!ownerCharacterId && !!attacker && attacker.id === ownerCharacterId;
          
          // Refined display message for combat/default
          let displayMessage = `${domain.LogType[logTypeNum] || `Event ${logTypeNum}`}:`;
          if (attacker) displayMessage += ` ${attacker.name}`; else displayMessage += ` P${mainPlayerIdx}`;
          if (defender) displayMessage += ` vs ${defender.name}`; else if (otherPlayerIdx > 0) displayMessage += ` vs P${otherPlayerIdx}`;
          if (log.hit) displayMessage += ` Hit${log.critical ? ' (Crit!)' : ''}.`;
          else if (logTypeNum === domain.LogType.Combat) displayMessage += ` Miss.`; // Indicate miss only for standard combat
          if (log.damageDone > 0) displayMessage += ` [${log.damageDone} dmg].`;
          if (log.healthHealed > 0) displayMessage += ` [${log.healthHealed} heal].`;
          if (log.experience > 0) displayMessage += ` [+${log.experience} XP].`;
          if (log.targetDied) displayMessage += ` Target Died!`;

          allEventLogs.push({
            logIndex: logIndex,
            timestamp: blockTimestamp,
            type: logTypeNum as domain.LogType,
            attacker: attacker || undefined,
            defender: defender || undefined,
            isPlayerInitiated: isPlayerInitiated,
            details: { 
              hit: log.hit,
              critical: log.critical,
              damageDone: log.damageDone,
              healthHealed: log.healthHealed,
              targetDied: log.targetDied,
              experience: log.experience,
              value: log.value
            },
            displayMessage: displayMessage
          });
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