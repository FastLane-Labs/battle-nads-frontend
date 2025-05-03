import React, { useState, useEffect, useRef } from 'react';
import { Box, Heading, VStack, Input, Button, HStack, Text, Flex, useToast, chakra } from '@chakra-ui/react';
import { domain } from '@/types'; // Import domain types

interface ChatPanelProps {
  characterId: string;
  onSendChatMessage: (message: string) => Promise<void>;
  addOptimisticChatMessage: (message: string) => void;
  chatLogs: domain.ChatMessage[]; // Accept chatLogs prop
}

const ChatPanel: React.FC<ChatPanelProps> = ({ 
  characterId, 
  onSendChatMessage, 
  addOptimisticChatMessage,
  chatLogs // Destructure chatLogs
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom when chatLogs change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLogs]);
  
  const handleSendMessage = async () => {
    const messageToSend = inputValue.trim();
    if (messageToSend && !isSubmitting) {
      setIsSubmitting(true);
      
      try {
        // 1. Send the message to the blockchain
        await onSendChatMessage(messageToSend);
        
        // 2. Add the message to the optimistic local state
        addOptimisticChatMessage(messageToSend);

        // 3. Clear the input field
        setInputValue('');
      } catch (error) {
        console.error('Failed to send message:', error);
        // Optionally show a toast or error message to the user
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
      
      {/* Messages Container */}
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
        {/* Use chatLogs prop */} 
        {chatLogs.map((message, index) => {
          // Determine if the message is sent by the current user
          // NOTE: This assumes the chat log sender name matches the current character's name
          // A more robust solution might involve passing the current character's name or ID
          // TODO: Pass playerCharacterId and compare message.sender.id === playerCharacterId
          const isOwnMessage = message.sender.name === "You"; // Placeholder - needs current character name/ID comparison using sender.id

          // Use a more robust composite key to avoid potential collisions
          // ---> Use composite key: timestamp-logIndex-isOptimistic
          const messageKey = `${message.timestamp}-${message.logIndex}-${message.isOptimistic ? 1 : 0}`; 

          return (
            <Box 
              key={messageKey} 
              p={2} 
              // Temporarily simplified styling:
              // borderRadius="md" 
              // bg={isOwnMessage ? 'blue.800' : 'gray.800'}
              // alignSelf={isOwnMessage ? 'flex-end' : 'flex-start'}
              // maxW="80%"
            >
              <Flex justify="space-between" alignItems="flex-end" mb={1}>
                <Text fontWeight="bold" fontSize="sm" color="blue.300">
                  {message.sender.name}
                </Text>
                <Text fontSize="xs" color="gray.400" ml={2}>
                  {/* Format timestamp without seconds */}
                  {new Date(message.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </Flex>
              {/* Render only the message content */}
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