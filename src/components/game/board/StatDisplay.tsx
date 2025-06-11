import React, { useState, memo, useCallback } from 'react';
import { VStack, Text, Flex } from '@chakra-ui/react';
import { domain } from '@/types';

// Memoized StatRow component to prevent re-renders
const StatRow = memo<{
  label: string;
  value: number;
  allocationKey: string;
  allocation: number;
  hasPointsToAllocate: boolean;
  pointsUsed: number;
  unallocatedAttributePoints: number;
  onIncrement: (key: string) => void;
  onDecrement: (key: string) => void;
  isInCombat: boolean;
}>(({ label, value, allocationKey, allocation, hasPointsToAllocate, pointsUsed, unallocatedAttributePoints, onIncrement, onDecrement, isInCombat }) => {
  const handleIncrement = useCallback(() => onIncrement(allocationKey), [allocationKey, onIncrement]);
  const handleDecrement = useCallback(() => onDecrement(allocationKey), [allocationKey, onDecrement]);
  
  return (
    <div className="flex justify-between items-center gold-text-light">
      <span>{label}</span>
      <div className="flex items-center gap-1">
        <span className="text-xl">{value}</span>
        {allocation > 0 && (
          <span className="px-2 py-1 rounded text-sm font-medium green-text">
            +{allocation}
          </span>
        )}
        {hasPointsToAllocate && !isInCombat && (
          <div className="flex gap-1 ml-2">
            <button 
              className={`relative flex items-center justify-center w-[30px] h-[30px] ${allocation <= 0 ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 transition-transform duration-200'}`}
              onClick={handleDecrement}
              disabled={allocation <= 0}
            >
              <img 
                src="/assets/buttons/-.webp" 
                alt="-" 
                className="w-full h-full object-contain"
              />
              <div className="absolute inset-0 rounded-md bg-red-400/20 filter blur-sm opacity-0 hover:opacity-100 transition-opacity duration-200"></div>
            </button>
            <button 
              className={`relative flex items-center justify-center w-[30px] h-[30px] ${pointsUsed >= unallocatedAttributePoints ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 transition-transform duration-200'}`}
              onClick={handleIncrement}
              disabled={pointsUsed >= unallocatedAttributePoints}
            >
              <img 
                src="/assets/buttons/+.webp" 
                alt="+" 
                className="w-full h-full object-contain"
              />
              <div className="absolute inset-0 rounded-md bg-teal-400/20 filter blur-sm opacity-0 hover:opacity-100 transition-opacity duration-200"></div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

StatRow.displayName = 'StatRow';

export interface StatDisplayProps {
  stats: domain.Character['stats'];
  unallocatedAttributePoints: number;
  allocatePoints: (strength: bigint, vitality: bigint, dexterity: bigint, quickness: bigint, sturdiness: bigint, luck: bigint) => Promise<any>;
  isAllocatingPoints: boolean;
  isInCombat: boolean;
}

// Memoized StatDisplay component to prevent re-renders that cause button flickering
export const StatDisplay = memo<StatDisplayProps>(({ stats, unallocatedAttributePoints, allocatePoints, isAllocatingPoints, isInCombat }) => {
  const [allocation, setAllocation] = useState({
    strength: 0,
    vitality: 0,
    dexterity: 0,
    quickness: 0,
    sturdiness: 0,
    luck: 0
  });

  const handleAllocatePoints = useCallback(async () => {
    try {
      await allocatePoints(
        BigInt(allocation.strength),
        BigInt(allocation.vitality),
        BigInt(allocation.dexterity),
        BigInt(allocation.quickness),
        BigInt(allocation.sturdiness),
        BigInt(allocation.luck)
      );
      // Reset allocation on success
      setAllocation({
        strength: 0,
        vitality: 0,
        dexterity: 0,
        quickness: 0,
        sturdiness: 0,
        luck: 0
      });
    } catch (error) {
      console.error('Error allocating points:', error);
    }
  }, [allocation, allocatePoints]);

  const handleIncrement = useCallback((key: string) => {
    setAllocation(prev => ({
      ...prev,
      [key]: prev[key as keyof typeof prev] + 1
    }));
  }, []);

  const handleDecrement = useCallback((key: string) => {
    setAllocation(prev => ({
      ...prev,
      [key]: Math.max(0, prev[key as keyof typeof prev] - 1)
    }));
  }, []);

  // Calculate points used
  const pointsUsed = allocation.strength + allocation.vitality + allocation.dexterity + allocation.quickness + allocation.sturdiness + allocation.luck;
  const hasPointsToAllocate = unallocatedAttributePoints > 0;

  return (
    <VStack spacing={3}>
      <div className="grid grid-cols-2 gap-2 text-xl w-full">
        <StatRow 
          label="STR" 
          value={Number(stats?.strength)} 
          allocationKey="strength"
          allocation={allocation.strength}
          hasPointsToAllocate={hasPointsToAllocate}
          pointsUsed={pointsUsed}
          unallocatedAttributePoints={unallocatedAttributePoints}
          onIncrement={handleIncrement}
          onDecrement={handleDecrement}
          isInCombat={isInCombat}
        />
        <StatRow 
          label="DEX" 
          value={Number(stats?.dexterity)} 
          allocationKey="dexterity"
          allocation={allocation.dexterity}
          hasPointsToAllocate={hasPointsToAllocate}
          pointsUsed={pointsUsed}
          unallocatedAttributePoints={unallocatedAttributePoints}
          onIncrement={handleIncrement}
          onDecrement={handleDecrement}
          isInCombat={isInCombat}
        />
        <StatRow 
          label="VIT" 
          value={Number(stats?.vitality)} 
          allocationKey="vitality"
          allocation={allocation.vitality}
          hasPointsToAllocate={hasPointsToAllocate}
          pointsUsed={pointsUsed}
          unallocatedAttributePoints={unallocatedAttributePoints}
          onIncrement={handleIncrement}
          onDecrement={handleDecrement}
          isInCombat={isInCombat}
        />
        <StatRow 
          label="STD" 
          value={Number(stats?.sturdiness)} 
          allocationKey="sturdiness"
          allocation={allocation.sturdiness}
          hasPointsToAllocate={hasPointsToAllocate}
          pointsUsed={pointsUsed}
          unallocatedAttributePoints={unallocatedAttributePoints}
          onIncrement={handleIncrement}
          onDecrement={handleDecrement}
          isInCombat={isInCombat}
        />
        <StatRow 
          label="QCK" 
          value={Number(stats?.quickness)} 
          allocationKey="quickness"
          allocation={allocation.quickness}
          hasPointsToAllocate={hasPointsToAllocate}
          pointsUsed={pointsUsed}
          unallocatedAttributePoints={unallocatedAttributePoints}
          onIncrement={handleIncrement}
          onDecrement={handleDecrement}
          isInCombat={isInCombat}
        />
        <StatRow 
          label="LCK" 
          value={Number(stats?.luck)} 
          allocationKey="luck"
          allocation={allocation.luck}
          hasPointsToAllocate={hasPointsToAllocate}
          pointsUsed={pointsUsed}
          unallocatedAttributePoints={unallocatedAttributePoints}
          onIncrement={handleIncrement}
          onDecrement={handleDecrement}
          isInCombat={isInCombat}
        />
      </div>

      {hasPointsToAllocate && pointsUsed > 0 && (
        <VStack spacing={2} w="100%">
          <Flex justify="space-between" alignItems="center" width="100%">
            <Text fontSize="md" className="gold-text-light">Points remaining:</Text>
            <span className={`text-xl font-medium ${unallocatedAttributePoints - pointsUsed > 0 ? 'gold-text-light' : 'gold-text-light opacity-25'}`}>
              {unallocatedAttributePoints - pointsUsed}
            </span>
          </Flex>
          
          {isInCombat && (
            <Text fontSize="sm" className="text-red-400 text-center italic">
              Cannot allocate points while in combat
            </Text>
          )}
          
          <div className="relative w-full group">
            {/* Background image - Confirm Allocation Button */}
            <img 
              src="/assets/buttons/primary-button.webp" 
              alt="" 
              className="absolute inset-0 w-full h-[45px] object-fill z-0 transition-all duration-200 
                group-hover:brightness-125 group-hover:scale-[1.02] group-active:brightness-90 group-active:scale-[0.98]" 
            />
            
            <button 
              className={`relative h-[45px] w-full text-lg font-bold uppercase z-[2] bg-transparent border-0
                ${(pointsUsed === 0 || isAllocatingPoints || isInCombat) 
                  ? 'opacity-50 cursor-not-allowed' 
                  : ''}`}
              onClick={handleAllocatePoints}
              disabled={pointsUsed === 0 || isAllocatingPoints || isInCombat}
              style={{ transform: 'translateZ(0)' }}
            >
              <p className='gold-text transition-transform duration-200 group-hover:scale-[1.02] group-active:scale-95'>
                {isInCombat 
                  ? 'Combat Active' 
                  : isAllocatingPoints 
                    ? 'Allocating...' 
                    : 'Confirm Allocation'}
              </p>
            </button>
          </div>
        </VStack>
      )}
    </VStack>
  );
});

StatDisplay.displayName = 'StatDisplay'; 