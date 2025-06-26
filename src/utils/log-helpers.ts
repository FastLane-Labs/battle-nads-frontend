import {
  MONSTER_NAMES,
  NAMED_BOSSES,
  MONSTER_ATTACKS,
  CLASS_SIGNATURES,
  PLAYER_TITLES,
  WEAPON_NAMES,
  ARMOR_NAMES,
} from "@/data/combat-data";
import { CharacterClass } from "@/types/domain/enums";
import type { EventParticipant } from "@/types/domain/dataFeed";

export interface CharacterLite {
  class: CharacterClass;
  index: number;
  level: number;
  name: string;
  weaponId?: number;
  armorId?: number;
}

export function formatActorName(char: CharacterLite, isPlayer: boolean = false, isTarget: boolean = false): string {
  if (char.class >= CharacterClass.Basic && char.class <= CharacterClass.Boss) {
    // Use the pre-resolved name from the event data if available, otherwise lookup by index
    const baseName = char.name || MONSTER_NAMES[char.index] || `Unknown Monster ${char.index}`;
    
    if (char.class === CharacterClass.Elite) {
      return `Elite ${baseName}`;
    }
    
    if (char.class === CharacterClass.Boss) {
      if (char.level < 16) {
        return "Dungeon Floor Boss";
      }
      // For bosses, if we have a pre-resolved name, use it directly
      if (char.name && char.name !== baseName) {
        return char.name; // Use the pre-resolved boss name from event data
      }
      
      if (char.level >= 46 && char.level <= 60) {
        const namedBoss = NAMED_BOSSES[char.level];
        if (namedBoss) return namedBoss;
      }
      if (char.level > 60) {
        return "Keone";
      }
      if (char.level >= 24 && char.level < 46) {
        const prefixes = ["Dread", "Nightmare", "Infernal"];
        const prefix = prefixes[char.level % prefixes.length];
        return `${prefix} ${baseName} Boss`;
      }
      return `${baseName} Boss`;
    }
    
    return baseName;
  } else if (char.class >= CharacterClass.Bard && char.class <= CharacterClass.Sorcerer) {
    // For player characters, show "You"/"you" if it's the current player, otherwise show name with title
    if (isPlayer) {
      return isTarget ? "you" : "You";
    }
    
    const title = getPlayerTitle(char);
    return title ? `${title} ${char.name}` : char.name;
  } else {
    // For Null or unknown classes, just use the name directly
    if (isPlayer) {
      return isTarget ? "you" : "You";
    }
    return char.name;
  }
}

export function getPlayerTitle(char: CharacterLite): string {
  const className = CharacterClass[char.class] as keyof typeof PLAYER_TITLES;
  if (className && PLAYER_TITLES[className]) {
    return PLAYER_TITLES[className](char.level);
  }
  return "";
}

export function pickAttackVerb(monsterIdx: number, logIndex?: number): string {
  const verbs = MONSTER_ATTACKS[monsterIdx] ?? ["hits"];
  // Use logIndex as seed for deterministic selection to prevent re-render changes
  const seed = logIndex ?? monsterIdx;
  return verbs[seed % verbs.length];
}

export function getSignatureAbility(char: CharacterLite) {
  const clsName = CharacterClass[char.class] as keyof typeof CLASS_SIGNATURES;
  return CLASS_SIGNATURES[clsName]?.(char.level);
}

export function getWeaponName(weaponId: number): string {
  return WEAPON_NAMES[weaponId] || `Unknown Weapon ${weaponId}`;
}

export function getArmorName(armorId: number): string {
  return ARMOR_NAMES[armorId] || `Unknown Armor ${armorId}`;
}

export function participantToCharacterLite(
  participant: EventParticipant,
  extraData?: Partial<CharacterLite>
): CharacterLite {
  return {
    class: extraData?.class ?? CharacterClass.Null,
    index: participant.index,
    level: extraData?.level ?? 1,
    name: participant.name,
    weaponId: extraData?.weaponId,
    armorId: extraData?.armorId,
  };
}

export function isMonster(char: CharacterLite): boolean {
  return char.class >= CharacterClass.Basic && char.class <= CharacterClass.Boss;
}

export function isPlayer(char: CharacterLite): boolean {
  return char.class >= CharacterClass.Bard && char.class <= CharacterClass.Sorcerer;
}