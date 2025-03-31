import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { gameStateAtom, playerCharacterSelector, combatantsSelector } from '../state/gameState';
import { useMockContract } from '../hooks/useMockContract';
import CharacterSheet from '../components/CharacterSheet';
import CharacterList from '../components/CharacterList';
import MovementControls from '../components/MovementControls';
import EquipmentPanel from '../components/EquipmentPanel';
import AttributeAllocation from '../components/AttributeAllocation';
import { BattleNad } from '../utils/types';

const GameBoard: React.FC = () => {
  const navigate = useNavigate();
  const { 
    fetchCharacter, 
    fetchCharactersInArea, 
    moveNorth, 
    moveSouth, 
    moveEast, 
    moveWest, 
    attack, 
    equipWeapon, 
    equipArmor, 
    allocatePoints,
    loading,
    error
  } = useMockContract();
  
  const setGameState = useSetRecoilState(gameStateAtom);
  const character = useRecoilValue(playerCharacterSelector);
  const combatants = useRecoilValue(combatantsSelector);
  
  const [selectedCharacter, setSelectedCharacter] = useState<BattleNad | null>(null);
  const [showAttributeAllocation, setShowAttributeAllocation] = useState(false);
  
  // Simulate loading the character
  useEffect(() => {
    const initializeGame = async () => {
      try {
        // Use mock character ID
        const mockCharacterId = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
        
        const character = await fetchCharacter(mockCharacterId);
        
        if (character) {
          await fetchCharactersInArea(
            character.stats.depth,
            character.stats.x,
            character.stats.y
          );
        } else {
          // No character found, navigate to creation
          navigate('/create-character');
        }
      } catch (err) {
        console.error('Error initializing game:', err);
      }
    };
    
    initializeGame();
  }, [fetchCharacter, fetchCharactersInArea, navigate]);
  
  // Handle moving the character
  const handleMove = useCallback(async (direction: 'north' | 'south' | 'east' | 'west') => {
    if (!character || loading) return;
    
    try {
      switch (direction) {
        case 'north':
          await moveNorth(character.id);
          break;
        case 'south':
          await moveSouth(character.id);
          break;
        case 'east':
          await moveEast(character.id);
          break;
        case 'west':
          await moveWest(character.id);
          break;
      }
    } catch (err) {
      console.error(`Error moving ${direction}:`, err);
    }
  }, [character, loading, moveNorth, moveSouth, moveEast, moveWest]);
  
  // Handle selecting a character in the area
  const handleSelectCharacter = (targetCharacter: BattleNad) => {
    setSelectedCharacter(targetCharacter);
  };
  
  // Handle attacking a selected character
  const handleAttack = async () => {
    if (!character || !selectedCharacter || loading) return;
    
    try {
      await attack(character.id, selectedCharacter.stats.index);
      setSelectedCharacter(null);
    } catch (err) {
      console.error('Error attacking:', err);
    }
  };
  
  // Handle equipping weapon
  const handleEquipWeapon = async (weaponId: number) => {
    if (!character || loading) return;
    
    try {
      await equipWeapon(character.id, weaponId);
    } catch (err) {
      console.error('Error equipping weapon:', err);
    }
  };
  
  // Handle equipping armor
  const handleEquipArmor = async (armorId: number) => {
    if (!character || loading) return;
    
    try {
      await equipArmor(character.id, armorId);
    } catch (err) {
      console.error('Error equipping armor:', err);
    }
  };
  
  // Handle allocating attribute points
  const handleAllocatePoints = async (
    strength: number,
    vitality: number,
    dexterity: number,
    quickness: number,
    sturdiness: number,
    luck: number
  ) => {
    if (!character || loading) return;
    
    try {
      await allocatePoints(
        character.id,
        strength,
        vitality,
        dexterity,
        quickness,
        sturdiness,
        luck
      );
    } catch (err) {
      console.error('Error allocating points:', err);
    }
  };
  
  // Handle logging out
  const handleLogout = () => {
    setGameState({
      characterId: null,
      character: null,
      charactersInArea: [],
      loading: false,
      error: null,
    });
    
    navigate('/');
  };
  
  if (!character) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-white">Loading game...</h2>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">BattleNads</h1>
          <button
            className="btn btn-secondary"
            onClick={handleLogout}
          >
            Log Out
          </button>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded text-sm">
            {error}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1 space-y-4">
            <CharacterSheet character={character} />
            <EquipmentPanel 
              character={character} 
              onEquipWeapon={handleEquipWeapon} 
              onEquipArmor={handleEquipArmor} 
            />
            {showAttributeAllocation && (
              <AttributeAllocation 
                character={character} 
                closeModal={() => setShowAttributeAllocation(false)}
                onAllocatePoints={async (...args) => {
                  await handleAllocatePoints(...args);
                  setShowAttributeAllocation(false);
                }}
              />
            )}
          </div>
          
          <div className="md:col-span-2 space-y-4">
            <div className="game-tile p-4">
              <h2 className="text-xl font-bold mb-2">
                Location: Depth {character.stats.depth}, X: {character.stats.x}, Y: {character.stats.y}
              </h2>
              
              {selectedCharacter && (
                <div className="mb-4 p-4 border border-gray-700 rounded">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold">
                      {selectedCharacter.stats.isMonster 
                        ? `Monster (Level ${selectedCharacter.stats.level})` 
                        : `Player (Level ${selectedCharacter.stats.level})`}
                    </h3>
                    <button 
                      className="btn btn-danger"
                      onClick={handleAttack}
                      disabled={loading}
                    >
                      Attack
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-400">Health:</span> {selectedCharacter.stats.health}
                    </div>
                    <div>
                      <span className="text-gray-400">Strength:</span> {selectedCharacter.stats.strength}
                    </div>
                    <div>
                      <span className="text-gray-400">Weapon:</span> {selectedCharacter.weapon.name || `Weapon ${selectedCharacter.stats.weaponID}`}
                    </div>
                    <div>
                      <span className="text-gray-400">Armor:</span> {selectedCharacter.armor.name || `Armor ${selectedCharacter.stats.armorID}`}
                    </div>
                  </div>
                </div>
              )}
              
              <MovementControls
                onMoveNorth={() => handleMove('north')}
                onMoveSouth={() => handleMove('south')}
                onMoveEast={() => handleMove('east')}
                onMoveWest={() => handleMove('west')}
                disabled={loading || character.stats.combatants > 0}
              />
            </div>
            
            <CharacterList
              characters={combatants}
              playerCombatants={combatants}
              onSelectCharacter={handleSelectCharacter}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameBoard; 