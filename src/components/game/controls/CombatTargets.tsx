import React, { useState } from 'react';
import { Box, Button, Heading, VStack, Text, Badge } from '@chakra-ui/react';
import { domain } from '../../../types';

interface CombatTargetsProps {
  combatants: domain.CharacterLite[];
  onAttack: (targetIndex: number) => Promise<void>;
  isAttacking: boolean;
  selectedTargetIndex: number | null;
  onSelectTarget: (index: number | null) => void;
}

const CombatTargets: React.FC<CombatTargetsProps> = ({ 
  combatants, 
  onAttack, 
  isAttacking, 
  selectedTargetIndex,
  onSelectTarget
}) => {
  const handleAttack = () => {
    if (selectedTargetIndex !== null && !isAttacking) {
      onAttack(selectedTargetIndex);
    }
  };
  
  return (
    <Box h="100%" display="flex" flexDirection="column">
      <h2 className='gold-text-light text-2xl font-bold tracking-tight mb-2 text-center'>Combat</h2>
      
      {combatants.length === 0 ? (
        <Box className="flex items-center justify-center h-full w-full bg-dark-brown rounded-md">
          <Text className='gold-text-light text-lg'>No targets in this area</Text>
        </Box>
      ) : (
        <VStack spacing={2} align="stretch">
          {/* Target List */}
          <Box p={2} borderRadius="md" mb={2} maxH="200px" overflowY="auto" className='bg-dark-brown'>
            {combatants.map((combatant, index) => (
              <Button
              key={index}
              size="sm"
              variant={selectedTargetIndex === index ? "solid" : "ghost"}
              colorScheme={selectedTargetIndex === index ? "red" : "gray"}
              justifyContent="flex-start"
              width="100%"
              mb={1}
              onClick={() => onSelectTarget(selectedTargetIndex === index ? null : index)}
              disabled={isAttacking}
              >
                <Text fontSize="sm" mr={2} className='gold-text-light'>
                  {combatant.name || `Enemy #${index + 1}`}
                </Text>
                <Box 
                backgroundImage="/assets/bg/level.png"
                backgroundSize="contain"
                backgroundRepeat="no-repeat"
                backgroundPosition="center"
                px={3}
                py={1}
                display="flex"
                alignItems="center"
                justifyContent="center"
                minWidth="70px"
                height="30px"
                className='text-yellow-400/90 text-center font-serif ml-auto'
                >
                  Lvl {combatant.level || '?'}
                </Box>
              </Button>
            ))}
          </Box>
          
          {/* Attack Button */}
          <Button
            colorScheme="red"
            size="md"
            onClick={handleAttack}
            isDisabled={selectedTargetIndex === null || isAttacking}
            isLoading={isAttacking}
            loadingText="Attacking..."
            >
            Attack
          </Button>
        </VStack>
      )}
      </Box>
  );
};

export default CombatTargets; 