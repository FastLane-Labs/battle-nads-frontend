/**
 * Mapper utility to convert contract types to domain types
 * This centralizes all transformation logic between the contract and domain layers
 */

import { contract, domain } from '@/types';
import { LogType } from '@/types/domain/enums';

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
 *
 * @param dataFeeds Raw DataFeed array from the contract.
 * @param characterLookup Pre-built map of index to domain.CharacterLite for sender info.
 * @param referenceTimestamp Optional: Timestamp to use for messages (e.g., estimated block time).
 * @returns An array of domain.ChatMessage.
 */
export const processChatFeedsToDomain = (
    dataFeeds: contract.DataFeed[],
    characterLookup: Map<number, domain.CharacterLite>,
    referenceTimestamp?: number // Optional timestamp for estimation
): domain.ChatMessage[] => {
    const allChatMessages: domain.ChatMessage[] = [];

    for (const feed of dataFeeds) {
        if (!feed || !feed.logs || feed.chatLogs.length === 0) continue;

        const blockNumber = BigInt(feed.blockNumber);
        // Determine timestamp: use provided reference or default (though ideally reference is always passed)
        const timestamp = referenceTimestamp ?? Date.now(); 

        feed.logs.forEach((log: contract.Log) => {
            if (Number(log.logType) === LogType.Chat) {
                const senderIndex = Number(log.mainPlayerIndex);
                const senderInfo = characterLookup.get(senderIndex);
                const messageContent = feed.chatLogs?.[Number(log.index)];
                const logIndex = Number(log.index); // Use the log's own index

                if (messageContent && senderInfo) {
                    allChatMessages.push({
                        blocknumber: blockNumber,
                        logIndex: logIndex,
                        timestamp: timestamp, // Use the determined timestamp
                        sender: senderInfo,
                        message: messageContent,
                        isOptimistic: false // These are confirmed logs
                    });
                } else {
                     console.warn(`[processChatFeedsToDomain] Skipping chat log due to missing content or sender info. Block: ${blockNumber}, LogIndex: ${logIndex}, SenderIndex: ${senderIndex}`);
                }
            }
        });
    }
    console.log(`[processChatFeedsToDomain] Processed ${allChatMessages.length} chat messages.`);
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
            
            // --- ADDED: Also push a corresponding EventMessage for the Event Feed ---
            const isPlayer = !!ownerCharacterId && sender.id === ownerCharacterId;
            allEventLogs.push({
              logIndex: logIndex,
              timestamp: blockTimestamp,
              type: logTypeNum as domain.LogType.Chat,
              attacker: sender, // Use sender as the primary participant ('attacker')
              defender: undefined,
              isPlayerInitiated: isPlayer,
              details: { value: messageContent }, // Store message in details.value for potential use?
              displayMessage: `Chat: ${sender.name}: ${messageContent}`
            });
            // ---------------------------------------------------------------------
            
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
          // --- Enhanced displayMessage ---
          const displayMessage = `${participant?.name || `Index ${mainPlayerIdx}`} ${logTypeNum === domain.LogType.EnteredArea ? 'entered' : 'left'} the area.`;
          allEventLogs.push({
            logIndex: logIndex,
            timestamp: blockTimestamp,
            type: logTypeNum as domain.LogType,
            attacker: participant || undefined,
            // No defender for movement
            isPlayerInitiated: isPlayer, // Movement is initiated by the participant
            details: { value: log.value }, // Any relevant value?
            displayMessage: displayMessage // Use enhanced message
          });
          break;
        } 
        case domain.LogType.Ability: { 
          const caster = findCharacterParticipantByIndex(mainPlayerIdx, combatants, noncombatants);
          const target = findCharacterParticipantByIndex(otherPlayerIdx, combatants, noncombatants);
          const isPlayer = !!ownerCharacterId && !!caster && caster.id === ownerCharacterId;
          // --- Enhanced displayMessage ---
          const abilityName = domain.Ability[Number(log.value)] || `Ability ${log.value}`;
          let displayMessage = `${caster?.name || `Index ${mainPlayerIdx}`} used ${abilityName}`;
          if (target) displayMessage += ` on ${target.name}`;
          displayMessage += `.`; 
          allEventLogs.push({
            logIndex: logIndex,
            timestamp: blockTimestamp,
            type: logTypeNum as domain.LogType,
            attacker: caster || undefined,
            defender: target || undefined, 
            isPlayerInitiated: isPlayer, 
            details: { value: log.value }, // Ability details might be packed here
            displayMessage: displayMessage // Use enhanced message
          });
          break;
        } 
        case domain.LogType.Ascend: {
           const participant = findCharacterParticipantByIndex(mainPlayerIdx, combatants, noncombatants);
           const isPlayer = !!ownerCharacterId && !!participant && participant.id === ownerCharacterId;
           // --- Enhanced displayMessage ---
           const displayMessage = `${participant?.name || `Index ${mainPlayerIdx}`} died.`; 
            allEventLogs.push({
              logIndex: logIndex,
              timestamp: blockTimestamp,
              type: logTypeNum as domain.LogType,
              attacker: participant || undefined, // The one who died is the primary participant here
              isPlayerInitiated: isPlayer, // Action initiated by the participant
              details: { targetDied: true, value: log.value },
              displayMessage: displayMessage // Use enhanced message
            });
          break;
        }
        case domain.LogType.Combat:
        case domain.LogType.InstigatedCombat: // Treat InstigatedCombat similarly for event structure
        default: { // Handle combat and any other unknown types
          const attacker = findCharacterParticipantByIndex(mainPlayerIdx, combatants, noncombatants);
          const defender = findCharacterParticipantByIndex(otherPlayerIdx, combatants, noncombatants);
          const isPlayerInitiated = !!ownerCharacterId && !!attacker && attacker.id === ownerCharacterId;
          
          // --- Enhanced displayMessage ---
          let messageParts: string[] = [];
          // Start with Attacker vs Defender (or just Attacker if no defender)
          let title = `${attacker?.name || `Index ${mainPlayerIdx}`}`;
          if (defender) title += ` vs ${defender.name}`;
          messageParts.push(title + ':');
          
          // Hit/Miss/Crit
          if (log.hit) {
            messageParts.push('Hit');
            if (log.critical) messageParts.push('(CRIT!)');
          } else if (logTypeNum === domain.LogType.Combat) {
            messageParts.push('Miss');
          }
          
          // Damage/Heal
          if (log.damageDone > 0) messageParts.push(`[${log.damageDone} dmg]`);
          if (log.healthHealed > 0) messageParts.push(`[${log.healthHealed} heal]`);
          
          // XP
          if (log.experience > 0) messageParts.push(`[+${log.experience} XP]`);
          
          // Loot (TODO: map IDs to names later if needed)
          if (log.lootedWeaponID > 0) messageParts.push(`[Looted Wpn ${log.lootedWeaponID}]`);
          if (log.lootedArmorID > 0) messageParts.push(`[Looted Arm ${log.lootedArmorID}]`);
          
          // Target Died
          if (log.targetDied) messageParts.push('Target Died!');
          
          // Join parts for final message
          const displayMessage = messageParts.join(' ') + '.'; // Add trailing period

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
              lootedWeaponID: log.lootedWeaponID,
              lootedArmorID: log.lootedArmorID,
              experience: log.experience,
              value: log.value
            },
            displayMessage: displayMessage // Use enhanced message
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