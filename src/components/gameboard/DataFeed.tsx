import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import { Box, VStack, Tabs, TabList, TabPanels, Tab, TabPanel } from '@chakra-ui/react';
import { useGameData } from '../../providers/GameDataProvider';
import ChatInterface from './ChatInterface';
import EventFeed from './EventFeed';

// Replace tracking array with singleton object
const ACTIVE_DATAFEED = {
  instance: null as string | null,
  timestamp: null as string | null,
  isMounted: false
};

interface DataFeedProps {
  characterId: string;
  owner?: string;
  sendChatMessage: (message: string) => void;
}

// Use React.memo to prevent unnecessary re-renders
const DataFeed = memo(function DataFeed({ characterId, owner, sendChatMessage }: DataFeedProps) {
  // Generate unique instance ID for this component
  const instanceId = useRef<string>(`DataFeed-${Math.random().toString(36).substring(2, 9)}`);
  
  // Track render count
  const renderCount = useRef<number>(0);
  
  // Track if we should render - initialized to false
  const [shouldRender, setShouldRender] = useState<boolean>(false);
  
  // Use game data context for access to shared state - always call this hook
  const { isLoading, processedChatMessages, processedEventLogs } = useGameData();
  
  // Debug log to check if chat messages are being received
  useEffect(() => {
    if (processedChatMessages.length > 0) {
      console.log(`[DataFeed] Received ${processedChatMessages.length} chat messages:`, 
                 processedChatMessages.slice(0, 3));
      console.log(`[DataFeed] Passing ${processedChatMessages.length} messages to ChatInterface`);
    }
  }, [processedChatMessages]);
  
  // Memoize the send message handler to avoid recreating it on each render - always call this hook
  const handleSendMessage = useMemo(() => {
    return (message: string) => {
      if (message.trim()) {
        const timestamp = new Date().toISOString();
        console.log(`[DATAFEED-DEBUG ${timestamp}] DataFeed ${instanceId.current} sending chat message: ${message}`);
        sendChatMessage(message);
      }
    };
  }, [sendChatMessage, instanceId]);
  
  // Register/unregister singleton instance - always call this hook last
  useEffect(() => {
    renderCount.current = 0;
    const timestamp = new Date().toISOString();
    
    // Check if an instance is already active
    if (!ACTIVE_DATAFEED.isMounted) {
      // Claim the singleton spot
      ACTIVE_DATAFEED.instance = instanceId.current;
      ACTIVE_DATAFEED.timestamp = timestamp;
      ACTIVE_DATAFEED.isMounted = true;
      
      // Use setTimeout to avoid state updates during render
      setTimeout(() => {
        setShouldRender(true);
      }, 0);
      
      console.log(`[DATAFEED-DEBUG ${timestamp}] DataFeed singleton instance ${instanceId.current} created with characterId=${characterId}`);
      
      // Log the component stack that created this instance to help trace parent components
      console.log(`[DATAFEED-DEBUG ${timestamp}] DataFeed ${instanceId.current} - Created from:`, 
        new Error('Component stack trace').stack);
    } else {
      // Another instance is already active
      console.log(`[DATAFEED-DEBUG ${timestamp}] DataFeed instance ${instanceId.current} not rendered - singleton already exists: ${ACTIVE_DATAFEED.instance}`);
    }
    
    return () => {
      // Only clean up if this is the active instance
      if (ACTIVE_DATAFEED.instance === instanceId.current) {
        const cleanupTime = new Date().toISOString();
        console.log(`[DATAFEED-DEBUG ${cleanupTime}] DataFeed singleton instance ${instanceId.current} destroyed`);
        
        // Release the singleton spot
        ACTIVE_DATAFEED.instance = null;
        ACTIVE_DATAFEED.timestamp = null;
        ACTIVE_DATAFEED.isMounted = false;
      }
    };
  }, [characterId]);
  
  // Skip rendering if this isn't the active instance
  if (!shouldRender) {
    return null;
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
    <Box height="100%" width="100%">
      <Tabs isFitted variant="enclosed" height="100%" display="flex" flexDirection="column">
        <TabList>
          <Tab>Chat</Tab>
          <Tab>Events</Tab>
        </TabList>
        
        <TabPanels flex="1" overflow="hidden">
          <TabPanel height="100%" padding={2}>
            <ChatInterface 
              characterId={characterId}
              messages={processedChatMessages}
              onSendMessage={handleSendMessage}
            />
            {/* Trigger useEffect for logging */}
            {processedChatMessages.length > 0 && <div style={{display: 'none'}} />}
          </TabPanel>
          <TabPanel height="100%" padding={2}>
            <EventFeed events={processedEventLogs} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary rerenders
  // Only rerender if characterId changes
  return prevProps.characterId === nextProps.characterId;
});

export default DataFeed; 