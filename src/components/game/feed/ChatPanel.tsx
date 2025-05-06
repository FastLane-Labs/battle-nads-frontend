import React, { useState, useEffect, useRef } from 'react';
import { Box, Heading, VStack, Input, Button, HStack, Text, Flex, Spinner, Center } from '@chakra-ui/react';
import { domain } from '@/types';
import { useVirtualizer } from '@tanstack/react-virtual';

interface ChatPanelProps {
  characterId: string;
  onSendChatMessage: (message: string) => Promise<void>;
  addOptimisticChatMessage: (message: string) => void;
  chatLogs: domain.ChatMessage[];
  isCacheLoading: boolean;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ 
  characterId, 
  onSendChatMessage, 
  addOptimisticChatMessage,
  chatLogs,
  isCacheLoading
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const parentRef = useRef<HTMLDivElement>(null);
  
  const rowVirtualizer = useVirtualizer({ 
    count: chatLogs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
    overscan: 5,
  });

  // scroll to the bottom when new messages are added
  useEffect(() => {
    console.log('ChatPanel: chatLogs.length', chatLogs.length);
    console.log('ChatPanel: isCacheLoading', isCacheLoading);
    if (chatLogs.length > 0 ||  !isCacheLoading) {
      rowVirtualizer.scrollToIndex(chatLogs.length - 1, { align: 'start' });
    }
  }, [chatLogs.length, rowVirtualizer, isCacheLoading]);
  
  const handleSendMessage = async () => {
    const messageToSend = inputValue.trim();
    if (messageToSend && !isSubmitting) {
      setIsSubmitting(true);
      
      try {
        addOptimisticChatMessage(messageToSend);
        await onSendChatMessage(messageToSend);
        setInputValue('');
      } catch (error) {
        console.error('Failed to send message:', error);
      } finally {
        setIsSubmitting(false);
      } 
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  return (
    <Box h="100%" display="flex" flexDirection="column">
      <Heading size="md" mb={4}>Chat</Heading>
      
      <Box 
        ref={parentRef}
        flex="1" 
        overflowY="auto" 
        mb={4}
        position="relative"
      >
        {isCacheLoading ? (
          <Center h="100%">
            <Spinner size="xl" color="blue.500" />
          </Center>
        ) : (
          <Box height={`${rowVirtualizer.getTotalSize()}px`} width="100%" position="relative">
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
                  position="absolute"
                  top={0}
                  left={0}
                  width="100%"
                  height={`${virtualRow.size}px`}
                  transform={`translateY(${virtualRow.start}px)`}
                  p={1}
                >
                  <Box bg="gray.700" p={2} borderRadius="md" fontSize="sm">
                    <Text as="span" fontWeight="bold" color={isPlayerMessage ? "blue.300" : "yellow.300"}>
                      {senderDisplayName}
                    </Text>
                    <Text as="span" fontSize="xs" color="gray.400" ml={2}>
                      {new Date(chat.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    <Text mt={1}>{chat.message}</Text>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
      
      <HStack spacing={2}>
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          variant="filled"
          bg="gray.700"
          _hover={{ bg: 'gray.600' }}
          _focus={{ bg: 'gray.600' }}
          disabled={isSubmitting || isCacheLoading}
        />
        <Button
          onClick={handleSendMessage}
          isLoading={isSubmitting}
          loadingText="Sending"
          colorScheme="blue"
          disabled={isCacheLoading || isSubmitting || !inputValue.trim()}
        >
          Send
        </Button>
      </HStack>
    </Box>
  );
};

export default ChatPanel; 