/**
 * Mapper utility to convert contract types to domain types
 * This centralizes all transformation logic between the contract and domain layers
 */

import { contract, domain } from '@/types';
import { safeStringify } from '@/utils/bigintSerializer';
import { estimateBlockTimestamp } from '@/utils/blockUtils'; // Import the utility

/**
 * Converts raw bitmap status effects to domain StatusEffect arrays
 */
export function mapStatusEffects(bitmap: number): domain.StatusEffect[] {
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
  rawCharacter: contract.CharacterLite // Revert: Only accept CharacterLite
): domain.CharacterLite {
  // Revert to original implementation
  return {
    id: rawCharacter.id,
    index: Number(rawCharacter.index),
    name: rawCharacter.name,
    class: rawCharacter.class as domain.CharacterClass,
    level: Number(rawCharacter.level),
    health: Number(rawCharacter.health),
    maxHealth: Number(rawCharacter.maxHealth),
    // Map buffs/debuffs from bitmap (assuming mapStatusEffects exists and works)
    buffs: mapStatusEffects(Number(rawCharacter.buffs)), 
    debuffs: mapStatusEffects(Number(rawCharacter.debuffs)),
    ability: {
      ability: rawCharacter.ability as domain.Ability,
      stage: Number(rawCharacter.abilityStage),
      targetIndex: 0, // Placeholder - Lite doesn't provide target index directly
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
 * Maps raw contract DataFeed arrays to domain ChatMessage arrays.
 */
export const processChatFeedsToDomain = (
    dataFeeds: contract.DataFeed[],
    characterLookup: Map<number, domain.CharacterLite>,
    referenceBlockNumber: bigint, 
    referenceTimestamp: number
): domain.ChatMessage[] => {
    const allChatMessages: domain.ChatMessage[] = [];

    for (const feed of dataFeeds) {
        if (!feed || !feed.logs || feed.chatLogs.length === 0) continue;

        const eventBlockNumber = BigInt(feed.blockNumber || 0);
        // Estimate timestamp for this feed's block
        const estimatedTimestamp = estimateBlockTimestamp(
            referenceBlockNumber, // Reference block (e.g., latest known)
            referenceTimestamp,   // Timestamp for reference block
            eventBlockNumber      // Block number for this feed
        );

        // Keep track of chat log index for mapping
        let blockChatLogIndex = 0;
        feed.logs.forEach((log: contract.Log) => {
            if (Number(log.logType) === domain.LogType.Chat) { // Use domain.LogType
                const senderIndex = Number(log.mainPlayerIndex);
                const senderInfo = characterLookup.get(senderIndex);
                // Map message content using blockChatLogIndex, NOT log.index
                const messageContent = feed.chatLogs?.[blockChatLogIndex];
                const logIndex = Number(log.index); // Use log's own index
                blockChatLogIndex++; // Increment after accessing chatLogs

                if (messageContent && senderInfo) {
                    allChatMessages.push({
                        blocknumber: eventBlockNumber,
                        logIndex: logIndex,
                        timestamp: estimatedTimestamp, // Use estimated timestamp
                        sender: {
                            id: senderInfo.id,
                            name: senderInfo.name,
                            index: senderIndex // Use the index we looked up by
                        },
                        message: messageContent,
                        isOptimistic: false // These are confirmed logs
                    });
                } else {
                     console.warn(`[processChatFeedsToDomain] Skipping chat log due to missing content or sender info. Block: ${eventBlockNumber}, LogIndex: ${logIndex}, SenderIndex: ${senderIndex}`);
                }
            }
        });
    }
    if (allChatMessages.length > 0) {
        console.log(`[processChatFeedsToDomain] Processed ${allChatMessages.length} chat messages.`);
    }
    // Sort by estimated timestamp, then log index
    allChatMessages.sort((a, b) => a.timestamp === b.timestamp ? a.logIndex - b.logIndex : a.timestamp - b.timestamp);
    return allChatMessages;
};

/**
 * Maps contract data to domain world snapshot
 * Works with both raw PollFrontendDataRaw and extended PollFrontendDataReturn
 * NOTE: Does not include 'movementOptions', which must be calculated separately.
 */
export function contractToWorldSnapshot(
  raw: contract.PollFrontendDataReturn | null,
  owner: string | null = null,
  ownerCharacterId?: string // Optional: Pass player's character ID for isPlayerInitiated flag
): domain.WorldSnapshot | null {
  
  if (!raw) {
    return null;
  }

  // --- Process DataFeeds directly for Logs and Chat Messages ---
  const allChatMessages: domain.ChatMessage[] = [];
  const allEventLogs: domain.EventMessage[] = [];
  
  const combatants = raw.combatants || [];
  const noncombatants = raw.noncombatants || [];

  // Reference point for timestamp estimation - Use BigInt for block number
  const referenceBlockNumber = BigInt(raw.endBlock || 0);
  const referenceTimestamp = Date.now(); 

  (raw.dataFeeds || []).forEach(feed => {
    const eventBlockNumber = BigInt(feed.blockNumber || 0);
    // Call estimateBlockTimestamp with correct BigInt types
    const estimatedTimestamp = estimateBlockTimestamp(
        referenceBlockNumber,  
        referenceTimestamp,
        eventBlockNumber    
    ); 

    let blockChatLogIndex = 0; 
    (feed.logs || []).forEach(log => {
      const logTypeNum = Number(log.logType);
      const logIndex = Number(log.index); 
      const mainPlayerIdx = Number(log.mainPlayerIndex);
      const otherPlayerIdx = Number(log.otherPlayerIndex);
      
      switch (logTypeNum) {
        case domain.LogType.Chat: {
          const sender = findCharacterParticipantByIndex(mainPlayerIdx, combatants, noncombatants);
          const messageContent = feed.chatLogs?.[blockChatLogIndex] ?? "[Chat message content unavailable]";
          blockChatLogIndex++;
          
          if (sender) {
            const newChatMessage: domain.ChatMessage = {
              logIndex: logIndex,
              blocknumber: eventBlockNumber,
              timestamp: estimatedTimestamp,
              sender: sender,
              message: messageContent
            };
            allChatMessages.push(newChatMessage);
            
            const isPlayer = !!ownerCharacterId && sender.id === ownerCharacterId;
            const newEventMessageForChat: domain.EventMessage = {
              logIndex: logIndex,
              blocknumber: eventBlockNumber,
              timestamp: estimatedTimestamp,
              type: logTypeNum as domain.LogType,
              attacker: sender,
              defender: undefined,
              isPlayerInitiated: isPlayer,
              details: { value: messageContent }, 
              displayMessage: `Chat: ${sender.name}: ${messageContent}`
            };
            allEventLogs.push(newEventMessageForChat);
            
          } else {
             console.warn(`[Mapper] Chat log found but sender index ${mainPlayerIdx} not resolved.`);
          }
          break;
        }
        case domain.LogType.EnteredArea:
        case domain.LogType.LeftArea: { 
          const participant = findCharacterParticipantByIndex(mainPlayerIdx, combatants, noncombatants);
          const isPlayer = !!ownerCharacterId && !!participant && participant.id === ownerCharacterId;
          const displayMessage = `${participant?.name || `Index ${mainPlayerIdx}`} ${logTypeNum === domain.LogType.EnteredArea ? 'entered' : 'left'} the area.`;
          const newEventMessage: domain.EventMessage = {
            logIndex: logIndex,
            blocknumber: eventBlockNumber, 
            timestamp: estimatedTimestamp,
            type: logTypeNum as domain.LogType,
            attacker: participant || undefined,
            isPlayerInitiated: isPlayer, 
            details: { value: log.value }, 
            displayMessage: displayMessage 
          };
          allEventLogs.push(newEventMessage);
          break;
        }
        case domain.LogType.Ability: { 
          const caster = findCharacterParticipantByIndex(mainPlayerIdx, combatants, noncombatants);
          const target = findCharacterParticipantByIndex(otherPlayerIdx, combatants, noncombatants);
          const isPlayer = !!ownerCharacterId && !!caster && caster.id === ownerCharacterId;
          const abilityName = domain.Ability[Number(log.value)] || `Ability ${log.value}`;
          let displayMessage = `${caster?.name || `Index ${mainPlayerIdx}`} used ${abilityName}`;
          if (target) displayMessage += ` on ${target.name}`;
          displayMessage += `.`; 
          const newEventMessage: domain.EventMessage = {
            logIndex: logIndex,
            blocknumber: eventBlockNumber, 
            timestamp: estimatedTimestamp,
            type: logTypeNum as domain.LogType,
            attacker: caster || undefined,
            defender: target || undefined, 
            isPlayerInitiated: isPlayer, 
            details: { value: log.value }, 
            displayMessage: displayMessage 
          };
          allEventLogs.push(newEventMessage);
          break;
        }
        case domain.LogType.Ascend: {
           const participant = findCharacterParticipantByIndex(mainPlayerIdx, combatants, noncombatants);
           const isPlayer = !!ownerCharacterId && !!participant && participant.id === ownerCharacterId;
           const displayMessage = `${participant?.name || `Index ${mainPlayerIdx}`} died.`; 
           const newEventMessage: domain.EventMessage = {
              logIndex: logIndex,
              blocknumber: eventBlockNumber, 
              timestamp: estimatedTimestamp,
              type: logTypeNum as domain.LogType,
              attacker: participant || undefined, 
              isPlayerInitiated: isPlayer, 
              details: { targetDied: true, value: log.value },
              displayMessage: displayMessage 
            };
           allEventLogs.push(newEventMessage);
          break;
        }
        case domain.LogType.Combat:
        case domain.LogType.InstigatedCombat:
        default: { 
          const attacker = findCharacterParticipantByIndex(mainPlayerIdx, combatants, noncombatants);
          const defender = findCharacterParticipantByIndex(otherPlayerIdx, combatants, noncombatants);
          const isPlayerInitiated = !!ownerCharacterId && !!attacker && attacker.id === ownerCharacterId;
          let messageParts: string[] = [];
          let title = `${attacker?.name || `Index ${mainPlayerIdx}`}`;
          if (defender) title += ` vs ${defender.name}`;
          messageParts.push(title + ':');
          if (log.hit) {
            messageParts.push('Hit');
            if (log.critical) messageParts.push('(CRIT!)');
          } else if (logTypeNum === domain.LogType.Combat) {
            messageParts.push('Miss');
          }
          if (log.damageDone > 0) messageParts.push(`[${log.damageDone} dmg]`);
          if (log.healthHealed > 0) messageParts.push(`[${log.healthHealed} heal]`);
          if (log.experience > 0) messageParts.push(`[+${log.experience} XP]`);
          if (log.lootedWeaponID > 0) messageParts.push(`[Looted Wpn ${log.lootedWeaponID}]`);
          if (log.lootedArmorID > 0) messageParts.push(`[Looted Arm ${log.lootedArmorID}]`);
          if (log.targetDied) messageParts.push('Target Died!');
          const displayMessage = messageParts.join(' ') + '.';
          const newEventMessage: domain.EventMessage = {
            logIndex: logIndex,
            blocknumber: eventBlockNumber, 
            timestamp: estimatedTimestamp,
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
              lootedWeaponID: log.lootedWeaponID,
              lootedArmorID: log.lootedArmorID,
              experience: log.experience,
              value: log.value
            },
            displayMessage: displayMessage 
          };
          allEventLogs.push(newEventMessage);
          break;
        }
      }
    });
  });

  // Sort combined logs by timestamp (using estimatedTimestamp now) then log index
  allChatMessages.sort((a, b) => a.timestamp === b.timestamp ? a.logIndex - b.logIndex : a.timestamp - b.timestamp);
  allEventLogs.sort((a, b) => a.timestamp === b.timestamp ? a.logIndex - b.logIndex : a.timestamp - b.timestamp);

  const mappedSessionKeyData = mapSessionKeyData(raw.sessionKeyData, owner);

  // Create the domain world snapshot (Now includes eventLogs and chatLogs)
  const partialWorldSnapshot: domain.WorldSnapshot = {
    characterID: raw.characterID || '',
    sessionKeyData: mappedSessionKeyData,
    character: mapCharacter(raw.character),
    combatants: raw.combatants?.map(mapCharacterLite) || [],
    noncombatants: raw.noncombatants?.map(mapCharacterLite) || [],
    eventLogs: allEventLogs,       // Include processed event logs
    chatLogs: allChatMessages,      // Include processed chat logs
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
  if (allChatMessages.length > 0) {
    console.log(`[contractToDomain] Processed ${allChatMessages.length} chat messages.`);
  }
  if (allEventLogs.length > 0) {
    console.log(`[contractToDomain] Processed ${allEventLogs.length} event logs.`);
  }
  
  return partialWorldSnapshot;
}