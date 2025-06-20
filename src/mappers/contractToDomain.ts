/**
 * Mapper utility to convert contract types to domain types
 * This centralizes all transformation logic between the contract and domain layers
 */

import { contract, domain } from '@/types';
import { estimateBlockTimestamp } from '@/utils/blockUtils';
import { createAreaID } from '@/utils/areaId'; 

/**
 * Constants for movement validation
 */
const MAX_DUNGEON_DEPTH = 50; // Maximum depth level
const MIN_COORDINATE = 0;     // Minimum x/y coordinate
const MAX_COORDINATE = 50;    // Maximum x/y coordinate

/**
 * Calculate the valid coordinates for depth changes (stairs/ladders)
 * This is a TypeScript implementation of the Solidity _depthChangeCoordinates function
 */
function getDepthChangeCoordinates(currentDepth: number, nextDepth: number): { x: number, y: number } | null {
  // Validate depth change
  if (nextDepth > MAX_DUNGEON_DEPTH || nextDepth < 0) {
    return null; // Invalid depth change
  }

  let deeperDepth: number;
  let shallowerDepth: number;
  
  if (currentDepth < nextDepth) {
    shallowerDepth = currentDepth;
    deeperDepth = nextDepth;
  } else {
    shallowerDepth = nextDepth;
    deeperDepth = currentDepth;
  }

  let x = 25; // starting x
  let y = 25; // starting y
  
  // Return (25,25) for location to descend to the second dungeon depth
  if (shallowerDepth === 1) {
    return { x, y };
  }

  const cornerIndicator = shallowerDepth % 4;
  const traverse = 10 + Math.floor(shallowerDepth / 4);
  
  // Calculate corner positions based on depth
  if (cornerIndicator === 0) {
    x -= traverse;
    y -= traverse;
  } else if (cornerIndicator === 1) {
    x += traverse;
    y += traverse;
  } else if (cornerIndicator === 2) {
    x += traverse;
    y -= traverse;
  } else if (cornerIndicator === 3) {
    x -= traverse;
    y += traverse;
  }
  
  return { x, y };
}

/**
 * Check if vertical movement is allowed at this position
 */
function isVerticalMovementAllowed(direction: 'up' | 'down', position: { x: number, y: number, depth: number }): boolean {
  const currentDepth = position.depth;
  const targetDepth = direction === 'up' ? currentDepth + 1 : currentDepth - 1;
  
  // Can't go above depth 0 or below MAX_DUNGEON_DEPTH
  if (targetDepth < 0 || targetDepth > MAX_DUNGEON_DEPTH) {
    return false;
  }
  
  // Calculate valid stair coordinates
  const validCoords = getDepthChangeCoordinates(currentDepth, targetDepth);
  if (!validCoords) {
    return false;
  }
  
  // Check if player is at the valid stair position
  return (
    position.x === validCoords.x && 
    position.y === validCoords.y
  );
}

/**
 * Gets the offensive (targeted) ability for a character class
 */
function getOffensiveAbilityForClass(characterClass: domain.CharacterClass): domain.Ability {
  switch (characterClass) {
    case domain.CharacterClass.Bard:
      return domain.Ability.DoDance;
    case domain.CharacterClass.Warrior:
      return domain.Ability.ShieldBash;
    case domain.CharacterClass.Rogue:
      return domain.Ability.ApplyPoison;
    case domain.CharacterClass.Monk:
      return domain.Ability.Smite;
    case domain.CharacterClass.Sorcerer:
      return domain.Ability.Fireball;
    default:
      return domain.Ability.None;
  }
}

/**
 * Gets the defensive (self/no-target) ability for a character class
 */
function getDefensiveAbilityForClass(characterClass: domain.CharacterClass): domain.Ability {
  switch (characterClass) {
    case domain.CharacterClass.Bard:
      return domain.Ability.SingSong;
    case domain.CharacterClass.Warrior:
      return domain.Ability.ShieldWall;
    case domain.CharacterClass.Rogue:
      return domain.Ability.EvasiveManeuvers;
    case domain.CharacterClass.Monk:
      return domain.Ability.Pray;
    case domain.CharacterClass.Sorcerer:
      return domain.Ability.ChargeUp;
    default:
      return domain.Ability.None;
  }
}

/**
 * Maps ability usage to global ability enum based on character class and target presence
 * 
 * Logic: Each class has exactly 2 abilities:
 * - Defensive (no target): Self-buffs, area effects
 * - Offensive (with target): Targeted attacks
 */
function getGlobalAbilityFromClassAndTarget(characterClass: domain.CharacterClass, hasTarget: boolean): domain.Ability {
  if (hasTarget) {
    return getOffensiveAbilityForClass(characterClass);
  } else {
    return getDefensiveAbilityForClass(characterClass);
  }
}

/**
 * Safely maps a raw numeric or bigint class value from the contract to the domain enum.
 * Returns Bard (0) as a fallback for unknown values.
 */
function mapContractClassToDomain(rawClassValue: number | bigint | undefined | null): domain.CharacterClass {

  if (rawClassValue === undefined || rawClassValue === null) {
    return domain.CharacterClass.Bard; // Default fallback
  }

  // Convert bigint to number for the check
  const numericValue = Number(rawClassValue);

  // Check if the numeric value corresponds to a valid enum member name (TypeScript enums map number to string)
  if (numericValue in domain.CharacterClass) {
    return numericValue as domain.CharacterClass;
  } else {
    // You might want a specific 'Unknown' or handle monster classes differently if needed
    return domain.CharacterClass.Bard; // Default fallback for now
  }
}

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
  
  // Map inventory - handle both object and array-like structures
  const inventory: domain.Inventory = {
    weaponBitmap: 0,
    armorBitmap: 0,
    balance: 0,
    weaponIDs: [],
    armorIDs: [],
    weaponNames: [],
    armorNames: []
  };
  
  // Check if inventory exists and has array-like indexing
  if (rawCharacter.inventory) {
    // Safe access with type assertion for array-like structure
    const invArray = rawCharacter.inventory as any;
    if (typeof invArray[0] !== 'undefined') inventory.weaponBitmap = Number(invArray[0]);
    if (typeof invArray[1] !== 'undefined') inventory.armorBitmap = Number(invArray[1]);
    if (typeof invArray[2] !== 'undefined') inventory.balance = Number(invArray[2]);
  }
  
  const position = {
    x: rawCharacter.stats.x,
    y: rawCharacter.stats.y,
    depth: rawCharacter.stats.depth
  };
  
  const isInCombat = Boolean(rawCharacter.stats.combatantBitMap);
  
  // Calculate movement options based on position and boundaries, not combat status
  const positionObj = {
    x: Number(position.x),
    y: Number(position.y),
    depth: Number(position.depth)
  };
  
  const movementOptions: domain.MovementOptions = {
    // Check board boundaries
    canMoveNorth: positionObj.y < MAX_COORDINATE,
    canMoveSouth: positionObj.y > MIN_COORDINATE,
    canMoveEast: positionObj.x < MAX_COORDINATE,
    canMoveWest: positionObj.x > MIN_COORDINATE,
    // Check vertical movement (stairs/ladders)
    canMoveUp: isVerticalMovementAllowed('up', positionObj),
    canMoveDown: isVerticalMovementAllowed('down', positionObj)
  };

  // Calculate area ID from position
  const areaId = createAreaID(positionObj.depth, positionObj.x, positionObj.y);
  
  return {
    id: rawCharacter.id,
    index: rawCharacter.stats.index,
    name: rawCharacter.name,
    class: mapContractClassToDomain(rawCharacter.stats.class),
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
    areaId,
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
    isDead: rawCharacter.tracker?.died || false,
    movementOptions // Add movement options to character
  };
}

/**
 * Maps contract character lite to domain character lite
 * Handles input that might be an object or an array-like Result.
 */
export function mapCharacterLite(
  rawCharacterInput: contract.CharacterLite // Expect the contract object type
): domain.CharacterLite {
  // Cast the input to the expected contract type for easier access
  // We assume ethers has decoded it correctly now into an object/proxy
  const raw = rawCharacterInput as contract.CharacterLite;
 
  // Basic validation
  if (!raw || typeof raw !== 'object' || typeof raw.id === 'undefined') {
    return { 
        id: 'error-invalid-input', index: 0, name: 'Mapping Error',
        class: domain.CharacterClass.Bard, level: 0, health: 0, maxHealth: 0,
        buffs: [], debuffs: [], weaponName: '', armorName: '', areaId: 0n, isDead: true,
        ability: { ability: domain.Ability.None, stage: 0, targetIndex: 0, taskAddress: '', targetBlock: 0 }
     } as domain.CharacterLite;
  }
 
  const health = Number(raw.health || 0);
  const maxHealth = Number(raw.maxHealth || 0);
  
  // Defensive validation: If health is 0 OR maxHealth is 0, the character should be dead
  // This fixes contract bugs where isDead is false but health/maxHealth is 0
  const shouldBeDead = health <= 0 || maxHealth <= 0;
  const actuallyDead = Boolean(raw.isDead) || shouldBeDead;

  // Map properties directly, applying necessary conversions
  const result = {
    id: raw.id,
    index: Number(raw.index || 0),
    name: raw.name || 'Unknown',
    class: mapContractClassToDomain(raw.class), // Use the class directly now
    level: Number(raw.level || 0),
    health: health,
    maxHealth: maxHealth, 
    buffs: mapStatusEffects(Number(raw.buffs || 0)), 
    debuffs: mapStatusEffects(Number(raw.debuffs || 0)),
    ability: {
      ability: (raw.ability !== undefined && raw.ability !== null ? Number(raw.ability) : domain.Ability.None) as domain.Ability,
      stage: Number(raw.abilityStage || 0),
      targetIndex: 0, // Placeholder
      taskAddress: '', // Placeholder
      targetBlock: Number(raw.abilityTargetBlock || 0)
    },
    weaponName: raw.weaponName || '',
    armorName: raw.armorName || '',
    areaId: 0n, // CharacterLite doesn't have position data, so areaId defaults to 0n
    isDead: actuallyDead // Use our validated death status instead of raw contract value
  };

  return result;
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
  noncombatants: contract.CharacterLite[],
  mainCharacter?: contract.Character | null
): domain.EventParticipant | null {
  
  if (index === 0) {
    return null; // Index 0 usually means no character
  }
  
  // Check main character first if its index matches
  if (mainCharacter && Number(mainCharacter.stats.index) === index) {
    const char = mainCharacter;
    return {
      id: char.id,
      name: char.name,
      index: Number(char.stats.index)
    };
  }

  // Check combatants
  const combatant = combatants.find(c => Number(c.index) === index);
  if (combatant) {
    return {
      id: combatant.id,
      name: combatant.name,
      index: Number(combatant.index)
    };
  }

  // Check non-combatants
  const noncombatant = noncombatants.find(c => Number(c.index) === index);
  if (noncombatant) {
    return {
      id: noncombatant.id,
      name: noncombatant.name,
      index: Number(noncombatant.index)
    };
  }
  
  return null;
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

  // --- Determine snapshotAreaId once for all events in this snapshot ---
  const snapshotAreaId: bigint = raw.character ? 
    createAreaID(
      Number(raw.character.stats.depth),
      Number(raw.character.stats.x),
      Number(raw.character.stats.y)
    ) : 0n;

  if (snapshotAreaId === 0n) {
    if (raw.character) {
      // This means createAreaID returned 0n even with character data (e.g., depth 0, x 0, y 0)
      // This is a valid areaId (representing the "void" or an undefined area), but log if it might be unexpected.
      console.log(`[contractToWorldSnapshot] Player character is at coordinates (Depth: ${raw.character.stats.depth}, X: ${raw.character.stats.x}, Y: ${raw.character.stats.y}), resulting in snapshotAreaId 0n for all events in this snapshot.`);
    } else {
      console.warn(`[contractToWorldSnapshot] Player character data not found in snapshot. Defaulting all event areaIds in this snapshot to 0n. This may impact event filtering if player context is crucial and missing.`);
    }
  }
  // --- End snapshotAreaId determination ---

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


      // --- Process each log type ---
      switch (logTypeNum) {
        case domain.LogType.Combat:
        case domain.LogType.InstigatedCombat: {
          const attacker = findCharacterParticipantByIndex(mainPlayerIdx, combatants, noncombatants, raw.character);
          const defender = findCharacterParticipantByIndex(otherPlayerIdx, combatants, noncombatants, raw.character);
          const isPlayer = !!ownerCharacterId && !!attacker && attacker.id === ownerCharacterId;
          
          // Enhanced fallback for missing character names
          const attackerName = isPlayer ? "You" : attacker?.name || `Character (Index ${mainPlayerIdx})`;
          const defenderName = defender?.name || `Character (Index ${otherPlayerIdx})`;

          let displayMessage = '';

          if (logTypeNum === domain.LogType.InstigatedCombat) {
            displayMessage = `${attackerName} initiated combat with ${defenderName}.`;
          } else {
            // Regular combat event
            if (log.hit) {
              // Find the full CharacterLite for the attacker to get weaponName and class
              const attackerCharacter = [...combatants, ...noncombatants, ...(raw.character ? [mapCharacterToCharacterLite(raw.character)] : [])].find(c => c?.index === mainPlayerIdx);
              const weaponName = attackerCharacter?.weaponName || 'their fists';
              
              // Get the offensive ability used for this attack
              const attackerClass = attackerCharacter?.class || domain.CharacterClass.Null;
              const offensiveAbility = getOffensiveAbilityForClass(attackerClass);
              const abilityName = domain.Ability[offensiveAbility];

              const damage = log.damageDone > 0 ? ` for ${log.damageDone} damage` : '';
              const critical = log.critical ? ' (Critical!)' : '';
              
              // Show both weapon and ability if available
              let weaponInfo = '';
              if (log.damageDone > 0) {
                if (abilityName && abilityName !== 'None') {
                  weaponInfo = ` with ${weaponName} using ${abilityName}`;
                } else {
                  weaponInfo = ` with ${weaponName}`;
                }
              }

              displayMessage = `${attackerName} hits ${defenderName}${damage}${critical}${weaponInfo}.`;
              
              if (log.targetDied) {
                displayMessage += ` ${defenderName} died!`;
              }
            } else {
              displayMessage = `${attackerName} misses ${defenderName}.`;
            }
          }
          
          const newEventMessage: domain.EventMessage = {
            logIndex: logIndex,
            blocknumber: eventBlockNumber, 
            timestamp: estimatedTimestamp,
            type: logTypeNum as domain.LogType,
            attacker: attacker || undefined,
            defender: defender || undefined,
            areaId: snapshotAreaId, // Use determined snapshotAreaId
            isPlayerInitiated: isPlayer, 
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
        case domain.LogType.Chat: {
          const sender = findCharacterParticipantByIndex(mainPlayerIdx, combatants, noncombatants, raw.character);
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
              areaId: snapshotAreaId, // Use determined snapshotAreaId
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
          const participant = findCharacterParticipantByIndex(mainPlayerIdx, combatants, noncombatants, raw.character);
          const isPlayer = !!ownerCharacterId && !!participant && participant.id === ownerCharacterId;
          
          // Enhanced fallback for missing character names
          let participantName: string;
          if (participant?.name) {
            participantName = isPlayer ? "You" : participant.name;
          } else {
            // Character not found in current area data (likely left already)
            participantName = `Character (Index ${mainPlayerIdx})`;
          }
          
          const actionText = logTypeNum === domain.LogType.EnteredArea ? 'entered' : 'left';
          const displayMessage = `${participantName} ${actionText} the area.`;
          
          const newEventMessage: domain.EventMessage = {
            logIndex: logIndex,
            blocknumber: eventBlockNumber, 
            timestamp: estimatedTimestamp,
            type: logTypeNum as domain.LogType,
            attacker: participant || undefined,
            areaId: snapshotAreaId, // Use determined snapshotAreaId
            isPlayerInitiated: isPlayer, 
            details: { value: log.value }, 
            displayMessage: displayMessage 
          };
          allEventLogs.push(newEventMessage);
          break;
        }
        case domain.LogType.Ability: { 
          const caster = findCharacterParticipantByIndex(mainPlayerIdx, combatants, noncombatants, raw.character);
          const target = findCharacterParticipantByIndex(otherPlayerIdx, combatants, noncombatants, raw.character);
          const isPlayer = !!ownerCharacterId && !!caster && caster.id === ownerCharacterId;
          
          // Enhanced fallback for missing character names
          const casterName = isPlayer ? "You" : caster?.name || `Character (Index ${mainPlayerIdx})`;
          const targetName = target?.name || (otherPlayerIdx !== 0 ? `Character (Index ${otherPlayerIdx})` : undefined);

          const casterCharacter = [...combatants, ...noncombatants, ...(raw.character ? [mapCharacterToCharacterLite(raw.character)] : [])].find(c => c?.index === mainPlayerIdx);

          // Map ability usage to global ability enum based on character class and target presence
          const casterClass = casterCharacter?.class || domain.CharacterClass.Null;
          const hasTarget = !!targetName;
          const globalAbility = getGlobalAbilityFromClassAndTarget(casterClass, hasTarget);
          const abilityName = domain.Ability[globalAbility] || `Unknown Ability (Class: ${domain.CharacterClass[casterClass]}, Target: ${hasTarget ? 'Yes' : 'No'})`;

          let displayMessage = `${casterName} used ${abilityName}`;
          if (targetName) displayMessage += ` on ${targetName}`;
          displayMessage += `.`;
          
          const newEventMessage: domain.EventMessage = {
            logIndex: logIndex,
            blocknumber: eventBlockNumber, 
            timestamp: estimatedTimestamp,
            type: logTypeNum as domain.LogType,
            attacker: caster || undefined,
            defender: target || undefined, 
            areaId: snapshotAreaId,
            isPlayerInitiated: isPlayer, 
            details: { value: log.value }, 
            displayMessage: displayMessage 
          };
          
          allEventLogs.push(newEventMessage);
          break;
        }
        case domain.LogType.Ascend: {
           const participant = findCharacterParticipantByIndex(mainPlayerIdx, combatants, noncombatants, raw.character);
           const isPlayer = !!ownerCharacterId && !!participant && participant.id === ownerCharacterId;
           
           // Enhanced fallback for missing character names
           let participantName: string;
           if (participant?.name) {
             participantName = isPlayer ? "You" : participant.name;
           } else {
             participantName = `Character (Index ${mainPlayerIdx})`;
           }
           
           const displayMessage = `${participantName} died.`;
           const newEventMessage: domain.EventMessage = {
              logIndex: logIndex,
              blocknumber: eventBlockNumber, 
              timestamp: estimatedTimestamp,
              type: logTypeNum as domain.LogType,
              attacker: participant || undefined,
              areaId: snapshotAreaId, // Use determined snapshotAreaId
              isPlayerInitiated: isPlayer, 
              details: { value: log.value }, 
              displayMessage: displayMessage 
           };
           allEventLogs.push(newEventMessage);
           break;
        }
        default: {
          // Handle unknown log types
          console.warn(`[contractToWorldSnapshot] Encountered unknown log type: ${logTypeNum}`, log);
          const participant = findCharacterParticipantByIndex(mainPlayerIdx, combatants, noncombatants, raw.character);
          const isPlayer = !!ownerCharacterId && !!participant && participant.id === ownerCharacterId;
          
          const displayMessage = `Unknown event: type ${logTypeNum}, value ${log.value?.toString()}, mainIdx ${mainPlayerIdx}, otherIdx ${otherPlayerIdx}`;
          
          const newEventMessage: domain.EventMessage = {
            logIndex: logIndex,
            blocknumber: eventBlockNumber,
            timestamp: estimatedTimestamp,
            type: domain.LogType.Unknown, // Use the Unknown type
            attacker: participant || undefined, // Assign main player as attacker for context
            defender: findCharacterParticipantByIndex(otherPlayerIdx, combatants, noncombatants, raw.character) || undefined,
            areaId: snapshotAreaId, // Use determined snapshotAreaId
            isPlayerInitiated: isPlayer,
            details: { 
              value: log.value,
              // Include other raw details if they might be relevant for unknown types
              hit: log.hit,
              critical: log.critical,
              damageDone: log.damageDone,
              healthHealed: log.healthHealed,
              targetDied: log.targetDied,
              lootedWeaponID: log.lootedWeaponID,
              lootedArmorID: log.lootedArmorID,
              experience: log.experience
            },
            displayMessage: displayMessage,
          };
          allEventLogs.push(newEventMessage);
          break;
        }
      }
    });
  });

  if (allChatMessages.length > 0) {
    console.log(`[contractToWorldSnapshot] Processed ${allChatMessages.length} chat messages and ${allEventLogs.length} event logs.`);
  }

  // Sort by estimated timestamp, then log index
  allChatMessages.sort((a, b) => a.timestamp === b.timestamp ? a.logIndex - b.logIndex : a.timestamp - b.timestamp);
  allEventLogs.sort((a, b) => a.timestamp === b.timestamp ? a.logIndex - b.logIndex : a.timestamp - b.timestamp);

  const mappedSessionKeyData = mapSessionKeyData(raw.sessionKeyData, owner);

  // Create the domain world snapshot (Now includes eventLogs and chatLogs)
  const partialWorldSnapshot: domain.WorldSnapshot = {
    characterID: raw.characterID || '',
    sessionKeyData: mappedSessionKeyData,
    character: mapCharacter(raw.character),
    combatants: (raw.combatants || []).map(mapCharacterLite),
    noncombatants: (raw.noncombatants || []).map(mapCharacterLite),
    eventLogs: allEventLogs,
    chatLogs: allChatMessages,
    balanceShortfall: raw.balanceShortfall || BigInt(0),
    unallocatedAttributePoints: Number(raw.unallocatedAttributePoints || 0),
    lastBlock: Number(raw.endBlock || 0)
  };

  return partialWorldSnapshot;
}

// --- NEW MAPPER --- 
/**
 * Maps a full contract Character object to a domain CharacterLite object.
 */
export function mapCharacterToCharacterLite(
  rawCharacter: contract.Character | null
): domain.CharacterLite | null {
  if (!rawCharacter) return null;

  // Reuse existing logic where possible
  const mappedClass = mapContractClassToDomain(rawCharacter.stats.class);
  const mappedBuffs = mapStatusEffects(Number(rawCharacter.stats.buffs));
  const mappedDebuffs = mapStatusEffects(Number(rawCharacter.stats.debuffs));

  return {
    id: rawCharacter.id,
    index: Number(rawCharacter.stats.index || 0),
    name: rawCharacter.name || 'Unknown',
    class: mappedClass,
    level: Number(rawCharacter.stats.level || 0),
    health: Number(rawCharacter.stats.health || 0),
    maxHealth: Number(rawCharacter.maxHealth || 0),
    buffs: mappedBuffs,
    debuffs: mappedDebuffs,
    ability: { // Use active ability details from full character
      ability: (rawCharacter.activeAbility.ability !== undefined && rawCharacter.activeAbility.ability !== null ? Number(rawCharacter.activeAbility.ability) : domain.Ability.None) as domain.Ability,
      stage: Number(rawCharacter.activeAbility.stage || 0),
      targetIndex: 0, // Placeholder
      taskAddress: '', // Placeholder
      targetBlock: Number(rawCharacter.activeAbility.targetBlock || 0)
    },
    weaponName: rawCharacter.weapon?.name || '',
    armorName: rawCharacter.armor?.name || '',
    areaId: createAreaID(Number(rawCharacter.stats.depth), Number(rawCharacter.stats.x), Number(rawCharacter.stats.y)),
    isDead: rawCharacter.tracker?.died || false
  };
}
// --- END NEW MAPPER ---