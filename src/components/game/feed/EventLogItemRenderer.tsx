import React from 'react';
import { Box, Text, chakra, Tooltip, Flex } from '@chakra-ui/react';
import { domain } from '@/types';

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

export const EventLogItemRenderer: React.FC<EventLogItemRendererProps> = ({ 
  event, 
  playerIndex, 
  getWeaponName, 
  getArmorName,
  playerCharacterClass
}) => {

  // Generate display message based on event data
  const generateDisplayMessage = (): string => {
    const getDisplayName = (participant: domain.EventParticipant | undefined): string => {
      if (!participant) return "Unknown";
      if (playerIndex !== null && participant.index === playerIndex) {
        return "You";
      }
      return participant.name || `Index ${participant.index}`;
    };

    const attackerName = getDisplayName(event.attacker);
    const defenderName = getDisplayName(event.defender);

    const eventTypeNum = Number(event.type);

    switch (eventTypeNum) {
      case domain.LogType.Combat:
        if (event.details?.hit) {
          const damage = event.details.damageDone && Number(event.details.damageDone) > 0 
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
        return `${attackerName} entered the area.`;
      
      case domain.LogType.LeftArea:
        return `${attackerName} left the area.`;
      
      case domain.LogType.Ascend:
        return `${attackerName} died.`;
      
      default:
        return `${attackerName} performed an action.`;
    }
  };

  // For ability events, always generate our own message to get proper ability names
  const displayMessage = (Number(event.type) === domain.LogType.Ability) 
    ? generateDisplayMessage() 
    : (event.displayMessage || generateDisplayMessage());

  return (
    <Box fontSize="sm" textAlign="left">
      <Flex alignItems="flex-start" justifyContent="space-between" gap={2}>
        <Box flex="1" minW="0">
          <Text color={getEventColor(event.type)} fontWeight="medium" lineHeight="1.4">
            {displayMessage}
            {/* Additional detailed information */}
            {event.count && event.count > 1 && (
              <chakra.span fontWeight="bold" ml={1}>({event.count}x)</chakra.span>
            )}
          </Text>
          
          {/* Details row */}
          <Flex flexWrap="wrap" gap={1} mt={1}>
            {/* Damage dealt */}
            {event.details?.damageDone && !isNaN(Number(event.details.damageDone)) && Number(event.details.damageDone) > 0 && (
              <chakra.span color="red.300" fontSize="xs" bg="rgba(239, 68, 68, 0.1)" px={1} borderRadius="sm">
                {Number(event.details.damageDone)} dmg
              </chakra.span>
            )}
            {/* Health healed */}
            {event.details?.healthHealed && !isNaN(Number(event.details.healthHealed)) && Number(event.details.healthHealed) > 0 && (
              <chakra.span color="green.300" fontSize="xs" bg="rgba(34, 197, 94, 0.1)" px={1} borderRadius="sm">
                +{Number(event.details.healthHealed)} heal
              </chakra.span>
            )}
            {/* Experience gained */}
            {event.details?.experience && !isNaN(Number(event.details.experience)) && Number(event.details.experience) > 0 && (
              <chakra.span color="green.300" fontSize="xs" bg="rgba(34, 197, 94, 0.1)" px={1} borderRadius="sm">
                +{Number(event.details.experience)} XP
              </chakra.span>
            )}
            {/* Weapon looted */}
            {event.details?.lootedWeaponID && !isNaN(Number(event.details.lootedWeaponID)) && Number(event.details.lootedWeaponID) > 0 && (
              <chakra.span color="yellow.400" fontSize="xs" bg="rgba(251, 191, 36, 0.1)" px={1} borderRadius="sm">
                Weapon: {(() => {
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
            {/* Armor looted */}
            {event.details?.lootedArmorID && !isNaN(Number(event.details.lootedArmorID)) && Number(event.details.lootedArmorID) > 0 && (
              <chakra.span color="yellow.400" fontSize="xs" bg="rgba(251, 191, 36, 0.1)" px={1} borderRadius="sm">
                Armor: {(() => {
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
              <chakra.span color="red.500" fontWeight="bold" fontSize="xs" bg="rgba(239, 68, 68, 0.2)" px={1} borderRadius="sm">
                Target Died!
              </chakra.span>
            )}
          </Flex>
        </Box>
        
        <Tooltip label={`Block: ${event.blocknumber}, Idx: ${event.logIndex}`} fontSize="xs" hasArrow>
          <Text fontSize="xs" color="gray.500" whiteSpace="nowrap" mt={0.5}>
            {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </Tooltip>
      </Flex>
    </Box>
  );
}; 