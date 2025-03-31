import React, { useState } from 'react';
import { BattleNad } from '../utils/types';

interface EquipmentPanelProps {
  character: BattleNad;
  onEquipWeapon: (weaponId: number) => void;
  onEquipArmor: (armorId: number) => void;
}

const EquipmentPanel: React.FC<EquipmentPanelProps> = ({
  character,
  onEquipWeapon,
  onEquipArmor
}) => {
  const [showWeapons, setShowWeapons] = useState(false);
  const [showArmor, setShowArmor] = useState(false);

  if (!character) return null;

  // Convert the weapon bitmap to an array of available weapons
  const availableWeapons = getBitmapItems(character.inventory.weaponBitmap);
  const availableArmor = getBitmapItems(character.inventory.armorBitmap);

  return (
    <div className="game-tile p-4">
      <h2 className="text-xl font-bold mb-4">Equipment</h2>
      
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold">Current Weapon</h3>
          <button 
            className="btn btn-secondary text-sm"
            onClick={() => setShowWeapons(!showWeapons)}
          >
            {showWeapons ? 'Hide' : 'Change'}
          </button>
        </div>
        
        <div className="p-2 border border-gray-700 rounded">
          <div className="font-medium">{character.weapon.name || `Weapon ${character.stats.weaponID}`}</div>
          <div className="text-sm text-gray-400">
            <span>Damage: {character.weapon.baseDamage + character.weapon.bonusDamage}</span>
            <span className="mx-2">|</span>
            <span>Accuracy: {character.weapon.accuracy}</span>
          </div>
        </div>
        
        {showWeapons && (
          <div className="mt-2 grid grid-cols-4 gap-2">
            {availableWeapons.map(id => (
              <button
                key={id}
                className={`p-2 border rounded ${
                  id === character.stats.weaponID
                    ? 'border-primary bg-primary/20' 
                    : 'border-gray-700 hover:border-primary'
                }`}
                onClick={() => onEquipWeapon(id)}
                disabled={id === character.stats.weaponID}
              >
                <div className="text-center text-sm">{id}</div>
              </button>
            ))}
            {availableWeapons.length === 0 && (
              <div className="col-span-4 text-center text-gray-400 text-sm p-2">
                No weapons available
              </div>
            )}
          </div>
        )}
      </div>
      
      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold">Current Armor</h3>
          <button 
            className="btn btn-secondary text-sm"
            onClick={() => setShowArmor(!showArmor)}
          >
            {showArmor ? 'Hide' : 'Change'}
          </button>
        </div>
        
        <div className="p-2 border border-gray-700 rounded">
          <div className="font-medium">{character.armor.name || `Armor ${character.stats.armorID}`}</div>
          <div className="text-sm text-gray-400">
            <span>Protection: {character.armor.armorFactor * character.armor.armorQuality / 100}</span>
            <span className="mx-2">|</span>
            <span>Weight: {character.armor.weight}</span>
          </div>
        </div>
        
        {showArmor && (
          <div className="mt-2 grid grid-cols-4 gap-2">
            {availableArmor.map(id => (
              <button
                key={id}
                className={`p-2 border rounded ${
                  id === character.stats.armorID
                    ? 'border-primary bg-primary/20' 
                    : 'border-gray-700 hover:border-primary'
                }`}
                onClick={() => onEquipArmor(id)}
                disabled={id === character.stats.armorID}
              >
                <div className="text-center text-sm">{id}</div>
              </button>
            ))}
            {availableArmor.length === 0 && (
              <div className="col-span-4 text-center text-gray-400 text-sm p-2">
                No armor available
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to convert bitmap to array of item IDs
function getBitmapItems(bitmap: number): number[] {
  const items: number[] = [];
  const bits = bitmap.toString(2).padStart(64, '0');
  
  for (let i = 0; i < 64; i++) {
    if (bits[63 - i] === '1') {
      items.push(i);
    }
  }
  
  return items;
}

export default EquipmentPanel; 