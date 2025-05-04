import React, { useMemo, useRef } from 'react';
import { Box, Heading, Text, chakra, Spinner, Center } from '@chakra-ui/react';
import { domain } from '@/types';
import { useVirtualizer } from '@tanstack/react-virtual';

interface EventFeedProps {
  characterId: string;
  eventLogs: domain.EventMessage[]; // Accept eventLogs prop
  combatants: domain.CharacterLite[]; // Add combatants for highlighting
  isCacheLoading: boolean;
}

const EventFeed: React.FC<EventFeedProps> = ({ 
  characterId, 
  eventLogs, 
  combatants, 
  isCacheLoading 
}) => {
  
  const parentRef = useRef<HTMLDivElement>(null); // Ref for the scrollable container

  const rowVirtualizer = useVirtualizer({ 
    count: eventLogs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60, // Estimate row height
    overscan: 5, // Render items slightly outside viewport
  });

  // Map domain.LogType to colors
  const getEventColor = (type: domain.LogType) => {
    switch (type) {
      case domain.LogType.Combat:
      case domain.LogType.InstigatedCombat:
      case domain.LogType.Sepukku:
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

  // Create a set of current combatant IDs for quick lookup
  const combatantIds = useMemo(() => new Set(combatants.map(c => c.id)), [combatants]);

  return (
    <Box h="100%" display="flex" flexDirection="column"> {/* Ensure parent has height */} 
      <Heading size="md" mb={4}>Event Log</Heading>
      
      {/* Scrollable Container */}
      <Box 
        ref={parentRef} 
        flex="1" 
        overflowY="auto" // Enable scrolling on this element
        position="relative" // Needed for absolute positioning of virtual items
      >
        {isCacheLoading ? (
          <Center h="100%">
            <Spinner size="xl" color="blue.500" />
          </Center>
        ) : (
          <> {/* Fragment to hold virtualized list or empty state */}
            {/* Virtualized List Container (takes total height) */}
            <Box 
              height={`${rowVirtualizer.getTotalSize()}px`} 
              width="100%" 
              position="relative"
            >
              {/* Render only virtual items */} 
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const event = eventLogs[virtualRow.index];
                if (!event) return null; // Should not happen, but safety check

                const eventKey = `${event.timestamp}-${event.logIndex}`;
                const involvesCombatant = 
                  (event.attacker && combatantIds.has(event.attacker.id)) || 
                  (event.defender && combatantIds.has(event.defender.id));
                const isPlayerAction = event.isPlayerInitiated;
                let bgColor = "gray.700";
                if (involvesCombatant) bgColor = "red.900"; 
                if (isPlayerAction) bgColor = "blue.900"; 

                return (
                  <Box 
                    key={eventKey} 
                    position="absolute" 
                    top={0} 
                    left={0} 
                    width="100%" 
                    height={`${virtualRow.size}px`} 
                    transform={`translateY(${virtualRow.start}px)`} // Position item absolutely
                    p={2} 
                    fontSize="sm" 
                  >
                    {/* Inner content box with background and padding */}
                    <Box bg={bgColor} p={2} borderRadius="md" h="100%">
                      <Text color={getEventColor(event.type)} fontWeight="bold" display="inline">
                        {event.attacker?.name && `${event.attacker.name} `}
                        {domain.LogType[event.type] || `Event ${event.type}`}
                        {event.defender?.name && ` on ${event.defender.name}`}
                      </Text>
                      
                      {/* Display details based on the log type and available data */}
                      <Text display="inline">:
                        {/* Display count if > 1 */}
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
                          <chakra.span color="orange.300"> [Looted Wpn {event.details.lootedWeaponID}]. </chakra.span> // TODO: Map ID to name?
                        )}
                        {event.details.lootedArmorID && event.details.lootedArmorID > 0 && (
                          <chakra.span color="orange.300"> [Looted Arm {event.details.lootedArmorID}]. </chakra.span> // TODO: Map ID to name?
                        )}
                         {event.details.targetDied && (
                          <chakra.span color="red.500" fontWeight="bold"> Target Died! </chakra.span>
                        )}
                      </Text>
                      
                      <Text fontSize="xs" color="gray.400" mt={1}>
                        {new Date(event.timestamp * 1000).toLocaleTimeString()} (Block: {event.timestamp}, Idx: {event.logIndex})
                      </Text>
                    </Box>
                  </Box>
                );
              })}
            </Box>
            
            {eventLogs.length === 0 && (
              <Box p={4} textAlign="center">
                <Text>No events yet</Text>
              </Box>
            )}
          </> 
        )}
      </Box>
    </Box>
  );
};

export default EventFeed; 