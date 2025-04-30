import React, { useState, useEffect, useRef } from 'react';
import { Box, Heading, VStack, Input, Button, HStack, Text, Flex } from '@chakra-ui/react';

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: Date;
}

interface ChatPanelProps {
  characterId: string;
  onSendChatMessage: (message: string) => Promise<void>;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ characterId, onSendChatMessage }) => {
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // This would be fetched from an actual API in a real implementation
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'System',
      text: 'Welcome to the chat room!',
      timestamp: new Date()
    },
    {
      id: '2',
      sender: 'Player1',
      text: 'Hello everyone!',
      timestamp: new Date(Date.now() - 60000)
    },
    {
      id: '3',
      sender: 'Player2',
      text: 'Hi there!',
      timestamp: new Date(Date.now() - 30000)
    }
  ]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSendMessage = async () => {
    if (inputValue.trim() && !isSubmitting) {
      setIsSubmitting(true);
      
      try {
        await onSendChatMessage(inputValue);
        
        // In a real implementation, we wouldn't add the message here
        // It would come back through a subscription or polling mechanism
        // But for this demo, we'll simulate it
        const newMessage: ChatMessage = {
          id: Date.now().toString(),
          sender: 'You',
          text: inputValue,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, newMessage]);
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
        {messages.map((message) => (
          <Box 
            key={message.id} 
            p={2} 
            borderRadius="md" 
            bg={message.sender === 'You' ? 'blue.800' : 'gray.800'}
            alignSelf={message.sender === 'You' ? 'flex-end' : 'flex-start'}
            maxW="80%"
          >
            <Flex justify="space-between" mb={1}>
              <Text fontWeight="bold" fontSize="sm" color="blue.300">
                {message.sender}
              </Text>
              <Text fontSize="xs" color="gray.400">
                {message.timestamp.toLocaleTimeString()}
              </Text>
            </Flex>
            <Text>{message.text}</Text>
          </Box>
        ))}
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