import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBattleNadsClient } from '../contracts/useBattleNadsClient';
import { useWallet } from '../../providers/WalletProvider';
import { useBattleNads } from './useBattleNads';
import { useUiSnapshot } from './useUiSnapshot';
import { invalidateSnapshot } from '../utils';
import { contract, domain } from '../../types';
import { getChatMessagesFromFeeds } from '../../utils/dataFeedSelectors';

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
  
  // Get raw data for chat logs directly from dataFeeds
  const { data: rawData } = useUiSnapshot(owner);
  
  // Get game state for character information
  const { gameState } = useBattleNads(owner);
  
  // Character ID
  const characterId = gameState?.character?.id || null;
  
  // Get chat logs directly from dataFeeds - this is the key change
  const chatLogs = useMemo(() => {
    if (!rawData?.dataFeeds) return [];
    
    // Convert raw dataFeeds to domain ChatMessage objects
    return getChatMessagesFromFeeds(rawData.dataFeeds);
  }, [rawData?.dataFeeds]);
  
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
      invalidateSnapshot(queryClient, owner);
    }
  });
  
  // Send chat message with optimistic updates
  const sendChatMessage = async (message: string) => {
    console.log(`[useChat] Preparing to send message: "${message}" for character ${characterId}`);
    
    // Add optimistic update to cache - with new data structure
    const previousData = queryClient.getQueryData<contract.PollFrontendDataReturn>(['uiSnapshot', owner]);
    
    if (previousData && gameState?.character) {
      // Format the optimistic chat message
      const chatMessage = `${gameState.character.name || 'You'}: ${message}`;
      
      console.log(`[useChat] Adding optimistic chat update: ${chatMessage}`);
      
      // Create a new optimistic dataFeed to add to the list
      const optimisticFeed: contract.DataFeed = {
        blockNumber: previousData.endBlock, // Use the latest known block
        logs: [],
        chatLogs: [chatMessage]
      };
      
      // Create a new array of dataFeeds with our optimistic update
      const updatedDataFeeds = [...(previousData.dataFeeds || []), optimisticFeed];
      
      // Update the cache with our optimistic dataFeed
      queryClient.setQueryData(['uiSnapshot', owner], {
        ...previousData,
        dataFeeds: updatedDataFeeds
      });
    } else {
      console.warn(`[useChat] Missing data for optimistic update. Owner: ${owner}, Character: ${characterId}`);
    }
    
    console.log(`[useChat] Calling client.chat with characterId: ${characterId}`);
    
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