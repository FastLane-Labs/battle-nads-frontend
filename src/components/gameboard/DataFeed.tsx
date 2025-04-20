import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import { Box, VStack, Flex, Text } from '@chakra-ui/react';
import { useGameData } from '../../providers/GameDataProvider';
import ChatInterface from './ChatInterface';
import EventFeed from './EventFeed';

interface DataFeedProps {
  characterId: string;
  owner?: string;
  sendChatMessage: (message: string) => void;
}

// Use React.memo to prevent unnecessary re-renders
const DataFeed = memo(function DataFeed({ characterId, owner, sendChatMessage }: DataFeedProps) {
  // Generate unique instance ID for this component - only for debugging
  const instanceId = useRef<string>(`DataFeed-${Math.random().toString(36).substring(2, 9)}`);
  
  // Track render count for debugging
  const renderCount = useRef<number>(0);
  
  // Use game data context for access to shared state
  const { isLoading, processedChatMessages, processedEventLogs } = useGameData();
  
  // Debug log to check if chat messages are being received
  useEffect(() => {
    if (processedChatMessages.length > 0) {
      console.log(`[DataFeed] Received ${processedChatMessages.length} chat messages:`, 
                 processedChatMessages.slice(0, 3));
      console.log(`[DataFeed] Passing ${processedChatMessages.length} messages to ChatInterface`);
    }
  }, [processedChatMessages]);
  
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
    console.log(`[DATAFEED-DEBUG ${timestamp}] DataFeed ${instanceId.current} render #${renderCount.current}`, {
      hasChatMessages: processedChatMessages.length > 0,
      hasEventLogs: processedEventLogs.length > 0,
      isLoading
    });
  }
  
  return (
    <Box height="100%" width="100%" overflow="hidden">
      <Flex direction="column" height="100%">
        {/* Events section (top half) */}
        <Box flex="1" minHeight="40%" maxHeight="50%" mb={2} overflow="hidden">
          <EventFeed events={processedEventLogs} />
        </Box>
        
        {/* Chat section (bottom half) */}
        <Box flex="1" minHeight="50%" overflow="hidden">
          <ChatInterface 
            characterId={characterId}
            messages={processedChatMessages}
            onSendMessage={handleSendMessage}
          />
          {/* Trigger useEffect for logging */}
          {processedChatMessages.length > 0 && <div style={{display: 'none'}} />}
        </Box>
      </Flex>
    </Box>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary rerenders
  // Only rerender if characterId changes
  return prevProps.characterId === nextProps.characterId;
});

export default DataFeed; 