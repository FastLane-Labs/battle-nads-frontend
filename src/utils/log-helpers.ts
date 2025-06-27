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

interface VerbInfo {
  verb: string;
  isComplete: boolean; // true if verb already includes target relationship
  needsTargetInsertion: boolean; // true if verb needs target inserted within the phrase
}

export function pickAttackVerb(monsterIdx: number, logIndex?: number): string {
  const verbs = MONSTER_ATTACKS[monsterIdx] ?? ["hits"];
  // Use logIndex as seed for deterministic selection to prevent re-render changes
  const seed = logIndex ?? monsterIdx;
  return verbs[seed % verbs.length];
}

export function getVerbInfo(verb: string): VerbInfo {
  // Verbs that already contain prepositions and need the target inserted within them
  const needsTargetInsertion = [
    'manifests darkness near',
    'embodies primal terror against',
    'breathes fire at',
    'hurls massive boulders at',
    'casts bone-shatter spell on',
    'pounds ground near',
    'perches menacingly near',
    'regenerates near',
    'raises undead near'
  ];
  
  // Check if this verb needs target insertion
  const requiresInsertion = needsTargetInsertion.some(pattern => verb.includes(pattern));
  
  // Check if verb already includes prepositions (complete phrase)
  const prepositions = ['at', 'toward', 'near', 'around', 'on', 'with', 'from', 'against'];
  const isComplete = prepositions.some(prep => verb.includes(` ${prep}`) || verb.endsWith(` ${prep}`));
  
  return {
    verb,
    isComplete,
    needsTargetInsertion: requiresInsertion
  };
}

export function buildAttackMessage(verb: string, actorName: string, targetName: string, isTargetPlayer: boolean, isHit: boolean, damageText: string = "", criticalText: string = "", deathText: string = ""): string {
  const verbInfo = getVerbInfo(verb);
  const target = isTargetPlayer ? "you" : targetName;
  const targetForAgainst = isTargetPlayer ? "against you" : `against ${targetName}`;
  
  if (!isHit) {
    // Handle misses - better word order
    if (verbInfo.needsTargetInsertion) {
      // For "manifests darkness near" -> "manifests darkness near you but misses"
      return `${actorName} ${verb} ${target} but misses.`;
    } else if (verbInfo.isComplete) {
      // For "oozes toward" -> "oozes toward you but misses"  
      return `${actorName} ${verb} ${target} but misses.`;
    } else {
      // For simple verbs like "strikes" -> "strikes at you but misses"
      return `${actorName} ${verb} at ${target} but misses.`;
    }
  }
  
  // Handle hits
  if (verbInfo.needsTargetInsertion) {
    // For "embodies primal terror against" -> "embodies primal terror against you for 32 damage"
    return `${actorName} ${verb} ${isTargetPlayer ? "you" : targetName}${damageText}.${criticalText}${deathText}`;
  } else if (verbInfo.isComplete) {
    // For "oozes toward" -> "oozes toward you for 32 damage"
    return `${actorName} ${verb} ${target}${damageText}.${criticalText}${deathText}`;
  } else {
    // For simple verbs -> "strikes you for 32 damage"
    return `${actorName} ${verb} ${target}${damageText}.${criticalText}${deathText}`;
  }
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