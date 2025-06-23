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
    rollback
  } = useOptimisticUpdatesContext();

  // Get all optimistic chat messages
  const optimisticChatMessages = useMemo(() => {
    const updates = getUpdatesByType<OptimisticChatData>('chat');
    return updates.map(update => update.data.message);
  }, [getUpdatesByType]);

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
      timestamp: Date.now(),
      logIndex: 9999, // High number to sort last
      isOptimistic: true
    };

    const optimisticData: OptimisticChatData = {
      message: chatMessage,
      originalMessage: message
    };

    // Add with deduplication based on message content and sender
    return addOptimisticUpdate('chat', optimisticData, {
      rollbackStrategy: 'timeout',
      timeoutDuration: 30000, // 30 seconds
      deduplicationKey: (data) => `${data.message.sender.id}-${data.originalMessage}`,
      onRollback: () => {
        console.log('[useOptimisticChat] Chat message rolled back:', message);
      }
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
  }, [getUpdatesByType]);

  // Rollback a specific chat message
  const rollbackChatMessage = useCallback((updateId: string) => {
    rollback(updateId);
  }, [rollback]);

  return {
    optimisticChatMessages,
    addOptimisticChatMessage,
    removeOptimisticChatMessage,
    isMessageOptimistic,
    rollbackChatMessage
  };
}