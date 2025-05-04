import { useMemo, useEffect } from 'react';
import { useWallet } from '../../providers/WalletProvider';
import { useBattleNadsClient } from '../contracts/useBattleNadsClient';
import { useBattleNads } from './useBattleNads';
import { useSessionKey } from '../session/useSessionKey';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { domain, contract } from '@/types';
import { useToast } from '@chakra-ui/react';
import { MAX_SESSION_KEY_VALIDITY_BLOCKS } from '../../config/env';
import { TransactionResponse } from 'ethers';
import { safeStringify } from '../../utils/bigintSerializer';
import { mapSessionKeyData } from '../../mappers/contractToDomain';
import { useCachedDataFeed, CachedDataBlock } from './useCachedDataFeed';

/**
 * Hook for game state and actions
 * Combines UI snapshot data with session key management and game actions
 */
export const useGame = () => {
  const { 
    injectedWallet, 
    embeddedWallet, 
    connectMetamask, 
    isInitialized: isWalletInitialized
  } = useWallet();
  const { client } = useBattleNadsClient();
  const queryClient = useQueryClient();
  const toast = useToast();
  
  // Owner address from wallet
  const owner = injectedWallet?.address || null;
  
  // Get LIVE game state data (includes LIVE chat/event logs from last poll)
  const { 
    gameState: liveGameState, // Renamed for clarity
    addOptimisticChatMessage,
    isLoading: isLoadingGameState, 
    error: gameStateError, 
  } = useBattleNads(owner);
  
  // Get historical cache data and loading state
  const { historicalBlocks, isHistoryLoading: isCacheLoading } = useCachedDataFeed(owner);
  
  // Character ID from game state
  const characterId = liveGameState?.character?.id || null;
  
  // Session key management
  const { 
    sessionKeyData,
    sessionKeyState, 
    needsUpdate: needsSessionKeyUpdate,
    refreshSessionKey
  } = useSessionKey(characterId);
  
  // Mutation for moving character
  const moveCharacterMutation = useMutation({
    mutationFn: async ({ direction }: { direction: domain.Direction }) => {
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
    // Add optimistic update locally BEFORE sending the transaction
    addOptimisticChatMessage(message);
    
    // Send the actual message via mutation
    return chatMutation.mutateAsync({ message });
  };
  
  // Mutation for updating session key
  const updateSessionKeyMutation = useMutation({
    mutationFn: async () => {
      if (!client || !characterId || !embeddedWallet?.address) {
        throw new Error('Client, character ID, or embedded wallet missing');
      }
      
      // --- Calculate expiration block --- 
      const currentBlock = await client.getLatestBlockNumber(); 
      const expirationBlock = currentBlock + BigInt(MAX_SESSION_KEY_VALIDITY_BLOCKS);
      // ---------------------------------

      // --- Fetch estimateBuyInAmountInMON and double it --- 
      let valueToSend = BigInt(0);
      try {
        const estimatedBuyIn = await client.estimateBuyInAmountInMON();
        valueToSend = estimatedBuyIn * BigInt(2); 
      } catch (estimateError) {
        console.error("[useGame] Error fetching estimateBuyInAmountInMON for session key update:", estimateError);
        throw new Error("Could not calculate required funds for session key update.");
      }
      // -------------------------------------------------

      // --- Call client with value --- 
      const tx = await client.updateSessionKey(
        embeddedWallet.address,
        expirationBlock, // Pass BigInt directly
        valueToSend 
      );
      return tx;
      // ---------------------------------
    },
    onSuccess: async (result: TransactionResponse) => {
      console.log("[useGame] updateSessionKey tx submitted, waiting for confirmation...", result.hash);
      
      // Optional: Add a toast notification for waiting
      toast?.({
        title: 'Session Key Update Sent',
        description: `Tx: ${result.hash.slice(0, 6)}...${result.hash.slice(-4)}. Waiting for confirmation...`,
        status: 'loading',
        duration: null,
        isClosable: true,
        id: 'session-key-wait-toast'
      });

      try {
        // --- Wait for 1 confirmation --- 
        const receipt = await result.wait(1);
        console.log("[useGame] updateSessionKey transaction confirmed:", receipt?.hash);
        toast?.close('session-key-wait-toast'); // Close waiting toast
        toast?.({
          title: 'Session Key Updated!',
          status: 'success',
          duration: 4000,
        });
        // --------------------------------

        // --- Invalidate session key query AFTER confirmation ---
        queryClient.invalidateQueries({ queryKey: ['sessionKey', injectedWallet?.address, characterId] }); // Use the updated query key
        // -----------------------------------------------------

      } catch (waitError: any) {
        console.error("[useGame] Error waiting for session key update confirmation:", waitError);
        toast?.close('session-key-wait-toast'); // Close waiting toast
        toast?.({
          title: 'Session Key Update Failed',
          description: `Failed to confirm transaction ${result.hash}: ${waitError.message}`,
          status: 'error',
          duration: 7000,
        });
      }
    },
    onError: (err: Error) => {
       console.error("[useGame] Error sending session key update transaction:", err);
       toast?.({
          title: 'Session Key Update Error',
          description: err.message || 'Failed to send update transaction.',
          status: 'error',
          duration: 5000,
       });
    }
  });
  
  // --- Map historical blocks to domain.ChatMessage --- 
  const historicalChatMessages = useMemo<domain.ChatMessage[]>(() => {
    if (!historicalBlocks || historicalBlocks.length === 0) return [];
    
    const messages: domain.ChatMessage[] = [];
    
    historicalBlocks.forEach((block: CachedDataBlock) => {
      block.chats?.forEach((chat, index) => { // chat is now SerializedChatLog
        messages.push({
          // Use stored sender info, provide fallback for older data / robustness
          sender: { 
            id: chat.senderId || 'unknown-id', 
            name: chat.senderName || 'Unknown', 
            index: -1 // Historical logs don't have a reliable runtime index
          }, 
          message: chat.content,
          blocknumber: BigInt(chat.timestamp), // Assuming timestamp is block number
          timestamp: Number(chat.timestamp), // Assuming timestamp is block number
          logIndex: index, // Use index within block as pseudo logIndex
          isOptimistic: false
        });
      });
    });
    return messages;
  }, [historicalBlocks]);
  // ----------------------------------------------------

  // --- Construct the unified WorldSnapshot --- 
  const worldSnapshot = useMemo<domain.WorldSnapshot | null>(() => {
    if (!liveGameState || !liveGameState.character) return null; // Need live character data
    
    // Combine live and historical chat logs
    const liveChatLogs = liveGameState.chatLogs || [];
    const combinedChatLogs = [...historicalChatMessages, ...liveChatLogs];
    
    // Remove duplicates (preferring live/optimistic ones)
    const uniqueChatLogs = combinedChatLogs.reduce((acc, current) => {
      const key = `${current.timestamp}-${current.sender.id}-${current.message}`;
      if (!acc.find(item => `${item.timestamp}-${item.sender.id}-${item.message}` === key)) {
        acc.push(current);
      }
      return acc;
    }, [] as domain.ChatMessage[]);
    
    uniqueChatLogs.sort((a, b) => a.timestamp - b.timestamp); // Sort by timestamp

    return {
      // Combine data from liveGameState and sessionKey
      characterID: liveGameState.character.id, 
      sessionKeyData: mapSessionKeyData(sessionKeyData ?? null, owner) ?? {
        owner: owner ?? '', // Use hook's owner, fallback to empty
        key: '',
        balance: '0',
        targetBalance: '0',
        ownerCommittedAmount: '0',
        ownerCommittedShares: '0',
        expiry: '0'
      },
      character: liveGameState.character,
      combatants: liveGameState.combatants || [],
      noncombatants: liveGameState.noncombatants || [],
      eventLogs: liveGameState.eventLogs || [], // Using only live events for now
      chatLogs: uniqueChatLogs, // Use combined, unique, sorted chat logs
      balanceShortfall: liveGameState.balanceShortfall || 0,
      unallocatedAttributePoints: liveGameState.unallocatedAttributePoints || 0,
      lastBlock: liveGameState.lastBlock || 0
    };
  }, [liveGameState, sessionKeyData, historicalChatMessages]); // Add historicalChatMessages dependency
  // -----------------------------------------

  // --- Determine Combat State ---
  const isInCombat = useMemo(() => {
      return !!worldSnapshot && worldSnapshot.combatants.length > 0;
  }, [worldSnapshot]);
  // ----------------------------

  // --- Combine Loading States (Now includes cache loading) ---
  const isLoading = !isWalletInitialized || isCacheLoading || isLoadingGameState;
  // --------------------------------------------------------

  return {
    // State
    worldSnapshot, 
    isLoading: isLoading, 
    isCacheLoading: isCacheLoading, 
    error: gameStateError,
    isInitialized: isWalletInitialized,
    
    // Wallet
    owner,
    connectWallet: connectMetamask,
    hasWallet: !!injectedWallet?.address,
    
    // Session key
    sessionKeyData,
    sessionKeyState,
    needsSessionKeyUpdate,
    updateSessionKey: updateSessionKeyMutation.mutate,
    isUpdatingSessionKey: updateSessionKeyMutation.isPending,
    
    // Character (Extract from snapshot for convenience, ensure null check)
    character: worldSnapshot?.character, 
    characterId: worldSnapshot?.character?.id || null,
    position: worldSnapshot?.character?.position ? 
              { 
                 x: worldSnapshot.character.position.x, 
                 y: worldSnapshot.character.position.y, 
                 depth: worldSnapshot.character.position.depth
              } : { x: 0, y: 0, depth: 0 }, 
    
    // Combat State
    isInCombat,

    // Actions
    moveCharacter: (direction: domain.Direction) => 
      moveCharacterMutation.mutate({ direction }),
    isMoving: moveCharacterMutation.isPending,
    
    attack: (targetIndex: number) => 
      attackMutation.mutate({ targetIndex }),
    isAttacking: attackMutation.isPending,
    
    sendChatMessage,
    addOptimisticChatMessage,
    isSendingChat: chatMutation.isPending,
    
    // Logs (Extract from snapshot for convenience - will now include historical chat)
    chatLogs: worldSnapshot?.chatLogs || [],
    eventLogs: worldSnapshot?.eventLogs || [], // Still only live events
    
    // Other characters (Extract from snapshot - adjust property name if needed)
    others: worldSnapshot?.noncombatants || [] // Assuming noncombatants are the 'others'
  };
}; 