import { useCallback, useMemo } from 'react';
import { useOptimisticUpdatesContext } from '@/providers/OptimisticUpdatesProvider';
import * as domain from '@/types/domain';

interface OptimisticChatData {
  message: domain.ChatMessage;
  originalMessage: string;
}

export function useOptimisticChat() {
  const { 
    addOptimisticUpdate, 
    removeOptimisticUpdate, 
    getUpdatesByType,
    updates
  } = useOptimisticUpdatesContext();

  // Get all optimistic chat messages
  const optimisticChatMessages = useMemo(() => {
    const updates = getUpdatesByType<OptimisticChatData>('chat');
    return updates.map(update => update.data.message);
  }, [getUpdatesByType, updates]);

  // Add an optimistic chat message
  const addOptimisticChatMessage = useCallback((
    message: string,
    character: { id: string; name: string; index: number },
    currentBlockNumber: bigint
  ): string => {
    const chatMessage: domain.ChatMessage = {
      sender: {
        id: character.id,
        name: character.name,
        index: character.index
      },
      message,
      blocknumber: currentBlockNumber,
      timestamp: Date.now(), // Use consistent timestamp for 30-second deduplication window
      logIndex: 9999, // High number to sort last
      isOptimistic: true
    };

    const optimisticData: OptimisticChatData = {
      message: chatMessage,
      originalMessage: message
    };

    // Add with deduplication based on message content and sender
    return addOptimisticUpdate('chat', optimisticData, {
      deduplicationKey: (data) => `${data.message.sender.id}-${data.originalMessage}`
    });
  }, [addOptimisticUpdate]);

  // Remove a specific optimistic chat message
  const removeOptimisticChatMessage = useCallback((updateId: string) => {
    removeOptimisticUpdate(updateId);
  }, [removeOptimisticUpdate]);

  // Check if a message already exists (for deduplication)
  const isMessageOptimistic = useCallback((
    message: string,
    senderId: string
  ): boolean => {
    const updates = getUpdatesByType<OptimisticChatData>('chat');
    return updates.some(update => 
      update.data.originalMessage === message && 
      update.data.message.sender.id === senderId
    );
  }, [getUpdatesByType, updates]);



  return {
    optimisticChatMessages,
    addOptimisticChatMessage,
    removeOptimisticChatMessage,
    isMessageOptimistic
  };
}