import React, { useMemo, useRef } from 'react';
import { Box, Heading, Text, Spinner, Center, VStack } from '@chakra-ui/react';
import { domain } from '@/types';
import { EventLogItemRenderer } from './EventLogItemRenderer';
import { useVirtualizer } from '@tanstack/react-virtual';

interface EventFeedProps {
  characterId: string;
  eventLogs: domain.EventMessage[];
  combatants: domain.CharacterLite[];
  isCacheLoading: boolean;
}

const EventFeed: React.FC<EventFeedProps> = ({ 
  characterId, 
  eventLogs,
  combatants, 
  isCacheLoading 
}) => {
  
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({ 
    count: eventLogs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 5,
  });
  
  const combatantIds = useMemo(() => new Set(combatants.map(c => c.id)), [combatants]);

  return (
    <Box h="100%" display="flex" flexDirection="column">
      <Heading size="md" mb={4}>Event Log</Heading>
      
      <Box 
        ref={parentRef}
        h="100%" 
        overflowY="auto" 
        position="relative"
      >
        {isCacheLoading ? (
          <Center h="100%">
            <Spinner size="xl" color="blue.500" />
          </Center>
        ) : (
          <>
            <Box 
              height={`${rowVirtualizer.getTotalSize()}px`} 
              width="100%" 
              position="relative"
            >
              {eventLogs.length > 0 ? (
                rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const event = eventLogs[virtualRow.index];
                  if (!event) return null; 

                  const itemKey = `${event.timestamp}-${event.logIndex}-${virtualRow.index}`;
                  
                  let bgColor = "gray.700";
                  const involvesCombatant = 
                    (event.attacker && combatantIds.has(event.attacker.id)) || 
                    (event.defender && combatantIds.has(event.defender.id));
                  const isPlayerAction = event.isPlayerInitiated;
                  
                  if (involvesCombatant) bgColor = "red.900"; 
                  if (isPlayerAction) bgColor = "blue.900";

                  return (
                    <Box 
                      key={itemKey} 
                      position="absolute" 
                      top={0} 
                      left={0} 
                      width="100%" 
                      height={`${virtualRow.size}px`} 
                      transform={`translateY(${virtualRow.start}px)`}
                      p={1}
                    >
                      <Box
                        bg={bgColor} 
                        p={2} 
                        borderRadius="md" 
                        h="100%"
                      >
                        <EventLogItemRenderer event={event} />
                      </Box>
                    </Box>
                  );
                })
              ) : (
                <Box p={4} textAlign="center">
                  <Text>No events yet</Text>
                </Box>
              )}
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
};

export default EventFeed; 