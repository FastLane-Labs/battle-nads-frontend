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

export function enrichLog(raw: LogEntryRaw): LogEntryRich {
  switch (raw.type) {
    case LogType.Combat: {
      if (!raw.attacker || !raw.defender) {
        return { ...raw, text: raw.displayMessage };
      }

      const actor = raw.actor || participantToCharacterLite(raw.attacker);
      const target = raw.target || participantToCharacterLite(raw.defender);
      
      const actorName = formatActorName(actor);
      const targetName = formatActorName(target);
      const weaponName = actor.weaponId ? getWeaponName(actor.weaponId) : "bare hands";
      
      let verb = "hits";
      if (isMonster(actor)) {
        verb = pickAttackVerb(actor.index, raw.logIndex);
      } else {
        verb = raw.details.critical ? "critically strikes" : "strikes";
      }

      const damageText = raw.details.damageDone ? ` for ${raw.details.damageDone} damage` : "";
      const criticalText = raw.details.critical ? " **CRITICAL HIT!**" : "";
      const deathText = raw.details.targetDied ? ` **${targetName} falls!**` : "";
      
      return {
        ...raw,
        text: `${actorName} ${verb} ${targetName}${damageText} with ${weaponName}.${criticalText}${deathText}`,
      };
    }

    case LogType.Ability: {
      if (!raw.attacker) {
        return { ...raw, text: raw.displayMessage };
      }

      const actor = raw.actor || participantToCharacterLite(raw.attacker);
      const target = raw.target || (raw.defender ? participantToCharacterLite(raw.defender) : null);
      
      const actorName = formatActorName(actor);
      const targetName = target ? formatActorName(target) : "";
      
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
      const actorName = formatActorName(actor);
      
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
      const actorName = formatActorName(actor);
      
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
      
      const actorName = formatActorName(actor);
      const targetName = formatActorName(target);
      
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
      const actorName = formatActorName(actor);
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