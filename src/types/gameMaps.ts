import { 
  GameState, 
  BattleNad, 
  BattleNadLite, 
  SessionKeyData, 
  StatusEffect,
  Position
} from './gameTypes';
import { PollFrontendDataReturn } from './contracts/BattleNadsEntrypoint';

/**
 * Maps contract data (PollFrontendDataReturn) to UI-friendly GameState
 * This centralizes all transformation logic to avoid duplication between hooks and providers
 */
export function mapUiSnapshotToGameState(
  data: PollFrontendDataReturn, 
  owner: string | null
): GameState {
  if (!data) {
    throw new Error('Cannot map undefined/null data to GameState');
  }

  // Extract position from character data
  const position: Position = {
    x: data.character?.stats?.x ?? 0,
    y: data.character?.stats?.y ?? 0,
    depth: data.character?.stats?.depth ?? 0
  };

  // Convert contract SessionKeyData to GameState SessionKeyData type
  const sessionKeyData: SessionKeyData = {
    owner: owner || '',
    key: data.sessionKeyData.key,
    balance: BigInt(0), // These would be populated with real data
    targetBalance: BigInt(0),
    ownerCommittedAmount: BigInt(0),
    ownerCommittedShares: BigInt(0),
    expiration: Number(data.sessionKeyData.expiration)
  };

  // Map character data
  const character = mapCharacter(data.character);
  
  // Map other characters (combatants and non-combatants)
  const others = mapOthers(data.combatants, data.noncombatants);

  // Transform the raw contract data into a structured GameState
  return {
    owner,
    character,
    others,
    position,
    movementOptions: data.movementOptions,
    eventLogs: data.eventLogs.map(log => ({
      message: log.content,
      timestamp: Number(log.timestamp)
    })),
    chatLogs: data.chatLogs.map(log => ({
      characterName: log.sender,
      message: log.content,
      timestamp: Number(log.timestamp)
    })),
    updates: {
      owner: true,
      character: true,
      sessionKey: true,
      others: new Array(64).fill(false), // Initialize a 64-length array
      position: true,
      combat: false,
      movementOptions: true,
      eventLogs: false,
      chatLogs: false,
      lastBlock: true,
      error: false
    },
    sessionKey: sessionKeyData,
    lastBlock: Number(data.endBlock)
  };
}

/**
 * Map contract character to BattleNad
 */
function mapCharacter(rawCharacter: any): BattleNad | null {
  if (!rawCharacter) return null;

  // Extract buffs/debuffs arrays
  const buffs: StatusEffect[] = [];
  const debuffs: StatusEffect[] = [];
  
  // Convert bitmaps to status effect arrays
  // (Actual implementation would parse bitmaps)

  return {
    id: rawCharacter.id,
    index: rawCharacter.stats?.index ?? 0,
    name: rawCharacter.name,
    class: rawCharacter.stats?.class,
    level: rawCharacter.stats?.level ?? 1,
    health: rawCharacter.stats?.health ?? 0,
    maxHealth: rawCharacter.maxHealth ?? 100,
    buffs,
    debuffs,
    stats: {
      unspentAttributePoints: rawCharacter.stats?.unspentAttributePoints ?? 0,
      buffs: rawCharacter.stats?.buffs ?? 0,
      debuffs: rawCharacter.stats?.debuffs ?? 0,
      experience: rawCharacter.stats?.experience ?? 0,
      strength: rawCharacter.stats?.strength ?? 0,
      vitality: rawCharacter.stats?.vitality ?? 0,
      dexterity: rawCharacter.stats?.dexterity ?? 0,
      quickness: rawCharacter.stats?.quickness ?? 0,
      sturdiness: rawCharacter.stats?.sturdiness ?? 0,
      luck: rawCharacter.stats?.luck ?? 0
    },
    weapon: rawCharacter.weapon,
    armor: rawCharacter.armor,
    availableWeapons: [], // Would populate from available weapons
    availableArmors: [], // Would populate from available armors
    position: {
      x: rawCharacter.stats?.x ?? 0,
      y: rawCharacter.stats?.y ?? 0,
      depth: rawCharacter.stats?.depth ?? 0
    },
    owner: rawCharacter.owner,
    activeTask: rawCharacter.activeTask,
    ability: rawCharacter.activeAbility,
    inventory: rawCharacter.inventory,
    unspentAttributePoints: rawCharacter.stats?.unspentAttributePoints ?? 0,
    isInCombat: Boolean(rawCharacter.stats?.combatantBitMap), // Non-zero combatantBitMap means in combat
    isDead: rawCharacter.tracker?.died ?? false
  };
}

/**
 * Map contract character lists to BattleNadLite arrays
 */
function mapOthers(rawCombatants: any[], rawNoncombatants: any[]): BattleNadLite[] {
  const result: BattleNadLite[] = [];
  
  // Process combatants
  if (Array.isArray(rawCombatants)) {
    rawCombatants.forEach(raw => {
      result.push({
        id: raw.id,
        index: raw.index,
        name: raw.name,
        class: raw.class,
        level: raw.level,
        health: raw.health,
        maxHealth: raw.maxHealth,
        buffs: [], // Would parse from bitmap
        debuffs: [], // Would parse from bitmap
        ability: {
          ability: raw.ability,
          stage: raw.abilityStage,
          targetIndex: 0,
          taskAddress: '',
          targetBlock: raw.abilityTargetBlock
        },
        weaponName: raw.weaponName,
        armorName: raw.armorName,
        isMonster: raw.class < 4, // Classes 0-3 are monsters
        isHostile: true,
        isDead: raw.isDead
      });
    });
  }
  
  // Process non-combatants
  if (Array.isArray(rawNoncombatants)) {
    rawNoncombatants.forEach(raw => {
      result.push({
        id: raw.id,
        index: raw.index,
        name: raw.name,
        class: raw.class,
        level: raw.level,
        health: raw.health,
        maxHealth: raw.maxHealth,
        buffs: [], // Would parse from bitmap
        debuffs: [], // Would parse from bitmap
        ability: {
          ability: raw.ability,
          stage: raw.abilityStage,
          targetIndex: 0,
          taskAddress: '',
          targetBlock: raw.abilityTargetBlock
        },
        weaponName: raw.weaponName,
        armorName: raw.armorName,
        isMonster: raw.class < 4, // Classes 0-3 are monsters
        isHostile: false,
        isDead: raw.isDead
      });
    });
  }
  
  return result;
} 