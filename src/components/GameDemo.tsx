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
        isMonster: false
      },
      inventory: {
        weaponBitmap: 0,
        armorBitmap: 0,
        balance: 0
      },
      activeTask: null,
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

  const handleMove = (direction: 'north' | 'south' | 'east' | 'west' | 'up' | 'down') => {
    if (!currentCharacter) return;

    const newCharacter = moveCharacter(currentCharacter, direction);
    setCurrentCharacter(newCharacter);
  };

  const handleAttack = (targetId: string) => {
    if (!currentCharacter || !currentInstance) return;

    const { attacker, defender } = attackCharacter(currentCharacter, currentInstance.combatants.find(c => c.id === targetId) || currentCharacter);
    setCurrentCharacter(attacker);
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