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
    rollback,
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
      rollbackStrategy: 'explicit', // Remove only when confirmed message is received
      deduplicationKey: (data) => `${data.message.sender.id}-${data.originalMessage}`,
      onRollback: () => {
        console.log('[useOptimisticChat] Chat message removed due to confirmed version:', message);
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
  }, [getUpdatesByType, updates]);

  // Rollback a specific chat message
  const rollbackChatMessage = useCallback((updateId: string) => {
    rollback(updateId);
  }, [rollback]);

  // Remove optimistic messages that have confirmed versions
  const removeConfirmedOptimisticMessages = useCallback((confirmedChatMessages: domain.ChatMessage[]) => {
    // Get all optimistic chat updates
    const optimisticUpdates = getUpdatesByType<OptimisticChatData>('chat');
    const toRemove: string[] = [];
    
    console.log(`[useOptimisticChat] Checking ${optimisticUpdates.length} optimistic messages against ${confirmedChatMessages.length} confirmed messages`);
    
    optimisticUpdates.forEach(optimisticUpdate => {
      const matchingConfirmed = confirmedChatMessages.find(confirmedMessage => 
        optimisticUpdate.data.originalMessage === confirmedMessage.message &&
        optimisticUpdate.data.message.sender.id === confirmedMessage.sender.id
      );
      
      if (matchingConfirmed) {
        console.log(`[useOptimisticChat] Found confirmed version for optimistic message: "${optimisticUpdate.data.originalMessage}" - removing optimistic version`);
        toRemove.push(optimisticUpdate.id);
      } else {
        console.log(`[useOptimisticChat] No confirmed version found for optimistic message: "${optimisticUpdate.data.originalMessage}"`);
      }
    });
    
    // Remove all confirmed updates
    if (toRemove.length > 0) {
      console.log(`[useOptimisticChat] Removing ${toRemove.length} confirmed optimistic messages`);
      toRemove.forEach(id => removeOptimisticUpdate(id));
    }
  }, [getUpdatesByType, removeOptimisticUpdate]);


  return {
    optimisticChatMessages,
    addOptimisticChatMessage,
    removeOptimisticChatMessage,
    isMessageOptimistic,
    rollbackChatMessage,
    removeConfirmedOptimisticMessages
  };
}