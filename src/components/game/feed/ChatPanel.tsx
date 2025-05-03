import React, { useState, useEffect, useRef } from 'react';
import { Box, Heading, VStack, Input, Button, HStack, Text, Flex } from '@chakra-ui/react';
import { domain } from '@/types';

interface ChatPanelProps {
  characterId: string;
  onSendChatMessage: (message: string) => Promise<void>;
  addOptimisticChatMessage: (message: string) => void;
  chatLogs: domain.ChatMessage[];
}

const ChatPanel: React.FC<ChatPanelProps> = ({ 
  characterId, 
  onSendChatMessage, 
  addOptimisticChatMessage,
  chatLogs
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLogs]);
  
  const handleSendMessage = async () => {
    const messageToSend = inputValue.trim();
    if (messageToSend && !isSubmitting) {
      setIsSubmitting(true);
      
      try {
        await onSendChatMessage(messageToSend);
        addOptimisticChatMessage(messageToSend);
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
      >
        {chatLogs.map((message, index) => {
          const isOwnMessage = message.sender.name === "You";
          const messageKey = `${message.timestamp}-${message.logIndex}-${message.isOptimistic ? 1 : 0}`; 

          return (
            <Box 
              key={messageKey} 
              p={2} 
              borderRadius="md"
              bg={isOwnMessage ? 'blue.800' : 'gray.800'}
              alignSelf={isOwnMessage ? 'flex-end' : 'flex-start'}
              maxW="80%"
            >
              <Flex justify="space-between" alignItems="flex-end" mb={1}>
                <Text fontWeight="bold" fontSize="sm" color="blue.300">
                  {message.sender.name}
                </Text>
                <Text fontSize="xs" color="gray.400" ml={2}>

                  {new Date(message.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </Flex>

              <Text>{message.message}</Text>
            </Box>
          );
        })}
        <div ref={messagesEndRef} />
      </VStack>
      
      {/* Input Area */}
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
          disabled={isSubmitting}
        />
        <Button
          onClick={handleSendMessage}
          isLoading={isSubmitting}
          loadingText="Sending"
          colorScheme="blue"
        >
          Send
        </Button>
      </HStack>
    </Box>
  );
};

export default ChatPanel; 