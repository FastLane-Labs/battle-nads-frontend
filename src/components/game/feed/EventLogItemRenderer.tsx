import React from 'react';
import { Box, Text, chakra, Tooltip, Flex } from '@chakra-ui/react';
import { domain } from '@/types';
import { useCombatFeed } from '@/hooks/game/useCombatFeed';
import { enrichLog, type LogEntryRaw } from '@/utils/log-builder';
import { participantToCharacterLite, type CharacterLite } from '@/utils/log-helpers';

// Helper functions for ability mapping
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

function getGlobalAbilityFromClassAndTarget(characterClass: domain.CharacterClass, hasTarget: boolean): domain.Ability {
  if (hasTarget) {
    return getOffensiveAbilityForClass(characterClass);
  } else {
    return getDefensiveAbilityForClass(characterClass);
  }
}

interface EventLogItemRendererProps { 
  event: domain.EventMessage;
  playerIndex: number | null; 
  getWeaponName?: ((weaponId: number | null | undefined) => string) | null;
  getArmorName?: ((armorId: number | null | undefined) => string) | null;
  playerCharacterClass?: domain.CharacterClass;
  combatants?: domain.CharacterLite[];
  playerWeaponName?: string;
  currentAreaId?: bigint;
  playerCharacterName?: string;
  isPreEnriched?: boolean; // Indicates if event.text is already enriched
}

const getEventColor = (type: domain.LogType | number) => {
  switch (Number(type)) {
    case domain.LogType.Combat:
    case domain.LogType.InstigatedCombat:
    case domain.LogType.Ascend:
      return 'red.400';
    case domain.LogType.EnteredArea:
    case domain.LogType.LeftArea:
      return 'blue.400';
    case domain.LogType.Ability:
      return 'purple.400';
    case domain.LogType.Chat:
      return 'green.400';
    case domain.LogType.Unknown:
    default:
      return 'gray.400';
  }
};

// Helper function to check if a numeric detail should be displayed
const shouldShowDetail = (value: any, minValue: number = 0): boolean => {
  return value != null && !isNaN(Number(value)) && Number(value) > minValue;
};

export const EventLogItemRenderer: React.FC<EventLogItemRendererProps> = ({ 
  event, 
  playerIndex, 
  getWeaponName, 
  getArmorName,
  playerCharacterClass,
  combatants,
  playerWeaponName,
  currentAreaId,
  playerCharacterName,
  isPreEnriched = false
}) => {

  // Helper to extract numeric ID from equipment names (if they follow a pattern)
  const extractIdFromName = React.useCallback((name: string): number | undefined => {
    // This is a simple heuristic - equipment names might not have IDs
    // For now, return undefined and rely on other data sources
    return undefined;
  }, []);

  // Helper to infer character class from participant data
  const inferCharacterClass = React.useCallback((participant: domain.EventParticipant): domain.CharacterClass => {
    // Check if it's the player by name (since indices can change between areas)
    const isPlayerByName = participant.name === "You" || 
                          (playerCharacterName && participant.name === playerCharacterName);
    
    if (isPlayerByName && playerCharacterClass) {
      return playerCharacterClass;
    }
    
    // For NPCs, default to Basic monster class
    return domain.CharacterClass.Basic;
  }, [playerCharacterName, playerCharacterClass]);

  // Helper function to create CharacterLite from event data
  const createCharacterLiteFromEvent = React.useCallback((
    participant: domain.EventParticipant,
    event: domain.EventMessage,
    combatants?: domain.CharacterLite[]
  ): CharacterLite => {
    // Try to find more detailed character info from combatants list
    const fullCharacter = combatants?.find(c => c.id === participant.id);
    
    if (fullCharacter) {
      const weaponId = extractIdFromName(fullCharacter.weaponName);
      
      return {
        class: fullCharacter.class,
        index: participant.index,
        level: fullCharacter.level,
        name: participant.name,
        // Try to extract weapon/armor IDs from names if possible
        weaponId: weaponId,
        armorId: extractIdFromName(fullCharacter.armorName),
      };
    }

    // Fallback to participant data with some smart defaults
    return participantToCharacterLite(participant, {
      class: inferCharacterClass(participant),
      level: 1, // Default level
    });
  }, [extractIdFromName, inferCharacterClass]);

  // Enrich the event log with better formatting (only if not pre-enriched)
  const enrichedLog = React.useMemo(() => {
    if (isPreEnriched && 'text' in event) {
      // Event is already enriched by useCombatFeed, use it directly
      return event as any; // Type assertion since pre-enriched events have text property
    }
    
    // Fallback to individual enrichment for backwards compatibility
    const logEntryRaw: LogEntryRaw = {
      ...event,
      actor: event.attacker ? createCharacterLiteFromEvent(event.attacker, event, combatants) : undefined,
      target: event.defender ? createCharacterLiteFromEvent(event.defender, event, combatants) : undefined,
    };
    return enrichLog(logEntryRaw, playerIndex, playerWeaponName, currentAreaId, playerCharacterName);
  }, [event, combatants, createCharacterLiteFromEvent, playerIndex, playerWeaponName, currentAreaId, playerCharacterName, isPreEnriched]);

  // Generate display message based on event data (fallback)
  const generateDisplayMessage = (): string => {
    const getDisplayName = (participant: domain.EventParticipant | undefined): string => {
      if (!participant) return "Unknown";
      
      // Use Number() to ensure proper comparison between potentially mixed types
      if (playerIndex !== null && Number(participant.index) === Number(playerIndex)) {
        return "You";
      }
      
      // Since participants are now resolved at event creation time, we can trust the stored name
      return participant.name || `Character ${participant.index}`;
    };

    const attackerName = getDisplayName(event.attacker);
    const defenderName = getDisplayName(event.defender);

    const eventTypeNum = Number(event.type);
    
    // Removed constant logging - too much noise

    switch (eventTypeNum) {
      case domain.LogType.Combat:
        if (event.details?.hit) {
          const damage = shouldShowDetail(event.details.damageDone) 
            ? ` for ${event.details.damageDone} damage` : '';
          const critical = event.details.critical ? ' (Critical!)' : '';
          const weaponInfo = ' with their fists'; // Default for now
          return `${attackerName} hits ${defenderName}${damage}${critical}${weaponInfo}.`;
        } else {
          return `${attackerName} misses ${defenderName}.`;
        }
      
      case domain.LogType.Ability:
        const hasTarget = !!event.defender;
        let abilityName = 'an ability';
        
        const isPlayerAbility = playerIndex !== null && Number(event.attacker?.index) === Number(playerIndex);
        
        if (isPlayerAbility && playerCharacterClass !== undefined) {
          const globalAbility = getGlobalAbilityFromClassAndTarget(playerCharacterClass, hasTarget);
          abilityName = domain.Ability[globalAbility] || `Ability ${globalAbility}`;
        } else {
          abilityName = hasTarget ? 'an offensive ability' : 'a defensive ability';
        }
        
        return hasTarget 
          ? `${attackerName} used ${abilityName} on ${defenderName}.`
          : `${attackerName} used ${abilityName}.`;
      
      case domain.LogType.InstigatedCombat:
        return `${attackerName} started combat with ${defenderName}.`;
      
      case domain.LogType.EnteredArea:
        return `${attackerName} entered the area (${event.areaId}).`;
      
      case domain.LogType.LeftArea:
        return `${attackerName} left the area.`;
      
      case domain.LogType.Ascend:
        return `${attackerName} died.`;
      
      default:
        // Handle events with defenders/targets
        if (event.defender) {
          return `${attackerName} performed an action against ${defenderName}.`;
        }
        return `${attackerName} performed an action.`;
    }
  };

  // Use enriched log text if available, otherwise fall back to existing logic
  const isAbilityEvent = Number(event.type) === domain.LogType.Ability;
  const generatedMessage = generateDisplayMessage();
  const displayMessage = enrichedLog.text || (isAbilityEvent 
    ? generatedMessage 
    : (event.displayMessage || generatedMessage));
    
  // Debug logging for any message containing zeros
  if (displayMessage && (displayMessage.includes(' 0') || displayMessage.includes('0 ') || displayMessage.endsWith('0'))) {
    console.log('[EventLogItemRenderer] Message contains zero:', {
      displayMessage,
      enrichedText: enrichedLog.text,
      originalMessage: event.displayMessage,
      generatedMessage,
      eventType: domain.LogType[event.type] || event.type,
      details: event.details,
      isPreEnriched,
      hasEnrichedText: !!enrichedLog.text,
      rawEvent: event
    });
  }
    
  // Removed constant logging - too much noise

  return (
    <Box fontSize={{ base: "xs", md: "sm" }} textAlign="left" minH={{ base: "45px", md: "40px" }} py={1}>
      <Flex alignItems="flex-start" justifyContent="space-between" gap={2} h="100%">
        <Box flex="1" minW="0">
          <Text 
            color={getEventColor(event.type)} 
            fontWeight="medium" 
            lineHeight="1.3"
            wordBreak="break-word"
            overflowWrap="break-word"
            mb={1}
          >
            {displayMessage}
            {/* Additional detailed information */}
            {event.count && event.count > 1 && (
              <chakra.span fontWeight="bold" ml={1}>({event.count}x)</chakra.span>
            )}
          </Text>
          
          {/* Details row */}
          <Flex flexWrap="wrap" gap={1}>
            {/* Damage dealt */}
            {shouldShowDetail(event.details?.damageDone) && (
              <chakra.span color="red.300" fontSize={{ base: "2xs", md: "xs" }} bg="rgba(239, 68, 68, 0.1)" px={1} borderRadius="sm">
                {Number(event.details.damageDone)} dmg
              </chakra.span>
            )}
            {/* Health healed */}
            {shouldShowDetail(event.details?.healthHealed) && (
              <chakra.span color="green.300" fontSize={{ base: "2xs", md: "xs" }} bg="rgba(34, 197, 94, 0.1)" px={1} borderRadius="sm">
                +{Number(event.details.healthHealed)} heal
              </chakra.span>
            )}
            {/* Experience gained */}
            {shouldShowDetail(event.details?.experience) && (
              <chakra.span color="purple.300" fontSize={{ base: "2xs", md: "xs" }} bg="rgba(147, 51, 234, 0.1)" px={1} borderRadius="sm">
                +{Number(event.details.experience)} XP
              </chakra.span>
            )}
            {!!(!isAbilityEvent && shouldShowDetail(event.details?.lootedWeaponID)) && (
              <chakra.span color="yellow.400" fontSize={{ base: "2xs", md: "xs" }} bg="rgba(251, 191, 36, 0.1)" px={1} borderRadius="sm">
                Looted: {(() => {
                  try {
                    const weaponId = Number(event.details.lootedWeaponID);
                    if (getWeaponName && typeof getWeaponName === 'function') {
                      const weaponName = getWeaponName(weaponId);
                      return weaponName || `Weapon ${weaponId}`;
                    }
                    return `Weapon ${weaponId}`;
                  } catch (error) {
                    console.warn('Error displaying weapon name:', error);
                    return 'Unknown Weapon';
                  }
                })()}
              </chakra.span>
            )}
            {!!(!isAbilityEvent && shouldShowDetail(event.details?.lootedArmorID)) && (
              <chakra.span color="yellow.400" fontSize={{ base: "2xs", md: "xs" }} bg="rgba(251, 191, 36, 0.1)" px={1} borderRadius="sm">
                Looted: {(() => {
                  try {
                    const armorId = Number(event.details.lootedArmorID);
                    if (getArmorName && typeof getArmorName === 'function') {
                      const armorName = getArmorName(armorId);
                      return armorName || `Armor ${armorId}`;
                    }
                    return `Armor ${armorId}`;
                  } catch (error) {
                    console.warn('Error displaying armor name:', error);
                    return 'Unknown Armor';
                  }
                })()}
              </chakra.span>
            )}
            {event.details?.targetDied && (
              <chakra.span color="red.500" fontWeight="bold" fontSize={{ base: "2xs", md: "xs" }} bg="rgba(239, 68, 68, 0.2)" px={1} borderRadius="sm">
                Target Died!
              </chakra.span>
            )}
          </Flex>
        </Box>
        
        <Tooltip label={`Block: ${event.blocknumber}, Idx: ${event.logIndex}`} fontSize="xs" hasArrow>
          <Text fontSize={{ base: "2xs", md: "xs" }} color="gray.500" whiteSpace="nowrap" mt={0.5}>
            {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </Tooltip>
      </Flex>
    </Box>
  );
}; 