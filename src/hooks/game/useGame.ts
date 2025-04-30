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

/**
 * Hook for game state and actions
 * Combines UI snapshot data with session key management and game actions
 */
export const useGame = () => {
  const { injectedWallet, embeddedWallet, connectMetamask } = useWallet();
  const { client } = useBattleNadsClient();
  const queryClient = useQueryClient();
  const toast = useToast();
  
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
  
  // Safely log state with BigInt values
  useEffect(() => {
      console.log(`[useGame] Session key state changed: ${sessionKeyState}`, { 
        needsUpdate: needsSessionKeyUpdate, 
        rawData: safeStringify(sessionKey)
      });
  }, [sessionKeyState, needsSessionKeyUpdate, sessionKey]);
  // ---------------------------------------------------
  
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
    // Add optimistic update to cache
    const previousData = queryClient.getQueryData<contract.PollFrontendDataReturn>(['uiSnapshot', owner]);
    
    if (previousData && gameState && gameState.character) {
      const chatMessage = `${gameState.character.name || 'You'}: ${message}`;
      
      console.log(`[useGame] Adding optimistic chat update: ${chatMessage}`);
      
      // Create a new optimistic dataFeed to add to the list
      const optimisticFeed: contract.DataFeed = {
        blockNumber: previousData.endBlock || BigInt(0), // Use the latest known block
        logs: [],
        chatLogs: [chatMessage]
      };
      
      // Update cache with our optimistic dataFeed
      queryClient.setQueryData(['uiSnapshot', owner], {
        ...previousData,
        dataFeeds: [...(previousData.dataFeeds || []), optimisticFeed]
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
      
      // --- Calculate expiration block --- 
      const currentBlock = await client.getLatestBlockNumber(); 
      const expirationBlock = currentBlock + BigInt(MAX_SESSION_KEY_VALIDITY_BLOCKS);
      console.log(`[useGame] Updating session key ${embeddedWallet.address}. Current Block: ${currentBlock}, Validity: ${MAX_SESSION_KEY_VALIDITY_BLOCKS}, Target Expiration: ${expirationBlock}`);
      // ---------------------------------

      // --- Fetch estimateBuyInAmountInMON and double it --- 
      let valueToSend = BigInt(0);
      try {
        const estimatedBuyIn = await client.estimateBuyInAmountInMON();
        valueToSend = estimatedBuyIn * BigInt(2); 
        console.log(`[useGame] Estimated buy-in: ${estimatedBuyIn}, sending 2x as value: ${valueToSend}`);
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
      console.log("[useGame] updateSessionKey transaction sent:", tx.hash);
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
        console.log("[useGame] Invalidating sessionKey query after confirmation...");
        queryClient.invalidateQueries({ queryKey: ['sessionKey', injectedWallet?.address, characterId] }); // Use the updated query key
        // refreshSessionKey(); // invalidateQueries should handle refetch
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
  
  // --- Construct the unified WorldSnapshot --- 
  const worldSnapshot = useMemo<domain.WorldSnapshot | null>(() => {
    if (!gameState || !gameState.character) return null; // Need character for a valid snapshot
    
    return {
      // Combine data from gameState (from useBattleNads) and sessionKey
      characterID: gameState.character.id, 
      sessionKeyData: mapSessionKeyData(sessionKey ?? null, owner) ?? {
        owner: owner ?? '', // Use hook's owner, fallback to empty
        key: '',
        balance: '0',
        targetBalance: '0',
        ownerCommittedAmount: '0',
        ownerCommittedShares: '0',
        expiry: '0'
      },
      character: gameState.character,
      combatants: gameState.combatants || [],
      noncombatants: gameState.noncombatants || [],
      eventLogs: gameState.eventLogs || [],
      chatLogs: gameState.chatLogs || [],
      balanceShortfall: gameState.balanceShortfall || 0,
      unallocatedAttributePoints: gameState.unallocatedAttributePoints || 0,
      movementOptions: gameState.movementOptions || {
        canMoveNorth: false, canMoveSouth: false, canMoveEast: false, 
        canMoveWest: false, canMoveUp: false, canMoveDown: false
      },
      lastBlock: gameState.lastBlock || 0
      // Note: Original gameState structure from useBattleNads might slightly differ
      // We might need to adjust which properties are pulled from where if needed
    };
  }, [gameState, sessionKey]);
  // -----------------------------------------

  return {
    // State
    worldSnapshot, // Return the unified snapshot
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
    
    // Character (Extract from snapshot for convenience, ensure null check)
    character: worldSnapshot?.character, 
    characterId: worldSnapshot?.character?.id || null,
    position: worldSnapshot?.character?.position ? 
              { 
                 x: worldSnapshot.character.position.x, 
                 y: worldSnapshot.character.position.y, 
                 depth: worldSnapshot.character.position.depth
              } : { x: 0, y: 0, depth: 0 }, 
    movementOptions: worldSnapshot?.movementOptions || { 
      canMoveNorth: false, canMoveSouth: false, canMoveEast: false, 
      canMoveWest: false, canMoveUp: false, canMoveDown: false 
    },
    
    // Actions
    moveCharacter: (direction: domain.Direction) => 
      moveCharacterMutation.mutate({ direction }),
    isMoving: moveCharacterMutation.isPending,
    
    attack: (targetIndex: number) => 
      attackMutation.mutate({ targetIndex }),
    isAttacking: attackMutation.isPending,
    
    sendChatMessage,
    isSendingChat: chatMutation.isPending,
    
    // Logs (Extract from snapshot for convenience)
    chatLogs: worldSnapshot?.chatLogs || [],
    eventLogs: worldSnapshot?.eventLogs || [],
    
    // Other characters (Extract from snapshot - adjust property name if needed)
    others: worldSnapshot?.noncombatants || [] // Assuming noncombatants are the 'others'
  };
}; 