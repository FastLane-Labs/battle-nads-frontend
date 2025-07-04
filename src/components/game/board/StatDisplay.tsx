import React, { useState, memo, useCallback } from 'react';
import { VStack, Text, Flex } from '@chakra-ui/react';
import { domain } from '@/types';
import { GameButton, StatIncrementControl } from '../../ui';

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
          <div className="ml-2">
            <StatIncrementControl
              value={allocation}
              onIncrement={handleIncrement}
              onDecrement={handleDecrement}
              canIncrement={pointsUsed < unallocatedAttributePoints}
              canDecrement={allocation > 0}
              size="small"
              isDisabled={false}
            />
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
  isTransactionDisabled: boolean;
  insufficientBalanceMessage: string | null;
}

// Memoized StatDisplay component to prevent re-renders that cause button flickering
export const StatDisplay = memo<StatDisplayProps>(({ stats, unallocatedAttributePoints, allocatePoints, isAllocatingPoints, isInCombat, isTransactionDisabled, insufficientBalanceMessage }) => {
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
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-2 text-xl w-full">
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
          
          {isTransactionDisabled && !isInCombat && (
            <Text fontSize="sm" className="text-red-400 text-center italic">
              {insufficientBalanceMessage}
            </Text>
          )}
          
          <GameButton
            variant="compact"
            onClick={handleAllocatePoints}
            isDisabled={pointsUsed === 0 || isAllocatingPoints || isInCombat || isTransactionDisabled}
            loading={isAllocatingPoints}
            loadingText="Allocating..."
          >
            {isInCombat 
              ? 'Combat Active' 
              : isTransactionDisabled
                ? 'Insufficient Balance'
                : 'Confirm Allocation'}
          </GameButton>
        </VStack>
      )}
    </VStack>
  );
});

StatDisplay.displayName = 'StatDisplay'; 