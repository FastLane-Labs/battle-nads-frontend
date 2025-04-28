import { useEffect, useState } from 'react';
import { useMachine } from '@xstate/react';
import { useWallet } from '@/providers/WalletProvider';
import { useBattleNadsClient } from './contracts/useBattleNadsClient';
import { gameMachine, logStateTransition } from '@/machines/gameStateMachine';
import { getCharacterLocalStorageKey, isValidCharacterId } from '@/utils/getCharacterLocalStorageKey';
import { logger } from '@/utils/logger';
import { domain } from '@/types';
import { ethers } from 'ethers';
import { MAX_SESSION_KEY_VALIDITY_BLOCKS } from '@/config/env'; // Import constant

/**
 * Hook that uses the game state machine to manage the application state
 */
export const useGameMachine = () => {
  const [state, send, actor] = useMachine(gameMachine);
  const { injectedWallet, embeddedWallet } = useWallet();
  const { client } = useBattleNadsClient();
  
  // Log all state transitions - commented out for tests
  // useEffect(() => {
  //   logStateTransition(state);
  // }, [state]);
  
  // Check wallet connection
  useEffect(() => {
    if (state.matches('checkingWallet')) {
      if (injectedWallet?.address) {
        send({ type: 'WALLET_CONNECTED', owner: injectedWallet.address });
      } else {
        send({ type: 'WALLET_DISCONNECTED' });
      }
    }
  }, [injectedWallet?.address, send, state]);
  
  // Check character when wallet is connected
  useEffect(() => {
    if (state.matches('checkingCharacter') && state.context.owner) {
      const loadCharacterId = async () => {
        try {
          const storageKey = getCharacterLocalStorageKey(state.context.owner!);
          if (storageKey) {
            const storedId = localStorage.getItem(storageKey);
            if (storedId && isValidCharacterId(storedId)) {
              send({ type: 'CHARACTER_SELECTED', characterId: storedId });
            } else {
              send({ type: 'NO_CHARACTER_FOUND' });
            }
          } else {
            send({ type: 'NO_CHARACTER_FOUND' });
          }
        } catch (error) {
          logger.error('[useGameMachine] Error loading character ID', error);
          send({ 
            type: 'ERROR', 
            message: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      };
      
      loadCharacterId();
    }
  }, [state, send]);
  
  // Check session key when character is selected
  useEffect(() => {
    if (state.matches('checkingSessionKey') && state.context.characterId && client && state.context.owner) {
      const checkSessionKey = async () => {
        try {
          // Use the new validateSessionKey method with just the owner address
          const validationResult = await client.validateSessionKey(
            state.context.owner!
          );
          
          // Handle the validation result based on state
          switch (validationResult.state) {
            case domain.SessionKeyState.VALID:
              send({ type: 'SESSION_KEY_VALID' });
              break;
            case domain.SessionKeyState.EXPIRED:
              send({ 
                type: 'SESSION_KEY_INVALID', 
                warning: validationResult.message || 'Session key is expired. Please update it.'
              });
              break;
            case domain.SessionKeyState.MISMATCHED:
              send({
                type: 'SESSION_KEY_INVALID',
                warning: validationResult.message || 'Session key does not match your wallet. Please update it.'
              });
              break;
            case domain.SessionKeyState.INVALID:
            default:
              send({
                type: 'SESSION_KEY_INVALID',
                warning: validationResult.message || 'Session key is invalid or not set. Please update it.'
              });
              break;
          }
        } catch (error) {
          logger.error('[useGameMachine] Error checking session key', error);
          send({ 
            type: 'ERROR', 
            message: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      };
      
      checkSessionKey();
    }
  }, [state, client, send]);
  
  // Create a character
  const createCharacter = async (params: {
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
    if (!client) {
      throw new Error('Game client not initialized');
    }
    
    try {
      // Call client with all parameters
      const tx = await client.createCharacter(
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
      const receipt = await tx.wait();
      
      // TODO: Properly extract CharacterCreated event from receipt.logs
      // For now, using placeholder
      console.warn("[useGameMachine] TODO: Extract real characterId from event logs in receipt:", receipt?.logs);
      const characterId = `char_${Math.random().toString(16).substring(2)}`; // Placeholder
      
      // Save placeholder to localStorage
      if (state.context.owner) {
        const storageKey = getCharacterLocalStorageKey(state.context.owner);
        if (storageKey) {
          localStorage.setItem(storageKey, characterId);
        }
      }
      
      send({ type: 'CHARACTER_CREATED', characterId });
      return characterId;
    } catch (error) {
      logger.error('[useGameMachine] Error creating character', error);
      send({ 
        type: 'ERROR', 
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  };
  
  // Update session key
  const updateSessionKey = async (sessionKeyAddress: string) => {
    if (!client) {
      throw new Error('Game client not initialized');
    }
    
    try {
      // --- Calculate expiration block --- 
      // TODO: Reuse client.getLatestBlockNumber if possible, maybe pass currentBlock in?
      const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL); // Need JsonRpcProvider + RPC_URL
      const currentBlock = await provider.getBlockNumber();
      const expirationBlocks = BigInt(currentBlock + MAX_SESSION_KEY_VALIDITY_BLOCKS); // Use constant
      console.log(`[useGameMachine] Updating session key ${sessionKeyAddress}. Target Expiration: ${expirationBlocks}`);
      // ---------------------------------
      
      // --- Fetch estimateBuyInAmountInMON and double it --- 
      let valueToSend = BigInt(0);
      try {
        const estimatedBuyIn = await client.estimateBuyInAmountInMON();
        valueToSend = estimatedBuyIn * BigInt(2); 
        console.log(`[useGameMachine] Estimated buy-in: ${estimatedBuyIn}, sending 2x as value: ${valueToSend}`);
      } catch (estimateError) {
        console.error("[useGameMachine] Error fetching estimateBuyInAmountInMON for session key update:", estimateError);
        throw new Error("Could not calculate required funds for session key update.");
      }
      // -------------------------------------------------

      // Pass value to client
      await client.updateSessionKey(
        sessionKeyAddress,
        expirationBlocks, // Pass BigInt directly to client
        valueToSend
      );
      
      send({ type: 'SESSION_KEY_FIXED' });
      return true;
    } catch (error) {
      logger.error('[useGameMachine] Error updating session key', error);
      send({ 
        type: 'ERROR', 
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  };
  
  // Fix session key
  const fixSessionKey = () => {
    send({ type: 'FIX_KEY' });
  };
  
  // Retry after error
  const retry = () => {
    send({ type: 'RETRY' });
  };
  
  return {
    state,
    send,
    createCharacter,
    updateSessionKey,
    fixSessionKey,
    retry,
    isCheckingWallet: state.matches('checkingWallet'),
    isNoWallet: state.matches('noOwnerWallet'),
    isCheckingCharacter: state.matches('checkingCharacter'),
    isNoCharacter: state.matches('noCharacter'),
    isCheckingSessionKey: state.matches('checkingSessionKey'),
    isSessionKeyWarning: state.matches('sessionKeyWarning'),
    isReady: state.matches('ready'),
    isError: state.matches('error'),
    owner: state.context.owner,
    characterId: state.context.characterId,
    warning: state.context.warning,
    errorMessage: state.context.errorMessage,
  };
}; 