import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBattleNadsClient } from '../contracts/useBattleNadsClient';
import { useWallet } from '../../providers/WalletProvider';
import { useBattleNads } from './useBattleNads';
import { ui } from '../../types';

/**
 * Hook for chat functionality
 * Provides chat logs and message sending capabilities
 */
export const useChat = () => {
  const { injectedWallet } = useWallet();
  const { client } = useBattleNadsClient();
  const queryClient = useQueryClient();
  
  // Owner address
  const owner = injectedWallet?.address || null;
  
  // Get game state for character ID and chat logs
  const { gameState } = useBattleNads(owner);
  
  // Character ID
  const characterId = gameState?.character?.id || null;
  
  // Chat logs
  const chatLogs = useMemo(() => gameState?.chatLogs || [], [gameState]);
  
  // Mutation for sending chat message
  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!client || !characterId) {
        throw new Error('Client or character ID missing');
      }
      
      return client.chat(characterId, message);
    },
    onSuccess: () => {
      // Invalidate and refetch game state
      queryClient.invalidateQueries({ queryKey: ['uiSnapshot', owner] });
    }
  });
  
  // Send chat message with optimistic updates
  const sendChatMessage = async (message: string) => {
    // Add optimistic update to cache
    const previousData = queryClient.getQueryData<ui.GameState>(['uiSnapshot', owner]);
    
    if (previousData && gameState && gameState.character) {
      // Create optimistic update
      const optimisticChat = {
        characterName: gameState.character.name || 'You',
        message,
        timestamp: Date.now()
      };
      
      // Update cache with optimistic chat message
      queryClient.setQueryData(['uiSnapshot', owner], {
        ...previousData,
        chatLogs: [...(previousData.chatLogs || []), optimisticChat]
      });
    }
    
    // Send the actual message
    return chatMutation.mutateAsync(message);
  };
  
  return {
    chatLogs,
    sendChatMessage,
    isSending: chatMutation.isPending,
    error: chatMutation.error ? (chatMutation.error as Error).message : null
  };
}; 