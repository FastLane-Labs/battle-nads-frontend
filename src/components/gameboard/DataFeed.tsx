import React, { useState, useEffect } from 'react';
import { Box, VStack, Tabs, TabList, TabPanels, Tab, TabPanel } from '@chakra-ui/react';
import { useBattleNads } from '../../hooks/useBattleNads';
import { useWallet } from '../../providers/WalletProvider';
import ChatInterface from './ChatInterface';
import EventFeed from './EventFeed';

interface DataFeedProps {
  characterId: string;
  pollInterval?: number; // Polling interval in milliseconds
}

export default function DataFeed({ characterId, pollInterval = 5000 }: DataFeedProps) {
  const { 
    getFullFrontendData, 
    sendChatMessage, 
    eventLogs, 
    chatMessages,
    loading,
    error,
    getOwnerWalletAddress
  } = useBattleNads();
  
  const { injectedWallet } = useWallet();
  
  const [pollingTimer, setPollingTimer] = useState<NodeJS.Timeout | null>(null);
  
  // Set up polling to get data updates
  useEffect(() => {
    if (!pollingTimer) {
      console.log('[DataFeed] Setting up polling interval');
      
      // Log the owner address we're using for polling
      const ownerAddress = injectedWallet?.address || getOwnerWalletAddress() || '';
      console.log(`[DataFeed] Using owner address: ${ownerAddress || 'undefined'}`);
      console.log(`[DataFeed] Character ID from props: ${characterId || 'undefined'}`);
      
      // Log wallet details (if available) for debugging
      if (injectedWallet) {
        console.log(`[DataFeed] Injected wallet info:`, {
          address: injectedWallet.address,
          connected: !!injectedWallet.provider
        });
      }
      
      // Track poll count for debugging
      let pollCount = 0;
      
      // Initial fetch
      const fetchInitialData = async () => {
        try {
          if (!ownerAddress) {
            console.warn('[DataFeed] No owner address available for initial data fetch');
            return;
          }
          
          console.log(`[DataFeed] Fetching initial data for owner: ${ownerAddress}`);
          const result = await getFullFrontendData(ownerAddress);
          
          if (result) {
            console.log(`[DataFeed] Initial fetch successful, character ID: ${result.characterID || 'null'}`);
          } else {
            console.warn('[DataFeed] Initial fetch returned null result');
          }
        } catch (err) {
          console.error('[DataFeed] Error in initial data fetch:', err);
        }
      };
      
      fetchInitialData();
      
      // Set up polling interval
      const interval = setInterval(async () => {
        pollCount++;
        try {
          if (!ownerAddress) {
            console.warn(`[DataFeed] Poll #${pollCount} - No owner address available`);
            return;
          }
          
          const result = await getFullFrontendData(ownerAddress);
          console.log(`[DataFeed] Poll #${pollCount} result: ${result ? 'data received' : 'null'}`);
          
          if (result) {
            if (!result.characterID) {
              console.warn(`[DataFeed] Warning: Poll #${pollCount} returned null characterID`);
            }
          } else {
            console.warn(`[DataFeed] Warning: Poll #${pollCount} returned null result`);
          }
        } catch (err) {
          console.error(`[DataFeed] Error in poll #${pollCount}:`, err);
        }
      }, pollInterval);
      
      setPollingTimer(interval);
      
      return () => {
        console.log('[DataFeed] Cleanup - clearing polling interval');
        clearInterval(interval);
      };
    }
  }, [getFullFrontendData, pollingTimer, injectedWallet?.address, getOwnerWalletAddress, characterId, injectedWallet, pollInterval]);
  
  // Handle sending a new chat message
  const handleSendMessage = (message: string) => {
    if (message.trim()) {
      sendChatMessage(message);
    }
  };
  
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
              messages={chatMessages}
              onSendMessage={handleSendMessage}
            />
          </TabPanel>
          <TabPanel height="100%" padding={2}>
            <EventFeed events={eventLogs} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
} 