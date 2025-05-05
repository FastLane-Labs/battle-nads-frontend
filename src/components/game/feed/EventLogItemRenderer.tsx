import React from 'react';
import { Box, Text, chakra, Tooltip } from '@chakra-ui/react';
import { domain } from '@/types';

// Removed UnifiedLogItem type

// Original props interface
interface EventLogItemRendererProps { 
  event: domain.EventMessage; // Use the specific EventMessage type
}

// Helper to get color based on type
const getEventColor = (type: domain.LogType) => {
  switch (type) {
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
      return 'gray.400'; // Ensure default returns a value
  }
};

// Original component name
export const EventLogItemRenderer: React.FC<EventLogItemRendererProps> = ({ event }) => {
  // Remove conditional rendering for 'chat' type

  // Directly render Event Message (original logic)
  return (
    <Box fontSize="sm">
      <Text color={getEventColor(event.type)} fontWeight="bold" display="inline">
        {event.attacker?.name && `${event.attacker.name} `} 
        {domain.LogType[event.type] || `Event ${event.type}`} 
        {event.type !== domain.LogType.EnteredArea && 
         event.type !== domain.LogType.LeftArea && 
         event.type !== domain.LogType.Ascend && 
         event.defender?.name && 
         ` on ${event.defender.name}`}
      </Text>
      
      <Text display="inline">:
        {event.type === domain.LogType.Ability && event.details.value != null && (
          <chakra.span color="purple.300" mx={1}> 
            [{domain.Ability[Number(event.details.value)] || `Ability ${event.details.value}`}]
          </chakra.span>
        )}
        {event.count && event.count > 1 && (
          <chakra.span fontWeight="bold" mr={1}>({event.count}x)</chakra.span>
        )}
        {event.details.hit && (
          <chakra.span color={event.details.critical ? "yellow.300" : "inherit"} fontWeight={event.details.critical ? "bold" : "normal"}> Hit{event.details.critical ? " (CRIT!) " : ". "}</chakra.span>
        )}
        {!event.details.hit && event.type === domain.LogType.Combat && (
          <chakra.span> Miss. </chakra.span>
        )}
        {event.details.damageDone && event.details.damageDone > 0 && (
          <chakra.span> [{event.details.damageDone} dmg]. </chakra.span>
        )}
        {event.details.healthHealed && event.details.healthHealed > 0 && (
          <chakra.span> [{event.details.healthHealed} heal]. </chakra.span>
        )}
        {event.details.experience && event.details.experience > 0 && (
          <chakra.span color="green.300"> [+{event.details.experience} XP]. </chakra.span>
        )}
        {event.details.lootedWeaponID && event.details.lootedWeaponID > 0 && (
          <chakra.span color="orange.300"> [Looted Wpn {event.details.lootedWeaponID}]. </chakra.span>
        )}
        {event.details.lootedArmorID && event.details.lootedArmorID > 0 && (
          <chakra.span color="orange.300"> [Looted Arm {event.details.lootedArmorID}]. </chakra.span>
        )}
         {event.details.targetDied && (
          <chakra.span color="red.500" fontWeight="bold"> Target Died! </chakra.span>
        )}
      </Text>
      
      <Tooltip label={`Block: ${event.timestamp}, Idx: ${event.logIndex}`} fontSize="xs" hasArrow>
        {/* Add ml={2} for spacing */}
        <Text fontSize="xs" color="gray.400" mt={1} display="inline-block" ml={2}> 
          {new Date(event.timestamp * 1000).toLocaleTimeString()} 
        </Text>
      </Tooltip>
    </Box>
  );
}; 