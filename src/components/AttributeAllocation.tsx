import React, { useState } from 'react';
import { Character } from '../types';

interface AttributeAllocationProps {
  character: Character;
  onSave: (attributes: Record<string, number>) => void;
  onCancel: () => void;
}

const AttributeAllocation: React.FC<AttributeAllocationProps> = ({ 
  character, 
  onSave, 
  onCancel 
}) => {
  const initialPoints = character.stats.unallocatedPoints ?? 0;
  const [pointsLeft, setPointsLeft] = useState(initialPoints);
  const [attributes, setAttributes] = useState({
    strength: character.stats.strength,
    vitality: character.stats.vitality,
    dexterity: character.stats.dexterity,
    quickness: character.stats.quickness,
    sturdiness: character.stats.sturdiness,
    luck: character.stats.luck,
  });

  const handleIncrement = (attribute: keyof typeof attributes) => {
    if (pointsLeft > 0) {
      setAttributes(prev => ({
        ...prev,
        [attribute]: prev[attribute] + 1
      }));
      setPointsLeft(prev => prev - 1);
    }
  };

  const handleDecrement = (attribute: keyof typeof attributes) => {
    // Only allow decreasing if the attribute is higher than its original value
    const originalValue = character.stats[attribute] as number;
    if (attributes[attribute] > originalValue) {
      setAttributes(prev => ({
        ...prev,
        [attribute]: prev[attribute] - 1
      }));
      setPointsLeft(prev => prev + 1);
    }
  };

  const handleSave = () => {
    onSave(attributes);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-surface p-6 rounded-lg w-full max-w-md">
        <h2 className="text-2xl font-semibold mb-4 text-center text-primary">Allocate Attribute Points</h2>
        
        <div className="text-center mb-6">
          <span className="text-accent">Points Remaining: </span>
          <span className="font-semibold">{pointsLeft}</span>
        </div>

        <div className="space-y-4">
          {Object.entries(attributes).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="capitalize text-accent">{key}</span>
              <div className="flex items-center gap-3">
                <button 
                  className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center"
                  onClick={() => handleDecrement(key as keyof typeof attributes)}
                  disabled={value <= (character.stats[key as keyof typeof character.stats] as number)}
                >
                  -
                </button>
                <span className="w-8 text-center">{value}</span>
                <button 
                  className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center"
                  onClick={() => handleIncrement(key as keyof typeof attributes)}
                  disabled={pointsLeft <= 0}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between mt-8">
          <button 
            className="btn btn-secondary px-4 py-2"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button 
            className="btn btn-primary px-4 py-2"
            onClick={handleSave}
            disabled={pointsLeft === initialPoints}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttributeAllocation; 