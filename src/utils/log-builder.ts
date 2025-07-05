import { LogType, Ability } from "@/types/domain/enums";
import type { EventMessage } from "@/types/domain/dataFeed";
import {
  formatActorName,
  pickAttackVerb,
  getSignatureAbility,
  getWeaponName,
  getArmorName,
  participantToCharacterLite,
  isMonster,
  isPlayer,
  buildAttackMessage,
  type CharacterLite,
} from "./log-helpers";
import {
  calculateAbilityEnhancement,
  buildEnhancementText,
  isSelfTargetedAbility,
} from "./ability-enhancements";

export interface LogEntryRaw extends EventMessage {
  actor?: CharacterLite;
  target?: CharacterLite;
  ability?: string;
}

export interface LogEntryRich extends LogEntryRaw {
  text: string;
  shouldFilter?: boolean;
}

// Helper function to check if two player names are the same person (ignoring title changes)
function isSamePlayer(name1: string, name2: string): boolean {
  if (!name1 || !name2) return false;
  // Extract the base name (before " the ")
  const baseName1 = name1.split(" the ")[0];
  const baseName2 = name2.split(" the ")[0];
  return baseName1 === baseName2;
}

// Helper function to check if an event should be filtered
function shouldFilterEvent(raw: LogEntryRaw, abilityName?: string): boolean {
  // Filter out ability events with unknown abilities
  if (raw.type === LogType.Ability && abilityName === "Unknown Ability") {
    return true;
  }
  
  // TODO: Add other filtering conditions here as needed
  // Examples of other events you might want to filter:
  // - Events with missing critical data
  // - Events from specific areas or participants
  // - Debug/test events that shouldn't be shown to players
  // - Events with null or undefined essential data
  
  return false;
}

/**
 * Export the filtering function for testing and external use
 */
export function shouldFilterLogEvent(raw: LogEntryRaw, abilityName?: string): boolean {
  return shouldFilterEvent(raw, abilityName);
}

export function enrichLog(raw: LogEntryRaw, playerIndex?: number | null, playerWeaponName?: string, currentAreaId?: bigint, playerCharacterName?: string): LogEntryRich {
  switch (raw.type) {
    case LogType.Combat: {
      if (!raw.attacker || !raw.defender) {
        return { ...raw, text: raw.displayMessage };
      }

      const actor = raw.actor || participantToCharacterLite(raw.attacker);
      const target = raw.target || participantToCharacterLite(raw.defender);
      
      // Simple player detection: check if the name matches the player character name
      const isPlayerAttacker = raw.attacker?.name === "You" || 
                              (playerCharacterName && raw.attacker?.name === playerCharacterName) ||
                              (playerCharacterName && isSamePlayer(raw.attacker?.name || '', playerCharacterName));
      const isPlayerDefender = raw.defender?.name === "You" || 
                              (playerCharacterName && raw.defender?.name === playerCharacterName) ||
                              (playerCharacterName && isSamePlayer(raw.defender?.name || '', playerCharacterName));

      const isActorPlayer = isPlayerAttacker;
      const isTargetPlayer = isPlayerDefender;
            
      const actorName = formatActorName(actor, isActorPlayer || false, false);
      const targetName = formatActorName(target, isTargetPlayer || false, true);

      // Get weapon name - different logic for monsters vs players
      let weaponName = "";
      
      // Debug logging for weapon resolution
      console.log('[enrichLog] Combat event weapon debug:', {
        actorName,
        isActorPlayer,
        playerWeaponName,
        playerCharacterName,
        actor: {
          weaponId: actor.weaponId,
          index: actor.index,
          name: actor.name,
          class: actor.class
        },
        isMonster: isMonster(actor),
        rawAttacker: raw.attacker,
        rawDefender: raw.defender
      });
      
      if (isMonster(actor)) {
        // Monsters use natural weapons, don't show weapon name in message
        weaponName = "";
      } else if (isActorPlayer && playerWeaponName) {
        // For the current player, use their actual weapon name
        weaponName = playerWeaponName.toLowerCase().replace(/^(a |an |the )/i, ''); // Remove articles for "with X" format
      } else if (actor.weaponId) {
        // Use weapon ID to get name if available
        weaponName = getWeaponName(actor.weaponId);
      } else {
        // For other players without weapon info, use generic text
        weaponName = "their weapon";
      }
      
      console.log('[enrichLog] Final weapon name:', weaponName);
      
      let verb = "hits";
      if (isMonster(actor)) {
        verb = pickAttackVerb(actor.index, raw.logIndex);
      } else {
        // Use correct grammar: "You strike" vs "John strikes"
        if (isActorPlayer) {
          verb = raw.details.critical ? "critically strike" : "strike";
        } else {
          verb = raw.details.critical ? "critically strikes" : "strikes";
        }
      }

      // Build the message using the improved text generation
      const damageText = raw.details.damageDone ? ` for ${raw.details.damageDone} damage` : "";
      const criticalText = raw.details.critical ? " **CRITICAL HIT!**" : "";
      const deathText = raw.details.targetDied ? ` **${targetName} falls!**` : "";
      const weaponText = weaponName ? ` with ${weaponName}` : "";
      
      if (isMonster(actor)) {
        // Use buildAttackMessage for monsters to handle complex verb structures
        const isHit: boolean = Boolean(raw.details.hit);
        const message = buildAttackMessage(
          verb as string, 
          actorName as string, 
          targetName as string, 
          isTargetPlayer as boolean, 
          isHit, 
          damageText as string, 
          criticalText as string, 
          deathText as string
        );
        return {
          ...raw,
          text: message,
        };
      } else {
        // For players/other characters, handle misses and hits separately
        if (!Boolean(raw.details.hit)) {
          return {
            ...raw,
            text: `${actorName} ${isActorPlayer ? "miss" : "misses"} ${targetName}.`,
          };
        }
        
        // For player hits: "You critically strike The Beast for 574 damage with battle axe."
        return {
          ...raw,
          text: `${actorName} ${verb} ${targetName}${damageText}${weaponText}.${criticalText}${deathText}`,
        };
      }
    }

    case LogType.Ability: {
      if (!raw.attacker) {
        return { ...raw, text: raw.displayMessage };
      }

      const actor = raw.actor || participantToCharacterLite(raw.attacker);
      const target = raw.target || (raw.defender ? participantToCharacterLite(raw.defender) : null);
      
      const isPlayerAttacker = raw.attacker?.name === "You" || 
                              (playerCharacterName && raw.attacker?.name === playerCharacterName) ||
                              (playerCharacterName && isSamePlayer(raw.attacker?.name || '', playerCharacterName));
      const isPlayerDefender = raw.defender?.name === "You" || 
                              (playerCharacterName && raw.defender?.name === playerCharacterName) ||
                              (playerCharacterName && isSamePlayer(raw.defender?.name || '', playerCharacterName));
      const isCurrentArea = currentAreaId === undefined || raw.areaId === currentAreaId;
      
      const isActorPlayer = isPlayerAttacker && isCurrentArea;
      const isTargetPlayer = isPlayerDefender && isCurrentArea;
      
      const actorName = formatActorName(actor, isActorPlayer || false, false);
      const targetName = target ? formatActorName(target, isTargetPlayer || false) : "";
      
      // Extract ability ID from lootedWeaponID (overloaded field) - convert BigInt to number
      const rawAbilityId = raw.details.lootedWeaponID;
      const abilityId = rawAbilityId ? Number(rawAbilityId) : undefined;
      const rawStage = raw.details.lootedArmorID;
      const stage = rawStage ? Number(rawStage) : undefined;
      
      // Get proper ability name using getAbilityName function
      let abilityName = "Unknown Ability";
      if (abilityId && abilityId !== 0) {
        abilityName = getAbilityName(abilityId);
      } else {
        // Fallback to raw ability name if lootedWeaponID is not set
        abilityName = raw.ability || abilityName;
      }

      // Check if this event should be filtered
      const shouldFilter = shouldFilterEvent(raw, abilityName);
      if (shouldFilter) {
        return {
          ...raw,
          text: "", // Empty text for filtered events
          shouldFilter: true,
        };
      }

      // Calculate level-based enhancement
      const rawValue = raw.details.damageDone || raw.details.healthHealed || 0;
      const enhancement = calculateAbilityEnhancement(abilityId || 0, actor, rawValue, stage);
      
      // Determine target type
      const isSelfTargeted = isSelfTargetedAbility(raw, Boolean(isPlayerAttacker), Boolean(isPlayerDefender));
      const isTargeted = Boolean(target);
      
      // Build enhancement text
      const enhancementText = buildEnhancementText(enhancement, isTargeted, isSelfTargeted);

      // Build message using the requested format: "You use Ability <Name> against <Target> with <Enhancement>"
      const verb = isActorPlayer ? "use" : "uses";
      let targetText = "";
      
      if (isSelfTargeted) {
        // For self-targeted, the enhancement text already includes "on themselves"
        targetText = "";
      } else if (isTargeted) {
        targetText = `against ${targetName} `;
      }
      
      const finalMessage = `${actorName} ${verb} Ability **${abilityName}** ${targetText}${enhancementText}.`;

      return {
        ...raw,
        text: finalMessage,
      };
    }

    case LogType.EnteredArea: {
      if (!raw.attacker) {
        return { ...raw, text: raw.displayMessage };
      }

      const actor = raw.actor || participantToCharacterLite(raw.attacker);
      const isPlayerAttacker = raw.attacker?.name === "You" || 
                              (playerCharacterName && raw.attacker?.name === playerCharacterName) ||
                              (playerCharacterName && isSamePlayer(raw.attacker?.name || '', playerCharacterName));
      const isCurrentArea = currentAreaId === undefined || raw.areaId === currentAreaId;
      const isActorPlayer = isPlayerAttacker && isCurrentArea;
      const actorName = formatActorName(actor, isActorPlayer || false, false);
      
      return {
        ...raw,
        text: `${actorName} entered the area (${raw.areaId}).`,
      };
    }

    case LogType.LeftArea: {
      if (!raw.attacker) {
        return { ...raw, text: raw.displayMessage };
      }

      const actor = raw.actor || participantToCharacterLite(raw.attacker);
      const isPlayerAttacker = raw.attacker?.name === "You" || 
                              (playerCharacterName && raw.attacker?.name === playerCharacterName) ||
                              (playerCharacterName && isSamePlayer(raw.attacker?.name || '', playerCharacterName));
      const isCurrentArea = currentAreaId === undefined || raw.areaId === currentAreaId;
      const isActorPlayer = isPlayerAttacker && isCurrentArea;
      const actorName = formatActorName(actor, isActorPlayer || false, false);
      
      return {
        ...raw,
        text: `${actorName} left the area (${raw.areaId}).`,
      };
    }

    case LogType.InstigatedCombat: {
      if (!raw.attacker || !raw.defender) {
        return { ...raw, text: raw.displayMessage };
      }

      const actor = raw.actor || participantToCharacterLite(raw.attacker);
      const target = raw.target || participantToCharacterLite(raw.defender);
      
      const isPlayerAttacker = playerIndex !== null && raw.attacker && Number(raw.attacker.index) === Number(playerIndex);
      const isPlayerDefender = playerIndex !== null && raw.defender && Number(raw.defender.index) === Number(playerIndex);
      const isCurrentArea = currentAreaId === undefined || raw.areaId === currentAreaId;
      
      const isActorPlayer = isPlayerAttacker && isCurrentArea;
      const isTargetPlayer = isPlayerDefender && isCurrentArea;
      
      const actorName = formatActorName(actor, isActorPlayer || false, false);
      const targetName = formatActorName(target, isTargetPlayer || false, true);
      
      return {
        ...raw,
        text: `${actorName} initiated combat with ${targetName}!`,
      };
    }

    case LogType.Ascend: {
      if (!raw.attacker) {
        return { ...raw, text: raw.displayMessage };
      }

      const actor = raw.actor || participantToCharacterLite(raw.attacker);
      const isPlayerAttacker = raw.attacker?.name === "You" || 
                              (playerCharacterName && raw.attacker?.name === playerCharacterName) ||
                              (playerCharacterName && isSamePlayer(raw.attacker?.name || '', playerCharacterName));
      const isCurrentArea = currentAreaId === undefined || raw.areaId === currentAreaId;
      const isActorPlayer = isPlayerAttacker && isCurrentArea;
      const actorName = formatActorName(actor, isActorPlayer || false, false);
      const experience = raw.details.experience || 0;
      
      return {
        ...raw,
        text: `${actorName} gained ${experience} experience and advanced to the next level!`,
      };
    }

    case LogType.Chat:
      return { ...raw, text: raw.displayMessage };

    default:
      return { ...raw, text: raw.displayMessage };
  }
}

export function getAbilityName(abilityId: number): string {
  switch (abilityId) {
    case Ability.SingSong:
      return "Sing Song";
    case Ability.DoDance:
      return "Do Dance";
    case Ability.ShieldBash:
      return "Shield Bash";
    case Ability.ShieldWall:
      return "Shield Wall";
    case Ability.EvasiveManeuvers:
      return "Evasive Maneuvers";
    case Ability.ApplyPoison:
      return "Apply Poison";
    case Ability.Pray:
      return "Pray";
    case Ability.Smite:
      return "Smite";
    case Ability.Fireball:
      return "Fireball";
    case Ability.ChargeUp:
      return "Charge Up";
    default:
      return "Unknown Ability";
  }
}