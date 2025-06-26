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
  type CharacterLite,
} from "./log-helpers";

export interface LogEntryRaw extends EventMessage {
  actor?: CharacterLite;
  target?: CharacterLite;
  ability?: string;
}

export interface LogEntryRich extends LogEntryRaw {
  text: string;
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
                              (playerCharacterName && raw.attacker?.name === playerCharacterName);
      const isPlayerDefender = raw.defender?.name === "You" || 
                              (playerCharacterName && raw.defender?.name === playerCharacterName);
      console.log('🔍 Player detection debug:', {
        isPlayerAttacker,
        isPlayerDefender,
        playerCharacterName,
        attackerName: raw.attacker?.name,
        defenderName: raw.defender?.name
      });
    
      const isActorPlayer = isPlayerAttacker
      const isTargetPlayer = isPlayerDefender
            
      const actorName = formatActorName(actor, isActorPlayer || false, false);
      const targetName = formatActorName(target, isTargetPlayer || false, true);

      // Get weapon name - different logic for monsters vs players
      let weaponName = "";
      if (isMonster(actor)) {
        // Monsters use natural weapons, don't show weapon name in message
        weaponName = "";
      } else if (actor.weaponId) {
        weaponName = getWeaponName(actor.weaponId);
      } else if (isPlayer(actor)) {
        // For player characters, use the passed weapon name if available
        if (raw.attacker && isActorPlayer && playerWeaponName) {
          // Use the actual weapon name for the current player
          weaponName = playerWeaponName.toLowerCase().replace(/^(a |an |the )/i, ''); // Remove articles for "with X" format
        } else if (raw.attacker && isActorPlayer) {
          weaponName = "your weapon"; // Fallback for current player
        } else {
          weaponName = "their weapon"; // Other players
        }
      } else {
        weaponName = "bare hands";
      }
      
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

      const damageText = raw.details.damageDone ? ` for ${raw.details.damageDone} damage` : "";
      const criticalText = raw.details.critical ? " **CRITICAL HIT!**" : "";
      const deathText = raw.details.targetDied ? ` **${targetName} falls!**` : "";
      const weaponText = weaponName ? ` with ${weaponName}` : "";
      
      // Different sentence structure for monsters vs players/other characters
      if (isMonster(actor)) {
        // For monsters: "The Beast stalks with ancient hunger for 32 damage against you."
        const targetText = isTargetPlayer ? "against you" : `against ${targetName}`;
        return {
          ...raw,
          text: `${actorName} ${verb}${damageText} ${targetText}.${criticalText}${deathText}`,
        };
      } else {
        // For players/other characters: "You critically strike The Beast for 574 damage with battle axe."
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
                              (playerCharacterName && raw.attacker?.name === playerCharacterName);
      const isPlayerDefender = raw.defender?.name === "You" || 
                              (playerCharacterName && raw.defender?.name === playerCharacterName);
      const isCurrentArea = currentAreaId === undefined || raw.areaId === currentAreaId;
      
      const isActorPlayer = isPlayerAttacker && isCurrentArea;
      const isTargetPlayer = isPlayerDefender && isCurrentArea;
      
      const actorName = formatActorName(actor, isActorPlayer || false, false);
      const targetName = target ? formatActorName(target, isTargetPlayer || false) : "";
      
      let abilityName = raw.ability;
      if (!abilityName) {
        const signature = getSignatureAbility(actor);
        abilityName = signature?.name || "an ability";
      }

      const damageText = raw.details.damageDone ? ` for ${raw.details.damageDone} damage` : "";
      const healingText = raw.details.healthHealed ? ` for ${raw.details.healthHealed} healing` : "";
      
      if (target) {
        return {
          ...raw,
          text: `${actorName} used **${abilityName}** on ${targetName}${damageText}${healingText}.`,
        };
      } else {
        return {
          ...raw,
          text: `${actorName} used **${abilityName}**${healingText}.`,
        };
      }
    }

    case LogType.EnteredArea: {
      if (!raw.attacker) {
        return { ...raw, text: raw.displayMessage };
      }

      const actor = raw.actor || participantToCharacterLite(raw.attacker);
      const isPlayerAttacker = raw.attacker?.name === "You" || 
                              (playerCharacterName && raw.attacker?.name === playerCharacterName);
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
                              (playerCharacterName && raw.attacker?.name === playerCharacterName);
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
                              (playerCharacterName && raw.attacker?.name === playerCharacterName);
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