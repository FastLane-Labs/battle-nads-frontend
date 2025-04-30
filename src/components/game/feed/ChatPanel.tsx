import React, { useState, useEffect, useRef } from 'react';
import { Box, Heading, VStack, Input, Button, HStack, Text, Flex } from '@chakra-ui/react';
import { domain } from '@/types'; // Import domain types

interface ChatPanelProps {
  characterId: string;
  onSendChatMessage: (message: string) => Promise<void>;
  chatLogs: domain.ChatMessage[]; // Accept chatLogs prop
}

const ChatPanel: React.FC<ChatPanelProps> = ({ 
  characterId, 
  onSendChatMessage, 
  chatLogs // Destructure chatLogs
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Remove placeholder messages state
  // const [messages, setMessages] = useState<ChatMessage[]>([...]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom when chatLogs change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLogs]);
  
  const handleSendMessage = async () => {
    if (inputValue.trim() && !isSubmitting) {
      setIsSubmitting(true);
      
      try {
        await onSendChatMessage(inputValue);
        // Remove local message simulation
        // const newMessage: ChatMessage = { ... };
        // setMessages(prev => [...prev, newMessage]);
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
        {chatLogs.map((message, index) => { // Add index for potential key fallback
          // Determine if the sender is the current player
          // NOTE: This assumes the chat log sender name matches the current character's name
          // A more robust solution might involve passing the current character's name or ID
          const isOwnMessage = message.characterName === "You"; // Placeholder - needs current character name/ID

          // Create a unique key - use timestamp + index as fallback
          const messageKey = `${message.timestamp}-${index}`;
          
          return (
            <Box 
              key={messageKey} // Use generated key
              p={2} 
              borderRadius="md" 
              bg={isOwnMessage ? 'blue.800' : 'gray.800'}
              alignSelf={isOwnMessage ? 'flex-end' : 'flex-start'}
              maxW="80%"
            >
              <Flex justify="space-between" mb={1}>
                <Text fontWeight="bold" fontSize="sm" color="blue.300">
                  {message.characterName} {/* Use characterName from domain type */}
                </Text>
                <Text fontSize="xs" color="gray.400">
                  {/* Format timestamp if needed, assumes it's a number (block number) */}
                  {new Date(message.timestamp * 1000).toLocaleTimeString()} {/* Convert block timestamp */}
                </Text>
              </Flex>
              <Text>{message.message}</Text> {/* Use message from domain type */}
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