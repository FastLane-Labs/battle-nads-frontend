import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, HStack, Text, Spinner, Center, Tooltip } from '@chakra-ui/react';
import { domain } from '@/types';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useTransactionBalance } from '@/hooks/wallet/useWalletState';

interface ChatPanelProps {
  characterId: string;
  onSendChatMessage: (message: string) => Promise<void>;
  chatLogs: domain.ChatMessage[];
  isCacheLoading: boolean;
  currentAreaId?: bigint;
  isSendingChat?: boolean; // New prop to track sending state
}

const ChatPanel: React.FC<ChatPanelProps> = ({ 
  characterId, 
  onSendChatMessage, 
  chatLogs,
  isCacheLoading,
  currentAreaId,
  isSendingChat = false
}) => {
  const [inputValue, setInputValue] = useState('');
  
  // Track previous area ID for change detection
  const prevAreaIdRef = useRef<bigint | undefined>(currentAreaId);
  
  // Transaction balance validation
  const { isTransactionDisabled, insufficientBalanceMessage } = useTransactionBalance();
  
  // Detect area ID changes and log when condition is met
  useEffect(() => {
    if (currentAreaId !== undefined && prevAreaIdRef.current !== undefined && 
        currentAreaId !== prevAreaIdRef.current) {
      console.log(`[ChatPanel] Area ID changed from ${prevAreaIdRef.current} to ${currentAreaId} - Chat reload condition met`);
      // TODO: Implement chat reload logic here when needed
    }
    prevAreaIdRef.current = currentAreaId;
  }, [currentAreaId]);
  
  const parentRef = useRef<HTMLDivElement>(null);
  
  const rowVirtualizer = useVirtualizer({ 
    count: chatLogs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
    overscan: 5,
  });

  // scroll to the bottom when new messages are added
  useEffect(() => {
    if (chatLogs.length > 0 && !isCacheLoading) {
      rowVirtualizer.scrollToIndex(chatLogs.length - 1, { align: 'start' });
    }
  }, [chatLogs.length, rowVirtualizer, isCacheLoading]);
  
  const handleSendMessage = async () => {
    const messageToSend = inputValue.trim();
    if (messageToSend && !isSendingChat && !isTransactionDisabled) {
      try {
        await onSendChatMessage(messageToSend);
        setInputValue(''); // Clear input only after successful send
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isTransactionDisabled && !isSendingChat) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Box h="100%" display="flex" flexDirection="column">
      <h2 className='uppercase gold-text-light text-2xl font-bold tracking-tight mb-2 px-4'>Chat</h2>
      
      <Box 
        ref={parentRef}
        flex="1" 
        overflowY="auto" 
        mb={4}
        position="relative"
        px={4}
      >
        {isCacheLoading ? (
          <Center h="100%">
            <Spinner size="xl" color="blue.500" />
          </Center>
        ) : (
          <Box 
          // height={`${rowVirtualizer.getTotalSize()}px`} 
          width="100%" position="relative">
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const chat = chatLogs[virtualRow.index];
              if (!chat) return null;
              
              const isPlayerMessage = characterId !== null && chat.sender.id === characterId;
              const senderDisplayName = isPlayerMessage ? "You" : chat.sender.name;

              if (!isPlayerMessage && chat.sender.name?.includes('NotMe')) {
                  console.log(`[ChatPanel] POTENTIAL MISMATCH: characterId=${characterId}, sender.id=${chat.sender.id}, sender.index=${chat.sender.index}, sender.name=${chat.sender.name}`);
              }

              return (
                <Box
                  key={`${chat.timestamp}-${chat.logIndex}-${virtualRow.index}`}
                  // position="absolute"
                  top={0}
                  left={0}
                  width="100%"
                  // height={`${virtualRow.size}px`}
                  // transform={`translateY(${virtualRow.start}px)`}
                >
                  <Box borderRadius="md" fontSize="sm" className='flex py-[3px] items-start'>
                    <Text as="span" fontSize="sm" color="gray.400" className='tracking-tighter whitespace-nowrap'>
                      {new Date(chat.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    <Text as="span" fontWeight="bold" ml={1} color={isPlayerMessage ? "blue.300" : "yellow.300"}>
                      {senderDisplayName}
                    </Text>
                    <Text as="span" className='font-semibold'>
                      :
                    </Text>
                    <Text className='ml-1'>{chat.message}
                    </Text>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
      
      <HStack spacing={2} px={2}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Send a message"
          disabled={isSendingChat || isCacheLoading}
          className="w-full bg-stone-600/90 text-white py-2 px-2 rounded-md outline-none focus:outline-none"
        />
        <Tooltip 
          label={insufficientBalanceMessage} 
          placement="top" 
          hasArrow
          isDisabled={!isTransactionDisabled}
          className="mx-2 !bg-dark-brown border rounded-md border-amber-400/30 !text-white"
        >
          <Button
            onClick={handleSendMessage}
            isLoading={isSendingChat}
            loadingText=""
            // colorScheme="blue"
            disabled={isCacheLoading || isSendingChat || !inputValue.trim() || isTransactionDisabled}
            className={`!outline-none ${
              isTransactionDisabled ? '!bg-[#8B6914]/50 !opacity-50' : '!bg-[#8B6914]'
            }`}
          >
            Send
          </Button>
        </Tooltip>
      </HStack>
    </Box>
  );
};

export default ChatPanel; 