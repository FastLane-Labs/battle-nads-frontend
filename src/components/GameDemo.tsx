import React, { useState, useEffect } from 'react';
import { useRecoilState } from 'recoil';
import { characterState } from '../state/atoms';
import { moveCharacter, attackCharacter } from '../utils/mockData';
import GameBoard from './GameBoard';
import { Character, BattleNad, BattleArea, BattleInstance } from '../types';

const GameDemo: React.FC = () => {
  const [currentCharacter, setCurrentCharacter] = useState<Character | null>(null);
  const [currentArea, setCurrentArea] = useState<BattleArea | null>(null);
  const [currentInstance, setCurrentInstance] = useState<BattleInstance | null>(null);

  useEffect(() => {
    // Initialize with mock data
    const mockCharacter: Character = {
      id: '1',
      stats: {
        strength: 10,
        vitality: 10,
        dexterity: 10,
        quickness: 10,
        sturdiness: 10,
        luck: 10,
        depth: 0,
        x: 2,
        y: 2,
        index: 0,
        health: 100,
        sumOfCombatantLevels: 0,
        combatants: 0,
        nextTargetIndex: 0,
        combatantBitMap: 0,
        weaponID: 0,
        armorID: 0,
        level: 1,
        experience: 0,
        unallocatedPoints: 0,
        isMonster: false
      },
      weapon: {
        name: 'Basic Sword',
        baseDamage: 10,
        bonusDamage: 0,
        accuracy: 80,
        speed: 5
      },
      armor: {
        name: 'Basic Armor',
        armorFactor: 5,
        armorQuality: 50,
        flexibility: 5,
        weight: 5
      },
      inventory: {
        weaponBitmap: 0,
        armorBitmap: 0,
        balance: 0
      },
      activeTask: "0x0000",
      owner: '0x123'
    };

    const mockArea: BattleArea = {
      playerCount: 1,
      sumOfPlayerLevels: 1,
      playerBitMap: 1,
      monsterCount: 0,
      sumOfMonsterLevels: 0,
      monsterBitMap: 0,
      depth: 0,
      x: 2,
      y: 2,
      update: false
    };

    const mockInstance: BattleInstance = {
      area: mockArea,
      combatants: []
    };

    setCurrentCharacter(mockCharacter);
    setCurrentArea(mockArea);
    setCurrentInstance(mockInstance);
  }, []);

  const handleMove = async (direction: 'north' | 'south' | 'east' | 'west' | 'up' | 'down') => {
    if (!currentCharacter) return;

    try {
      // Convert direction to match what moveCharacter expects
      let moveDirection: 'up' | 'down' | 'left' | 'right' = 'up';
      switch (direction) {
        case 'north': moveDirection = 'up'; break;
        case 'south': moveDirection = 'down'; break;
        case 'east': moveDirection = 'right'; break;
        case 'west': moveDirection = 'left'; break;
        case 'up': moveDirection = 'up'; break;
        case 'down': moveDirection = 'down'; break;
      }
      
      const result = await moveCharacter(moveDirection);
      if (result && result.position) {
        setCurrentCharacter(prev => {
          if (!prev) return null;
          return {
            ...prev,
            stats: {
              ...prev.stats,
              x: result.position.x,
              y: result.position.y
            }
          };
        });
      }
    } catch (error) {
      console.error("Failed to move character:", error);
    }
  };

  const handleAttack = async (targetId: string) => {
    if (!currentCharacter || !currentInstance) return;

    try {
      const result = await attackCharacter();
      // Update character with attack results
      console.log("Attack result:", result);
    } catch (error) {
      console.error("Failed to attack:", error);
    }
  };

  if (!currentCharacter || !currentArea || !currentInstance) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background text-text">
      {/* Logo */}
      <div className="fixed top-8 left-8 w-48 h-48 bg-surface rounded-lg p-4">
        <img 
          src="/BattleNadsLogo.png" 
          alt="BattleNads Logo" 
          className="w-full h-full object-contain"
        />
      </div>

      <GameBoard
        currentCharacter={currentCharacter}
        currentArea={currentArea}
        currentInstance={currentInstance}
        onMove={handleMove}
        onAttack={handleAttack}
      />
    </div>
  );
};

export default GameDemo; 