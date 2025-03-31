import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { usePrivy } from '@privy-io/react-auth';
import { useSetRecoilState } from 'recoil';
import { gameStateAtom } from '../state/gameState';
import { BattleNadsContract } from '../utils/contracts';
import { BattleNad } from '../utils/types';

export function useContract() {
  const { user, authenticated, ready } = usePrivy();
  const [contract, setContract] = useState<BattleNadsContract | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setGameState = useSetRecoilState(gameStateAtom);

  // Initialize contract when user is authenticated
  useEffect(() => {
    if (!ready || !authenticated || !user?.wallet?.address) return;

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const battleNadsContract = new BattleNadsContract(provider, signer);
    setContract(battleNadsContract);
  }, [ready, authenticated, user]);

  // Fetch character data
  const fetchCharacter = useCallback(async (characterId: string) => {
    if (!contract) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const character = await contract.getBattleNad(characterId);
      
      setGameState(prev => ({
        ...prev,
        characterId,
        character,
        loading: false,
      }));
      
      return character;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      
      setGameState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [contract, setGameState]);

  // Fetch characters in area
  const fetchCharactersInArea = useCallback(async (depth: number, x: number, y: number) => {
    if (!contract) return [];
    
    setLoading(true);
    setError(null);
    
    try {
      const characters = await contract.getBattleNadsInArea(depth, x, y);
      
      // Filter out null entries (characters array has fixed size with nulls)
      const validCharacters = characters.filter(c => c && c.id);
      
      setGameState(prev => ({
        ...prev,
        charactersInArea: validCharacters,
        loading: false,
      }));
      
      return validCharacters;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      
      setGameState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      
      return [];
    } finally {
      setLoading(false);
    }
  }, [contract, setGameState]);

  // Create a character
  const createCharacter = useCallback(async (
    name: string,
    strength: number,
    vitality: number,
    dexterity: number,
    quickness: number,
    sturdiness: number,
    luck: number,
    sessionKey: string
  ) => {
    if (!contract) {
      setError('Contract not initialized');
      return null;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Get estimated buy-in amount
      const buyInAmount = await contract.estimateBuyInAmount();
      
      // Session key deadline (example: 1 year from now in block numbers, ~2.1M blocks)
      const sessionKeyDeadline = Math.floor(Date.now() / 1000) + 31536000;
      
      const characterId = await contract.createCharacter(
        name,
        strength,
        vitality,
        dexterity,
        quickness,
        sturdiness,
        luck,
        sessionKey,
        sessionKeyDeadline,
        buyInAmount
      );
      
      // After character creation, fetch the character data
      const character = await fetchCharacter(characterId);
      
      return character;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [contract, fetchCharacter]);

  // Movement functions
  const moveNorth = useCallback(async (characterId: string) => {
    if (!contract) {
      setError('Contract not initialized');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await contract.moveNorth(characterId);
      
      // Refresh character data
      await fetchCharacter(characterId);
      
      // Get the updated location
      const character = await contract.getBattleNad(characterId);
      
      // Fetch characters in the new area
      await fetchCharactersInArea(character.stats.depth, character.stats.x, character.stats.y);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [contract, fetchCharacter, fetchCharactersInArea]);

  const moveSouth = useCallback(async (characterId: string) => {
    if (!contract) {
      setError('Contract not initialized');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await contract.moveSouth(characterId);
      
      // Refresh character data
      await fetchCharacter(characterId);
      
      // Get the updated location
      const character = await contract.getBattleNad(characterId);
      
      // Fetch characters in the new area
      await fetchCharactersInArea(character.stats.depth, character.stats.x, character.stats.y);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [contract, fetchCharacter, fetchCharactersInArea]);

  const moveEast = useCallback(async (characterId: string) => {
    if (!contract) {
      setError('Contract not initialized');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await contract.moveEast(characterId);
      
      // Refresh character data
      await fetchCharacter(characterId);
      
      // Get the updated location
      const character = await contract.getBattleNad(characterId);
      
      // Fetch characters in the new area
      await fetchCharactersInArea(character.stats.depth, character.stats.x, character.stats.y);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [contract, fetchCharacter, fetchCharactersInArea]);

  const moveWest = useCallback(async (characterId: string) => {
    if (!contract) {
      setError('Contract not initialized');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await contract.moveWest(characterId);
      
      // Refresh character data
      await fetchCharacter(characterId);
      
      // Get the updated location
      const character = await contract.getBattleNad(characterId);
      
      // Fetch characters in the new area
      await fetchCharactersInArea(character.stats.depth, character.stats.x, character.stats.y);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [contract, fetchCharacter, fetchCharactersInArea]);

  // Attack function
  const attack = useCallback(async (characterId: string, targetIndex: number) => {
    if (!contract) {
      setError('Contract not initialized');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await contract.attack(characterId, targetIndex);
      
      // Refresh character data
      await fetchCharacter(characterId);
      
      // Get the updated location
      const character = await contract.getBattleNad(characterId);
      
      // Fetch characters in the area
      await fetchCharactersInArea(character.stats.depth, character.stats.x, character.stats.y);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [contract, fetchCharacter, fetchCharactersInArea]);

  // Equipment functions
  const equipWeapon = useCallback(async (characterId: string, weaponId: number) => {
    if (!contract) {
      setError('Contract not initialized');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await contract.equipWeapon(characterId, weaponId);
      
      // Refresh character data
      await fetchCharacter(characterId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [contract, fetchCharacter]);

  const equipArmor = useCallback(async (characterId: string, armorId: number) => {
    if (!contract) {
      setError('Contract not initialized');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await contract.equipArmor(characterId, armorId);
      
      // Refresh character data
      await fetchCharacter(characterId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [contract, fetchCharacter]);

  // Allocate points
  const allocatePoints = useCallback(async (
    characterId: string,
    strength: number,
    vitality: number,
    dexterity: number,
    quickness: number,
    sturdiness: number,
    luck: number
  ) => {
    if (!contract) {
      setError('Contract not initialized');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await contract.allocatePoints(
        characterId,
        strength,
        vitality,
        dexterity,
        quickness,
        sturdiness,
        luck
      );
      
      // Refresh character data
      await fetchCharacter(characterId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [contract, fetchCharacter]);

  // Update session key
  const updateSessionKey = useCallback(async (sessionKey: string, value: string = '0') => {
    if (!contract) {
      setError('Contract not initialized');
      return null;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Session key deadline (example: 1 year from now in block numbers, ~2.1M blocks)
      const sessionKeyDeadline = Math.floor(Date.now() / 1000) + 31536000;
      
      const result = await contract.updateSessionKey(
        sessionKey,
        sessionKeyDeadline,
        value
      );
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [contract]);

  // Replenish gas balance
  const replenishGasBalance = useCallback(async (value: string) => {
    if (!contract) {
      setError('Contract not initialized');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await contract.replenishGasBalance(value);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [contract]);

  // Get shortfall to recommended balance
  const getShortfallToRecommendedBalance = useCallback(async (characterId: string) => {
    if (!contract) {
      setError('Contract not initialized');
      return '0';
    }
    
    try {
      const shortfall = await contract.shortfallToRecommendedBalance(characterId);
      return shortfall;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return '0';
    }
  }, [contract]);

  return {
    contract,
    loading,
    error,
    fetchCharacter,
    fetchCharactersInArea,
    createCharacter,
    moveNorth,
    moveSouth,
    moveEast,
    moveWest,
    attack,
    equipWeapon,
    equipArmor,
    allocatePoints,
    updateSessionKey,
    replenishGasBalance,
    getShortfallToRecommendedBalance,
  };
}