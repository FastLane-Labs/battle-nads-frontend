import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  VStack, 
  Input, 
  Button, 
  Text, 
  HStack, 
  Flex, 
  Spacer,
  useColorModeValue
} from '@chakra-ui/react';
import { ChatMessage } from '@/types/domain';

interface ChatInterfaceProps {
  characterId: string;
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
}

export default function ChatInterface({ 
  characterId, 
  messages, 
  onSendMessage 
}: ChatInterfaceProps) {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Message container styling
  const bgColor = useColorModeValue('gray.700', 'gray.800');
  const borderColor = useColorModeValue('gray.600', 'gray.700');
  
  // Add debug logging for incoming messages
  useEffect(() => {
    console.log(`[ChatInterface] Received ${messages.length} messages to display`);
    if (messages.length > 0) {
      console.log('[ChatInterface] First few messages:', messages.slice(0, 3));
    }
  }, [messages]);
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Using zoneChat via the onSendMessage callback, which ultimately calls
  // client.chat() in useChat hook that invokes adapter.zoneChat()
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      try {
        console.log(`[ChatInterface] Sending message for character ${characterId}: "${newMessage}"`);
        // This will use zoneChat through the client interface
        onSendMessage(newMessage);
        setNewMessage('');
      } catch (error) {
        console.error('[ChatInterface] Error sending message:', error);
      }
    }
  };
  
  const formatTime = (realTimestamp?: number, blockTimestamp?: number) => {
    // Use real timestamp if available
    if (realTimestamp) {
      const date = new Date(realTimestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Fall back to block timestamp if no real timestamp
    if (blockTimestamp) {
      return `Block: ${blockTimestamp}`;
    }
    
    return '';
  };
  
  return (
    <Box 
      border="1px" 
      borderColor={borderColor}
      borderRadius="md" 
      h="100%" 
      display="flex" 
      flexDirection="column"
    >
      <Box p={2} bg="gray.800" borderTopRadius="md">
        <Text fontWeight="bold">Chat</Text>
      </Box>
      
      {/* Messages container */}
      <Box 
        p={3} 
        flex="1" 
        overflowY="auto" 
        bg={bgColor}
        opacity={0.9}
        css={{
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#2D3748',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#4A5568',
            borderRadius: '4px',
          },
        }}
      >
        <VStack spacing={2} align="stretch">
          {messages.length === 0 ? (
            <Text color="gray.400" fontSize="sm">No messages yet. Start a conversation!</Text>
          ) : (
            messages.map((msg, index) => (
              <Box 
                key={index} 
                p={2} 
                borderRadius="md" 
                bg={msg.characterName === 'You' ? 'blue.800' : 'gray.800'}
                maxW="85%"
                alignSelf={msg.characterName === 'You' ? 'flex-end' : 'flex-start'}
              >
                <Flex direction="column">
                  <HStack mb={1}>
                    <Text fontWeight="bold" fontSize="sm" color="gray.300">
                      {msg.characterName}
                    </Text>
                    <Spacer />
                    <Text fontSize="xs" color="gray.400">
                      {formatTime(msg.timestamp)}
                    </Text>
                  </HStack>
                  <Text fontSize="md">{msg.message}</Text>
                </Flex>
              </Box>
            ))
          )}
          <div ref={messagesEndRef} />
        </VStack>
      </Box>
      
      {/* Input area */}
      <Box p={3} bg="gray.800" borderBottomRadius="md">
        <form onSubmit={handleSendMessage}>
          <HStack>
            <Input 
              value={newMessage} 
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              bg="gray.700"
              _hover={{ bg: 'gray.600' }}
              _focus={{ bg: 'gray.600' }}
            />
            <Button 
              colorScheme="blue" 
              type="submit" 
              isDisabled={!newMessage.trim()}
            >
              Send
            </Button>
          </HStack>
        </form>
      </Box>
    </Box>
  );
} 