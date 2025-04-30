import React, { useEffect, useState } from 'react';
import { Box, Heading, VStack, Text, Divider } from '@chakra-ui/react';

interface GameEvent {
  id: string;
  message: string;
  timestamp: Date;
  type: 'combat' | 'movement' | 'system' | 'item' | 'other';
}

interface EventFeedProps {
  characterId: string;
}

const EventFeed: React.FC<EventFeedProps> = ({ characterId }) => {
  // In a real implementation, this would fetch events from a game event system
  // For now, we'll just show some placeholder events
  const [events, setEvents] = useState<GameEvent[]>([
    {
      id: '1',
      message: 'Welcome to Battle Nads!',
      timestamp: new Date(),
      type: 'system'
    },
    {
      id: '2',
      message: 'You entered the arena',
      timestamp: new Date(Date.now() - 60000),
      type: 'movement'
    },
    {
      id: '3',
      message: 'You found a health potion',
      timestamp: new Date(Date.now() - 120000),
      type: 'item'
    }
  ]);
  
  // This would actually subscribe to game events in a real implementation
  useEffect(() => {
    if (characterId) {
      console.log(`Subscribing to events for character: ${characterId}`);
      // Subscribe to events logic would go here
    }
    
    return () => {
      console.log(`Unsubscribing from events for character: ${characterId}`);
      // Unsubscribe logic would go here
    };
  }, [characterId]);
  
  const getEventColor = (type: GameEvent['type']) => {
    switch (type) {
      case 'combat': return 'red.400';
      case 'movement': return 'blue.400';
      case 'system': return 'yellow.400';
      case 'item': return 'green.400';
      default: return 'white';
    }
  };
  
  return (
    <Box>
      <Heading size="md" mb={4}>Event Log</Heading>
      
      <VStack spacing={2} align="stretch" maxH="500px" overflowY="auto">
        {events.map((event) => (
          <Box key={event.id} p={2} borderRadius="md" bg="gray.700">
            <Text color={getEventColor(event.type)} fontWeight="bold">
              {event.message}
            </Text>
            <Text fontSize="xs" color="gray.400">
              {event.timestamp.toLocaleTimeString()}
            </Text>
          </Box>
        ))}
        
        {events.length === 0 && (
          <Box p={4} textAlign="center">
            <Text>No events yet</Text>
          </Box>
        )}
      </VStack>
    </Box>
  );
};

export default EventFeed; 