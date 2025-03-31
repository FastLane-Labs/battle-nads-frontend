import { useState, useCallback, useEffect } from 'react';
import { useSetRecoilState } from 'recoil';
import { gameStateAtom } from '../state/gameState';
import { 
  mockCharacter, 
  mockCharactersInArea, 
  mockContractMethods,
  initialGameState
} from '../utils/mockData';
import { BattleNad } from '../utils/types';

export function useMockContract() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setGameState = useSetRecoilState(gameStateAtom);
  
  // Initialize the game state with mock data
  useEffect(() => {
    setGameState(initialGameState);
  }, [setGameState]);

  // Fetch character data
  const fetchCharacter = useCallback(async (characterId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulate a small delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setGameState(prev => ({
        ...prev,
        characterId,
        character: mockCharacter,
        loading: false,
      }));
      
      return mockCharacter;
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
  }, [setGameState]);

  // Fetch characters in area
  const fetchCharactersInArea = useCallback(async (depth: number, x: number, y: number) => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulate a small delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setGameState(prev => ({
        ...prev,
        charactersInArea: mockCharactersInArea,
        loading: false,
      }));
      
      return mockCharactersInArea;
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
  }, [setGameState]);

  // Create a character
  const createCharacter = useCallback(async (
    name: string,
    strength: number,
    vitality: number,
    dexterity: number,
    quickness: number,
    sturdiness: number,
    luck: number
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulate a small delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create a new character based on the provided attributes
      const newCharacter: BattleNad = {
        ...mockCharacter,
        stats: {
          ...mockCharacter.stats,
          strength,
          vitality,
          dexterity,
          quickness,
          sturdiness,
          luck
        }
      };
      
      setGameState(prev => ({
        ...prev,
        characterId: newCharacter.id,
        character: newCharacter,
        loading: false,
      }));
      
      return newCharacter;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [setGameState]);

  // Movement functions
  const moveNorth = useCallback(async (characterId: string) => {
    if (!characterId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Simulate a small delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const updatedCharacter = await mockContractMethods.moveNorth();
      
      setGameState(prev => ({
        ...prev,
        character: updatedCharacter,
        loading: false,
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [setGameState]);

  const moveSouth = useCallback(async (characterId: string) => {
    if (!characterId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Simulate a small delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const updatedCharacter = await mockContractMethods.moveSouth();
      
      setGameState(prev => ({
        ...prev,
        character: updatedCharacter,
        loading: false,
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [setGameState]);

  const moveEast = useCallback(async (characterId: string) => {
    if (!characterId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Simulate a small delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const updatedCharacter = await mockContractMethods.moveEast();
      
      setGameState(prev => ({
        ...prev,
        character: updatedCharacter,
        loading: false,
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [setGameState]);

  const moveWest = useCallback(async (characterId: string) => {
    if (!characterId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Simulate a small delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const updatedCharacter = await mockContractMethods.moveWest();
      
      setGameState(prev => ({
        ...prev,
        character: updatedCharacter,
        loading: false,
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [setGameState]);

  // Attack function
  const attack = useCallback(async (characterId: string, targetIndex: number) => {
    if (!characterId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Simulate a small delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const result = await mockContractMethods.attack();
      
      // Update game state with combat results
      setGameState(prev => {
        // Find and update the monster in charactersInArea
        const updatedCharactersInArea = prev.charactersInArea.map(character => 
          character.id === result.target.id ? result.target : character
        );
        
        return {
          ...prev,
          character: result.character,
          charactersInArea: updatedCharactersInArea,
          loading: false,
        };
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [setGameState]);

  // Equipment functions
  const equipWeapon = useCallback(async (characterId: string, weaponId: number) => {
    if (!characterId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Simulate a small delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const updatedCharacter = await mockContractMethods.equipWeapon(weaponId);
      
      setGameState(prev => ({
        ...prev,
        character: updatedCharacter,
        loading: false,
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [setGameState]);

  const equipArmor = useCallback(async (characterId: string, armorId: number) => {
    if (!characterId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Simulate a small delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const updatedCharacter = await mockContractMethods.equipArmor(armorId);
      
      setGameState(prev => ({
        ...prev,
        character: updatedCharacter,
        loading: false,
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [setGameState]);

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
    if (!characterId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Simulate a small delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const updatedCharacter = await mockContractMethods.allocatePoints(
        strength,
        vitality,
        dexterity,
        quickness,
        sturdiness,
        luck
      );
      
      setGameState(prev => ({
        ...prev,
        character: updatedCharacter,
        loading: false,
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [setGameState]);
  
  // Dummy functions to maintain compatibility
  const updateSessionKey = useCallback(async () => {
    return { previousKey: '0x0', balanceOnPreviousKey: '0' };
  }, []);
  
  const replenishGasBalance = useCallback(async () => {
    return;
  }, []);
  
  const getShortfallToRecommendedBalance = useCallback(async () => {
    return '0';
  }, []);

  return {
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