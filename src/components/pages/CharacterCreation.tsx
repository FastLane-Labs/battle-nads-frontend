import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBattleNads } from '../../hooks/useBattleNads';

interface CharacterCreationProps {
  onCharacterCreated?: () => void;
}

const CharacterCreation: React.FC<CharacterCreationProps> = ({ onCharacterCreated }) => {
  const router = useRouter();
  const { createCharacter, loading, error } = useBattleNads();
  
  const [name, setName] = useState('');
  const [strength, setStrength] = useState(5);
  const [vitality, setVitality] = useState(5);
  const [dexterity, setDexterity] = useState(5);
  const [quickness, setQuickness] = useState(5);
  const [sturdiness, setSturdiness] = useState(5);
  const [luck, setLuck] = useState(5);
  const [remainingPoints, setRemainingPoints] = useState(5);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreated, setIsCreated] = useState(false);
  const [createError, setCreateError] = useState('');
  
  const totalPoints = 30; // Starting points for allocation
  
  useEffect(() => {
    const used = strength + vitality + dexterity + quickness + sturdiness + luck;
    setRemainingPoints(totalPoints - used);
  }, [strength, vitality, dexterity, quickness, sturdiness, luck]);
  
  const handleCreateCharacter = async () => {
    if (!name || remainingPoints !== 0) {
      return;
    }
    
    setIsCreating(true);
    console.log("Creating character...");

    try {
      const characterId = await createCharacter(
        name,
        strength,
        vitality,
        dexterity,
        quickness,
        sturdiness,
        luck
      );

      if (characterId) {
        console.log("Character created successfully:", characterId);
        setIsCreated(true);
        
        // Explicitly store in localStorage to ensure it's available
        localStorage.setItem('battleNadsCharacterId', characterId);
        console.log("Character ID stored in localStorage:", characterId);
        
        // Call the callback if provided
        if (onCharacterCreated) {
          onCharacterCreated();
        }
        
        // Show message to user and add a longer delay before redirecting
        console.log("Redirecting to game in 2 seconds...");
        
        // Force a longer delay to ensure state updates propagate
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Use a hard redirect to game page to ensure a clean slate
        window.location.href = '/game?newCharacter=true';
        return;
      } else {
        console.error("Failed to create character: No character ID returned");
        setCreateError("Failed to create character. Please try again.");
      }
    } catch (err) {
      console.error('Error creating character:', err);
      setCreateError("An error occurred while creating the character. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };
  
  const canIncrease = (value: number) => {
    return remainingPoints > 0 && value < 10; // Max 10 per attribute 
  };
  
  const canDecrease = (value: number) => {
    return value > 1; // Min 1 per attribute
  };
  
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Create Your BattleNad</h1>
          <p className="text-gray-400">Customize your character's attributes and prepare for battle!</p>
        </div>
        
        <div className="game-tile p-6 mb-8">
          <div className="mb-6">
            <label htmlFor="name" className="block font-medium mb-2">Character Name</label>
            <input
              type="text"
              id="name"
              className="w-full bg-background border border-gray-700 rounded-md py-2 px-3 text-white"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter a character name"
            />
          </div>
          
          <div className="mb-4">
            <h2 className="font-semibold mb-2">Attribute Points</h2>
            <p className="text-sm text-gray-400 mb-4">
              Remaining Points: <span className={remainingPoints === 0 ? 'text-green-500' : 'text-yellow-500'}>{remainingPoints}</span>
            </p>
            
            <div className="space-y-3">
              <AttributeItem 
                name="Strength" 
                value={strength}
                description="Increases your damage in combat"
                canIncrease={canIncrease(strength)}
                canDecrease={canDecrease(strength)}
                onChange={setStrength}
              />
              
              <AttributeItem 
                name="Vitality" 
                value={vitality}
                description="Increases your health"
                canIncrease={canIncrease(vitality)}
                canDecrease={canDecrease(vitality)}
                onChange={setVitality}
              />
              
              <AttributeItem 
                name="Dexterity" 
                value={dexterity}
                description="Increases your accuracy"
                canIncrease={canIncrease(dexterity)}
                canDecrease={canDecrease(dexterity)}
                onChange={setDexterity}
              />
              
              <AttributeItem 
                name="Quickness" 
                value={quickness}
                description="Increases your speed in combat"
                canIncrease={canIncrease(quickness)}
                canDecrease={canDecrease(quickness)}
                onChange={setQuickness}
              />
              
              <AttributeItem 
                name="Sturdiness" 
                value={sturdiness}
                description="Increases your defense"
                canIncrease={canIncrease(sturdiness)}
                canDecrease={canDecrease(sturdiness)}
                onChange={setSturdiness}
              />
              
              <AttributeItem 
                name="Luck" 
                value={luck}
                description="Increases your critical chance"
                canIncrease={canIncrease(luck)}
                canDecrease={canDecrease(luck)}
                onChange={setLuck}
              />
            </div>
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded text-sm">
              {error}
            </div>
          )}
          
          {createError && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded text-sm">
              {createError}
            </div>
          )}
          
          <div className="flex justify-end">
            <button
              className="btn btn-primary px-6 py-2"
              onClick={handleCreateCharacter}
              disabled={!name || remainingPoints !== 0 || isCreating || loading}
            >
              {isCreating ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </span>
              ) : 'Create Character'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface AttributeItemProps {
  name: string;
  value: number;
  description: string;
  canIncrease: boolean;
  canDecrease: boolean;
  onChange: (value: number) => void;
}

const AttributeItem: React.FC<AttributeItemProps> = ({
  name,
  value,
  description,
  canIncrease,
  canDecrease,
  onChange
}) => {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="font-medium">{name}</div>
        <div className="text-xs text-gray-400">{description}</div>
      </div>
      <div className="flex items-center">
        <div className="mx-3 min-w-[2rem] text-center">{value}</div>
        <div className="flex">
          <button
            className="w-8 h-8 rounded border border-gray-700 hover:border-red-500 disabled:opacity-50 disabled:hover:border-gray-700 flex items-center justify-center"
            onClick={(e) => { e.preventDefault(); onChange(value - 1); }}
            disabled={!canDecrease}
          >
            -
          </button>
          <button
            className="w-8 h-8 rounded border border-gray-700 hover:border-green-500 ml-1 disabled:opacity-50 disabled:hover:border-gray-700 flex items-center justify-center"
            onClick={(e) => { e.preventDefault(); onChange(value + 1); }}
            disabled={!canIncrease}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
};

export default CharacterCreation; 