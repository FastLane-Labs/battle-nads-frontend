import React from 'react';
import { BattleNad } from '../utils/types';

interface CharacterListProps {
  characters: BattleNad[];
  playerCombatants: BattleNad[];
  onSelectCharacter: (character: BattleNad) => void;
}

const CharacterList: React.FC<CharacterListProps> = ({ 
  characters, 
  playerCombatants,
  onSelectCharacter 
}) => {
  if (!characters || characters.length === 0) {
    return (
      <div className="game-tile p-4">
        <h2 className="text-xl font-bold mb-2">Characters in Area</h2>
        <p className="text-gray-400">No characters in this area.</p>
      </div>
    );
  }

  // Group characters by type (players and monsters)
  const players = characters.filter(c => !c.stats.isMonster);
  const monsters = characters.filter(c => c.stats.isMonster);

  // Check if a character is in combat with the player
  const isInCombat = (character: BattleNad) => {
    return playerCombatants.some(c => c.id === character.id);
  };

  return (
    <div className="game-tile p-4">
      <h2 className="text-xl font-bold mb-4">Characters in Area</h2>
      
      {players.length > 0 && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Players</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {players.map(player => (
              <div 
                key={player.id}
                className={`p-2 rounded border cursor-pointer transition-colors ${
                  isInCombat(player) 
                    ? 'border-red-500 bg-red-900/30' 
                    : 'border-gray-700 hover:border-blue-500'
                }`}
                onClick={() => onSelectCharacter(player)}
              >
                <div className="flex items-center">
                  <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center mr-2">
                    {player.stats.level}
                  </div>
                  <div>
                    <div className="font-medium">{player.id.substring(0, 6)}...</div>
                    <div className="text-xs">
                      {isInCombat(player) ? (
                        <span className="text-red-400">In Combat</span>
                      ) : (
                        <span className="text-gray-400">Peaceful</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {monsters.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Monsters</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {monsters.map(monster => (
              <div 
                key={monster.id}
                className={`p-2 rounded border cursor-pointer transition-colors ${
                  isInCombat(monster) 
                    ? 'border-red-500 bg-red-900/30' 
                    : 'border-gray-700 hover:border-red-500'
                }`}
                onClick={() => onSelectCharacter(monster)}
              >
                <div className="flex items-center">
                  <div className="h-8 w-8 bg-red-500 rounded-full flex items-center justify-center mr-2">
                    {monster.stats.level}
                  </div>
                  <div>
                    <div className="font-medium">Monster {monster.id.substring(0, 6)}...</div>
                    <div className="text-xs">
                      {isInCombat(monster) ? (
                        <span className="text-red-400">Attacking You</span>
                      ) : (
                        <span className="text-gray-400">Lurking</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CharacterList;