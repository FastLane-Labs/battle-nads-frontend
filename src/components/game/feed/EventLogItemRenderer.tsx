import React from 'react';
import { Box, Text, chakra, Tooltip } from '@chakra-ui/react';
import { domain } from '@/types';

// Removed UnifiedLogItem type

// Original props interface
interface EventLogItemRendererProps { 
  event: domain.EventMessage; // Use the specific EventMessage type
}

// Helper to get color based on type
const getEventColor = (type: domain.LogType | number) => { // Allow number type input
  switch (Number(type)) { // Ensure comparison against numbers
    case domain.LogType.Combat:
    case domain.LogType.InstigatedCombat:
    case domain.LogType.Ascend:
      return 'red.400';
    case domain.LogType.EnteredArea:
    case domain.LogType.LeftArea:
      return 'blue.400';
    case domain.LogType.Ability:
      return 'purple.400';
    // --- Map contract value 4 to Chat color --- 
    case 4: // Treat LogType 4 from contract as Chat
    case domain.LogType.Chat: // Keep original enum mapping just in case
      return 'green.400';
    // -------------------------------------------
    case domain.LogType.Unknown:
    default:
      return 'gray.400'; // Ensure default returns a value
  }
};

// Helper to get the display name for the event type
const getEventTypeName = (type: domain.LogType | number): string => {
    switch (Number(type)) {
        case 4: // Treat LogType 4 as Chat
            return 'Chat';
        // Use enum names for others
        case domain.LogType.Combat: return 'Combat';
        case domain.LogType.InstigatedCombat: return 'InstigatedCombat';
        case domain.LogType.Ascend: return 'Ascend';
        case domain.LogType.EnteredArea: return 'EnteredArea';
        case domain.LogType.LeftArea: return 'LeftArea';
        case domain.LogType.Ability: return 'Ability';
        // case domain.LogType.Chat: return 'Chat'; // Covered by case 4
        case domain.LogType.Unknown: return 'Unknown';
        default: return `Event ${type}`; // Fallback for unexpected types
    }
};

export const EventLogItemRenderer: React.FC<EventLogItemRendererProps> = ({ event }) => {

  // Use the helper function for the event type name
  const eventTypeName = getEventTypeName(event.type);

  return (
    <Box fontSize="sm">
      <Text color={getEventColor(event.type)} fontWeight="bold" display="inline">
        {event.attacker?.name && `${event.attacker.name} `} 
        {/* Use the resolved event type name */} 
        {eventTypeName} 
        {event.type !== domain.LogType.EnteredArea && 
         event.type !== domain.LogType.LeftArea && 
         event.type !== domain.LogType.Ascend && 
         // Also exclude Chat (type 4) from showing 'on defender'
         Number(event.type) !== 4 && 
         event.defender?.name && 
         ` on ${event.defender.name}`}
      </Text>
      
      <Text display="inline">:
        {event.type === domain.LogType.Ability && event.details.value != null && (
          <chakra.span color="purple.300" mx={1}> 
            {/* Assuming Ability enum maps directly from details.value */} 
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
      
      <Tooltip label={`Block: ${event.blocknumber}, Idx: ${event.logIndex}`} fontSize="xs" hasArrow>
        <Text fontSize="xs" color="gray.400" mt={1} display="inline-block" ml={1}> 
          {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
        </Text>
      </Tooltip>
    </Box>
  );
}; 