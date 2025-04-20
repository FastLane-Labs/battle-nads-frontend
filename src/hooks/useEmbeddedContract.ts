import { useMemo, useState, useEffect, useCallback } from 'react';
import { BigNumberish, TransactionRequest, TransactionResponse, Interface } from 'ethers';
import { useWallet } from '../providers/WalletProvider';
import ENTRYPOINT_ABI from '../abis/battleNads.json';

// Use environment variables for contract addresses and RPC URLs
const ENTRYPOINT_ADDRESS = process.env.NEXT_PUBLIC_ENTRYPOINT_ADDRESS || "0x1E85b64E23Cf13b305b4c056438DD5242d93BB76";
const MIN_EXECUTION_GAS = BigInt(950000); // From Constants.sol
const MOVEMENT_GAS_LIMIT = MIN_EXECUTION_GAS + BigInt(550000); // Double gas limit only for movement

// Define transaction options type
export interface TransactionOptions {
    gasLimit?: number | bigint;
    value?: BigNumberish;
    gasPrice?: BigNumberish;
    nonce?: number;
  }

const iface = new Interface(ENTRYPOINT_ABI);

export const useEmbeddedContract = () => {
  const { embeddedWallet, sendPrivyTransaction } = useWallet();

  const getTransactionRequest = (functionName: string, args: any[], txOptions: TransactionOptions): TransactionRequest => {
    const input = iface.encodeFunctionData(functionName, args);
    const txRequest: TransactionRequest = {
        to: ENTRYPOINT_ADDRESS,
        from: embeddedWallet?.address,
        data: input,
        ...txOptions
    }
    return txRequest;
  }

  const sendTransaction = async (tx: TransactionRequest): Promise<TransactionResponse> => {
    if (!embeddedWallet?.signer) {
      throw new Error('No signer available');
    }
    const txResponse = await sendPrivyTransaction(tx);
    return txResponse;
  }

  const zoneChat = async (characterId: string, message: string): Promise<TransactionResponse> => {
    const options: TransactionOptions = {
        gasLimit: MIN_EXECUTION_GAS,
    }   
    try {
      console.log(`[useEmbeddedContract] Sending chat message: "${message}"`);
      const txArgs = [characterId, message];
      const txRequest: TransactionRequest = getTransactionRequest('zoneChat', txArgs, options || {});
      return sendTransaction(txRequest);
    } catch (error) {
      console.error("[useEmbeddedContract] Error preparing chat message:", error);
      throw error;
    }
  }

  const moveNorth = async (characterId: string): Promise<TransactionResponse> => {
    const options: TransactionOptions = {
        gasLimit: MOVEMENT_GAS_LIMIT,
    }
    const txArgs = [characterId];
    const txRequest: TransactionRequest = getTransactionRequest('moveNorth', txArgs, options || {});
    return sendTransaction(txRequest);
  }

  const moveSouth = async (characterId: string): Promise<TransactionResponse> => {
    const options: TransactionOptions = {
        gasLimit: MOVEMENT_GAS_LIMIT,
    }
    const txArgs = [characterId];
    const txRequest: TransactionRequest = getTransactionRequest('moveSouth', txArgs, options || {});
    return sendTransaction(txRequest);
  }     

  const moveEast = async (characterId: string): Promise<TransactionResponse> => {
    const options: TransactionOptions = {
        gasLimit: MOVEMENT_GAS_LIMIT,
    }
    const txArgs = [characterId];
    const txRequest: TransactionRequest = getTransactionRequest('moveEast', txArgs, options || {});
    return sendTransaction(txRequest);
  } 

  const moveWest = async (characterId: string): Promise<TransactionResponse> => {
    const options: TransactionOptions = {
        gasLimit: MOVEMENT_GAS_LIMIT,
    }
    const txArgs = [characterId];
    const txRequest: TransactionRequest = getTransactionRequest('moveWest', txArgs, options || {});
    return sendTransaction(txRequest);
  }

  const moveUp = async (characterId: string): Promise<TransactionResponse> => {
    const options: TransactionOptions = {
        gasLimit: MOVEMENT_GAS_LIMIT,
    }
    const txArgs = [characterId];
    const txRequest: TransactionRequest = getTransactionRequest('moveUp', txArgs, options || {});
    return sendTransaction(txRequest);
  } 

  const moveDown = async (characterId: string): Promise<TransactionResponse> => {
    const options: TransactionOptions = {
        gasLimit: MOVEMENT_GAS_LIMIT,
    }
    const txArgs = [characterId];
    const txRequest: TransactionRequest = getTransactionRequest('moveDown', txArgs, options || {});
    return sendTransaction(txRequest);
  }

  const attack = async (characterId: string, targetIndex: number): Promise<TransactionResponse> => {
    const options: TransactionOptions = {
        gasLimit: MIN_EXECUTION_GAS,
    }   
    const txArgs = [characterId, targetIndex];
    const txRequest: TransactionRequest = getTransactionRequest('attack', txArgs, options || {});
    return sendTransaction(txRequest);
  }

  const equipWeapon = async (characterId: string, weaponId: number): Promise<TransactionResponse> => {
    const options: TransactionOptions = {
        gasLimit: MIN_EXECUTION_GAS,
    }   
    const txArgs = [characterId, weaponId];
    const txRequest: TransactionRequest = getTransactionRequest('equipWeapon', txArgs, options || {});
    return sendTransaction(txRequest);
  }

  const equipArmor = async (characterId: string, armorId: number): Promise<TransactionResponse> => {
    const options: TransactionOptions = {
        gasLimit: MIN_EXECUTION_GAS,
    }   
    const txArgs = [characterId, armorId];
    const txRequest: TransactionRequest = getTransactionRequest('equipArmor', txArgs, options || {});
    return sendTransaction(txRequest);
  }
  
  const allocatePoints = async (characterId: string, strength: bigint, vitality: bigint, dexterity: bigint, quickness: bigint, sturdiness: bigint, luck: bigint): Promise<TransactionResponse> => {
    const options: TransactionOptions = {
        gasLimit: MIN_EXECUTION_GAS,
    }   
    const txArgs = [characterId, strength, vitality, dexterity, quickness, sturdiness, luck];
    const txRequest: TransactionRequest = getTransactionRequest('allocatePoints', txArgs, options || {});
    return sendTransaction(txRequest);
  }

  return {
    zoneChat,
    moveNorth,
    moveSouth,
    moveEast,
    moveWest,
    moveUp,
    moveDown,
    attack,
    equipWeapon,
    equipArmor,
    allocatePoints
  }
}