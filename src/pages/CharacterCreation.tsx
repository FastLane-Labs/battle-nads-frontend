import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMockContract } from '../hooks/useMockContract';

const CharacterCreation: React.FC = () => {
  const navigate = useNavigate();
  const { createCharacter, loading, error } = useMockContract();
  
  const [name, setName] = useState('');
  const [strength, setStrength] = useState(5);
  const [vitality, setVitality] = useState(5);
  const [dexterity, setDexterity] = useState(5);
  const [quickness, setQuickness] = useState(5);
  const [sturdiness, setSturdiness] = useState(5);
  const [luck, setLuck] = useState(5);
  const [remainingPoints, setRemainingPoints] = useState(5);
  const [isCreating, setIsCreating] = useState(false);
  
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
    
    try {
      const result = await createCharacter(
        name,
        strength,
        vitality,
        dexterity,
        quickness,
        sturdiness,
        luck
      );
      
      if (result) {
        navigate('/game');
      }
    } catch (err) {
      console.error('Error creating character:', err);
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
          
          <div className="flex justify-end">
            <button
              className="btn btn-primary px-6 py-2"
              onClick={handleCreateCharacter}
              disabled={!name || remainingPoints !== 0 || isCreating || loading}
            >
              {isCreating ? 'Creating...' : 'Create Character'}
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
            onClick={() => onChange(value - 1)}
            disabled={!canDecrease}
          >
            -
          </button>
          <button
            className="w-8 h-8 rounded border border-gray-700 hover:border-green-500 ml-1 disabled:opacity-50 disabled:hover:border-gray-700 flex items-center justify-center"
            onClick={() => onChange(value + 1)}
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