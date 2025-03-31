import React, { useEffect, useRef, useState } from 'react';
import { useRecoilState } from 'recoil';
import { characterState } from '../state/atoms';
import { moveCharacter, attackCharacter } from '../utils/mockData';
import { Character, ParticleEffect, BattleNad, BattleArea, BattleInstance } from '../types';
import AttributeAllocation from './AttributeAllocation';

interface GameBoardProps {
  currentCharacter: Character;
  currentArea: BattleArea;
  currentInstance: BattleInstance;
  onMove: (direction: 'north' | 'south' | 'east' | 'west' | 'up' | 'down') => void;
  onAttack: (targetId: string) => void;
}

const GameBoard: React.FC<GameBoardProps> = ({
  currentCharacter,
  currentArea,
  currentInstance,
  onMove,
  onAttack
}) => {
  const [particles, setParticles] = useState<ParticleEffect[]>([]);
  const [screenShake, setScreenShake] = useState(0);
  const [minimapData, setMinimapData] = useState<('empty' | 'player' | 'enemy')[][]>([]);
  const [characterCount, setCharacterCount] = useState(5); // Default to 5 characters for testing
  const [currentTargetIndex, setCurrentTargetIndex] = useState<number | null>(null);
  const [showAttributeAllocation, setShowAttributeAllocation] = useState(false);
  const [combatLogs, setCombatLogs] = useState<string[]>([
    "You entered a new area",
    "Enemy 3 appeared",
    "You hit Enemy 3 for 15 damage",
    "Enemy 3 hit you for 8 damage",
    "You gained 50 experience points"
  ]);
  const [areaMessages, setAreaMessages] = useState<{sender: string, message: string}[]>([
    {sender: "Player 1", message: "Hello everyone!"},
    {sender: "Enemy 2", message: "Who dares enter my lair?"},
    {sender: "You", message: "I'm just exploring..."}
  ]);
  const [chatInput, setChatInput] = useState("");
  const gameLoopRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleSelectTarget = (index: number) => {
    setCurrentTargetIndex(index);
    setCombatLogs(prev => [...prev, `Selected target: Enemy ${index}`]);
  };

  useEffect(() => {
    // Generate minimap data
    const generateMinimapData = () => {
      const data: ('empty' | 'player' | 'enemy')[][] = [];
      for (let y = 0; y < 5; y++) {
        const row: ('empty' | 'player' | 'enemy')[] = [];
        for (let x = 0; x < 5; x++) {
          if (x === 2 && y === 2) {
            row.push('player');
          } else if (Math.random() < 0.2) {
            row.push('enemy');
          } else {
            row.push('empty');
          }
        }
        data.push(row);
      }
      return data;
    };

    setMinimapData(generateMinimapData());

    // Set character count based on combat bitmap
    if (currentCharacter?.stats?.combatantBitMap) {
      // Count number of bits set in combatantBitMap
      const bits = currentCharacter.stats.combatantBitMap.toString(2).split('1').length - 1;
      setCharacterCount(bits + 1); // Add 1 for the player
    }

    // Setup canvas for background
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Draw grid lines
        ctx.strokeStyle = '#2a2a3e';
        ctx.lineWidth = 1;
        for (let i = 0; i < canvas.width; i += 40) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, canvas.height);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(0, i);
          ctx.lineTo(canvas.width, i);
          ctx.stroke();
        }
      }
    }
  }, [currentCharacter?.stats?.combatantBitMap]);

  useEffect(() => {
    const gameLoop = (timestamp: number) => {
      const deltaTime = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      // Update particle effects
      setParticles(prevParticles => 
        prevParticles.filter(particle => {
          const age = timestamp - particle.id;
          return age < 1000; // Remove particles after 1 second
        })
      );

      // Update screen shake
      if (screenShake > 0) {
        setScreenShake(prev => Math.max(0, prev - deltaTime));
      }

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, []);

  const addParticleEffect = (x: number, y: number, type: 'damage' | 'heal', value: number) => {
    setParticles((prev: ParticleEffect[]) => [...prev, {
      id: Date.now(),
      x,
      y,
      type,
      value
    }]);
  };

  const triggerScreenShake = () => {
    setScreenShake(500); // Screen shake for 500ms
  };

  const handleMove = (direction: 'up' | 'down' | 'left' | 'right') => {
    switch (direction) {
      case 'up':
        onMove('north');
        break;
      case 'down':
        onMove('south');
        break;
      case 'left':
        onMove('west');
        break;
      case 'right':
        onMove('east');
        break;
    }
  };

  const handleAttack = () => {
    if (currentCharacter.stats.combatantBitMap !== 0) {
      const targetId = currentInstance.combatants.find(c => c.stats.isMonster)?.id;
      if (targetId) {
        onAttack(targetId);
        addParticleEffect(currentCharacter.stats.x, currentCharacter.stats.y, 'damage', 50);
        triggerScreenShake();
      }
    }
  };

  // Function to simulate combat (would be replaced with actual game logic)
  const simulateCombat = () => {
    if (currentTargetIndex !== null) {
      // Add screen shake
      setScreenShake(1);
      setTimeout(() => setScreenShake(0), 300);
      
      // Add to combat log
      setCombatLogs(prev => [
        ...prev, 
        `You hit Enemy ${currentTargetIndex} for ${Math.floor(Math.random() * 20) + 5} damage`
      ]);
    }
  };

  const handleSaveAttributes = (newAttributes: Record<string, number>) => {
    console.log('Saving new attributes:', newAttributes);
    // Here you would update the character's attributes
    // This would typically call an API or dispatch an action
    
    // Add to combat log
    setCombatLogs(prev => [
      ...prev,
      `You allocated attribute points!`
    ]);
    
    // Close the allocation screen
    setShowAttributeAllocation(false);
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      // Here you would call the contract's zoneChat function
      // For now, we'll just add it to the local state
      setAreaMessages(prev => [...prev, {sender: "You", message: chatInput.trim()}]);
      setChatInput("");
    }
  };

  return (
    <div className={`min-h-screen w-full ${screenShake > 0 ? 'animate-screen-shake' : ''}`}>
      {/* Main grid layout */}
      <div className="grid grid-cols-12 gap-6 p-6 h-screen">
        {/* Left Column - 3 columns wide */}
        <div className="col-span-3 flex flex-col gap-6">
          {/* Logo Area - stays at top */}
          <div className="bg-surface rounded-lg h-64 relative">
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <img 
                src="/BattleNadsLogo.png" 
                alt="BattleNads" 
                className="max-w-full max-h-full object-contain"
                aria-hidden="true" /* Prevent screen readers from using alt text */
              />
            </div>
          </div>
          
          {/* Flexible space will appear here */}
          <div className="flex-grow"></div>
          
          {/* Combat Box - stays above Movement */}
          <div className="bg-surface rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4 text-center text-primary">Combat</h2>
            
            <div className="flex flex-col space-y-4">
              <div className="text-sm text-center mb-2">
                {currentTargetIndex !== null ? (
                  <div className="text-accent">
                    Target: {currentTargetIndex === 0 ? 'You' : `Enemy ${currentTargetIndex}`}
                  </div>
                ) : (
                  <div className="text-secondary italic">No target selected</div>
                )}
              </div>
              
              <button 
                className="w-full h-12 bg-danger rounded-lg flex items-center justify-center text-xl" 
                onClick={() => simulateCombat()}
                disabled={currentTargetIndex === null}
              >
                ⚔️ Attack
              </button>
            </div>
          </div>
          
          {/* Movement Box - fixed size at bottom */}
          <div className="bg-surface rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4 text-center text-primary">Movement</h2>
            
            <div className="flex justify-center">
              <div className="grid grid-cols-3 gap-2">
                <div />
                <button 
                  className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-xl" 
                  onClick={() => handleMove('up')}
                >
                  ⬆️
                </button>
                <div />
                <button 
                  className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-xl" 
                  onClick={() => handleMove('left')}
                >
                  ⬅️
                </button>
                <div /> {/* Center space */}
                <button 
                  className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-xl" 
                  onClick={() => handleMove('right')}
                >
                  ➡️
                </button>
                <div />
                <button 
                  className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-xl" 
                  onClick={() => handleMove('down')}
                >
                  ⬇️
                </button>
                <div />
              </div>
            </div>
            <div className="h-[1.5rem]"></div> {/* Spacing at bottom */}
          </div>
        </div>
        
        {/* Center Column - 6 columns wide */}
        <div className="col-span-6 flex flex-col gap-6">
          {/* Characters in Area Box */}
          <div className="bg-surface/80 rounded-lg p-4 flex-grow overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4 text-center text-primary">Characters in Area</h2>
            
            {/* Grid of Characters */}
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {/* This will render characters in the area - up to 64 */}
              {Array.from({ length: Math.min(characterCount, 64) }, (_, i) => (
                <div 
                  key={i} 
                  className="flex flex-col items-center justify-center p-1 bg-surface rounded cursor-pointer hover:bg-surface/70"
                  onClick={() => handleSelectTarget(i)}
                >
                  <div className={`w-10 h-10 flex items-center justify-center text-xl ${i === currentTargetIndex ? 'ring-2 ring-accent rounded-md' : ''} ${
                    i === 0 ? 'text-primary' : 'text-danger'
                  }`} style={{ fontFamily: 'monospace', imageRendering: 'pixelated' }}>
                    {i === 0 ? '🧙' : 
                     i % 5 === 1 ? '👹' : 
                     i % 5 === 2 ? '🐉' : 
                     i % 5 === 3 ? '💀' : 
                     '🧟'}
                  </div>
                  <span className="text-xs truncate w-full text-center mt-1 font-pixel">
                    {i === 0 ? 'You' : `Enemy ${i}`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Combat Log Box */}
          <div className="bg-surface/90 rounded-lg p-4 h-1/4 overflow-y-auto">
            <h2 className="text-lg font-semibold mb-2 text-center text-primary">Combat Log</h2>
            <div className="space-y-1 text-sm">
              {combatLogs.map((log, index) => (
                <div key={index} className="p-1">
                  <span className={`${
                    log.includes('hit') ? 'text-danger' : 
                    log.includes('gained') ? 'text-success' : ''
                  }`}>{log}</span>
                </div>
              ))}
              {combatLogs.length === 0 && (
                <div className="text-center text-secondary italic">No combat activity yet</div>
              )}
            </div>
          </div>

          {/* Area Chat Box */}
          <div className="bg-surface/90 rounded-lg p-4 h-1/4 overflow-y-auto flex flex-col">
            <h2 className="text-lg font-semibold mb-2 text-center text-primary">Area Chat</h2>
            
            {/* Chat Messages */}
            <div className="space-y-1 text-sm flex-grow overflow-y-auto mb-2">
              {areaMessages.map((msg, index) => (
                <div key={index} className="p-1">
                  <span className={`font-semibold ${msg.sender === "You" ? "text-primary" : "text-accent"}`}>
                    {msg.sender}:
                  </span>{" "}
                  <span>{msg.message}</span>
                </div>
              ))}
              {areaMessages.length === 0 && (
                <div className="text-center text-secondary italic">No chat messages yet</div>
              )}
            </div>
            
            {/* Chat Input */}
            <form onSubmit={handleChatSubmit} className="flex mt-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-grow bg-surface/70 rounded-l-lg px-3 py-1 text-sm focus:outline-none"
              />
              <button 
                type="submit"
                className="bg-primary rounded-r-lg px-3 py-1 text-sm"
              >
                Send
              </button>
            </form>
          </div>
        </div>
        
        {/* Canvas background */}
        <canvas ref={canvasRef} width="800" height="800" className="absolute top-0 left-0 w-full h-full -z-10" />
        
        {/* Right Column - 3 columns wide */}
        <div className="col-span-3 flex flex-col gap-6">
          {/* Minimap - stays at top */}
          <div className="bg-surface rounded-lg p-4 h-48">
            <h2 className="text-xl font-semibold mb-2 text-center text-primary">Minimap</h2>
            
            {/* Location Info */}
            <div className="text-sm text-center mb-2">
              <div className="text-accent">Location</div>
              <div>X: {currentCharacter.stats.x} | Y: {currentCharacter.stats.y} | Depth: {currentCharacter.stats.depth}</div>
            </div>

            {/* Grid Container */}
            <div className="flex items-center justify-center mt-1">
              <div className="grid grid-cols-5 gap-1">
                {minimapData.map((row, y) => 
                  row.map((cell, x) => (
                    <div
                      key={`${x}-${y}`}
                      className={`w-2 h-2 rounded-full ${
                        cell === 'player' ? 'bg-primary' :
                        cell === 'enemy' ? 'bg-danger' :
                        'bg-secondary/30'
                      }`}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Flexible space will appear here */}
          <div className="flex-grow"></div>

          {/* Character Stats - stays above Inventory */}
          <div className="bg-surface rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4 text-center text-primary">Character Stats</h2>
            
            {/* Health Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Health</span>
                <span>{currentCharacter.stats.health}/100</span>
              </div>
              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-accent transition-all duration-300"
                  style={{ width: `${(currentCharacter.stats.health / 100) * 100}%` }}
                />
              </div>
            </div>

            {/* Level and Experience */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Level {currentCharacter.stats.level}</span>
                <span>{currentCharacter.stats.experience} XP</span>
              </div>
              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${(currentCharacter.stats.experience / (currentCharacter.stats.level * 100)) * 100}%` }}
                />
              </div>
            </div>

            {/* Attributes */}
            <div className="grid grid-cols-2 gap-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-accent">STR</span>
                <span>{currentCharacter.stats.strength}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-accent">VIT</span>
                <span>{currentCharacter.stats.vitality}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-accent">DEX</span>
                <span>{currentCharacter.stats.dexterity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-accent">QUI</span>
                <span>{currentCharacter.stats.quickness}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-accent">STU</span>
                <span>{currentCharacter.stats.sturdiness}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-accent">LCK</span>
                <span>{currentCharacter.stats.luck}</span>
              </div>
            </div>

            {/* Unallocated Points */}
            <div className="border-t border-secondary/30 pt-3">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <span className="text-sm text-accent">Unallocated Points</span>
                  <div className="font-semibold">{currentCharacter.stats.unallocatedPoints ?? 0}</div>
                </div>
                <button 
                  className="btn btn-primary text-sm px-3 py-1"
                  disabled={!(currentCharacter.stats.unallocatedPoints && currentCharacter.stats.unallocatedPoints > 0)}
                  onClick={() => setShowAttributeAllocation(true)}
                >
                  Allocate
                </button>
              </div>
            </div>
          </div>

          {/* Equipment -> Inventory */}
          <div className="bg-surface rounded-lg p-4 mt-auto">
            <h2 className="text-xl font-semibold mb-4 text-center text-primary">Inventory</h2>
            
            {/* Balance */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-secondary/30">
              <div>
                <div className="text-sm text-accent">Balance</div>
                <div className="text-sm font-semibold">{currentCharacter.inventory?.balance || 0} shMON</div>
              </div>
            </div>
            
            {/* Equipment Items */}
            <div className="space-y-4">
              {/* Weapon */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-accent">Weapon</div>
                  <div className="text-sm">{currentCharacter.weapon?.name || 'None'}</div>
                </div>
                <button className="btn btn-primary text-sm px-3 py-1">Change</button>
              </div>

              {/* Armor */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-accent">Armor</div>
                  <div className="text-sm">{currentCharacter.armor?.name || 'None'}</div>
                </div>
                <button className="btn btn-primary text-sm px-3 py-1">Change</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Attribute Allocation Modal */}
      {showAttributeAllocation && (
        <AttributeAllocation 
          character={currentCharacter} 
          onSave={handleSaveAttributes} 
          onCancel={() => setShowAttributeAllocation(false)} 
        />
      )}
    </div>
  );
};

export default GameBoard; 