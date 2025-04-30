import React, { useEffect, useState } from 'react';
import { Box, Heading, VStack, Text, Divider } from '@chakra-ui/react';
import { domain } from '../../../types'; // Import domain types

// Remove internal GameEvent type if domain.EventMessage matches structure
// interface GameEvent {
//   id: string;
//   message: string;
//   timestamp: Date;
//   type: 'combat' | 'movement' | 'system' | 'item' | 'other';
// }

interface EventFeedProps {
  characterId: string;
  eventLogs: domain.EventMessage[]; // Accept eventLogs prop
}

const EventFeed: React.FC<EventFeedProps> = ({ 
  characterId, 
  eventLogs // Destructure eventLogs
}) => {
  // Remove placeholder events state
  // const [events, setEvents] = useState<GameEvent[]>([...]);
  
  // Remove placeholder subscription useEffect
  // useEffect(() => {
  //   if (characterId) {
  //     console.log(`Subscribing to events for character: ${characterId}`);
  //     // Subscribe to events logic would go here
  //   }
  //   return () => {
  //     console.log(`Unsubscribing from events for character: ${characterId}`);
  //     // Unsubscribe logic would go here
  //   };
  // }, [characterId]);
  
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
      case domain.LogType.Chat: // Should ideally not appear here, but handle just in case
        return 'green.400';
      case domain.LogType.Unknown: // Explicitly handle unknown
      default:
        return 'gray.400'; // Use a neutral color for unknown/default
    }
  };
  
  return (
    <Box>
      <Heading size="md" mb={4}>Event Log</Heading>
      
      {/* Use eventLogs prop */}
      <VStack spacing={2} align="stretch" maxH="500px" overflowY="auto">
        {eventLogs.map((event, index) => { // Add index for key fallback
          // Create a unique key
          const eventKey = `${event.timestamp}-${index}`;
          return (
            <Box key={eventKey} p={2} borderRadius="md" bg="gray.700">
              <Text color={getEventColor(event.type)} fontWeight="bold">
                {event.message}
              </Text>
              <Text fontSize="xs" color="gray.400">
                {/* Format timestamp if needed, assumes it's a number (block number) */}
                {new Date(event.timestamp * 1000).toLocaleTimeString()} {/* Convert block timestamp */}
              </Text>
            </Box>
          );
        })}
        
        {eventLogs.length === 0 && (
          <Box p={4} textAlign="center">
            <Text>No events yet</Text>
          </Box>
        )}
      </VStack>
    </Box>
  );
};

export default EventFeed; 