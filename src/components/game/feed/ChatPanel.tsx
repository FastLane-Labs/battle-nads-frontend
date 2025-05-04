import React, { useState, useEffect, useRef } from 'react';
import { Box, Heading, VStack, Input, Button, HStack, Text, Flex, Spinner, Center } from '@chakra-ui/react';
import { domain } from '@/types';

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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  

  useEffect(() => {
    if (!isCacheLoading) {
       messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatLogs, isCacheLoading]);
  
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
      
      <VStack 
        spacing={2} 
        align="stretch" 
        flex="1" 
        mb={4}
        overflowY="auto"
        bg="gray.700" 
        p={2} 
        borderRadius="md"
        position="relative"
      >
        {isCacheLoading ? (
          <Center h="100%">
            <Spinner size="xl" color="blue.500" />
          </Center>
        ) : (
          <>
            {chatLogs.map((message, index) => {
              const senderName = message.sender?.name || 'Unknown';
              const isOwnMessage = senderName === characterId;
              const messageKey = message.isOptimistic 
                ? `opt-${message.timestamp}-${message.message.slice(0, 10)}` 
                : `conf-${message.blocknumber}-${message.logIndex}`;

              return (
                <Box 
                  key={messageKey} 
                  p={2} 
                  borderRadius="md"
                  bg={isOwnMessage ? 'blue.800' : 'gray.800'}
                  opacity={message.isOptimistic ? 0.6 : 1.0}
                  alignSelf={isOwnMessage ? 'flex-end' : 'flex-start'}
                  maxW="80%"
                >
                  <Flex justify="space-between" alignItems="flex-end" mb={1}>
                    <Text fontWeight="bold" fontSize="sm" color="blue.300">
                      {senderName}
                    </Text>
                    <Text fontSize="xs" color="gray.400" ml={2}>
                      {message.isOptimistic ? '(sending...)' : new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </Flex>

                  <Text>{message.message}</Text>
                </Box>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </VStack>
      
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
          disabled={isCacheLoading}
        >
          Send
        </Button>
      </HStack>
    </Box>
  );
};

export default ChatPanel; 