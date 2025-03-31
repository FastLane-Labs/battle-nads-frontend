import React from 'react';
import { BattleNad } from '../utils/types';

interface CharacterSheetProps {
  character: BattleNad;
}

const CharacterSheet: React.FC<CharacterSheetProps> = ({ character }) => {
  if (!character) return null;

  const healthPercentage = Math.floor((character.stats.health / calculateMaxHealth(character)) * 100);
  
  return (
    <div className="game-tile flex flex-col">
      <h2 className="text-xl font-bold mb-2">{character.stats.isMonster ? 'Monster' : 'Character'}</h2>
      
      <div className="mb-4">
        <h3 className="font-semibold">Vitals</h3>
        <div className="mb-2">
          <div className="flex justify-between">
            <span>Health:</span>
            <span>{character.stats.health}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2.5">
            <div 
              className={`h-2.5 rounded-full ${healthPercentage > 50 ? 'bg-green-500' : healthPercentage > 25 ? 'bg-yellow-500' : 'bg-red-500'}`} 
              style={{ width: `${healthPercentage}%` }}
            ></div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <span className="block text-xs text-gray-400">Level</span>
            <span className="font-medium">{character.stats.level}</span>
          </div>
          <div>
            <span className="block text-xs text-gray-400">Experience</span>
            <span className="font-medium">{character.stats.experience}</span>
          </div>
          <div>
            <span className="block text-xs text-gray-400">Combat</span>
            <span className="font-medium">{character.stats.combatants > 0 ? 'In Combat' : 'Peaceful'}</span>
          </div>
        </div>
      </div>
      
      <div className="mb-4">
        <h3 className="font-semibold">Attributes</h3>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <span className="block text-xs text-gray-400">Strength</span>
            <span className="font-medium">{character.stats.strength}</span>
          </div>
          <div>
            <span className="block text-xs text-gray-400">Vitality</span>
            <span className="font-medium">{character.stats.vitality}</span>
          </div>
          <div>
            <span className="block text-xs text-gray-400">Dexterity</span>
            <span className="font-medium">{character.stats.dexterity}</span>
          </div>
          <div>
            <span className="block text-xs text-gray-400">Quickness</span>
            <span className="font-medium">{character.stats.quickness}</span>
          </div>
          <div>
            <span className="block text-xs text-gray-400">Sturdiness</span>
            <span className="font-medium">{character.stats.sturdiness}</span>
          </div>
          <div>
            <span className="block text-xs text-gray-400">Luck</span>
            <span className="font-medium">{character.stats.luck}</span>
          </div>
        </div>
      </div>
      
      <div className="mb-4">
        <h3 className="font-semibold">Equipment</h3>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="block text-xs text-gray-400">Weapon</span>
            <span className="font-medium">{character.weapon.name || `Weapon ${character.stats.weaponID}`}</span>
          </div>
          <div>
            <span className="block text-xs text-gray-400">Armor</span>
            <span className="font-medium">{character.armor.name || `Armor ${character.stats.armorID}`}</span>
          </div>
        </div>
      </div>
      
      <div>
        <h3 className="font-semibold">Location</h3>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <span className="block text-xs text-gray-400">Depth</span>
            <span className="font-medium">{character.stats.depth}</span>
          </div>
          <div>
            <span className="block text-xs text-gray-400">X</span>
            <span className="font-medium">{character.stats.x}</span>
          </div>
          <div>
            <span className="block text-xs text-gray-400">Y</span>
            <span className="font-medium">{character.stats.y}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to calculate max health (simplified version of the contract logic)
function calculateMaxHealth(character: BattleNad): number {
  const baseHealth = character.stats.isMonster ? 300 : 1000;
  const vitalityMod = character.stats.isMonster ? 40 : 100;
  const sturdinessMod = character.stats.isMonster ? 40 : 20;
  
  let maxHealth = baseHealth + (character.stats.vitality * vitalityMod) + (character.stats.sturdiness * sturdinessMod);
  
  if (character.stats.isMonster) {
    maxHealth = (maxHealth * 2) / 3;
  }
  
  return Math.min(maxHealth, 65535); // uint16 max value
}

export default CharacterSheet;