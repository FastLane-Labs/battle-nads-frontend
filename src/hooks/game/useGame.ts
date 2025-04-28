import { useMemo } from 'react';
import { useWallet } from '../../providers/WalletProvider';
import { useBattleNadsClient } from '../contracts/useBattleNadsClient';
import { useBattleNads } from './useBattleNads';
import { useSessionKey } from '../session/useSessionKey';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { GameState } from '../../types/gameTypes';
import { Direction } from '../../types/contracts/BattleNadsEntrypoint';

/**
 * Hook for game state and actions
 * Combines UI snapshot data with session key management and game actions
 */
export const useGame = () => {
  const { injectedWallet, embeddedWallet, connectMetamask } = useWallet();
  const { client } = useBattleNadsClient();
  const queryClient = useQueryClient();
  
  // Owner address from wallet
  const owner = injectedWallet?.address || null;
  
  // Get game state
  const { 
    gameState, 
    isLoading: isLoadingGameState, 
    error: gameStateError, 
    refetch: refetchGameState 
  } = useBattleNads(owner);
  
  // Character ID from game state
  const characterId = gameState?.character?.id || null;
  
  // Session key management
  const { 
    sessionKey, 
    sessionKeyState, 
    needsUpdate: needsSessionKeyUpdate,
    refreshSessionKey
  } = useSessionKey(characterId);
  
  // Extract chat logs
  const chatLogs = useMemo(() => gameState?.chatLogs || [], [gameState]);
  
  // Extract event logs
  const eventLogs = useMemo(() => gameState?.eventLogs || [], [gameState]);
  
  // Character position
  const position = useMemo(() => gameState?.position || { x: 0, y: 0, depth: 0 }, [gameState]);
  
  // Movement options
  const movementOptions = useMemo(() => gameState?.movementOptions || {
    canMoveNorth: false,
    canMoveSouth: false,
    canMoveEast: false,
    canMoveWest: false,
    canMoveUp: false,
    canMoveDown: false
  }, [gameState]);
  
  // Mutation for moving character
  const moveCharacterMutation = useMutation({
    mutationFn: async ({ direction }: { direction: Direction }) => {
      if (!client || !characterId) {
        throw new Error('Client or character ID missing');
      }
      
      return client.moveCharacter(characterId, direction);
    },
    onSuccess: () => {
      // Invalidate and refetch game state
      queryClient.invalidateQueries({ queryKey: ['uiSnapshot', owner] });
    }
  });
  
  // Mutation for attacking
  const attackMutation = useMutation({
    mutationFn: async ({ targetIndex }: { targetIndex: number }) => {
      if (!client || !characterId) {
        throw new Error('Client or character ID missing');
      }
      
      return client.attack(characterId, targetIndex);
    },
    onSuccess: () => {
      // Invalidate and refetch game state
      queryClient.invalidateQueries({ queryKey: ['uiSnapshot', owner] });
    }
  });
  
  // Mutation for chat
  const chatMutation = useMutation({
    mutationFn: async ({ message }: { message: string }) => {
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
  
  // Optimistic update helper for chat
  const sendChatMessage = async (message: string) => {
    // Add optimistic update to cache
    const previousData = queryClient.getQueryData<GameState>(['uiSnapshot', owner]);
    
    if (previousData && gameState) {
      // Create optimistic update
      const optimisticChat = {
        characterName: gameState.character?.name || 'You',
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
    return chatMutation.mutateAsync({ message });
  };
  
  // Mutation for updating session key
  const updateSessionKeyMutation = useMutation({
    mutationFn: async () => {
      if (!client || !characterId || !embeddedWallet?.address) {
        throw new Error('Client, character ID, or embedded wallet missing');
      }
      
      return client.updateSessionKey(
        characterId,
        embeddedWallet.address,
        100000 // Default expiration blocks
      );
    },
    onSuccess: () => {
      // Invalidate session key query and refetch
      queryClient.invalidateQueries({ queryKey: ['sessionKey', characterId] });
      refreshSessionKey();
    }
  });
  
  return {
    // State
    gameState,
    isLoading: isLoadingGameState,
    error: gameStateError,
    refetch: refetchGameState,
    
    // Wallet
    owner,
    connectWallet: connectMetamask,
    hasWallet: !!injectedWallet?.address,
    
    // Session key
    sessionKey,
    sessionKeyState,
    needsSessionKeyUpdate,
    updateSessionKey: updateSessionKeyMutation.mutate,
    isUpdatingSessionKey: updateSessionKeyMutation.isPending,
    
    // Character
    character: gameState?.character,
    characterId,
    position,
    movementOptions,
    
    // Actions
    moveCharacter: (direction: Direction) => 
      moveCharacterMutation.mutate({ direction }),
    isMoving: moveCharacterMutation.isPending,
    
    attack: (targetIndex: number) => 
      attackMutation.mutate({ targetIndex }),
    isAttacking: attackMutation.isPending,
    
    sendChatMessage,
    isSendingChat: chatMutation.isPending,
    
    // Logs
    chatLogs,
    eventLogs,
    
    // Other characters
    others: gameState?.others || []
  };
}; 