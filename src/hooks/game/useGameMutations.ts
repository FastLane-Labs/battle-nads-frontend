import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@chakra-ui/react';
import { TransactionResponse } from 'ethers';
import { useBattleNadsClient } from '../contracts/useBattleNadsClient';
import { useWallet } from '../../providers/WalletProvider';
import { domain } from '@/types';
import { MAX_SESSION_KEY_VALIDITY_BLOCKS } from '../../config/env';
import { useGameMutation, useGameTransactionMutation } from './useGameMutation';

/**
 * Layer 1: Pure game mutations
 * Focused only on contract interactions without complex state management
 */
export const useGameMutations = (characterId: string | null, owner: string | null) => {
  const { client } = useBattleNadsClient();
  const { injectedWallet, embeddedWallet } = useWallet();
  const queryClient = useQueryClient();
  const toast = useToast();

  // Move character mutation
  const moveCharacterMutation = useGameMutation(
    async (variables: { direction: domain.Direction }) => {
      if (!client || !characterId) {
        throw new Error('Client or character ID missing');
      }
      return client.moveCharacter(characterId, variables.direction);
    },
    {
      successMessage: 'Character moved successfully',
      errorMessage: 'Failed to move character',
      mutationKey: ['moveCharacter', characterId || 'unknown', owner || 'unknown'],
      characterId,
    }
  );

  // Attack mutation
  const attackMutation = useGameMutation(
    async (variables: { targetCharacterIndex: number }) => {
      if (!client || !characterId) {
        throw new Error('Client or character ID missing');
      }
      return client.attack(characterId, variables.targetCharacterIndex);
    },
    {
      successMessage: 'Attack successful',
      errorMessage: 'Attack failed',
      mutationKey: ['attack', characterId || 'unknown', owner || 'unknown'],
      characterId,
    }
  );

  // Allocate points mutation
  const allocatePointsMutation = useGameMutation(
    async (variables: { strength: number; vitality: number; dexterity: number; quickness: number; sturdiness: number; luck: number }) => {
      if (!client || !characterId) {
        throw new Error('Client or character ID missing');
      }
      return client.allocatePoints(
        characterId, 
        BigInt(variables.strength), 
        BigInt(variables.vitality), 
        BigInt(variables.dexterity), 
        BigInt(variables.quickness), 
        BigInt(variables.sturdiness), 
        BigInt(variables.luck)
      );
    },
    {
      successMessage: 'Points allocated successfully',
      errorMessage: 'Failed to allocate points',
      mutationKey: ['allocatePoints', characterId || 'unknown', owner || 'unknown'],
      characterId,
    }
  );

  // Send chat mutation
  const sendChatMutation = useGameTransactionMutation(
    async (variables: { message: string }) => {
      if (!client || !characterId) {
        throw new Error('Client or character ID missing');
      }
      return client.chat(characterId, variables.message);
    },
    {
      successMessage: 'Message confirmed',
      errorMessage: 'Failed to send message',
      showSuccessToast: false,
      showTransactionFlow: false,
      mutationKey: ['sendChat', characterId || 'unknown', owner || 'unknown'],
      characterId,
    }
  );

  // Session key update mutation
  const updateSessionKeyMutation = useMutation({
    mutationFn: async (variables: { endBlock: bigint }) => {
      if (!client || !characterId || !embeddedWallet?.address) {
        throw new Error('Client, character ID, or embedded wallet missing');
      }

      const expirationBlock = variables.endBlock + BigInt(MAX_SESSION_KEY_VALIDITY_BLOCKS);
      const estimatedBuyIn = await client.estimateBuyInAmountInMON();
      const valueToSend = estimatedBuyIn * BigInt(2);

      return client.updateSessionKey(
        embeddedWallet.address,
        expirationBlock,
        valueToSend
      );
    },
    onSuccess: async (result: TransactionResponse) => {
      const loadingToastId = 'session-key-wait-toast';
      toast?.({
        id: loadingToastId,
        title: 'Session Key Update Sent',
        description: `Tx: ${result.hash.slice(0, 6)}...${result.hash.slice(-4)}. Waiting for confirmation...`,
        status: 'loading',
        duration: null,
        isClosable: true,
      });
      
      try {
        await result.wait(1);
        toast?.close(loadingToastId);
        toast?.({
          title: 'Session Key Updated!',
          status: 'success',
          duration: 4000,
        });
        queryClient.invalidateQueries({ queryKey: ['sessionKey', injectedWallet?.address, characterId] });
      } catch (waitError: any) {
        console.error('[useGameMutations] Error waiting for session key update confirmation:', waitError);
        toast?.close(loadingToastId);
        toast?.({
          title: 'Session Key Update Failed',
          description: `Failed to confirm transaction ${result.hash}: ${waitError.message}`,
          status: 'error',
          duration: 7000,
        });
      }
    },
    onError: (err: Error) => {
      console.error('[useGameMutations] Error sending session key update transaction:', err);
      toast?.({
        title: 'Session Key Update Error',
        description: err.message || 'Failed to send update transaction.',
        status: 'error',
        duration: 5000,
      });
    }
  });

  return {
    // Action functions
    moveCharacter: (direction: domain.Direction) => 
      moveCharacterMutation.mutate({ direction }),
    attack: (targetCharacterIndex: number) => 
      attackMutation.mutate({ targetCharacterIndex }),
    allocatePoints: (strength: number, vitality: number, dexterity: number, quickness: number, sturdiness: number, luck: number) => 
      allocatePointsMutation.mutate({ strength, vitality, dexterity, quickness, sturdiness, luck }),
    sendChatMessage: (message: string) => 
      sendChatMutation.mutate({ message }),
    updateSessionKey: (endBlock: bigint) => 
      updateSessionKeyMutation.mutate({ endBlock }),

    // Action states
    isMoving: moveCharacterMutation.isPending,
    isAttacking: attackMutation.isPending,
    isAllocatingPoints: allocatePointsMutation.isPending,
    isSendingChat: sendChatMutation.isPending,
    isUpdatingSessionKey: updateSessionKeyMutation.isPending,

    // Action errors
    moveError: moveCharacterMutation.error,
    attackError: attackMutation.error,
    allocatePointsError: allocatePointsMutation.error,
    chatError: sendChatMutation.error,
    sessionKeyError: updateSessionKeyMutation.error,
  };
};