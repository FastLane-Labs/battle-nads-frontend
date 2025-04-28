import { useMemo } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useBattleNadsClient } from '../contracts/useBattleNadsClient';
import { useWallet } from '../../providers/WalletProvider';
import { useBattleNads } from './useBattleNads';
import { domain } from '../../types';

/**
 * Hook for character management
 * Provides functions to create, upgrade, and delete characters
 */
export const useCharacter = () => {
  const { injectedWallet } = useWallet();
  const { client } = useBattleNadsClient();
  const queryClient = useQueryClient();
  
  // Owner address
  const owner = injectedWallet?.address || null;
  
  // Get game state for character data
  const { gameState } = useBattleNads(owner);
  
  // Character ID
  const characterId = gameState?.character?.id || null;
  
  // Get character ID
  const { data: fetchedCharacterId } = useQuery({
    queryKey: ['characterId', owner],
    queryFn: async () => {
      if (!client || !owner) {
        return null;
      }
      
      try {
        return await client.getPlayerCharacterID(owner);
      } catch (error) {
        // New player or error
        return null;
      }
    },
    enabled: !!client && !!owner && !characterId
  });
  
  // Get estimated buy-in amount
  const { data: buyInAmount } = useQuery({
    queryKey: ['buyInAmount'],
    queryFn: async () => {
      if (!client) {
        return BigInt(0);
      }
      
      return client.estimateBuyInAmountInMON();
    },
    enabled: !!client
  });
  
  // Unallocated attribute points
  const unallocatedPoints = useMemo(() => 
    gameState?.unallocatedAttributePoints || 0,
    [gameState]
  );
  
  // Mutation for creating a character
  const createCharacterMutation = useMutation({
    mutationFn: async (params: {
      name: string;
      strength: bigint;
      vitality: bigint;
      dexterity: bigint;
      quickness: bigint;
      sturdiness: bigint;
      luck: bigint;
      sessionKey: string;
      sessionKeyDeadline: bigint;
      value: bigint;
    }) => {
      if (!client) throw new Error("Client missing");
      // Pass all arguments to client
      return client.createCharacter(
        params.name,
        params.strength,
        params.vitality,
        params.dexterity,
        params.quickness,
        params.sturdiness,
        params.luck,
        params.sessionKey,
        params.sessionKeyDeadline,
        params.value
      );
    },
    onSuccess: () => {
      // Invalidate and refetch character ID and game state
      queryClient.invalidateQueries({ queryKey: ['characterId', owner] });
      queryClient.invalidateQueries({ queryKey: ['uiSnapshot', owner] });
    }
  });
  
  // Mutation for allocating attribute points
  const allocatePointsMutation = useMutation({
    mutationFn: async ({ 
      strength, 
      vitality, 
      dexterity, 
      quickness, 
      sturdiness, 
      luck 
    }: { 
      strength: number, 
      vitality: number, 
      dexterity: number, 
      quickness: number, 
      sturdiness: number, 
      luck: number 
    }) => {
      if (!client || !characterId) {
        throw new Error('Client or character ID missing');
      }
      
      return client.allocatePoints(
        characterId,
        BigInt(strength),
        BigInt(vitality),
        BigInt(dexterity),
        BigInt(quickness),
        BigInt(sturdiness),
        BigInt(luck)
      );
    },
    onSuccess: () => {
      // Invalidate and refetch game state
      queryClient.invalidateQueries({ queryKey: ['uiSnapshot', owner] });
    }
  });
  
  // Mutation for deleting a character
  const deleteCharacterMutation = useMutation({
    mutationFn: async () => {
      if (!client || !characterId) {
        throw new Error('Client or character ID missing');
      }
      
      return client.sepukku(characterId);
    },
    onSuccess: () => {
      // Invalidate and refetch character ID and game state
      queryClient.invalidateQueries({ queryKey: ['characterId', owner] });
      queryClient.invalidateQueries({ queryKey: ['uiSnapshot', owner] });
    }
  });
  
  return {
    // Character data
    character: gameState?.character,
    characterId: characterId || fetchedCharacterId,
    hasCharacter: !!(characterId || fetchedCharacterId),
    unallocatedPoints,
    buyInAmount,
    
    // Character creation
    createCharacter: (params: {
      name: string;
      strength: bigint;
      vitality: bigint;
      dexterity: bigint;
      quickness: bigint;
      sturdiness: bigint;
      luck: bigint;
      sessionKey: string;
      sessionKeyDeadline: bigint;
      value: bigint;
    }) => 
      createCharacterMutation.mutate(params),
    isCreating: createCharacterMutation.isPending,
    createError: createCharacterMutation.error ? (createCharacterMutation.error as Error).message : null,
    
    // Attribute allocation
    allocatePoints: (attributes: { 
      strength: number, 
      vitality: number, 
      dexterity: number, 
      quickness: number, 
      sturdiness: number, 
      luck: number 
    }) => allocatePointsMutation.mutate(attributes),
    isAllocating: allocatePointsMutation.isPending,
    allocateError: allocatePointsMutation.error ? (allocatePointsMutation.error as Error).message : null,
    
    // Character deletion
    deleteCharacter: () => deleteCharacterMutation.mutate(),
    isDeleting: deleteCharacterMutation.isPending,
    deleteError: deleteCharacterMutation.error ? (deleteCharacterMutation.error as Error).message : null
  };
}; 