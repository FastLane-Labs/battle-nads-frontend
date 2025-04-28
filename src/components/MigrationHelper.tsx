/**
 * Migration Helper
 * 
 * This file provides a backward compatibility layer for components 
 * still using the old useGameData hook from GameDataProvider
 * 
 * It should be imported where useGameData was previously used:
 * import { useGameData } from './MigrationHelper'
 */

import { useMemo } from 'react';
import { useGame } from '../hooks/game/useGame';
import { useChat } from '../hooks/game/useChat';
import { useCombat } from '../hooks/game/useCombat';
import { useCharacter } from '../hooks/game/useCharacter';
import { useEquipment } from '../hooks/game/useEquipment';
import { useSessionFunding } from '../hooks/session/useSessionFunding';

export function useGameData() {
  // Get data from our specialized hooks
  const game = useGame();
  const chat = useChat();
  const combat = useCombat();
  const character = useCharacter();
  const equipment = useEquipment();
  const session = useSessionFunding(character.characterId ?? null);
  
  // Create a compatibility layer that mimics the old GameDataProvider structure
  const compatData = useMemo(() => {
    return {
      // Basic game state
      isPolling: game.isLoading,
      character: game.character,
      characterId: game.characterId,
      others: game.others || [],
      movementOptions: game.movementOptions,
      position: game.position,
      
      // Session key
      sessionKey: session.sessionKey,
      sessionKeyState: session.sessionKeyState,
      
      // Chat logs
      chatLogs: chat.chatLogs,
      processedChatMessages: chat.chatLogs.map(msg => ({
        sender: msg.characterName,
        message: msg.message,
        timestamp: msg.timestamp
      })),
      
      // Items/equipment
      equipableWeapons: equipment.weaponOptions,
      equipableArmors: equipment.armorOptions,
      
      // Combat
      isInCombat: combat.isInCombat,
      combatants: combat.combatants,
      
      // Actions
      moveCharacter: game.moveCharacter,
      attack: combat.attack,
      sendMessage: chat.sendChatMessage,
      equipWeapon: equipment.equipWeapon,
      equipArmor: equipment.equipArmor,
      allocatePoints: character.allocatePoints,
      
      // Loading states
      isMoving: game.isMoving,
      isAttacking: combat.isAttacking,
      isSendingChat: chat.isSending
    };
  }, [game, chat, combat, character, equipment, session]);
  
  return compatData;
} 