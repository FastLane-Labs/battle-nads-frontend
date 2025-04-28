import React, { useEffect, useRef } from 'react';
import { 
  Box, 
  VStack, 
  Text, 
  Badge, 
  useColorModeValue, 
  Flex
} from '@chakra-ui/react';
import { LogType } from '../../types/domain';

interface Log {
  logType: LogType;
  source: string;
  message: string;
  characterID?: string;
  characterName?: string;
  x?: number;
  y?: number;
  depth?: number;
  extraData?: any;
  timestamp?: number;
}

interface EventFeedProps {
  events: Log[];
}

export default function EventFeed({ events }: EventFeedProps) {
  const eventsEndRef = useRef<HTMLDivElement>(null);
  
  // Container styling
  const bgColor = useColorModeValue('gray.700', 'gray.800');
  const borderColor = useColorModeValue('gray.600', 'gray.700');
  
  // Scroll to bottom when new events arrive
  useEffect(() => {
    scrollToBottom();
  }, [events]);
  
  const scrollToBottom = () => {
    eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Get color based on log type
  const getLogColor = (logType: LogType) => {
    switch (logType) {
      case LogType.Combat:
        return 'red.400';
      case LogType.InstigatedCombat:
        return 'orange.400';
      case LogType.EnteredArea:
        return 'blue.400';
      case LogType.LeftArea:
        return 'green.400';
      case LogType.Chat:
        return 'purple.400';
      case LogType.Sepukku:
        return 'red.600';
      default:
        return 'gray.400';
    }
  };
  
  // Get badge text based on log type
  const getLogTypeBadge = (logType: LogType) => {
    switch (logType) {
      case LogType.Combat:
        return 'Combat';
      case LogType.InstigatedCombat:
        return 'Attack';
      case LogType.EnteredArea:
        return 'Entered';
      case LogType.LeftArea:
        return 'Left';
      case LogType.Chat:
        return 'Chat';
      case LogType.Sepukku:
        return 'Death';
      default:
        return 'Info';
    }
  };
  
  return (
    <Box 
      border="1px" 
      borderColor={borderColor}
      borderRadius="md" 
      h="100%" 
      display="flex" 
      flexDirection="column"
    >
      <Box p={2} bg="gray.800" borderTopRadius="md">
        <Text fontWeight="bold">Game Events</Text>
      </Box>
      
      {/* Events container */}
      <Box 
        p={3} 
        flex="1" 
        overflowY="auto" 
        bg={bgColor}
        opacity={0.9}
        css={{
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#2D3748',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#4A5568',
            borderRadius: '4px',
          },
        }}
      >
        <VStack spacing={2} align="stretch">
          {events.length === 0 ? (
            <Text color="gray.400" fontSize="sm">No events yet.</Text>
          ) : (
            events.map((event, index) => (
              <Box 
                key={index} 
                p={2} 
                borderRadius="md" 
                bg="gray.800"
                borderLeft="4px solid"
                borderLeftColor={getLogColor(event.logType)}
              >
                <Flex direction="column">
                  <Flex alignItems="center" mb={1}>
                    <Badge 
                      colorScheme={getLogColor(event.logType).split('.')[0]} 
                      variant="solid" 
                      fontSize="xs"
                      mr={2}
                    >
                      {getLogTypeBadge(event.logType)}
                    </Badge>
                    
                    {event.characterName && (
                      <Text fontSize="xs" color="gray.400" mr={2}>
                        {event.characterName}
                      </Text>
                    )}
                    
                    {event.x !== undefined && event.y !== undefined && (
                      <Text fontSize="xs" color="gray.400">
                        ({event.x}, {event.y})
                        {event.depth !== undefined && ` [${event.depth}]`}
                      </Text>
                    )}
                  </Flex>
                  
                  <Text fontSize="sm">{event.message}</Text>
                </Flex>
              </Box>
            ))
          )}
          <div ref={eventsEndRef} />
        </VStack>
      </Box>
    </Box>
  );
} 