import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import { Box, VStack, Flex, Text, Spinner } from '@chakra-ui/react';
import { useBattleNads } from '../../hooks/game/useBattleNads';
import { contract, ui, domain } from '../../types';
import ChatInterface from './ChatInterface';
import EventFeed from './EventFeed';

// Target Log structure expected by EventFeed
interface UiLog {
  logType: domain.LogType;
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

interface DataFeedProps {
  characterId: string;
  owner?: string;
  sendChatMessage: (message: string) => void;
}

// Mapper from domain.EventMessage to UiLog
function mapDomainEventMessageToUiLog(msg: domain.EventMessage): UiLog {
  return {
    logType: msg.type, // Use type from domain.EventMessage
    message: msg.message,
    timestamp: msg.timestamp,
    source: 'GameEvent' // Provide a default source
    // Other optional fields (characterName, etc.) are not in domain.EventMessage
  };
}

// Use React.memo to prevent unnecessary re-renders
const DataFeed = memo(function DataFeed({ characterId, owner, sendChatMessage }: DataFeedProps) {
  // Generate unique instance ID for this component - only for debugging
  const instanceId = useRef<string>(`DataFeed-${Math.random().toString(36).substring(2, 9)}`);
  
  // Track render count for debugging
  const renderCount = useRef<number>(0);
  
  // Use useBattleNads hook to get game state
  const { gameState, isLoading, error } = useBattleNads(owner || null);
  
  // Directly use logs from gameState assuming they are in the correct format
  const chatLogs = useMemo(() => gameState?.chatLogs || [], [gameState?.chatLogs]);
  
  // Map domain.EventMessage[] to UiLog[]
  const mappedEventLogs: UiLog[] = useMemo(() => 
    (gameState?.eventLogs || []).map(mapDomainEventMessageToUiLog),
    [gameState?.eventLogs]
  );

  // Debug log to check if chat messages are being received
  useEffect(() => {
    if (chatLogs.length > 0) {
      // console.log(`[DataFeed] Received ${chatLogs.length} chat logs:`, chatLogs.slice(0, 3));
      // console.log(`[DataFeed] Passing ${chatLogs.length} messages to ChatInterface`);
    }
  }, [chatLogs]);
  
  // Memoize the send message handler to avoid recreating it on each render
  const handleSendMessage = useMemo(() => {
    return (message: string) => {
      if (message.trim()) {
        const timestamp = new Date().toISOString();
        console.log(`[DATAFEED-DEBUG ${timestamp}] DataFeed ${instanceId.current} sending chat message: ${message}`);
        sendChatMessage(message);
      }
    };
  }, [sendChatMessage, instanceId]);
  
  // Log component lifecycle for debugging
  useEffect(() => {
    const timestamp = new Date().toISOString();
    console.log(`[DATAFEED-DEBUG ${timestamp}] DataFeed instance ${instanceId.current} created with characterId=${characterId}`);
    
    return () => {
      const cleanupTime = new Date().toISOString();
      console.log(`[DATAFEED-DEBUG ${cleanupTime}] DataFeed instance ${instanceId.current} destroyed`);
    };
  }, [characterId]);
  
  // Skip rendering if no characterId is provided
  if (!characterId) {
    return <Box p={4}>No character selected</Box>;
  }
  
  // Track each render - but only log occasionally to reduce noise
  renderCount.current += 1;
  const shouldLog = renderCount.current <= 5 || renderCount.current % 20 === 0;
  
  if (shouldLog) {
    const timestamp = new Date().toISOString();
    // console.log(`[DATAFEED-DEBUG ${timestamp}] DataFeed ${instanceId.current} render #${renderCount.current}`, {
    //   hasChatLogs: chatLogs.length > 0,
    //   hasEventLogs: mappedEventLogs.length > 0,
    //   isLoading,
    //   error
    // });
  }
  
  // Handle loading state
  if (isLoading && !gameState) { 
     return (
      <Box height="100%" width="100%" display="flex" justifyContent="center" alignItems="center">
        <Spinner />
        <Text ml={2}>Loading game feed...</Text>
      </Box>
    );
  }
  
  // Handle error state
  if (error) {
    return (
      <Box height="100%" width="100%" p={4} bg="red.900" color="white">
        <Text>Error loading game feed: {error}</Text>
      </Box>
    );
  }

  return (
    <Box height="100%" width="100%" overflow="hidden">
      <Flex direction="column" height="100%">
        {/* Events section (top half) */}
        <Box flex="1" minHeight="40%" maxHeight="50%" mb={2} overflow="hidden">
          {/* Pass the mapped logs (UiLog[]) to EventFeed */}
          <EventFeed events={mappedEventLogs} /> 
        </Box>
        
        {/* Chat section (bottom half) */}
        <Box flex="1" minHeight="50%" overflow="hidden">
          {/* Assuming ChatInterface expects domain.ChatMessage[] */}
          <ChatInterface 
            characterId={characterId}
            messages={chatLogs} 
            onSendMessage={handleSendMessage}
          />
        </Box>
      </Flex>
    </Box>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary rerenders
  // Only rerender if characterId or owner changes significantly
  // Memoizing based on gameState changes might be better handled internally by the component
  return prevProps.characterId === nextProps.characterId && prevProps.owner === nextProps.owner;
});

export default DataFeed; 